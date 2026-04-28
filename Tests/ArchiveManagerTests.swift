import XCTest
@testable import PokerAI

final class ArchiveManagerTests: XCTestCase {

    private var suiteName: String!
    private var userDefaults: UserDefaults!
    private var manager: GameArchiveManager!

    override func setUp() {
        super.setUp()
        suiteName = "ArchiveManagerTests-\(UUID().uuidString)"
        userDefaults = UserDefaults(suiteName: suiteName)
        userDefaults.removePersistentDomain(forName: suiteName)
        manager = GameArchiveManager(userDefaults: userDefaults)
    }

    override func tearDown() {
        if let suiteName {
            userDefaults?.removePersistentDomain(forName: suiteName)
        }
        suiteName = nil
        userDefaults = nil
        manager = nil
        super.tearDown()
    }

    func testSaveArchiveMarksPresenceFlag() throws {
        let archive = GameArchive(
            gameState: GameState(
                players: [Player.createHuman(position: .bb, chips: 2000)],
                handNumber: 3
            ),
            savedAt: Date(),
            version: GameArchive.currentVersion
        )

        try manager.saveArchive(archive)

        XCTAssertTrue(manager.hasArchive())
        XCTAssertTrue(userDefaults.bool(forKey: GameArchive.archivePresenceKey))
    }

    func testLoadArchiveWithoutDataClearsPresenceFlag() {
        userDefaults.set(true, forKey: GameArchive.archivePresenceKey)

        let archive = manager.loadArchive()

        XCTAssertNil(archive)
        XCTAssertFalse(userDefaults.bool(forKey: GameArchive.archivePresenceKey))
    }

    func testClearArchiveResetsPresenceFlag() throws {
        let archive = GameArchive(
            gameState: GameState(
                players: [Player.createHuman(position: .bb, chips: 2000)]
            ),
            savedAt: Date(),
            version: GameArchive.currentVersion
        )

        try manager.saveArchive(archive)
        manager.clearArchive()

        XCTAssertFalse(manager.hasArchive())
        XCTAssertFalse(userDefaults.bool(forKey: GameArchive.archivePresenceKey))
    }

    func testLoadLegacyArchiveDefaultsToCurrentHandResumeMode() throws {
        struct LegacyArchive: Codable {
            let gameState: GameState
            let savedAt: Date
            let version: Int
        }

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601

        let legacyArchive = LegacyArchive(
            gameState: GameState(
                players: [Player.createHuman(position: .bb, chips: 2000)],
                handNumber: 5
            ),
            savedAt: Date(),
            version: GameArchive.currentVersion
        )

        let data = try encoder.encode(legacyArchive)
        userDefaults.set(data, forKey: GameArchive.archiveKey)

        let archive = manager.loadArchive()

        XCTAssertEqual(archive?.resumeMode, .currentHand)
        XCTAssertEqual(archive?.gameState.handNumber, 5)
        XCTAssertTrue(manager.hasArchive())
    }
}
