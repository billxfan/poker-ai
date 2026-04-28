import Foundation

struct GameArchive: Codable {
    enum ResumeMode: String, Codable {
        case currentHand
        case nextHand
    }

    let gameState: GameState
    let savedAt: Date
    let version: Int
    let resumeMode: ResumeMode

    init(
        gameState: GameState,
        savedAt: Date,
        version: Int,
        resumeMode: ResumeMode = .currentHand
    ) {
        self.gameState = gameState
        self.savedAt = savedAt
        self.version = version
        self.resumeMode = resumeMode
    }

    private enum CodingKeys: String, CodingKey {
        case gameState
        case savedAt
        case version
        case resumeMode
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        gameState = try container.decode(GameState.self, forKey: .gameState)
        savedAt = try container.decode(Date.self, forKey: .savedAt)
        version = try container.decode(Int.self, forKey: .version)
        resumeMode = try container.decodeIfPresent(ResumeMode.self, forKey: .resumeMode) ?? .currentHand
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(gameState, forKey: .gameState)
        try container.encode(savedAt, forKey: .savedAt)
        try container.encode(version, forKey: .version)
        try container.encode(resumeMode, forKey: .resumeMode)
    }

    static let currentVersion = 1
    static let archiveKey = "poker_ai_game_archive"
    static let archivePresenceKey = "poker_ai_game_archive_exists"
}

protocol IGameArchiveManager {
    func saveArchive(_ archive: GameArchive) throws
    func loadArchive() -> GameArchive?
    func hasArchive() -> Bool
    func clearArchive()
}

final class GameArchiveManager: IGameArchiveManager {
    private let userDefaults: UserDefaults

    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
    }

    func saveArchive(_ archive: GameArchive) throws {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let data = try encoder.encode(archive)
        userDefaults.set(data, forKey: GameArchive.archiveKey)
        userDefaults.set(true, forKey: GameArchive.archivePresenceKey)
    }

    func loadArchive() -> GameArchive? {
        guard let data = userDefaults.data(forKey: GameArchive.archiveKey) else {
            userDefaults.set(false, forKey: GameArchive.archivePresenceKey)
            return nil
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        do {
            let archive = try decoder.decode(GameArchive.self, from: data)
            if archive.version == GameArchive.currentVersion {
                userDefaults.set(true, forKey: GameArchive.archivePresenceKey)
                return archive
            }
        } catch {
            clearArchive()
        }

        return nil
    }

    func hasArchive() -> Bool {
        let hasData = userDefaults.data(forKey: GameArchive.archiveKey) != nil

        if userDefaults.bool(forKey: GameArchive.archivePresenceKey) != hasData {
            userDefaults.set(hasData, forKey: GameArchive.archivePresenceKey)
        }

        return hasData
    }

    func clearArchive() {
        userDefaults.removeObject(forKey: GameArchive.archiveKey)
        userDefaults.set(false, forKey: GameArchive.archivePresenceKey)
    }
}
