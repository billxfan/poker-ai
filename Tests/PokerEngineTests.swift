import XCTest
@testable import PokerAI

final class PokerEngineTests: XCTestCase {

    func testPreviousPositionWrapsToBigBlind() {
        XCTAssertEqual(Position.utg.previous(), .bb)
    }

    func testBlindPostingDoesNotCreateNegativeChips() async {
        let engine = PokerEngine()

        await engine.setupGame(humanChips: 10)
        await engine.startNewHand()

        let state = await engine.getState()
        let human = try! XCTUnwrap(state.players.first { $0.id == 0 })

        XCTAssertEqual(human.chips, 0)
        XCTAssertEqual(human.status, .allIn)
        XCTAssertEqual(state.handBets[0], 10)
        XCTAssertEqual(state.pot, 20)
    }

    func testInvalidRaiseCannotReduceCurrentBet() async {
        let engine = PokerEngine()
        let players = [
            Player(id: 0, name: "你", avatar: "🧑", position: .utg, chips: 1000, holeCards: nil, status: .active),
            Player(id: 1, name: "AI", avatar: "🤖", position: .bb, chips: 1000, holeCards: nil, status: .active)
        ]
        let state = GameState(
            players: players,
            communityCards: [],
            currentStreet: .preFlop,
            pot: 150,
            sidePots: [],
            currentBet: 100,
            playerBets: [0: 0, 1: 100],
            buttonPosition: .btn,
            actionLog: [],
            currentActorIndex: 0,
            handNumber: 1,
            playerBetsAtLastAction: [:],
            playersActedThisStreet: [],
            handBets: [1: 100]
        )

        await engine.restoreState(state)
        _ = await engine.processAction(playerId: 0, action: Action(playerId: 0, street: .preFlop, type: .raise, amount: 99))

        let updatedState = await engine.getState()
        XCTAssertEqual(updatedState.currentBet, 100)
        XCTAssertEqual(updatedState.playerBets[0], 100)
        XCTAssertEqual(updatedState.handBets[0], 100)
    }

    func testRaiseUpdatesMinimumRaiseIncrementAndNextMinimumTarget() async {
        let engine = PokerEngine()

        await engine.setupGame(humanChips: 2000)
        await engine.startNewHand()
        _ = await engine.processAction(
            playerId: 1,
            action: Action(playerId: 1, street: .preFlop, type: .raise, amount: 60)
        )

        let state = await engine.getState()

        XCTAssertEqual(state.currentBet, 60)
        XCTAssertEqual(state.minimumRaiseIncrement, 40)
        XCTAssertEqual(
            PotCalculator.calculateMinRaise(
                playerId: 2,
                playerBets: state.playerBets,
                currentBet: state.currentBet,
                minimumRaiseIncrement: state.minimumRaiseIncrement
            ),
            100
        )
    }

    func testShortAllInDoesNotReduceMinimumRaiseIncrement() async {
        let engine = PokerEngine()
        let players = [
            Player(id: 0, name: "你", avatar: "🧑", position: .utg, chips: 1000, holeCards: nil, status: .active),
            Player(id: 1, name: "AI1", avatar: "🤖", position: .mp, chips: 1000, holeCards: nil, status: .active),
            Player(id: 2, name: "AI2", avatar: "🤖", position: .co, chips: 80, holeCards: nil, status: .active),
            Player(id: 3, name: "AI3", avatar: "🤖", position: .btn, chips: 1000, holeCards: nil, status: .active),
            Player(id: 4, name: "AI4", avatar: "🤖", position: .sb, chips: 990, holeCards: nil, status: .active),
            Player(id: 5, name: "AI5", avatar: "🤖", position: .bb, chips: 980, holeCards: nil, status: .active)
        ]
        let state = GameState(
            players: players,
            communityCards: [],
            currentStreet: .preFlop,
            pot: 150,
            sidePots: [],
            currentBet: 60,
            minimumRaiseIncrement: 40,
            playerBets: [1: 60, 4: 10, 5: 20],
            buttonPosition: .btn,
            actionLog: [
                Action(playerId: 1, street: .preFlop, type: .raise, amount: 60)
            ],
            currentActorIndex: 2,
            handNumber: 1,
            playerBetsAtLastAction: [1: 60],
            playersActedThisStreet: [1],
            handBets: [1: 60, 4: 10, 5: 20]
        )

        await engine.restoreState(state)
        _ = await engine.processAction(
            playerId: 2,
            action: Action(playerId: 2, street: .preFlop, type: .allIn, amount: 80)
        )

        let updatedState = await engine.getState()

        XCTAssertEqual(updatedState.currentBet, 80)
        XCTAssertEqual(updatedState.minimumRaiseIncrement, 40)
        XCTAssertEqual(
            PotCalculator.calculateMinRaise(
                playerId: 3,
                playerBets: updatedState.playerBets,
                currentBet: updatedState.currentBet,
                minimumRaiseIncrement: updatedState.minimumRaiseIncrement
            ),
            120
        )
    }

