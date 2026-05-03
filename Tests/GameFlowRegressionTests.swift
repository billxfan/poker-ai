import XCTest
@testable import PokerAI

final class GameFlowRegressionTests: XCTestCase {

    private var validTableState: GameState {
        GameState(
            players: [
                Player.createHuman(position: .bb, chips: 2000),
                Player.createAI(id: 1, name: "老K", avatar: "👴", position: .sb, chips: 2000)
            ],
            handNumber: 2
        )
    }

    func testToolbarExitSavesArchiveDuringActiveHand() {
        let archiveManager = MockArchiveManager()
        let viewModel = GameViewModel(
            initialChips: 2000,
            restoredGameState: validTableState,
            onGameEnd: { _ in },
            patternRepository: MockPatternRepository(),
            recordRepository: MockRecordRepository(),
            archiveManager: archiveManager
        )

        viewModel.prepareForExitFromToolbar()

        XCTAssertEqual(archiveManager.saveCount, 1)
        XCTAssertEqual(archiveManager.clearCount, 0)
        XCTAssertEqual(archiveManager.lastSavedArchive?.resumeMode, .currentHand)
    }

    func testToolbarExitSavesNextHandArchiveDuringRoundEnd() {
        let archiveManager = MockArchiveManager()
        let viewModel = GameViewModel(
            initialChips: 2000,
            restoredGameState: validTableState,
            onGameEnd: { _ in },
            patternRepository: MockPatternRepository(),
            recordRepository: MockRecordRepository(),
            archiveManager: archiveManager
        )

        viewModel.showRoundEndModal = true

        viewModel.prepareForExitFromToolbar()

        XCTAssertEqual(archiveManager.saveCount, 1)
        XCTAssertEqual(archiveManager.clearCount, 0)
        XCTAssertEqual(archiveManager.lastSavedArchive?.resumeMode, .nextHand)
    }

    func testToolbarExitClearsArchiveWhenHumanIsOutAtRoundEnd() {
        let archiveManager = MockArchiveManager()
        var bustedState = validTableState
        bustedState.players[0].chips = 0
        bustedState.players[0].status = .out

        let viewModel = GameViewModel(
            initialChips: 2000,
            restoredGameState: bustedState,
            onGameEnd: { _ in },
            patternRepository: MockPatternRepository(),
            recordRepository: MockRecordRepository(),
            archiveManager: archiveManager
        )

        viewModel.showRoundEndModal = true

        viewModel.prepareForExitFromToolbar()

        XCTAssertEqual(archiveManager.saveCount, 0)
        XCTAssertEqual(archiveManager.clearCount, 1)
        XCTAssertNil(archiveManager.lastSavedArchive)
    }

    func testSaveGameWithoutPlayersClearsBrokenArchive() {
        let archiveManager = MockArchiveManager()
        let viewModel = GameViewModel(
            initialChips: 2000,
            onGameEnd: { _ in },
            patternRepository: MockPatternRepository(),
            recordRepository: MockRecordRepository(),
            archiveManager: archiveManager
        )

        viewModel.saveGame()

        XCTAssertEqual(archiveManager.saveCount, 0)
        XCTAssertEqual(archiveManager.clearCount, 1)
    }

    func testSaveGamePersistsRemainingDeckSnapshot() {
        let archiveManager = MockArchiveManager()
        let viewModel = GameViewModel(
            initialChips: 2000,
            restoredGameState: validTableState,
            onGameEnd: { _ in },
            patternRepository: MockPatternRepository(),
            recordRepository: MockRecordRepository(),
            archiveManager: archiveManager
        )

        let remainingDeck = [
            Card(suit: .spades, rank: 14),
            Card(suit: .clubs, rank: 9),
            Card(suit: .diamonds, rank: 4)
        ]
        viewModel.remainingDeckSnapshot = remainingDeck

        viewModel.saveGame()

        XCTAssertEqual(archiveManager.lastSavedArchive?.remainingDeck, remainingDeck)
    }

