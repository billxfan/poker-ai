import SwiftUI

@Observable
final class MainViewModel {
    private let chipStorage: IChipStorage
    private let welfareStorage: WelfareStorage
    private let archiveManager: IGameArchiveManager
    private let databaseManager: DatabaseManager

    var chips: Int = 0
    var hasArchive: Bool = false
    var showNewGameConfirmation: Bool = false
    var isLoading: Bool = false

    var hasClaimedDailyFree: Bool {
        welfareStorage.hasClaimedDailyFree()
    }

    var hasSignedInToday: Bool {
        welfareStorage.hasSignedInToday()
    }

    init(
        chipStorage: IChipStorage = ChipStorage(),
        welfareStorage: WelfareStorage = WelfareStorage(),
        archiveManager: IGameArchiveManager = GameArchiveManager(),
        databaseManager: DatabaseManager = .shared
    ) {
        self.chipStorage = chipStorage
        self.welfareStorage = welfareStorage
        self.archiveManager = archiveManager
        self.databaseManager = databaseManager

        loadState()
    }

    func loadState() {
        welfareStorage.refreshBenefits()
        chips = chipStorage.getChips()
        hasArchive = refreshArchiveAvailability()
    }

    func claimDailyFreeChips() {
        chips = chipStorage.getChips()
    }

    func claimSignInBonus() {
        guard !hasSignedInToday else { return }
        chipStorage.addChips(GameConstants.dailySignInBonus)
        welfareStorage.markSignedIn()
        chips = chipStorage.getChips()
    }

    func continueGame() -> GameArchive? {
        let archive = archiveManager.loadArchive()
        if let archive, archive.isResumableFromMainMenu {
            hasArchive = true
            return archive
        }

        if archive != nil {
            archiveManager.clearArchive()
        }

        hasArchive = false
        return nil
    }

    func startNewGame() {
        archiveManager.clearArchive()
        databaseManager.clearAIPatterns()
        databaseManager.clearHandRecords()
        hasArchive = false
    }

    func getChipsForNewGame() -> Int {
        let stored = chipStorage.getChips()
        if stored > 0 {
            return stored
        }

        chipStorage.setChips(GameConstants.startingChips)
        chips = GameConstants.startingChips
        return GameConstants.startingChips
    }

    func deductChipsForGame(_ amount: Int) -> Bool {
        return chipStorage.deductChips(amount)
    }

    func addChipsToPlayer(_ amount: Int) {
        chipStorage.addChips(amount)
        chips = chipStorage.getChips()
    }

    func syncPlayerChips(_ amount: Int) {
        chipStorage.setChips(amount)
        chips = chipStorage.getChips()
    }

    private func refreshArchiveAvailability() -> Bool {
        guard let archive = archiveManager.loadArchive() else {
            return false
        }

        guard archive.isResumableFromMainMenu else {
            archiveManager.clearArchive()
            return false
        }

        return true
    }
}
