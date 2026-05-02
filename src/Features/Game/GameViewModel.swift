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
    let pokerEngine = PokerEngine()
    let aiEngine = AIEngine()
    let patternRepository: IAIPatternRepository
    let recordRepository: IGameRecordRepository
    let archiveManager: IGameArchiveManager
    let analytics: IAnalyticsService

    var gameState: GameState = GameState()
    var viewState: GameViewState = .idle
    var thinkingPlayerId: Int?
    var currentActor: Player?
    var callAmount: Int = 0
    var minRaiseAmount: Int = 0
    var selectedQuickBet: Int?

    var showActionLog: Bool = false
    var showRoundEndModal: Bool = false
    /// 点击"下一局"后设置为true，GameView用.onChange监听它来启动新手牌
    var triggerNewHand: Bool = false
    var lastWinner: Player?
    var lastWinningPlayerIds: [Int] = []
    var lastIsSplitPot: Bool = false
    var lastProfit: Int = 0
    var lastPayouts: [Int: Int] = [:]
    var remainingDeckSnapshot: [Card] = []

    let initialChips: Int
    let onGameEnd: (Int) -> Void
    var restoredResumeMode: GameArchive.ResumeMode = .currentHand
    var restoredRemainingDeck: [Card]?

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
        players.first { $0.id == Player.humanPlayerId }
    }

    private var humanCurrentBet: Int {
        gameState.playerBets[Player.humanPlayerId] ?? 0
    }

    var payableCallAmount: Int {
        min(callAmount, max(0, humanPlayer?.chips ?? 0))
    }

    var canHumanFold: Bool { true }
    var canHumanCall: Bool { callAmount > 0 && payableCallAmount > 0 }
    var canHumanRaise: Bool {
        let availableTotalBet = (humanPlayer?.chips ?? 0) + humanCurrentBet
        return (humanPlayer?.chips ?? 0) > 0 && availableTotalBet >= minRaiseAmount
    }
    var canHumanAllIn: Bool { (humanPlayer?.chips ?? 0) > 0 }

    init(
        initialChips: Int,
        restoredGameState: GameState? = nil,
        restoredRemainingDeck: [Card]? = nil,
        restoredResumeMode: GameArchive.ResumeMode = .currentHand,
        onGameEnd: @escaping (Int) -> Void,
        patternRepository: IAIPatternRepository = AIPatternRepository(),
        recordRepository: IGameRecordRepository = GameRecordRepository(),
        archiveManager: IGameArchiveManager = GameArchiveManager(),
        analytics: IAnalyticsService = AnalyticsService.shared
    ) {
        self.initialChips = initialChips
        self.onGameEnd = onGameEnd
        self.patternRepository = patternRepository
        self.recordRepository = recordRepository
        self.archiveManager = archiveManager
        self.analytics = analytics

        if let restored = restoredGameState {
            self.gameState = restored
            self.viewState = .idle
            self._isRestoredFromArchive = true
            self.restoredRemainingDeck = restoredRemainingDeck
            self.restoredResumeMode = restoredResumeMode
        }
    }

    /// 是否从存档恢复（仅在 init 时设置，区分"继续游戏"和"下一局"）
    var _isRestoredFromArchive: Bool = false

    var isRestoredGame: Bool {
        _isRestoredFromArchive
    }
}