    func testShortStackCanUseRemainingChipsToCall() {
        let archiveManager = MockArchiveManager()
        var shortStackState = validTableState
        shortStackState.players[0].chips = 10
        shortStackState.playerBets = [0: 0, 1: 40]
        shortStackState.currentBet = 40

        let viewModel = GameViewModel(
            initialChips: 2000,
            restoredGameState: shortStackState,
            onGameEnd: { _ in },
            patternRepository: MockPatternRepository(),
            recordRepository: MockRecordRepository(),
            archiveManager: archiveManager
        )

        viewModel.updateBettingInfo()

        XCTAssertEqual(viewModel.callAmount, 40)
        XCTAssertEqual(viewModel.payableCallAmount, 10)
        XCTAssertTrue(viewModel.canHumanCall)
    }

    func testAggressiveWinFeedsResultDrivenLearning() {
        var pattern = AIPattern()
        let players = [
            Player.createAI(id: 1, name: "小马", avatar: "🧑", position: .mp, chips: 2000),
            Player.createHuman(position: .bb, chips: 2000)
        ]

        let actions = [
            Action(playerId: 1, street: .preFlop, type: .raise, amount: 60),
            Action(playerId: 1, street: .flop, type: .bet, amount: 120)
        ]

        pattern.updateAfterHand(
            playerId: 1,
            style: .looseAggressive,
            playerActions: actions,
            allActions: actions,
            players: players,
            profit: 180,
            didWin: true,
            showdown: false,
            shownHandType: nil,
            winningPlayerIds: [1],
            shownHandTypes: [:],
            potSize: 300
        )

        XCTAssertEqual(pattern.handsPlayed, 1)
        XCTAssertEqual(pattern.totalProfit, 180)
        XCTAssertEqual(pattern.nonShowdownWins, 1)
        XCTAssertEqual(pattern.aggressiveWins, 1)
        XCTAssertEqual(pattern.bluffSuccessCount, 1)
        XCTAssertGreaterThan(pattern.learnedAggressionBias, 0)
        XCTAssertGreaterThan(pattern.learnedBluffBias, 0)
        XCTAssertLessThan(pattern.learnedTightnessBias, 0)
        XCTAssertEqual(pattern.learningSnapshots.count, 1)
        XCTAssertEqual(pattern.learningSnapshots.last?.handIndex, 1)
    }

    func testLosingThinShowdownTightensRange() {
        var pattern = AIPattern()
        let players = [
            Player.createAI(id: 3, name: "大叔", avatar: "🧔", position: .co, chips: 2000),
            Player.createHuman(position: .bb, chips: 2000)
        ]
        let actions = [
            Action(playerId: 3, street: .preFlop, type: .call, amount: 20),
            Action(playerId: 3, street: .flop, type: .call, amount: 40)
        ]

        pattern.updateAfterHand(
            playerId: 3,
            style: .tightWeak,
            playerActions: actions,
            allActions: actions,
            players: players,
            profit: -120,
            didWin: false,
            showdown: true,
            shownHandType: .onePair,
            winningPlayerIds: [0],
            shownHandTypes: [3: .onePair, 0: .twoPair],
            potSize: 220
        )

        XCTAssertEqual(pattern.showdownLosses, 1)
        XCTAssertGreaterThan(pattern.learnedTightnessBias, 0)
        XCTAssertEqual(pattern.learnedAggressionBias, 0, accuracy: 0.0001)
    }

    func testLearningBiasAffectsEveryStyleTuning() {
        var learnedPattern = AIPattern()
        learnedPattern.handsPlayed = 200
        learnedPattern.learnedAggressionBias = 0.7
        learnedPattern.learnedTightnessBias = -0.4
        learnedPattern.learnedBluffBias = 0.5

        for style in AIStyle.allCases {
            let baseline = AIPattern().decisionTuning(for: style)
            let adapted = learnedPattern.decisionTuning(for: style)

            let changed = abs(baseline.aggressiveThreshold - adapted.aggressiveThreshold) > 0.0001
                || abs(baseline.passiveThreshold - adapted.passiveThreshold) > 0.0001
                || abs(baseline.aggressionChance - adapted.aggressionChance) > 0.0001
                || abs(baseline.continueChance - adapted.continueChance) > 0.0001
                || abs(baseline.bluffThreshold - adapted.bluffThreshold) > 0.0001
                || abs(baseline.bluffChance - adapted.bluffChance) > 0.0001

            XCTAssertTrue(changed, "\(style.displayName) 应该响应学习偏移")
        }
    }