    func testRestoreStateRecalculatesCurrentBetFromPlayerBets() async {
        let engine = PokerEngine()
        let players = [
            Player(id: 0, name: "你", avatar: "🧑", position: .utg, chips: 1000, holeCards: nil, status: .active),
            Player(id: 1, name: "AI", avatar: "🤖", position: .bb, chips: 1000, holeCards: nil, status: .active)
        ]
        let state = GameState(
            players: players,
            communityCards: [
                Card(suit: .spades, rank: 14),
                Card(suit: .hearts, rank: 13),
                Card(suit: .clubs, rank: 12)
            ],
            currentStreet: .flop,
            pot: 200,
            sidePots: [],
            currentBet: 2091,
            playerBets: [:],
            buttonPosition: .btn,
            actionLog: [],
            currentActorIndex: 0,
            handNumber: 1,
            playerBetsAtLastAction: [:],
            playersActedThisStreet: [],
            handBets: [0: 100, 1: 100]
        )

        await engine.restoreState(state)
        let restored = await engine.getState()

        XCTAssertEqual(restored.currentBet, 0)
    }

    func testRestoredHandCanStillDealMissingFutureCommunityCards() async {
        let sourceEngine = PokerEngine()

        await sourceEngine.setupGame(humanChips: 2000)
        await sourceEngine.startNewHand()
        await sourceEngine.dealCommunityCards()
        let flopState = await sourceEngine.getState()

        XCTAssertEqual(flopState.currentStreet, .flop)
        XCTAssertEqual(flopState.communityCards.count, 3)

        let restoredEngine = PokerEngine()
        await restoredEngine.restoreState(flopState)
        await restoredEngine.dealCommunityCards()
        let turnState = await restoredEngine.getState()

        XCTAssertEqual(turnState.currentStreet, .turn)
        XCTAssertEqual(turnState.communityCards.count, 4, "恢复中的牌局继续发转牌时，不应该出现 street 前进了但公共牌没补上的情况")
    }

    func testRestoreStateRepairsBrokenBoardToMatchStreet() async {
        let engine = PokerEngine()
        let brokenState = GameState(
            players: [
                Player(
                    id: 0,
                    name: "你",
                    avatar: "🧑",
                    position: .utg,
                    chips: 1747,
                    holeCards: HoleCards(
                        Card(suit: .hearts, rank: 9),
                        Card(suit: .spades, rank: 2)
                    ),
                    status: .active
                ),
                Player(
                    id: 1,
                    name: "老K",
                    avatar: "👴",
                    position: .mp,
                    chips: 2000,
                    holeCards: HoleCards(
                        Card(suit: .clubs, rank: 13),
                        Card(suit: .diamonds, rank: 13)
                    ),
                    status: .folded
                )
            ],
            communityCards: [
                Card(suit: .spades, rank: 6),
                Card(suit: .clubs, rank: 7)
            ],
            currentStreet: .river,
            pot: 547,
            sidePots: [],
            currentBet: 0,
            playerBets: [:],
            buttonPosition: .btn,
            actionLog: [],
            currentActorIndex: 0,
            handNumber: 2,
            playerBetsAtLastAction: [:],
            playersActedThisStreet: [],
            handBets: [0: 233]
        )

        await engine.restoreState(brokenState)
        let repairedState = await engine.getState()

        XCTAssertEqual(repairedState.currentStreet, .river)
        XCTAssertEqual(repairedState.communityCards.count, 5, "恢复坏存档时，公共牌应该自动补齐到当前 street 应有的张数")
    }

