import Foundation

final class DatabaseManager {
    static let shared = DatabaseManager()

    private let fileManager = FileManager.default
    private let documentsURL: URL

    private init() {
        documentsURL = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("poker_ai_data")

        try? fileManager.createDirectory(at: documentsURL, withIntermediateDirectories: true)
    }

    func getHandRecordsURL() -> URL {
        documentsURL.appendingPathComponent("hand_records.json")
    }

    func getAIPatternsURL() -> URL {
        documentsURL.appendingPathComponent("ai_patterns.json")
    }

    func clearAIPatterns() {
        try? fileManager.removeItem(at: getAIPatternsURL())
    }

    func clearHandRecords() {
        try? fileManager.removeItem(at: getHandRecordsURL())
    }
}
