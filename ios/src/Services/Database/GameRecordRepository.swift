import Foundation

protocol IGameRecordRepository {
    func saveHandRecord(_ record: HandRecord) async throws
    func getRecentHands(limit: Int) async throws -> [HandRecord]
    func getAllRecords() async throws -> [HandRecord]
    func getStatistics() async throws -> GameStatistics
}

struct GameStatistics {
    let totalHands: Int
    let winRate: Double
    let totalProfit: Int
    let averageProfit: Double
    let vpip: Double
    let pfr: Double
    let threeBetRate: Double
    let showdownWinRate: Double
}

final class GameRecordRepository: IGameRecordRepository {
    private let database: DatabaseManager
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(database: DatabaseManager = .shared) {
        self.database = database
    }

    func saveHandRecord(_ record: HandRecord) async throws {
        var records = try await getAllRecords()
        if let latest = records.first, isSemanticallyDuplicate(record, latest) {
            return
        }
        records.insert(record, at: 0)
        try persist(records)
    }

    func getRecentHands(limit: Int) async throws -> [HandRecord] {
        let records = try await getAllRecords()
        return Array(records.prefix(limit))
    }

    func getAllRecords() async throws -> [HandRecord] {
        let url = database.getHandRecordsURL()

        guard FileManager.default.fileExists(atPath: url.path) else {
            return []
        }

        let data = try Data(contentsOf: url)
        let records = try decoder.decode([HandRecord].self, from: data)
        let normalizedRecords = removeConsecutiveSemanticDuplicates(from: records)

        if normalizedRecords.count != records.count {
            try? persist(normalizedRecords)
        }

        return normalizedRecords
    }

    func getStatistics() async throws -> GameStatistics {
        let records = try await getAllRecords()

        guard !records.isEmpty else {
            return GameStatistics(
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

        let aggressiveTypes: Set<ActionType> = [.raise, .bet, .allIn]
        let voluntaryTypes: Set<ActionType> = [.call, .raise, .bet, .allIn]

        let wins = records.filter { $0.result == .win }.count
        let totalProfit = records.reduce(0) { $0 + $1.profit }
        let vpipHands = records.filter { record in
            record.actions.contains { $0.playerId == 0 && $0.street == .preFlop && voluntaryTypes.contains($0.type) }
        }.count
        let pfrHands = records.filter { record in
            record.actions.contains { $0.playerId == 0 && $0.street == .preFlop && aggressiveTypes.contains($0.type) }
        }.count
        let showdownRecords = records.filter(\.showdown)
        let showdownWins = showdownRecords.filter { $0.result != .lose }.count

        var threeBetOpportunities = 0
        var threeBetHands = 0

        for record in records {
            let preFlopActions = record.actions.filter { $0.street == .preFlop }

            guard let firstHumanActionIndex = preFlopActions.firstIndex(where: { $0.playerId == 0 }) else {
                continue
            }

            let actionsBeforeHuman = preFlopActions.prefix(firstHumanActionIndex)
            let facedOpenRaise = actionsBeforeHuman.contains { action in
                action.playerId != 0 && aggressiveTypes.contains(action.type)
            }

            guard facedOpenRaise else { continue }
            threeBetOpportunities += 1

            if let firstHumanAggressionIndex = preFlopActions.firstIndex(where: { action in
                action.playerId == 0 && aggressiveTypes.contains(action.type)
            }) {
                let aggressionsBeforeHuman = preFlopActions.prefix(firstHumanAggressionIndex).filter { action in
                    action.playerId != 0 && aggressiveTypes.contains(action.type)
                }

                if aggressionsBeforeHuman.count == 1 {
                    threeBetHands += 1
                }
            }
        }

        return GameStatistics(
            totalHands: records.count,
            winRate: Double(wins) / Double(records.count),
            totalProfit: totalProfit,
            averageProfit: Double(totalProfit) / Double(records.count),
            vpip: Double(vpipHands) / Double(records.count),
            pfr: Double(pfrHands) / Double(records.count),
            threeBetRate: threeBetOpportunities > 0 ? Double(threeBetHands) / Double(threeBetOpportunities) : 0,
            showdownWinRate: showdownRecords.isEmpty ? 0 : Double(showdownWins) / Double(showdownRecords.count)
        )
    }

    private func persist(_ records: [HandRecord]) throws {
        let url = database.getHandRecordsURL()
        let data = try encoder.encode(records)
        try data.write(to: url)
    }

    private func removeConsecutiveSemanticDuplicates(from records: [HandRecord]) -> [HandRecord] {
        var normalized: [HandRecord] = []

        for record in records {
            if let last = normalized.last, isSemanticallyDuplicate(record, last) {
                continue
            }
            normalized.append(record)
        }

        return normalized
    }

    private func isSemanticallyDuplicate(_ lhs: HandRecord, _ rhs: HandRecord) -> Bool {
        lhs.result == rhs.result &&
        lhs.profit == rhs.profit &&
        lhs.communityCards == rhs.communityCards &&
        lhs.pot == rhs.pot &&
        lhs.playerHoleCards == rhs.playerHoleCards &&
        lhs.playerHandType == rhs.playerHandType &&
        lhs.winnerId == rhs.winnerId &&
        lhs.showdown == rhs.showdown &&
        lhs.revealedHands.count == rhs.revealedHands.count &&
        lhs.revealedHands.elementsEqual(rhs.revealedHands, by: revealedHandEquals) &&
        lhs.actions.count == rhs.actions.count &&
        lhs.actions.elementsEqual(rhs.actions, by: actionEquals)
    }

    private func revealedHandEquals(_ lhs: RevealedPlayerHand, _ rhs: RevealedPlayerHand) -> Bool {
        lhs.playerId == rhs.playerId &&
        lhs.name == rhs.name &&
        lhs.avatar == rhs.avatar &&
        lhs.holeCards == rhs.holeCards &&
        lhs.handType == rhs.handType &&
        lhs.isWinner == rhs.isWinner
    }

    private func actionEquals(_ lhs: Action, _ rhs: Action) -> Bool {
        lhs.playerId == rhs.playerId &&
        lhs.street == rhs.street &&
        lhs.type == rhs.type &&
        lhs.amount == rhs.amount
    }
}