    func testBigBlindStillGetsActionAfterEarlierPlayersFold() async {
        let engine = PokerEngine()
        let players = [
            Player(id: 0, name: "你", avatar: "🧑", position: .bb, chips: 1980, holeCards: nil, status: .active),
            Player(id: 1, name: "老K", avatar: "👴", position: .utg, chips: 2000, holeCards: nil, status: .folded),
            Player(id: 2, name: "小马", avatar: "🧑", position: .mp, chips: 2000, holeCards: nil, status: .folded),
            Player(id: 3, name: "大叔", avatar: "🧔", position: .co, chips: 2000, holeCards: nil, status: .folded),
            Player(id: 4, name: "小鱼", avatar: "👧", position: .btn, chips: 2000, holeCards: nil, status: .folded),
            Player(id: 5, name: "狐狸", avatar: "🦊", position: .sb, chips: 1980, holeCards: nil, status: .active)
        ]
        let state = GameState(
            players: players,
            communityCards: [],
            currentStreet: .preFlop,
            pot: 40,
            sidePots: [],
            currentBet: 20,
            playerBets: [0: 20, 5: 20],
            buttonPosition: .btn,
            actionLog: [],
            currentActorIndex: 5,
            handNumber: 1,
            playerBetsAtLastAction: [0: 20, 5: 20],
            playersActedThisStreet: [1, 2, 3, 4, 5],
            handBets: [0: 20, 5: 20]
        )

        await engine.restoreState(state)

        let nextActor = await engine.getNextActor()
        XCTAssertEqual(nextActor, 0)
    }

    func testSingleRemainingPlayerDoesNotNeedExtraAction() async {
        let engine = PokerEngine()
        let players = [
            Player(id: 0, name: "你", avatar: "🧑", position: .bb, chips: 1980, holeCards: nil, status: .active),
            Player(id: 1, name: "老K", avatar: "👴", position: .utg, chips: 2000, holeCards: nil, status: .folded),
            Player(id: 2, name: "小马", avatar: "🧑", position: .mp, chips: 2000, holeCards: nil, status: .folded),
            Player(id: 3, name: "大叔", avatar: "🧔", position: .co, chips: 2000, holeCards: nil, status: .folded),
            Player(id: 4, name: "小鱼", avatar: "👧", position: .btn, chips: 2000, holeCards: nil, status: .folded),
            Player(id: 5, name: "狐狸", avatar: "🦊", position: .sb, chips: 1990, holeCards: nil, status: .folded)
        ]
        let state = GameState(
            players: players,
            communityCards: [],
            currentStreet: .preFlop,
            pot: 30,
            sidePots: [],
            currentBet: 20,
            playerBets: [0: 20, 5: 10],
            buttonPosition: .btn,
            actionLog: [],
            currentActorIndex: 5,
            handNumber: 1,
            playerBetsAtLastAction: [5: 10],
            playersActedThisStreet: [1, 2, 3, 4, 5],
            handBets: [0: 20, 5: 10]
        )

        await engine.restoreState(state)

        let nextActor = await engine.getNextActor()
        XCTAssertNil(nextActor)
    }

    func testLoneActionablePlayerCanStillRespondToAllInBet() async {
        let engine = PokerEngine()
        let players = [
            Player(id: 0, name: "你", avatar: "🧑", position: .bb, chips: 980, holeCards: nil, status: .active),
            Player(id: 1, name: "AI", avatar: "🤖", position: .sb, chips: 0, holeCards: nil, status: .allIn)
        ]
        let state = GameState(
            players: players,
            communityCards: [],
            currentStreet: .preFlop,
            pot: 120,
            sidePots: [],
            currentBet: 100,
            playerBets: [0: 20, 1: 100],
            buttonPosition: .btn,
            actionLog: [],
            currentActorIndex: 1,
            handNumber: 1,
            playerBetsAtLastAction: [1: 100],
            playersActedThisStreet: [1],
            handBets: [0: 20, 1: 100]
        )

        await engine.restoreState(state)

        let nextActor = await engine.getNextActor()
        XCTAssertEqual(nextActor, 0)
    }

    func testNoPostFlopActionWhenOnlyOpponentIsAllInAndBetMatched() async {
        let engine = PokerEngine()
        let players = [
            Player(id: 0, name: "你", avatar: "🧑", position: .bb, chips: 900, holeCards: nil, status: .active),
            Player(id: 1, name: "AI", avatar: "🤖", position: .sb, chips: 0, holeCards: nil, status: .allIn)
        ]
        let state = GameState(
            players: players,
            communityCards: [
                Card(suit: .spades, rank: 14),
                Card(suit: .hearts, rank: 13),
                Card(suit: .clubs, rank: 2)
            ],
            currentStreet: .flop,
            pot: 200,
            sidePots: [],
            currentBet: 0,
            playerBets: [:],
            buttonPosition: .btn,
            actionLog: [],
            currentActorIndex: 0,
            handNumber: 1,
            playerBetsAtLastAction: [:],
            playersActedThisStreet: [],
            handBets: [0: 100, 1: 100]
        )

        await engine.restoreState(state)

        let nextActor = await engine.getNextActor()
        XCTAssertNil(nextActor)
    }

