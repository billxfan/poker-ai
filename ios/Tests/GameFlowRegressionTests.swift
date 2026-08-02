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

    func testAIStylesAllRecordVisibleHumanSignals() {
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

        XCTAssertEqual(tightWeakPattern.observedProfile(for: 0)?.vpipCount, 1)
        XCTAssertEqual(looseWeakPattern.observedProfile(for: 0)?.vpipCount, 1)
    }

    func testTightWeakAIRecordsHumanAfterShowdownWin() {
        var pattern = AIPattern()
        let players = [
            Player.createAI(id: 3, name: "大叔", avatar: "🧔", position: .co, chips: 2000),
            Player.createHuman(position: .bb, chips: 2000)
        ]
        let actions = [
            Action(playerId: 0, street: .preFlop, type: .call, amount: 20),
            Action(playerId: 3, street: .preFlop, type: .call, amount: 20),
            Action(playerId: 0, street: .flop, type: .check, amount: 0),
            Action(playerId: 3, street: .flop, type: .check, amount: 0),
            Action(playerId: 0, street: .river, type: .bet, amount: 40),
            Action(playerId: 3, street: .river, type: .call, amount: 40)
        ]

        pattern.updateAfterHand(
            playerId: 3,
            style: .tightWeak,
            playerActions: actions.filter { $0.playerId == 3 },
            allActions: actions,
            players: players,
            profit: -60,
            didWin: false,
            showdown: true,
            shownHandType: .onePair,
            winningPlayerIds: [0],
            shownHandTypes: [0: .twoPair, 3: .onePair],
            potSize: 120
        )

        XCTAssertEqual(pattern.observedProfile(for: 0)?.handsObserved, 1)
        XCTAssertEqual(pattern.observedProfile(for: 0)?.vpipCount, 1)
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

    func testNewGameSeedsStartingChipsWhenStoredBankrollIsZero() {
        let suiteName = "MainViewModelSeedStartingChips-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defaults.removePersistentDomain(forName: suiteName)
        defaults.set(0, forKey: "poker_ai_chips")
        defaults.set(true, forKey: "poker_ai_daily_free")

        let chipStorage = ChipStorage(userDefaults: defaults)
        let welfareStorage = WelfareStorage(userDefaults: defaults)
        let viewModel = MainViewModel(
            chipStorage: chipStorage,
            welfareStorage: welfareStorage,
            archiveManager: MockArchiveManager(),
            databaseManager: .shared
        )

        let entryChips = viewModel.getChipsForNewGame()

        XCTAssertEqual(entryChips, GameConstants.startingChips)
        XCTAssertEqual(chipStorage.getChips(), GameConstants.startingChips)
        XCTAssertEqual(viewModel.chips, GameConstants.startingChips)

        defaults.removePersistentDomain(forName: suiteName)
    }

    func testChipStorageNeverPersistsNegativeBalance() {
        let suiteName = "ChipStorageNoNegative-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defaults.removePersistentDomain(forName: suiteName)

        let chipStorage = ChipStorage(userDefaults: defaults)
        chipStorage.setChips(100)
        chipStorage.addChips(-300)

        XCTAssertEqual(chipStorage.getChips(), 0)

        defaults.removePersistentDomain(forName: suiteName)
    }


    func testWelfareDailyFreeDoesNotCreditBeforeTenAM() {
        let suiteName = "WelfareBeforeTen-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defaults.removePersistentDomain(forName: suiteName)

        var components = DateComponents()
        components.year = 2026
        components.month = 5
        components.day = 4
        components.hour = 9
        components.minute = 30
        let calendar = Calendar(identifier: .gregorian)
        let now = calendar.date(from: components)!

        let storage = WelfareStorage(userDefaults: defaults, nowProvider: { now })

        XCTAssertEqual(storage.getChips(), 0)
        XCTAssertFalse(storage.hasClaimedDailyFree())

        defaults.removePersistentDomain(forName: suiteName)
    }

    func testWelfareDailyFreeCreditsOnceAfterTenAM() {
        let suiteName = "WelfareAfterTen-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defaults.removePersistentDomain(forName: suiteName)

        var components = DateComponents()
        components.year = 2026
        components.month = 5
        components.day = 4
        components.hour = 10
        components.minute = 1
        let calendar = Calendar(identifier: .gregorian)
        let now = calendar.date(from: components)!

        let storage = WelfareStorage(userDefaults: defaults, nowProvider: { now })

        XCTAssertEqual(storage.getChips(), GameConstants.dailyFreeChips)
        XCTAssertTrue(storage.hasClaimedDailyFree())

        storage.refreshBenefits()

        XCTAssertEqual(storage.getChips(), GameConstants.dailyFreeChips)

        defaults.removePersistentDomain(forName: suiteName)
    }

    func testRoundEndModalKeepsOpponentCardsHiddenWithoutShowdown() {
        var human = Player.createHuman(position: .bb, chips: 1_954)
        human.status = .folded
        human.holeCards = HoleCards(
            Card(suit: .hearts, rank: 5),
            Card(suit: .clubs, rank: 7)
        )

        var winner = Player.createAI(id: 1, name: "小马", avatar: "🧑", position: .sb, chips: 2_046)
        winner.holeCards = HoleCards(
            Card(suit: .hearts, rank: 6),
            Card(suit: .diamonds, rank: 13)
        )

        let modal = RoundEndModal(
            winner: winner,
            winningPlayerIds: [winner.id],
            isSplitPot: false,
            profit: -46,
            players: [human, winner],
            communityCards: [],
            payouts: [winner.id: 46],
            handBets: [human.id: 46],
            showdown: false,
            isGameOver: false,
            onNextHand: {},
            onReturnToMain: {}
        )

        XCTAssertTrue(modal.playersWithRevealedHands.isEmpty)
    }

    func testRoundEndModalRevealsEligibleCardsAtShowdown() {
        var human = Player.createHuman(position: .bb, chips: 2_100)
        human.holeCards = HoleCards(
            Card(suit: .spades, rank: 14),
            Card(suit: .clubs, rank: 14)
        )

        var foldedOpponent = Player.createAI(id: 1, name: "老K", avatar: "👴", position: .sb, chips: 1_980)
        foldedOpponent.status = .folded
        foldedOpponent.holeCards = HoleCards(
            Card(suit: .hearts, rank: 2),
            Card(suit: .diamonds, rank: 7)
        )

        var showdownOpponent = Player.createAI(id: 2, name: "小马", avatar: "🧑", position: .utg, chips: 1_920)
        showdownOpponent.holeCards = HoleCards(
            Card(suit: .hearts, rank: 13),
            Card(suit: .diamonds, rank: 13)
        )

        let modal = RoundEndModal(
            winner: human,
            winningPlayerIds: [human.id],
            isSplitPot: false,
            profit: 120,
            players: [human, foldedOpponent, showdownOpponent],
            communityCards: [],
            payouts: [human.id: 240],
            handBets: [human.id: 120, showdownOpponent.id: 120],
            showdown: true,
            isGameOver: false,
            onNextHand: {},
            onReturnToMain: {}
        )

        XCTAssertEqual(modal.playersWithRevealedHands.map(\.id), [human.id, showdownOpponent.id])
    }

    func testRoundEndModalMarksGameOverWhenHumanHasNoChips() {
        var human = Player.createHuman(position: .bb, chips: 0)
        human.status = .out

        let modal = RoundEndModal(
            winner: nil,
            winningPlayerIds: [1],
            isSplitPot: false,
            profit: -20_000,
            players: [human],
            communityCards: [],
            payouts: [:],
            handBets: [human.id: 20_000],
            showdown: true,
            isGameOver: true,
            onNextHand: {},
            onReturnToMain: {}
        )

        XCTAssertTrue(modal.isGameOver)
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

    func testContextLearningWeightsMatchingSpotMoreThanUnrelatedSpot() {
        var pattern = AIPattern()
        let players = [
            Player.createAI(id: 5, name: "狐狸", avatar: "🦊", position: .btn, chips: 2000),
            Player.createHuman(position: .bb, chips: 2000)
        ]
        let actions = [
            Action(playerId: 5, street: .flop, type: .bet, amount: 60)
        ]
        let learnedContext = AILearningContext(
            street: .flop,
            position: .btn,
            pressure: .unopened,
            strengthBucket: .weak,
            isHeadsUp: true
        )
        let matchingPoint = AILearningDecisionPoint(
            context: learnedContext,
            actionKind: .aggressive,
            handStrength: 0.22,
            committedAmount: 60,
            usedExploration: false,
            createdAt: Date()
        )

        pattern.updateAfterHand(
            playerId: 5,
            style: .balanced,
            playerActions: actions,
            allActions: actions,
            players: players,
            profit: 120,
            didWin: true,
            showdown: false,
            shownHandType: nil,
            winningPlayerIds: [5],
            shownHandTypes: [:],
            potSize: 180,
            decisionPoints: [matchingPoint]
        )

        let unrelatedContext = AILearningContext(
            street: .preFlop,
            position: .utg,
            pressure: .facingRaise,
            strengthBucket: .premium,
            isHeadsUp: false
        )

        let base = AIPattern().decisionTuning(
            for: .balanced,
            against: [Player.createHuman(position: .bb, chips: 2000)],
            actionLog: [],
            street: .flop,
            selfPlayerId: 5,
            communityCards: [],
            playerPosition: .btn,
            learningContext: learnedContext
        )
        let matching = pattern.decisionTuning(
            for: .balanced,
            against: [Player.createHuman(position: .bb, chips: 2000)],
            actionLog: [],
            street: .flop,
            selfPlayerId: 5,
            communityCards: [],
            playerPosition: .btn,
            learningContext: learnedContext
        )
        let unrelated = pattern.decisionTuning(
            for: .balanced,
            against: [Player.createHuman(position: .bb, chips: 2000)],
            actionLog: [],
            street: .preFlop,
            selfPlayerId: 5,
            communityCards: [],
            playerPosition: .utg,
            learningContext: unrelatedContext
        )

        XCTAssertGreaterThan(matching.bluffChance, base.bluffChance)
        XCTAssertLessThan(matching.bluffThreshold, base.bluffThreshold)
        XCTAssertGreaterThan(matching.bluffChance - unrelated.bluffChance, 0.005)
    }

    func testBigCommitmentMistakeLearnsMoreThanSmallCommitmentMistake() {
        let context = AILearningContext(
            street: .river,
            position: .btn,
            pressure: .facingRaise,
            strengthBucket: .marginal,
            isHeadsUp: true
        )

        let lowCommitPoint = AILearningDecisionPoint(
            context: context,
            actionKind: .aggressive,
            handStrength: 0.46,
            committedAmount: 40,
            usedExploration: false,
            createdAt: Date()
        )
        let highCommitPoint = AILearningDecisionPoint(
            context: context,
            actionKind: .aggressive,
            handStrength: 0.46,
            committedAmount: 220,
            usedExploration: false,
            createdAt: Date()
        )

        let players = [
            Player.createAI(id: 5, name: "狐狸", avatar: "🦊", position: .btn, chips: 2000),
            Player.createHuman(position: .bb, chips: 2000)
        ]

        var lowCommitPattern = AIPattern()
        lowCommitPattern.updateAfterHand(
            playerId: 5,
            style: .balanced,
            playerActions: [Action(playerId: 5, street: .river, type: .raise, amount: 40)],
            allActions: [Action(playerId: 5, street: .river, type: .raise, amount: 40)],
            players: players,
            profit: -90,
            didWin: false,
            showdown: true,
            shownHandType: .onePair,
            winningPlayerIds: [0],
            shownHandTypes: [5: .onePair, 0: .twoPair],
            potSize: 260,
            decisionPoints: [lowCommitPoint]
        )

        var highCommitPattern = AIPattern()
        highCommitPattern.updateAfterHand(
            playerId: 5,
            style: .balanced,
            playerActions: [Action(playerId: 5, street: .river, type: .raise, amount: 220)],
            allActions: [Action(playerId: 5, street: .river, type: .raise, amount: 220)],
            players: players,
            profit: -90,
            didWin: false,
            showdown: true,
            shownHandType: .onePair,
            winningPlayerIds: [0],
            shownHandTypes: [5: .onePair, 0: .twoPair],
            potSize: 260,
            decisionPoints: [highCommitPoint]
        )

        let lowScore = lowCommitPattern.contextPolicy(for: context)?.aggressiveScore ?? 0
        let highScore = highCommitPattern.contextPolicy(for: context)?.aggressiveScore ?? 0

        XCTAssertLessThan(highScore, lowScore)
    }

    func testStyleSpecificLearningWeightsCreateDifferentAggressionUpdates() {
        let context = AILearningContext(
            street: .flop,
            position: .co,
            pressure: .unopened,
            strengthBucket: .weak,
            isHeadsUp: true
        )
        let point = AILearningDecisionPoint(
            context: context,
            actionKind: .aggressive,
            handStrength: 0.24,
            committedAmount: 90,
            usedExploration: false,
            createdAt: Date()
        )
        let actions = [Action(playerId: 2, street: .flop, type: .bet, amount: 90)]
        let players = [
            Player.createAI(id: 2, name: "小马", avatar: "🧑", position: .co, chips: 2000),
            Player.createHuman(position: .bb, chips: 2000)
        ]

        var looseAggressivePattern = AIPattern()
        looseAggressivePattern.updateAfterHand(
            playerId: 2,
            style: .looseAggressive,
            playerActions: actions,
            allActions: actions,
            players: players,
            profit: 120,
            didWin: true,
            showdown: false,
            shownHandType: nil,
            winningPlayerIds: [2],
            shownHandTypes: [:],
            potSize: 180,
            decisionPoints: [point]
        )

        var tightWeakPattern = AIPattern()
        tightWeakPattern.updateAfterHand(
            playerId: 2,
            style: .tightWeak,
            playerActions: actions,
            allActions: actions,
            players: players,
            profit: 120,
            didWin: true,
            showdown: false,
            shownHandType: nil,
            winningPlayerIds: [2],
            shownHandTypes: [:],
            potSize: 180,
            decisionPoints: [point]
        )

        let lagScore = looseAggressivePattern.contextPolicy(for: context)?.aggressiveScore ?? 0
        let twScore = tightWeakPattern.contextPolicy(for: context)?.aggressiveScore ?? 0

        XCTAssertGreaterThan(lagScore, twScore)
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
    @MainActor
    func testStartGameDoesNotAutoResetBustedPlayerToInitialChipsOnNextHand() async {
        var bustedState = validTableState
        bustedState.players[0].chips = 0
        bustedState.players[0].status = .out

        let viewModel = GameViewModel(
            initialChips: 20_000,
            restoredGameState: nil,
            onGameEnd: { _ in },
            patternRepository: MockPatternRepository(),
            recordRepository: MockRecordRepository(),
            archiveManager: MockArchiveManager(),
            analytics: MockAnalyticsService()
        )
        viewModel.gameState = bustedState

        await viewModel.startGame()

        XCTAssertEqual(viewModel.humanPlayer?.chips, 0)
        XCTAssertEqual(viewModel.humanPlayer?.status, .out)
    }

    @MainActor
    func testFinalizeHandClearsArchiveWhenHumanIsBusted() async {
        let archiveManager = MockArchiveManager()
        let viewModel = GameViewModel(
            initialChips: 20_000,
            restoredGameState: nil,
            onGameEnd: { _ in },
            patternRepository: MockPatternRepository(),
            recordRepository: MockRecordRepository(),
            archiveManager: archiveManager,
            analytics: MockAnalyticsService()
        )

        var bustedState = validTableState
        bustedState.players[0].chips = 0
        bustedState.players[0].status = .out
        viewModel.gameState = bustedState

        let settlement = HandSettlement(
            winningPlayerIds: [1],
            payouts: [1: 200],
            handsByPlayer: [:],
            totalPot: 200,
            isSplitPot: false
        )

        await viewModel.finalizeHand(with: settlement, showdown: true)

        XCTAssertEqual(archiveManager.clearCount, 1)
        XCTAssertNil(archiveManager.lastSavedArchive)
        XCTAssertTrue(viewModel.showRoundEndModal)
        XCTAssertTrue(viewModel.isHumanBusted)
    }

    func testSyncPlayerChipsPersistsExactFinalStack() {
        let suiteName = "MainViewModelSyncPlayerChips-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defaults.removePersistentDomain(forName: suiteName)
        defaults.set(2000, forKey: "poker_ai_chips")
        defaults.set(true, forKey: "poker_ai_daily_free")

        let viewModel = MainViewModel(
            chipStorage: ChipStorage(userDefaults: defaults),
            welfareStorage: WelfareStorage(userDefaults: defaults),
            archiveManager: MockArchiveManager(),
            databaseManager: .shared
        )

        viewModel.syncPlayerChips(0)

        XCTAssertEqual(viewModel.chips, 0)
        XCTAssertEqual(defaults.integer(forKey: "poker_ai_chips"), 0)

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
