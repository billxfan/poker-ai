import SwiftUI

@Observable
final class MainViewModel {
    private let chipStorage: IChipStorage
    private let welfareStorage: WelfareStorage
    private let archiveManager: IGameArchiveManager
    private let databaseManager: DatabaseManager

    var chips: Int = 0
    var hasArchive: Bool = false
    var showNoChipsAlert: Bool = false
    var showNoChipsToWelfare: Bool = false
    var showNewGameConfirmation: Bool = false
    var isLoading: Bool = false
    var minimumChipsForNewGame: Int { GameConstants.startingChips }

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
        chips = chipStorage.getChips()
        hasArchive = archiveManager.hasArchive()

        if chips == 0 && !hasClaimedDailyFree {
            claimDailyFreeChips()
        }
    }

    func claimDailyFreeChips() {
        guard !hasClaimedDailyFree else { return }
        chipStorage.addChips(GameConstants.dailyFreeChips)
        welfareStorage.markDailyFreeClaimed()
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
        if let archive, !archive.gameState.players.isEmpty {
            hasArchive = true
            return archive
        }

        if archive != nil {
            archiveManager.clearArchive()
        }

        hasArchive = archiveManager.hasArchive()
        return nil
    }

    func startNewGame() {
        guard chips >= minimumChipsForNewGame else {
            showNoChipsAlert = true
            return
        }

        archiveManager.clearArchive()
        databaseManager.clearAIPatterns()
        databaseManager.clearHandRecords()
        hasArchive = false
    }

    func getChipsForNewGame() -> Int {
        return minimumChipsForNewGame
    }

    func deductChipsForGame(_ amount: Int) -> Bool {
        return chipStorage.deductChips(amount)
    }

    func addChipsToPlayer(_ amount: Int) {
        chipStorage.addChips(amount)
        chips = chipStorage.getChips()
    }
}