    func testShowdownSplitPotDividesEvenly() async {
        let engine = PokerEngine()
        let communityCards = [
            Card(suit: .spades, rank: 14),
            Card(suit: .hearts, rank: 13),
            Card(suit: .clubs, rank: 12),
            Card(suit: .diamonds, rank: 11),
            Card(suit: .clubs, rank: 10)
        ]
        let players = [
            Player(id: 0, name: "你", avatar: "🧑", position: .utg, chips: 900, holeCards: HoleCards(Card(suit: .spades, rank: 2), Card(suit: .hearts, rank: 3)), status: .active),
            Player(id: 1, name: "AI", avatar: "🤖", position: .bb, chips: 900, holeCards: HoleCards(Card(suit: .diamonds, rank: 4), Card(suit: .clubs, rank: 5)), status: .active)
        ]
        let state = GameState(
            players: players,
            communityCards: communityCards,
            currentStreet: .river,
            pot: 200,
            sidePots: [],
            currentBet: 100,
            playerBets: [0: 100, 1: 100],
            buttonPosition: .btn,
            actionLog: [],
            currentActorIndex: 0,
            handNumber: 1,
            playerBetsAtLastAction: [0: 100, 1: 100],
            playersActedThisStreet: [0, 1],
            handBets: [0: 100, 1: 100]
        )

        await engine.restoreState(state)
        let settlement = await engine.settleShowdown()
        let updatedState = await engine.getState()

        XCTAssertEqual(Set(settlement.winningPlayerIds), Set([0, 1]))
        XCTAssertEqual(settlement.payouts[0], 100)
        XCTAssertEqual(settlement.payouts[1], 100)
        XCTAssertEqual(updatedState.players.first { $0.id == 0 }?.chips, 1000)
        XCTAssertEqual(updatedState.players.first { $0.id == 1 }?.chips, 1000)
    }

    func testShowdownHandlesSidePots() async {
        let engine = PokerEngine()
        let communityCards = [
            Card(suit: .clubs, rank: 14),
            Card(suit: .clubs, rank: 13),
            Card(suit: .diamonds, rank: 7),
            Card(suit: .spades, rank: 3),
            Card(suit: .hearts, rank: 2)
        ]
        let players = [
            Player(id: 0, name: "你", avatar: "🧑", position: .utg, chips: 0, holeCards: HoleCards(Card(suit: .diamonds, rank: 14), Card(suit: .hearts, rank: 14)), status: .allIn),
            Player(id: 1, name: "AI1", avatar: "🤖", position: .mp, chips: 50, holeCards: HoleCards(Card(suit: .diamonds, rank: 13), Card(suit: .hearts, rank: 13)), status: .active),
            Player(id: 2, name: "AI2", avatar: "🤖", position: .bb, chips: 50, holeCards: HoleCards(Card(suit: .diamonds, rank: 12), Card(suit: .hearts, rank: 11)), status: .active)
        ]
        let state = GameState(
            players: players,
            communityCards: communityCards,
            currentStreet: .river,
            pot: 400,
            sidePots: [],
            currentBet: 150,
            playerBets: [0: 100, 1: 150, 2: 150],
            buttonPosition: .btn,
            actionLog: [],
            currentActorIndex: 0,
            handNumber: 1,
            playerBetsAtLastAction: [0: 100, 1: 150, 2: 150],
            playersActedThisStreet: [0, 1, 2],
            handBets: [0: 100, 1: 150, 2: 150]
        )

        await engine.restoreState(state)
        let settlement = await engine.settleShowdown()
        let updatedState = await engine.getState()

        XCTAssertEqual(Set(settlement.winningPlayerIds), Set([0, 1]))
        XCTAssertEqual(settlement.payouts[0], 300)
        XCTAssertEqual(settlement.payouts[1], 100)
        XCTAssertNil(settlement.payouts[2])
        XCTAssertEqual(updatedState.players.first { $0.id == 0 }?.chips, 300)
        XCTAssertEqual(updatedState.players.first { $0.id == 1 }?.chips, 150)
        XCTAssertEqual(updatedState.players.first { $0.id == 2 }?.chips, 50)
    }

