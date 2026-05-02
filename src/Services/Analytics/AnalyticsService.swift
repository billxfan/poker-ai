import Foundation
#if canImport(FirebaseAnalytics)
import FirebaseAnalytics
#endif

protocol IAnalyticsService {
    func log(_ event: String, parameters: [String: Any])
    func setUserID(_ id: String?)
}

extension IAnalyticsService {
    func log(_ event: String) {
        log(event, parameters: [:])
    }
}

final class AnalyticsService: IAnalyticsService {
    static let shared = AnalyticsService()

    private init() {}

    func log(_ event: String, parameters: [String: Any] = [:]) {
        #if canImport(FirebaseAnalytics)
        Analytics.logEvent(event, parameters: parameters)
        #else
        // Fallback: print in debug, no-op in release
        #if DEBUG
        print("[Analytics] \(event) \(parameters)")
        #endif
        #endif
    }

    func setUserID(_ id: String?) {
        #if canImport(FirebaseAnalytics)
        Analytics.setUserID(id)
        #endif
    }
}

// MARK: - Convenience

extension IAnalyticsService {
    func logGameStart(chips: Int, source: String) {
        log(AnalyticsEvent.gameStart, parameters: [
            AnalyticsParam.chipCount: chips,
            AnalyticsParam.source: source
        ])
    }

    func logGameEnd(totalGames: Int, duration: TimeInterval) {
        log(AnalyticsEvent.gameEnd, parameters: [
            AnalyticsParam.totalGames: totalGames,
            AnalyticsParam.duration: Int(duration)
        ])
    }

    func logHandResult(
        handNumber: Int,
        result: String,
        profit: Int,
        handType: String?,
        showdown: Bool,
        potSize: Int,
        aiProfile: String?
    ) {
        var params: [String: Any] = [
            AnalyticsParam.handNumber: handNumber,
            AnalyticsParam.result: result,
            AnalyticsParam.profit: profit,
            AnalyticsParam.showdown: showdown,
            AnalyticsParam.potSize: potSize
        ]
        if let handType { params[AnalyticsParam.handType] = handType }
        if let aiProfile { params[AnalyticsParam.aiProfile] = aiProfile }
        log(AnalyticsEvent.handResult, parameters: params)
    }

    func logHandAction(action: String, street: String, potSize: Int) {
        log(AnalyticsEvent.handAction, parameters: [
            AnalyticsParam.action: action,
            AnalyticsParam.street: street,
            AnalyticsParam.potSize: potSize
        ])
    }

    func logFirstGameTime(_ interval: TimeInterval) {
        log(AnalyticsEvent.firstGameTime, parameters: [
            AnalyticsParam.duration: Int(interval)
        ])
    }

    func logTutorialComplete() {
        log(AnalyticsEvent.tutorialComplete)
    }
}
