import Foundation

enum AdMobConfig {
    /// App ID (from AdMob dashboard)
    static let appID = "ca-app-pub-4141888691603158~7766666763"

    /// Rewarded ad unit ID
    static let rewardedAdUnitID: String = {
        #if DEBUG
        // Google test ad unit ID for rewarded ads
        return "ca-app-pub-3940256099942544/1712485313"
        #else
        return "ca-app-pub-4141888691603158/3238281311"
        #endif
    }()

    /// SKAdNetwork identifier for AdMob
    static let skAdNetworkIdentifier = "cstr6suwn9.skadnetwork"
}
