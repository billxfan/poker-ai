import SwiftUI

@Observable
final class WelfareViewModel {
    private let welfareStorage: WelfareStorage

    var chips: Int = 0
    var isAdLoading: Bool = false
    var toastMessage: String?

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
        showToast(L10n.f("welfare.toast.daily_free_claimed", GameConstants.dailyFreeChips))
    }

    func claimSignIn() {
        guard !hasSignedInToday else { return }
        welfareStorage.addChips(GameConstants.dailySignInBonus)
        welfareStorage.markSignedIn()
        loadState()
        showToast(L10n.f("welfare.toast.sign_in_claimed", GameConstants.dailySignInBonus))
    }

    func showRewardedAd(from viewController: UIViewController) {
        isAdLoading = true

        AdMobService.shared.prepareForAds(from: viewController) { [weak self] in
            DispatchQueue.main.async {
                guard let self else { return }

                if AdMobService.shared.isRewardedAdReady {
                    self.presentRewardedAd(from: viewController)
                    return
                }

                AdMobService.shared.loadRewardedAd { [weak self] in
                    DispatchQueue.main.async {
                        guard let self else { return }
                        if AdMobService.shared.isRewardedAdReady {
                            self.presentRewardedAd(from: viewController)
                        } else {
                            self.isAdLoading = false
                            self.showToast(L10n.t("welfare.toast.ad_unavailable"))
                        }
                    }
                }
            }
        }

        // Safety timeout: reset loading state after 10s if ad never loads or consent blocks requests.
        DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
            if self?.isAdLoading == true {
                self?.isAdLoading = false
            }
        }
    }

    private func presentRewardedAd(from viewController: UIViewController) {
        AdMobService.shared.showRewardedAd(from: viewController) { [weak self] reward in
            DispatchQueue.main.async {
                self?.welfareStorage.addChips(GameConstants.rewardAdChips)
                self?.loadState()
                self?.isAdLoading = false
                self?.showToast(L10n.f("welfare.toast.reward_ad_claimed", GameConstants.rewardAdChips))
            }
        }
    }

    private func showToast(_ message: String) {
        toastMessage = message

        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
            if self?.toastMessage == message {
                self?.toastMessage = nil
            }
        }
    }
}