    func testExplorationRateDecaysButRespectsFloor() {
        var pattern = AIPattern()
        pattern.handsPlayed = 240

        let lagProfile = AIStyle.looseAggressive.learningProfile
        let lagEpsilon = pattern.explorationRate(for: .looseAggressive)

        XCTAssertLessThan(lagEpsilon, lagProfile.initialEpsilon)
        XCTAssertGreaterThanOrEqual(lagEpsilon, lagProfile.minimumEpsilon)
    }

    func testObservedHumanProfileCapturesFoldAndBluffTendencies() {
        var pattern = AIPattern()
        let players = [
            Player.createAI(id: 5, name: "狐狸", avatar: "🦊", position: .btn, chips: 2000),
            Player.createHuman(position: .bb, chips: 2000)
        ]
        let actions = [
            Action(playerId: 0, street: .preFlop, type: .call, amount: 20),
            Action(playerId: 5, street: .preFlop, type: .raise, amount: 80),
            Action(playerId: 0, street: .preFlop, type: .fold)
        ]

        pattern.updateAfterHand(
            playerId: 5,
            style: .balanced,
            playerActions: [actions[1]],
            allActions: actions,
            players: players,
            profit: 40,
            didWin: true,
            showdown: false,
            shownHandType: nil,
            winningPlayerIds: [5],
            shownHandTypes: [:],
            potSize: 60
        )

        guard let humanProfile = pattern.observedProfile(for: 0) else {
            XCTFail("应该生成对人类玩家的画像")
            return
        }
        XCTAssertEqual(humanProfile.handsObserved, 1)
        XCTAssertEqual(humanProfile.vpipCount, 1)
        XCTAssertEqual(humanProfile.foldFacingAggressionCount, 1)
        XCTAssertEqual(humanProfile.pressureOpportunities, 1)
        XCTAssertEqual(humanProfile.foldToAggressionRate, 1.0, accuracy: 0.0001)
    }

    func testAIStylesObserveHumanThroughDifferentLenses() {
        let players = [
            Player.createAI(id: 3, name: "大叔", avatar: "🧔", position: .co, chips: 2000),
            Player.createAI(id: 4, name: "小鱼", avatar: "👧", position: .btn, chips: 2000),
            Player.createHuman(position: .bb, chips: 2000)
        ]
        let actions = [
            Action(playerId: 0, street: .preFlop, type: .call, amount: 20),
            Action(playerId: 3, street: .preFlop, type: .fold),
            Action(playerId: 4, street: .preFlop, type: .call, amount: 20)
        ]

        var tightWeakPattern = AIPattern()
        tightWeakPattern.updateAfterHand(
            playerId: 3,
            style: .tightWeak,
            playerActions: [actions[1]],
            allActions: actions,
            players: players,
            profit: -10,
            didWin: false,
            showdown: false,
            shownHandType: nil,
            winningPlayerIds: [0],
            shownHandTypes: [:],
            potSize: 60
        )

        var looseWeakPattern = AIPattern()
        looseWeakPattern.updateAfterHand(
            playerId: 4,
            style: .looseWeak,
            playerActions: [actions[2]],
            allActions: actions,
            players: players,
            profit: -20,
            didWin: false,
            showdown: false,
            shownHandType: nil,
            winningPlayerIds: [0],
            shownHandTypes: [:],
            potSize: 60
        )

        XCTAssertNil(tightWeakPattern.observedProfile(for: 0))
        XCTAssertEqual(looseWeakPattern.observedProfile(for: 0)?.vpipCount, 1)
    }

    func testQuickBetTargetsUsePotAfterCallAndTotalStreetBet() {
        let target = QuickBetCalculator.targetAmount(
            potSize: 200,
            callAmount: 40,
            currentRoundBet: 40,
            playerChips: 34_408,
            minimumAmount: 100,
            potMultiplier: 1.0 / 3.0
        )

        XCTAssertEqual(target, 160)
    }

