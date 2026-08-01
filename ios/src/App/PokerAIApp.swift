import SwiftUI
#if canImport(FirebaseCore)
import FirebaseCore
#endif

@main
struct PokerAIApp: App {
    @State private var analytics = AnalyticsService.shared

    init() {
        #if canImport(FirebaseCore)
        if Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil {
            FirebaseConfiguration.shared.setLoggerLevel(.min)
            FirebaseApp.configure()
            AnalyticsService.shared.setFirebaseEnabled(true)
        } else {
            AnalyticsService.shared.setFirebaseEnabled(false)
        }
        #endif
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
