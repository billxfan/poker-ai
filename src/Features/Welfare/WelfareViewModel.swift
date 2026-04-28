import SwiftUI

@Observable
final class WelfareViewModel {
    private let welfareStorage: WelfareStorage

    var chips: Int = 0

    var hasClaimedDailyFree: Bool {
        welfareStorage.hasClaimedDailyFree()
    }

    var hasSignedInToday: Bool {
        welfareStorage.hasSignedInToday()
    }

    init(welfareStorage: WelfareStorage = WelfareStorage()) {
        self.welfareStorage = welfareStorage
        loadState()
    }

    func loadState() {
        chips = welfareStorage.getChips()
    }

    func claimDailyFree() {
        guard !hasClaimedDailyFree else { return }
        welfareStorage.addChips(GameConstants.dailyFreeChips)
        welfareStorage.markDailyFreeClaimed()
        loadState()
    }

    func claimSignIn() {
        guard !hasSignedInToday else { return }
        welfareStorage.addChips(GameConstants.dailySignInBonus)
        welfareStorage.markSignedIn()
        loadState()
    }
}
