import Foundation

protocol IAIPatternRepository {
    func getPattern(for playerId: Int) async throws -> AIPattern?
    func savePattern(_ pattern: AIPattern, for playerId: Int) async throws
    func getAllPatterns() async throws -> [Int: AIPattern]
}

final class AIPatternRepository: IAIPatternRepository {
    private let database: DatabaseManager
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(database: DatabaseManager = .shared) {
        self.database = database
    }

    func getPattern(for playerId: Int) async throws -> AIPattern? {
        let patterns = try await getAllPatterns()
        return patterns[playerId]
    }

    func savePattern(_ pattern: AIPattern, for playerId: Int) async throws {
        var patterns = try await getAllPatterns()
        patterns[playerId] = pattern

        let url = database.getAIPatternsURL()
        let data = try encoder.encode(patterns)
        try data.write(to: url)
    }

    func getAllPatterns() async throws -> [Int: AIPattern] {
        let url = database.getAIPatternsURL()

        guard FileManager.default.fileExists(atPath: url.path) else {
            return [:]
        }

        let data = try Data(contentsOf: url)
        return try decoder.decode([Int: AIPattern].self, from: data)
    }
}
