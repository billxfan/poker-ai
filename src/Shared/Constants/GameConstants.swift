import Foundation

enum GameConstants {
    // MARK: - Blinds
    static let smallBlind: Int = 10
    static let bigBlind: Int = 20

    // MARK: - Starting Chips
    static let startingChips: Int = 2000

    // MARK: - Welfare
    static let dailyFreeChips: Int = 2000
    static let dailySignInBonus: Int = 1000
    static let rewardAdChips: Int = 1000

    // MARK: - AI Thinking Delay
    static let aiThinkingDelayMin: Double = 1.0
    static let aiThinkingDelayMax: Double = 3.0

    // MARK: - Table
    static let playerCount: Int = 6

    // MARK: - Quick Bet Multipliers
    static let quickBetMultipliers: [Double] = [0.33, 0.5, 0.67, 1.0, 1.2]

    // MARK: - Card Display
    static let cardWidth: CGFloat = 44
    static let cardHeight: CGFloat = 60
    static let holeCardWidth: CGFloat = 48
    static let holeCardHeight: CGFloat = 64
    static let cardSpacing: CGFloat = 4
}
