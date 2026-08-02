import Foundation

enum AnalyticsEvent {
    // MARK: - App Lifecycle
    static let appLaunch = "app_launch"
    static let appBackground = "app_background"

    // MARK: - Game Flow
    static let gameStart = "game_start"
    static let gameEnd = "game_end"
    static let handResult = "hand_result"
    static let handAction = "hand_action"

    // MARK: - User Behavior
    static let tutorialComplete = "tutorial_complete"
    static let firstGameTime = "first_game_time"
    static let sessionDuration = "session_duration"
    static let exitFromGame = "exit_from_game"

    // MARK: - Monetization (future)
    static let purchaseAttempt = "purchase_attempt"
    static let purchaseComplete = "purchase_complete"
}

enum AnalyticsParam {
    static let handNumber = "hand_number"
    static let profit = "profit"
    static let result = "result"           // win / lose / tie
    static let handType = "hand_type"
    static let showdown = "showdown"
    static let potSize = "pot_size"
    static let duration = "duration"
    static let aiProfile = "ai_profile"
    static let action = "action"           // fold / call / raise / all_in
    static let street = "street"
    static let chipCount = "chip_count"
    static let totalGames = "total_games"
    static let daysSinceInstall = "days_since_install"
    static let source = "source"           // new_game / restored
}
