import Foundation

enum AIPressureState: String, Codable {
    case unopened
    case facingBet
    case facingRaise
}

enum AIHandStrengthBucket: String, Codable {
    case weak
    case marginal
    case strong
    case premium

    static func from(strength: Double) -> AIHandStrengthBucket {
        switch strength {
        case ..<0.33: return .weak
        case ..<0.58: return .marginal
        case ..<0.80: return .strong
        default: return .premium
        }
    }

    var isWeakOrMarginal: Bool {
        self == .weak || self == .marginal
    }
}

struct AILearningContext: Codable, Hashable {
    let street: Street
    let position: Position
    let pressure: AIPressureState
    let strengthBucket: AIHandStrengthBucket
    let isHeadsUp: Bool

    var storageKey: String {
        [
            street.rawValue,
            position.rawValue,
            pressure.rawValue,
            strengthBucket.rawValue,
            isHeadsUp ? "hu" : "mw"
        ].joined(separator: "|")
    }

    static func from(storageKey: String) -> AILearningContext? {
        let parts = storageKey.split(separator: "|").map(String.init)
        guard parts.count == 5,
              let street = Street(rawValue: parts[0]),
              let position = Position(rawValue: parts[1]),
              let pressure = AIPressureState(rawValue: parts[2]),
              let strengthBucket = AIHandStrengthBucket(rawValue: parts[3])
        else {
            return nil
        }

        return AILearningContext(
            street: street,
            position: position,
            pressure: pressure,
            strengthBucket: strengthBucket,
            isHeadsUp: parts[4] == "hu"
        )
    }
}

enum AILearningActionKind: String, Codable {
    case fold
    case passive
    case aggressive

    static func from(action: Action) -> AILearningActionKind {
        switch action.type {
        case .fold:
            return .fold
        case .check, .call:
            return .passive
        case .bet, .raise, .allIn:
            return .aggressive
        }
    }
}

struct AILearningDecisionPoint: Codable {
    let context: AILearningContext
    let actionKind: AILearningActionKind
    let handStrength: Double
    let committedAmount: Int
    let usedExploration: Bool
    let createdAt: Date
}

struct AIContextPolicy: Codable {
    var foldScore: Double = 0
    var passiveScore: Double = 0
    var aggressiveScore: Double = 0
    var sampleCount: Int = 0
    var cumulativeReward: Double = 0
    var lastUpdated: Date = Date()

    func score(for actionKind: AILearningActionKind) -> Double {
        switch actionKind {
        case .fold: return foldScore
        case .passive: return passiveScore
        case .aggressive: return aggressiveScore
        }
    }

    mutating func applyFeedback(
        for actionKind: AILearningActionKind,
        reward: Double,
        learningRate: Double
    ) {
        sampleCount += 1
        cumulativeReward += reward

        switch actionKind {
        case .fold:
            foldScore += (reward - foldScore) * learningRate
        case .passive:
            passiveScore += (reward - passiveScore) * learningRate
        case .aggressive:
            aggressiveScore += (reward - aggressiveScore) * learningRate
        }

        lastUpdated = Date()
    }
}

struct AIDecisionPlan {
    let action: Action
    let learningPoint: AILearningDecisionPoint
}