    func testQuickBetTargetsRespectMinimumRaiseAndAllInCap() {
        let minimumCappedTarget = QuickBetCalculator.targetAmount(
            potSize: 20,
            callAmount: 0,
            currentRoundBet: 0,
            playerChips: 1_000,
            minimumAmount: 40,
            potMultiplier: 1.0 / 3.0
        )
        let allInCappedTarget = QuickBetCalculator.targetAmount(
            potSize: 200,
            callAmount: 40,
            currentRoundBet: 40,
            playerChips: 90,
            minimumAmount: 160,
            potMultiplier: 1.0
        )

        XCTAssertEqual(minimumCappedTarget, 40)
        XCTAssertEqual(allInCappedTarget, 130)
    }

    func testOpponentProfileCanShiftTowardMoreBluffingAgainstFoldyHuman() {
        var pattern = AIPattern()
        let foldyHuman = AIOpponentProfile(
            handsObserved: 30,
            vpipCount: 8,
            pfrCount: 2,
            aggressiveActionCount: 4,
            totalActionCount: 30,
            pressureOpportunities: 20,
            foldFacingAggressionCount: 15,
            continueFacingAggressionCount: 2,
            showdownCount: 2,
            showdownWins: 1,
            bluffLikeAttempts: 3,
            bluffLikeSuccesses: 1,
            lastShownHandType: nil,
            lastUpdated: Date()
        )
        pattern.observedOpponents[0] = foldyHuman

        let base = pattern.decisionTuning(for: .balanced)
        let adjusted = pattern.decisionTuning(
            for: .balanced,
            against: [Player.createHuman(position: .bb, chips: 2000)],
            actionLog: [],
            street: .flop,
            selfPlayerId: 5
        )

        XCTAssertGreaterThan(adjusted.bluffChance, base.bluffChance)
        XCTAssertLessThan(adjusted.bluffThreshold, base.bluffThreshold)
    }

    func testLatePositionStealSpotIncreasesPreFlopAggression() {
        let base = AIPattern().decisionTuning(for: .tightAggressive)
        let adjusted = AIPattern().decisionTuning(
            for: .tightAggressive,
            against: [
                Player.createHuman(position: .bb, chips: 2000),
                Player.createAI(id: 7, name: "小鱼", avatar: "👧", position: .sb, chips: 2000)
            ],
            actionLog: [],
            street: .preFlop,
            selfPlayerId: 1,
            communityCards: [],
            playerPosition: .btn
        )

        XCTAssertLessThan(adjusted.aggressiveThreshold, base.aggressiveThreshold)
        XCTAssertGreaterThan(adjusted.aggressionChance, base.aggressionChance)
    }

    func testDryHeadsUpContinuationBetGetsMoreBluffPressure() {
        let base = AIPattern().decisionTuning(for: .balanced)
        let actionLog = [
            Action(playerId: 5, street: .preFlop, type: .raise, amount: 70),
            Action(playerId: 0, street: .preFlop, type: .call, amount: 70)
        ]
        let dryBoard = [
            Card(suit: .spades, rank: 14),
            Card(suit: .hearts, rank: 7),
            Card(suit: .clubs, rank: 2)
        ]

        let adjusted = AIPattern().decisionTuning(
            for: .balanced,
            against: [Player.createHuman(position: .bb, chips: 2000)],
            actionLog: actionLog,
            street: .flop,
            selfPlayerId: 5,
            communityCards: dryBoard,
            playerPosition: .btn
        )

        XCTAssertLessThan(adjusted.aggressiveThreshold, base.aggressiveThreshold)
        XCTAssertGreaterThan(adjusted.aggressionChance, base.aggressionChance)
        XCTAssertGreaterThan(adjusted.bluffChance, base.bluffChance)
    }

