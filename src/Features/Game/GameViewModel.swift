import SwiftUI

enum GameViewState {
    case idle
    case dealing
    case waitingForAction
    case playerActing
    case aiThinking
    case checkingRoundEnd
    case roundTransition
    case roundEnd
}

@Observable
final class GameViewModel {
    private let pokerEngine = PokerEngine()
    private let aiEngine = AIEngine()
    private let patternRepository: IAIPatternRepository
    private let recordRepository: IGameRecordRepository
    private let archiveManager: IGameArchiveManager

    private(set) var gameState: GameState = GameState()
    private(set) var viewState: GameViewState = .idle
    private(set) var thinkingPlayerId: Int?
    private(set) var currentActor: Player?
    private(set) var callAmount: Int = 0
    private(set) var minRaiseAmount: Int = 0
    private(set) var selectedQuickBet: Int?

    var showActionLog: Bool = false
    var showRoundEndModal: Bool = false
    /// 点击"下一局"后设置为true，GameView用.onChange监听它来启动新手牌
    var triggerNewHand: Bool = false
    var lastWinner: Player?
    var lastWinningPlayerIds: [Int] = []
    var lastProfit: Int = 0

    let initialChips: Int
    let onGameEnd: (Int) -> Void
    private var restoredResumeMode: GameArchive.ResumeMode = .currentHand

    var communityCards: [Card] {
        gameState.communityCards
    }

    var pot: Int {
        gameState.pot
    }

    var currentBet: Int {
        gameState.currentBet
    }

    var players: [Player] {
        gameState.players
    }

    var humanPlayer: Player? {
        players.first { $0.id == 0 }
    }

    private var humanCurrentBet: Int {
        gameState.playerBets[0] ?? 0
    }

    var canHumanFold: Bool { true }
    var canHumanCall: Bool { callAmount > 0 && (humanPlayer?.chips ?? 0) >= callAmount }
    var canHumanRaise: Bool {
        let availableTotalBet = (humanPlayer?.chips ?? 0) + humanCurrentBet
        return (humanPlayer?.chips ?? 0) > 0 && availableTotalBet >= minRaiseAmount
    }
    var canHumanAllIn: Bool { (humanPlayer?.chips ?? 0) > 0 }

    init(
        initialChips: Int,
        restoredGameState: GameState? = nil,
        restoredResumeMode: GameArchive.ResumeMode = .currentHand,
        onGameEnd: @escaping (Int) -> Void,
        patternRepository: IAIPatternRepository = AIPatternRepository(),
        recordRepository: IGameRecordRepository = GameRecordRepository(),
        archiveManager: IGameArchiveManager = GameArchiveManager()
    ) {
        self.initialChips = initialChips
        self.onGameEnd = onGameEnd
        self.patternRepository = patternRepository
        self.recordRepository = recordRepository
        self.archiveManager = archiveManager

        if let restored = restoredGameState {
            self.gameState = restored
            self.viewState = .idle
            self._isRestoredFromArchive = true
            self.restoredResumeMode = restoredResumeMode
        }
    }

    /// 是否从存档恢复（仅在 init 时设置，区分"继续游戏"和"下一局"）
    private var _isRestoredFromArchive: Bool = false

    var isRestoredGame: Bool {
        _isRestoredFromArchive
    }

    @MainActor
    func startGame() async {
        viewState = .dealing

        if isRestoredGame {
            await pokerEngine.restoreState(gameState)
            if restoredResumeMode == .nextHand {
                await pokerEngine.startNewHand(advanceTable: true)
            }
            gameState = await pokerEngine.getState()
            _isRestoredFromArchive = false
            restoredResumeMode = .currentHand
        } else if gameState.players.isEmpty {
            await pokerEngine.setupGame(humanChips: initialChips)
            await pokerEngine.startNewHand()
            gameState = await pokerEngine.getState()
        } else {
            await pokerEngine.restoreState(gameState)
            await pokerEngine.startNewHand(advanceTable: true)
            gameState = await pokerEngine.getState()
        }

        updateBettingInfo()
        viewState = .waitingForAction
        triggerNewHand = false
        syncArchiveForInProgressGame()

        await proceedToNextActor()
    }