    func testStartingNextHandRotatesPositionsAndIncrementsHandNumber() async {
        let engine = PokerEngine()

        await engine.setupGame(humanChips: 2000)
        await engine.startNewHand()
        let firstHandState = await engine.getState()

        await engine.startNewHand(advanceTable: true)
        let secondHandState = await engine.getState()

        XCTAssertEqual(firstHandState.handNumber, 1)
        XCTAssertEqual(secondHandState.handNumber, 2)
        XCTAssertEqual(firstHandState.players.first { $0.id == 0 }?.position, .bb)
        // 顺时针轮转：SB → BB → UTG → MP → CO → BTN
        XCTAssertEqual(secondHandState.players.first { $0.id == 0 }?.position, .utg)
        XCTAssertEqual(secondHandState.players.first { $0.id == 4 }?.position, .sb)
        XCTAssertEqual(secondHandState.players.first { $0.id == 5 }?.position, .bb)
    }

    func testPreFlopBettingOrderStartsFromUTGAfterBlindsPosted() async {
        let engine = PokerEngine()

        await engine.setupGame(humanChips: 2000)
        await engine.startNewHand()

        let firstActorId = await engine.getNextActor()
        let state = await engine.getState()
        let utgId = state.players.first { $0.position == .utg }?.id
        let mpId = state.players.first { $0.position == .mp }?.id

        XCTAssertEqual(firstActorId, utgId)

        _ = await engine.processAction(
            playerId: utgId ?? -1,
            action: Action(playerId: utgId ?? -1, street: .preFlop, type: .fold)
        )

        let secondActorId = await engine.getNextActor()
        XCTAssertEqual(secondActorId, mpId)
    }

    func testPreFlopRaiseContinuesClockwiseThenWrapsToEarlierCallers() async {
        let engine = PokerEngine()

        await engine.setupGame(humanChips: 2000)
        await engine.startNewHand()

        let state = await engine.getState()
        let playerByPosition = Dictionary(uniqueKeysWithValues: state.players.map { ($0.position, $0.id) })

        var nextActor = await engine.getNextActor()
        XCTAssertEqual(nextActor, playerByPosition[.utg])

        _ = await engine.processAction(
            playerId: playerByPosition[.utg] ?? -1,
            action: Action(playerId: playerByPosition[.utg] ?? -1, street: .preFlop, type: .call)
        )
        nextActor = await engine.getNextActor()
        XCTAssertEqual(nextActor, playerByPosition[.mp])

        _ = await engine.processAction(
            playerId: playerByPosition[.mp] ?? -1,
            action: Action(playerId: playerByPosition[.mp] ?? -1, street: .preFlop, type: .raise, amount: 60)
        )
        nextActor = await engine.getNextActor()
        XCTAssertEqual(nextActor, playerByPosition[.co])

        for position in [Position.co, .btn, .sb, .bb, .utg] {
            let playerId = playerByPosition[position] ?? -1
            _ = await engine.processAction(
                playerId: playerId,
                action: Action(playerId: playerId, street: .preFlop, type: .call)
            )

            let expectedNextByPosition: [Position: Position] = [
                .co: .btn,
                .btn: .sb,
                .sb: .bb,
                .bb: .utg
            ]
            let expectedNext = expectedNextByPosition[position]

            nextActor = await engine.getNextActor()
            XCTAssertEqual(nextActor, expectedNext.flatMap { playerByPosition[$0] })
        }
    }

    func testPostFlopBettingOrderStartsFromSmallBlind() async {
        let engine = PokerEngine()

        await engine.setupGame(humanChips: 2000)
        await engine.startNewHand()
        await engine.dealCommunityCards()

        let firstActorId = await engine.getNextActor()
        let state = await engine.getState()
        let smallBlindId = state.players.first { $0.position == .sb }?.id

        XCTAssertEqual(firstActorId, smallBlindId)
    }

    func testBlindPositionsRotateSequentiallyAcrossHands() async {
        let engine = PokerEngine()

        await engine.setupGame(humanChips: 2000)
        await engine.startNewHand()
        let firstHand = await engine.getState()

        await engine.startNewHand(advanceTable: true)
        let secondHand = await engine.getState()

        await engine.startNewHand(advanceTable: true)
        let thirdHand = await engine.getState()

        XCTAssertNotEqual(firstHand.players.first { $0.position == .sb }?.id, secondHand.players.first { $0.position == .sb }?.id)
        XCTAssertNotEqual(secondHand.players.first { $0.position == .sb }?.id, thirdHand.players.first { $0.position == .sb }?.id)
        XCTAssertEqual(secondHand.players.first { $0.position == .bb }?.id, firstHand.players.first { $0.position == .sb }?.id)
        XCTAssertEqual(thirdHand.players.first { $0.position == .bb }?.id, secondHand.players.first { $0.position == .sb }?.id)
    }
}