    func testWetMultiwayBoardReducesAutoContinuationBluff() {
        let actionLog = [
            Action(playerId: 5, street: .preFlop, type: .raise, amount: 70),
            Action(playerId: 0, street: .preFlop, type: .call, amount: 70),
            Action(playerId: 3, street: .preFlop, type: .call, amount: 70)
        ]

        let dryBoard = [
            Card(suit: .spades, rank: 14),
            Card(suit: .hearts, rank: 7),
            Card(suit: .clubs, rank: 2)
        ]
        let wetBoard = [
            Card(suit: .hearts, rank: 11),
            Card(suit: .hearts, rank: 10),
            Card(suit: .clubs, rank: 9)
        ]

        let dryAdjusted = AIPattern().decisionTuning(
            for: .balanced,
            against: [Player.createHuman(position: .bb, chips: 2000)],
            actionLog: Array(actionLog.prefix(2)),
            street: .flop,
            selfPlayerId: 5,
            communityCards: dryBoard,
            playerPosition: .btn
        )

        let wetAdjusted = AIPattern().decisionTuning(
            for: .balanced,
            against: [
                Player.createHuman(position: .bb, chips: 2000),
                Player.createAI(id: 3, name: "大叔", avatar: "🧔", position: .co, chips: 2000)
            ],
            actionLog: actionLog,
            street: .flop,
            selfPlayerId: 5,
            communityCards: wetBoard,
            playerPosition: .btn
        )

        XCTAssertLessThan(wetAdjusted.bluffChance, dryAdjusted.bluffChance)
        XCTAssertGreaterThan(wetAdjusted.bluffThreshold, dryAdjusted.bluffThreshold)
    }

    func testTurnScareCardEncouragesSecondBarrel() {
        let base = AIPattern().decisionTuning(for: .looseAggressive)
        let actionLog = [
            Action(playerId: 2, street: .preFlop, type: .raise, amount: 70),
            Action(playerId: 0, street: .preFlop, type: .call, amount: 70),
            Action(playerId: 2, street: .flop, type: .bet, amount: 90),
            Action(playerId: 0, street: .flop, type: .call, amount: 90)
        ]
        let turnBoard = [
            Card(suit: .spades, rank: 14),
            Card(suit: .hearts, rank: 7),
            Card(suit: .clubs, rank: 2),
            Card(suit: .diamonds, rank: 13)
        ]

        let adjusted = AIPattern().decisionTuning(
            for: .looseAggressive,
            against: [Player.createHuman(position: .bb, chips: 2000)],
            actionLog: actionLog,
            street: .turn,
            selfPlayerId: 2,
            communityCards: turnBoard,
            playerPosition: .btn
        )

        XCTAssertGreaterThan(adjusted.aggressionChance, base.aggressionChance)
        XCTAssertGreaterThan(adjusted.bluffChance, base.bluffChance)
    }

    func testLearningSnapshotsCaptureHumanTrendSignals() {
        var pattern = AIPattern()
        let players = [
            Player.createAI(id: 2, name: "小马", avatar: "🧑", position: .co, chips: 2000),
            Player.createHuman(position: .bb, chips: 2000)
        ]
        let actions = [
            Action(playerId: 0, street: .preFlop, type: .call, amount: 20),
            Action(playerId: 2, street: .preFlop, type: .raise, amount: 70),
            Action(playerId: 0, street: .preFlop, type: .call, amount: 50)
        ]

        pattern.updateAfterHand(
            playerId: 2,
            style: .looseAggressive,
            playerActions: [actions[1]],
            allActions: actions,
            players: players,
            profit: 30,
            didWin: true,
            showdown: false,
            shownHandType: nil,
            winningPlayerIds: [2],
            shownHandTypes: [:],
            potSize: 90
        )

        guard let snapshot = pattern.learningSnapshots.last else {
            XCTFail("应该生成学习快照")
            return
        }

        XCTAssertEqual(snapshot.handIndex, 1)
        XCTAssertEqual(snapshot.totalProfit, 30)
        XCTAssertEqual(snapshot.observedHumanVPIP ?? -1, 1.0, accuracy: 0.0001)
        XCTAssertEqual(snapshot.observedHumanFoldToAggression ?? -1, 0.0, accuracy: 0.0001)
    }

