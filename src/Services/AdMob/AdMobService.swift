import Foundation
import UIKit

#if canImport(GoogleMobileAds)
import GoogleMobileAds
#endif

#if canImport(UserMessagingPlatform)
import UserMessagingPlatform
#endif

protocol IAdMobService {
    func prepareForAds(from viewController: UIViewController, completion: (() -> Void)?)
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
    private var hasStartedMobileAds = false
    private var isPreparingAds = false
    private var prepareCompletions: [() -> Void] = []

    private override init() {
        super.init()
    }

    func configure() {
        #if canImport(GoogleMobileAds)
        #if !canImport(UserMessagingPlatform)
        startMobileAdsIfNeeded()
        #endif
        #endif
    }

    func prepareForAds(from viewController: UIViewController, completion: (() -> Void)? = nil) {
        #if canImport(GoogleMobileAds)
        if let completion {
            prepareCompletions.append(completion)
        }

        guard !isPreparingAds else { return }
        isPreparingAds = true

        #if DEBUG
        // Skip UMP consent in DEBUG — consent forms aren't configured for test builds
        startMobileAdsIfNeeded()
        finishPreparingAds()
        #elseif canImport(UserMessagingPlatform)
        let parameters = RequestParameters()
        parameters.isTaggedForUnderAgeOfConsent = false

        ConsentInformation.shared.requestConsentInfoUpdate(with: parameters) { [weak self, weak viewController] requestError in
            guard let self else { return }

            if let requestError {
                print("[AdMob] Consent info update failed: \(requestError.localizedDescription)")
                self.finishPreparingAds()
                return
            }

            guard let viewController else {
                self.startAdsIfConsentAllows()
                return
            }

            ConsentForm.loadAndPresentIfRequired(from: viewController) { [weak self] formError in
                guard let self else { return }
                if let formError {
                    print("[AdMob] Consent form failed: \(formError.localizedDescription)")
                }
                self.startAdsIfConsentAllows()
            }
        }
        #else
        startMobileAdsIfNeeded()
        finishPreparingAds()
        #endif
        #else
        completion?()
        #endif
    }

    private func startAdsIfConsentAllows() {
        #if canImport(GoogleMobileAds) && canImport(UserMessagingPlatform)
        if ConsentInformation.shared.canRequestAds {
            startMobileAdsIfNeeded()
        }
        finishPreparingAds()
        #endif
    }

    private func finishPreparingAds() {
        isPreparingAds = false
        let completions = prepareCompletions
        prepareCompletions = []
        completions.forEach { $0() }
    }

    private func startMobileAdsIfNeeded() {
        #if canImport(GoogleMobileAds)
        guard !hasStartedMobileAds else {
            if rewardedAd == nil {
                loadRewardedAd()
            }
            return
        }

        hasStartedMobileAds = true
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
        guard hasStartedMobileAds else {
            completion?()
            return
        }

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
        guard hasStartedMobileAds else {
            prepareForAds(from: viewController)
            return
        }

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
            let points = Int(truncating: reward.amount)
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
        if hasStartedMobileAds {
            loadRewardedAd()
        }
    }

    func ad(_ ad: FullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) {
        #if DEBUG
        print("[AdMob] Failed to present ad: \(error.localizedDescription)")
        #endif
        rewardedAd = nil
        if hasStartedMobileAds {
            loadRewardedAd()
        }
    }
}
#endif