    @MainActor
    func proceedToNextActor() async {
        guard let nextPlayerId = await pokerEngine.getNextActor() else {
            await handleRoundEnd()
            return
        }

        currentActor = gameState.players.first { $0.id == nextPlayerId }

        if nextPlayerId == 0 {
            viewState = .playerActing
        } else {
            await handleAITurn(playerId: nextPlayerId)
            await proceedToNextActor()
        }
    }

    @MainActor
    private func handleAITurn(playerId: Int) async {
        viewState = .aiThinking
        thinkingPlayerId = playerId

        let delay = await aiEngine.getThinkingDelay()
        try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))

        let aiInfo = AIAvatars.getAvatar(for: playerId)
        let patterns = try? await patternRepository.getPattern(for: playerId)

        let action = await aiEngine.requestDecision(
            playerId: playerId,
            gameState: gameState,
            style: aiInfo.style,
            patterns: patterns
        )

        thinkingPlayerId = nil
        gameState = await pokerEngine.processAction(playerId: playerId, action: action)
        updateBettingInfo()
        syncArchiveForInProgressGame()
    }

    @MainActor
    func humanFold() async {
        let action = Action(playerId: 0, street: gameState.currentStreet, type: .fold)
        gameState = await pokerEngine.processAction(playerId: 0, action: action)

        if gameState.activePlayers.count == 1 {
            await handleEarlyWin()
        } else {
            updateBettingInfo()
            syncArchiveForInProgressGame()
            await proceedToNextActor()
        }
    }

    @MainActor
    func humanCall() async {
        let actionType: ActionType = callAmount == 0 ? .check : .call
        let action = Action(playerId: 0, street: gameState.currentStreet, type: actionType, amount: callAmount)
        gameState = await pokerEngine.processAction(playerId: 0, action: action)
        updateBettingInfo()
        syncArchiveForInProgressGame()
        await proceedToNextActor()
    }

    @MainActor
    func humanRaise(amount: Int) async {
        let actionType: ActionType = gameState.currentBet == 0 ? .bet : .raise
        let action = Action(playerId: 0, street: gameState.currentStreet, type: actionType, amount: amount)
        gameState = await pokerEngine.processAction(playerId: 0, action: action)
        updateBettingInfo()
        syncArchiveForInProgressGame()
        await proceedToNextActor()
    }

    @MainActor
    func humanAllIn() async {
        guard let player = humanPlayer else { return }
        let action = Action(playerId: 0, street: gameState.currentStreet, type: .allIn, amount: player.chips)
        gameState = await pokerEngine.processAction(playerId: 0, action: action)
        updateBettingInfo()
        syncArchiveForInProgressGame()
        await proceedToNextActor()
    }

    @MainActor
    private func handleRoundEnd() async {
        let isComplete = await pokerEngine.isRoundComplete()

        if !isComplete {
            if let nextPlayerId = await pokerEngine.getNextActor() {
                currentActor = gameState.players.first { $0.id == nextPlayerId }

                if nextPlayerId == 0 {
                    viewState = .playerActing
                } else {
                    await handleAITurn(playerId: nextPlayerId)
                    await handleRoundEnd()
                }
            }
            return
        }

        if gameState.activePlayers.count <= 1 {
            await handleEarlyWin()
        } else if gameState.currentStreet == .river {
            await handleShowdown()
        } else {
            await pokerEngine.dealCommunityCards()
            gameState = await pokerEngine.getState()
            updateBettingInfo()
            syncArchiveForInProgressGame()
            await proceedToNextActor()
        }
    }

    @MainActor
    private func handleEarlyWin() async {
        let settlement = await pokerEngine.settleUncontestedHand()
        await finalizeHand(with: settlement, showdown: false)
    }

    @MainActor
    private func handleShowdown() async {
        let settlement = await pokerEngine.settleShowdown()
        await finalizeHand(with: settlement, showdown: true)
    }

    @MainActor
    private func finalizeHand(with settlement: HandSettlement, showdown: Bool) async {
        gameState = await pokerEngine.getState()
        updateBettingInfo()
        thinkingPlayerId = nil
        currentActor = nil
        showActionLog = false

        lastWinningPlayerIds = settlement.winningPlayerIds
        if settlement.winningPlayerIds.count == 1, let winnerId = settlement.winningPlayerIds.first {
            lastWinner = gameState.players.first { $0.id == winnerId }
        } else {
            lastWinner = nil
        }
        lastProfit = settlement.profit(for: 0, contributions: gameState.handBets)

        await updatePatternsAfterHand()
        await saveHandRecord(settlement: settlement, showdown: showdown)

        onGameEnd(lastProfit)
        saveGame(resumeMode: .nextHand)

        showRoundEndModal = true
        viewState = .roundEnd
    }

    private func updateBettingInfo() {
        callAmount = PotCalculator.calculateCallAmount(
            playerId: 0,
            playerBets: gameState.playerBets,
            currentBet: gameState.currentBet
        )

        minRaiseAmount = PotCalculator.calculateMinRaise(
            playerId: 0,
            playerBets: gameState.playerBets,
            currentBet: gameState.currentBet,
            minimumRaiseIncrement: gameState.minimumRaiseIncrement
        )
    }

    /// 每局结束后，根据本局动作日志更新所有AI的玩家画像（学习数据）
    private func updatePatternsAfterHand() async {
        for player in gameState.players {
            guard player.id != 0 else { continue }

            var pattern = (try? await patternRepository.getPattern(for: player.id)) ?? AIPattern()
            let playerActions = gameState.actionLog.filter { $0.playerId == player.id }
            pattern.updateAfterHand(playerId: player.id, playerActions: playerActions, allActions: gameState.actionLog)
            try? await patternRepository.savePattern(pattern, for: player.id)
        }
    }

    private func saveHandRecord(settlement: HandSettlement, showdown: Bool) async {
        let playerHoleCards = humanPlayer?.holeCards
        let humanWon = settlement.winningPlayerIds.contains(0)
        let isSplitPot = settlement.winningPlayerIds.count > 1 && humanWon
        let result: HandRecord.Result
        let revealedHands = showdown
            ? gameState.players
                .compactMap { player -> RevealedPlayerHand? in
                    guard !player.isFolded, let holeCards = player.holeCards else {
                        return nil
                    }

                    return RevealedPlayerHand(
                        playerId: player.id,
                        name: player.name,
                        avatar: player.avatar,
                        holeCards: holeCards,
                        handType: settlement.handsByPlayer[player.id]?.handType,
                        isWinner: settlement.winningPlayerIds.contains(player.id)
                    )
                }
                .sorted { lhs, rhs in
                    if lhs.isWinner != rhs.isWinner {
                        return lhs.isWinner && !rhs.isWinner
                    }
                    return lhs.playerId < rhs.playerId
                }
            : []

        if isSplitPot {
            result = .tie
        } else if lastProfit > 0 {
            result = .win
        } else if lastProfit < 0 {
            result = .lose
        } else {
            result = humanWon ? .tie : .lose
        }

        let record = HandRecord(
            id: Int(Date().timeIntervalSince1970 * 1000),
            result: result,
            profit: lastProfit,
            communityCards: gameState.communityCards,
            pot: settlement.totalPot,
            playerHoleCards: playerHoleCards,
            playerHandType: settlement.handsByPlayer[0]?.handType,
            actions: gameState.actionLog,
            winnerId: settlement.winningPlayerIds.count == 1 ? settlement.winningPlayerIds.first : nil,
            showdown: showdown,
            revealedHands: revealedHands
        )

        try? await recordRepository.saveHandRecord(record)
    }

    func syncArchiveForInProgressGame() {
        guard !gameState.players.isEmpty else {
            clearSavedGame()
            return
        }

        if showRoundEndModal || viewState == .roundEnd {
            saveGame(resumeMode: .nextHand)
        } else {
            saveGame(resumeMode: .currentHand)
        }
    }

    func prepareForExitFromToolbar() {
        if showRoundEndModal || viewState == .roundEnd {
            saveGame(resumeMode: .nextHand)
        } else {
            saveGame(resumeMode: .currentHand)
        }
    }

    func saveGame(resumeMode: GameArchive.ResumeMode = .currentHand) {
        guard !gameState.players.isEmpty else {
            clearSavedGame()
            return
        }

        let archive = GameArchive(
            gameState: gameState,
            savedAt: Date(),
            version: GameArchive.currentVersion,
            resumeMode: resumeMode
        )
        try? archiveManager.saveArchive(archive)
    }

    func clearSavedGame() {
        archiveManager.clearArchive()
    }
}