    func testStartNewGameStillClearsTrainingStateWhenChipsBelowDefaultStack() {
        let suiteName = "MainViewModelLowChipRestart-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defaults.removePersistentDomain(forName: suiteName)
        defaults.set(910, forKey: "poker_ai_chips")
        defaults.set(true, forKey: "poker_ai_daily_free")

        let archiveManager = MockArchiveManager(hasArchive: true)
        let databaseManager = DatabaseManager.shared
        let handRecordsURL = databaseManager.getHandRecordsURL()
        let aiPatternsURL = databaseManager.getAIPatternsURL()

        try? Data("records".utf8).write(to: handRecordsURL)
        try? Data("patterns".utf8).write(to: aiPatternsURL)

        let viewModel = MainViewModel(
            chipStorage: ChipStorage(userDefaults: defaults),
            welfareStorage: WelfareStorage(userDefaults: defaults),
            archiveManager: archiveManager,
            databaseManager: databaseManager
        )

        viewModel.startNewGame()

        XCTAssertEqual(archiveManager.clearCount, 1)
        XCTAssertFalse(viewModel.hasArchive)
        XCTAssertFalse(FileManager.default.fileExists(atPath: handRecordsURL.path))
        XCTAssertFalse(FileManager.default.fileExists(atPath: aiPatternsURL.path))

        defaults.removePersistentDomain(forName: suiteName)
    }

    func testLoadStateClearsContinueArchiveWhenHumanAlreadyOut() {
        let suiteName = "MainViewModelBustedArchive-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defaults.removePersistentDomain(forName: suiteName)

        var bustedState = validTableState
        bustedState.players[0].chips = 0
        bustedState.players[0].status = .out

        let archiveManager = MockArchiveManager(
            storedArchive: GameArchive(
                gameState: bustedState,
                savedAt: Date(),
                version: GameArchive.currentVersion,
                resumeMode: .nextHand
            )
        )

        let viewModel = MainViewModel(
            chipStorage: ChipStorage(userDefaults: defaults),
            welfareStorage: WelfareStorage(userDefaults: defaults),
            archiveManager: archiveManager,
            databaseManager: .shared
        )

        XCTAssertFalse(viewModel.hasArchive)
        XCTAssertEqual(archiveManager.clearCount, 1)
        XCTAssertNil(viewModel.continueGame())

        defaults.removePersistentDomain(forName: suiteName)
    }
}

private final class MockArchiveManager: IGameArchiveManager {
    var saveCount = 0
    var clearCount = 0
    var lastSavedArchive: GameArchive?
    var storedArchive: GameArchive?
    var archiveExists: Bool

    init(
        storedArchive: GameArchive? = nil,
        hasArchive: Bool = false
    ) {
        self.storedArchive = storedArchive
        self.archiveExists = hasArchive || storedArchive != nil
    }

    func saveArchive(_ archive: GameArchive) throws {
        saveCount += 1
        lastSavedArchive = archive
        storedArchive = archive
        archiveExists = true
    }

    func loadArchive() -> GameArchive? {
        storedArchive
    }

    func hasArchive() -> Bool {
        archiveExists
    }

    func clearArchive() {
        clearCount += 1
        storedArchive = nil
        archiveExists = false
    }
}

private final class MockPatternRepository: IAIPatternRepository {
    func getPattern(for playerId: Int) async throws -> AIPattern? {
        nil
    }

    func savePattern(_ pattern: AIPattern, for playerId: Int) async throws { }

    func getAllPatterns() async throws -> [Int: AIPattern] { [:] }
}

private final class MockRecordRepository: IGameRecordRepository {
    func saveHandRecord(_ record: HandRecord) async throws { }
    func getRecentHands(limit: Int) async throws -> [HandRecord] { [] }
    func getAllRecords() async throws -> [HandRecord] { [] }
    func getStatistics() async throws -> GameStatistics {
        GameStatistics(
            totalHands: 0,
            winRate: 0,
            totalProfit: 0,
            averageProfit: 0,
            vpip: 0,
            pfr: 0,
            threeBetRate: 0,
            showdownWinRate: 0
        )
    }
}
