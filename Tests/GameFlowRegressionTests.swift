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
}

private final class MockArchiveManager: IGameArchiveManager {
    var saveCount = 0
    var clearCount = 0
    var lastSavedArchive: GameArchive?

    func saveArchive(_ archive: GameArchive) throws {
        saveCount += 1
        lastSavedArchive = archive
    }

    func loadArchive() -> GameArchive? {
        nil
    }

    func hasArchive() -> Bool {
        false
    }

    func clearArchive() {
        clearCount += 1
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
