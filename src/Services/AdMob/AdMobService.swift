import Foundation
import UIKit

#if canImport(GoogleMobileAds)
import GoogleMobileAds
#endif

protocol IAdMobService {
    func loadRewardedAd(completion: (() -> Void)?)
    func showRewardedAd(from viewController: UIViewController, onReward: @escaping (Int) -> Void)
    var isRewardedAdReady: Bool { get }
}

final class AdMobService: NSObject, IAdMobService {
    static let shared = AdMobService()

    #if canImport(GoogleMobileAds)
    private var rewardedAd: RewardedAd?
    #endif
    private var rewardCallback: ((Int) -> Void)?

    private override init() {
        super.init()
    }

    func configure() {
        #if canImport(GoogleMobileAds)
        MobileAds.shared.start { [weak self] _ in
            #if DEBUG
            print("[AdMob] SDK initialized")
            #endif
            self?.loadRewardedAd()
        }
        #endif
    }

    func loadRewardedAd(completion: (() -> Void)? = nil) {
        #if canImport(GoogleMobileAds)
        let request = Request()

        RewardedAd.load(
            with: AdMobConfig.rewardedAdUnitID,
            request: request
        ) { [weak self] ad, error in
            if let error {
                #if DEBUG
                print("[AdMob] Failed to load rewarded ad: \(error.localizedDescription)")
                #endif
                completion?()
                return
            }
            self?.rewardedAd = ad
            ad?.fullScreenContentDelegate = self
            #if DEBUG
            print("[AdMob] Rewarded ad loaded successfully")
            #endif
            completion?()
        }
        #endif
    }

    var isRewardedAdReady: Bool {
        #if canImport(GoogleMobileAds)
        return rewardedAd != nil
        #else
        return false
        #endif
    }

    func showRewardedAd(from viewController: UIViewController, onReward: @escaping (Int) -> Void) {
        #if canImport(GoogleMobileAds)
        guard let ad = rewardedAd else {
            #if DEBUG
            print("[AdMob] Rewarded ad not ready, reloading...")
            #endif
            loadRewardedAd()
            return
        }

        rewardCallback = onReward
        ad.present(from: viewController) { [weak self] in
            let reward = ad.adReward
            let points = Int(reward.amount)
            #if DEBUG
            print("[AdMob] User earned reward: \(points) \(reward.type)")
            #endif
            self?.rewardCallback?(points)
            self?.rewardCallback = nil
        }
        #endif
    }
}

#if canImport(GoogleMobileAds)
extension AdMobService: FullScreenContentDelegate {
    func adDidDismissFullScreenContent(_ ad: FullScreenPresentingAd) {
        rewardedAd = nil
        loadRewardedAd()
    }

    func ad(_ ad: FullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) {
        #if DEBUG
        print("[AdMob] Failed to present ad: \(error.localizedDescription)")
        #endif
        rewardedAd = nil
        loadRewardedAd()
    }
}
#endif
