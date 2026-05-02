import SwiftUI
#if canImport(FirebaseCore)
import FirebaseCore
#endif

@main
struct PokerAIApp: App {
    @State private var analytics = AnalyticsService.shared

    init() {
        #if canImport(FirebaseCore)
        FirebaseApp.configure()
        #endif
        AdMobService.shared.configure()
        AnalyticsService.shared.log(AnalyticsEvent.appLaunch)
    }

    var body: some Scene {
        WindowGroup {
            MainView()
                .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
                    analytics.log(AnalyticsEvent.appLaunch)
                }
                .onReceive(NotificationCenter.default.publisher(for: UIApplication.didEnterBackgroundNotification)) { _ in
                    analytics.log(AnalyticsEvent.appBackground)
                }
        }
    }
}
