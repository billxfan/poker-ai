import SwiftUI

@Observable
final class WelfareViewModel {
    private let welfareStorage: WelfareStorage

    var chips: Int = 0
    var isAdLoading: Bool = false

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

    func showRewardedAd(from viewController: UIViewController) {
        guard AdMobService.shared.isRewardedAdReady else {
            isAdLoading = true
            AdMobService.shared.loadRewardedAd { [weak self] in
                DispatchQueue.main.async {
                    guard let self else { return }
                    if AdMobService.shared.isRewardedAdReady {
                        AdMobService.shared.showRewardedAd(from: viewController) { reward in
                            DispatchQueue.main.async {
                                let points = reward > 0 ? reward : GameConstants.rewardAdChips
                                self.welfareStorage.addChips(points)
                                self.loadState()
                                self.isAdLoading = false
                            }
                        }
                    } else {
                        self.isAdLoading = false
                    }
                }
            }
            // Safety timeout: reset loading state after 10s if ad never loads
            DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
                if self?.isAdLoading == true {
                    self?.isAdLoading = false
                }
            }
            return
        }

        isAdLoading = true
        AdMobService.shared.showRewardedAd(from: viewController) { [weak self] reward in
            DispatchQueue.main.async {
                let points = reward > 0 ? reward : GameConstants.rewardAdChips
                self?.welfareStorage.addChips(points)
                self?.loadState()
                self?.isAdLoading = false
            }
        }
    }
}
