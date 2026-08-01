import XCTest
@testable import PokerAI

final class GameRecordRepositoryTests: XCTestCase {

    private var repository: GameRecordRepository!
    private var database: DatabaseManager!

    override func setUp() {
        super.setUp()
        database = .shared
        database.clearHandRecords()
        repository = GameRecordRepository(database: database)
    }

    override func tearDown() {
        database.clearHandRecords()
        repository = nil
        database = nil
        super.tearDown()
    }

    func testSaveHandRecordSkipsConsecutiveSemanticDuplicate() async throws {
        let record = makeRecord(id: 1001, createdAt: Date(timeIntervalSinceReferenceDate: 1_000))
        let duplicate = makeRecord(id: 1002, createdAt: Date(timeIntervalSinceReferenceDate: 1_100))

        try await repository.saveHandRecord(record)
        try await repository.saveHandRecord(duplicate)

        let records = try await repository.getAllRecords()
        XCTAssertEqual(records.count, 1)
        XCTAssertEqual(records.first?.id, 1001)
    }

    func testGetAllRecordsRemovesExistingConsecutiveSemanticDuplicates() async throws {
        let url = database.getHandRecordsURL()
        let encoder = JSONEncoder()
        let original = [
            makeRecord(id: 2001, createdAt: Date(timeIntervalSinceReferenceDate: 2_000)),
            makeRecord(id: 2002, createdAt: Date(timeIntervalSinceReferenceDate: 2_100)),
            makeDistinctRecord(id: 3001, createdAt: Date(timeIntervalSinceReferenceDate: 3_000))
        ]
        try encoder.encode(original).write(to: url)

        let records = try await repository.getAllRecords()

        XCTAssertEqual(records.count, 2)
        XCTAssertEqual(records.map(\.id), [2001, 3001])
    }

    func testGetStatisticsCalculatesPokerMetrics() async throws {
        try await repository.saveHandRecord(
            HandRecord(
                id: 4001,
                result: .win,
                profit: 80,
                communityCards: [
                    Card(suit: .hearts, rank: 14),
                    Card(suit: .clubs, rank: 10),
                    Card(suit: .diamonds, rank: 8)
                ],
                pot: 160,
                playerHoleCards: HoleCards(Card(suit: .spades, rank: 14), Card(suit: .spades, rank: 13)),
                playerHandType: .onePair,
                actions: [
                    Action(playerId: 2, street: .preFlop, type: .raise, amount: 60),
                    Action(playerId: 0, street: .preFlop, type: .raise, amount: 180),
                    Action(playerId: 2, street: .preFlop, type: .call, amount: 180)
                ],
                winnerId: 0,
                showdown: true,
                revealedHands: []
            )
        )

        try await repository.saveHandRecord(
            HandRecord(
                id: 4002,
                result: .lose,
                profit: -20,
                communityCards: [],
                pot: 30,
                playerHoleCards: HoleCards(Card(suit: .clubs, rank: 7), Card(suit: .diamonds, rank: 2)),
                playerHandType: nil,
                actions: [
                    Action(playerId: 2, street: .preFlop, type: .call, amount: 20),
                    Action(playerId: 0, street: .preFlop, type: .check)
                ],
                winnerId: 2,
                showdown: false,
                revealedHands: []
            )
        )

        let statistics = try await repository.getStatistics()

        XCTAssertEqual(statistics.totalHands, 2)
        XCTAssertEqual(statistics.totalProfit, 60)
        XCTAssertEqual(statistics.averageProfit, 30, accuracy: 0.001)
        XCTAssertEqual(statistics.winRate, 0.5, accuracy: 0.001)
        XCTAssertEqual(statistics.vpip, 0.5, accuracy: 0.001)
        XCTAssertEqual(statistics.pfr, 0.5, accuracy: 0.001)
        XCTAssertEqual(statistics.threeBetRate, 1.0, accuracy: 0.001)
        XCTAssertEqual(statistics.showdownWinRate, 1.0, accuracy: 0.001)
    }

    private func makeRecord(id: Int, createdAt: Date) -> HandRecord {
        HandRecord(
            id: id,
            result: .lose,
            profit: -20,
            communityCards: [
                Card(suit: .hearts, rank: 5),
                Card(suit: .diamonds, rank: 6),
                Card(suit: .clubs, rank: 11),
                Card(suit: .spades, rank: 2),
                Card(suit: .hearts, rank: 14)
            ],
            pot: 80,
            playerHoleCards: HoleCards(Card(suit: .diamonds, rank: 2), Card(suit: .spades, rank: 6)),
            playerHandType: .highCard,
            actions: [
                Action(playerId: 2, street: .preFlop, type: .call, amount: 20),
                Action(playerId: 0, street: .river, type: .fold)
            ],
            winnerId: 2,
            showdown: true,
            revealedHands: [
                RevealedPlayerHand(
                    playerId: 2,
                    name: "小马",
                    avatar: "🧑",
                    holeCards: HoleCards(Card(suit: .clubs, rank: 4), Card(suit: .hearts, rank: 2)),
                    handType: .onePair,
                    isWinner: true
                ),
                RevealedPlayerHand(
                    playerId: 4,
                    name: "小鱼",
                    avatar: "👧",
                    holeCards: HoleCards(Card(suit: .diamonds, rank: 13), Card(suit: .clubs, rank: 7)),
                    handType: .highCard,
                    isWinner: false
                )
            ],
            createdAt: createdAt
        )
    }

    private func makeDistinctRecord(id: Int, createdAt: Date) -> HandRecord {
        HandRecord(
            id: id,
            result: .win,
            profit: 30,
            communityCards: [
                Card(suit: .spades, rank: 14),
                Card(suit: .clubs, rank: 10),
                Card(suit: .diamonds, rank: 10),
                Card(suit: .hearts, rank: 4),
                Card(suit: .spades, rank: 3)
            ],
            pot: 120,
            playerHoleCards: HoleCards(Card(suit: .clubs, rank: 14), Card(suit: .diamonds, rank: 9)),
            playerHandType: .onePair,
            actions: [
                Action(playerId: 0, street: .preFlop, type: .raise, amount: 60),
                Action(playerId: 5, street: .preFlop, type: .fold)
            ],
            winnerId: 0,
            showdown: false,
            revealedHands: [],
            createdAt: createdAt
        )
    }
}
