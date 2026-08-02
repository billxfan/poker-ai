import Foundation

func clamp(_ value: Double, min lowerBound: Double, max upperBound: Double) -> Double {
    Swift.min(upperBound, Swift.max(lowerBound, value))
}

struct AIStyleLearningProfile {
    let aggressiveThreshold: Double
    let passiveThreshold: Double
    let aggressionChance: Double
    let continueChance: Double
    let bluffThreshold: Double
    let bluffChance: Double
    let learningRate: Double
    let memoryWindow: Int
    let adjustmentCap: Double
    let initialEpsilon: Double
    let minimumEpsilon: Double
    let explorationDecayMultiplier: Double
    let aggressiveLearningWeight: Double
    let passiveLearningWeight: Double
    let foldLearningWeight: Double
    let explorationFeedbackDiscount: Double
}

struct AIDecisionTuning: Equatable {
    let aggressiveThreshold: Double
    let passiveThreshold: Double
    let aggressionChance: Double
    let continueChance: Double
    let bluffThreshold: Double
    let bluffChance: Double
}

struct AIOpponentDecisionAdjustment {
    var aggressiveThresholdDelta: Double = 0
    var passiveThresholdDelta: Double = 0
    var aggressionChanceDelta: Double = 0
    var continueChanceDelta: Double = 0
    var bluffThresholdDelta: Double = 0
    var bluffChanceDelta: Double = 0

    func adding(_ other: AIOpponentDecisionAdjustment) -> AIOpponentDecisionAdjustment {
        AIOpponentDecisionAdjustment(
            aggressiveThresholdDelta: aggressiveThresholdDelta + other.aggressiveThresholdDelta,
            passiveThresholdDelta: passiveThresholdDelta + other.passiveThresholdDelta,
            aggressionChanceDelta: aggressionChanceDelta + other.aggressionChanceDelta,
            continueChanceDelta: continueChanceDelta + other.continueChanceDelta,
            bluffThresholdDelta: bluffThresholdDelta + other.bluffThresholdDelta,
            bluffChanceDelta: bluffChanceDelta + other.bluffChanceDelta
        )
    }
}

extension AIStyle: CaseIterable {
    static var allCases: [AIStyle] {
        [.tightAggressive, .looseAggressive, .tightWeak, .looseWeak, .balanced]
    }

    var learningProfile: AIStyleLearningProfile {
        switch self {
        case .tightAggressive:
            return AIStyleLearningProfile(
                aggressiveThreshold: 0.60,
                passiveThreshold: 0.32,
                aggressionChance: 0.88,
                continueChance: 0.82,
                bluffThreshold: 0.24,
                bluffChance: 0.10,
                learningRate: 0.30,
                memoryWindow: 50,
                adjustmentCap: 0.15,
                initialEpsilon: 0.30,
                minimumEpsilon: 0.05,
                explorationDecayMultiplier: 0.80,
                aggressiveLearningWeight: 1.10,
                passiveLearningWeight: 0.90,
                foldLearningWeight: 1.00,
                explorationFeedbackDiscount: 0.92
            )
        case .looseAggressive:
            return AIStyleLearningProfile(
                aggressiveThreshold: 0.42,
                passiveThreshold: 0.20,
                aggressionChance: 0.82,
                continueChance: 0.76,
                bluffThreshold: 0.12,
                bluffChance: 0.34,
                learningRate: 0.50,
                memoryWindow: 30,
                adjustmentCap: 0.30,
                initialEpsilon: 0.40,
                minimumEpsilon: 0.10,
                explorationDecayMultiplier: 0.85,
                aggressiveLearningWeight: 1.28,
                passiveLearningWeight: 0.88,
                foldLearningWeight: 0.86,
                explorationFeedbackDiscount: 0.95
            )
        case .tightWeak:
            return AIStyleLearningProfile(
                aggressiveThreshold: 0.80,
                passiveThreshold: 0.62,
                aggressionChance: 0.18,
                continueChance: 0.88,
                bluffThreshold: 0.18,
                bluffChance: 0.02,
                learningRate: 0.10,
                memoryWindow: 20,
                adjustmentCap: 0.05,
                initialEpsilon: 0.20,
                minimumEpsilon: 0.05,
                explorationDecayMultiplier: 0.90,
                aggressiveLearningWeight: 0.72,
                passiveLearningWeight: 1.05,
                foldLearningWeight: 1.18,
                explorationFeedbackDiscount: 0.82
            )
        case .looseWeak:
            return AIStyleLearningProfile(
                aggressiveThreshold: 0.72,
                passiveThreshold: 0.28,
                aggressionChance: 0.08,
                continueChance: 0.92,
                bluffThreshold: 0.10,
                bluffChance: 0.06,
                learningRate: 0.05,
                memoryWindow: 10,
                adjustmentCap: 0.03,
                initialEpsilon: 0.35,
                minimumEpsilon: 0.15,
                explorationDecayMultiplier: 0.90,
                aggressiveLearningWeight: 0.62,
                passiveLearningWeight: 1.00,
                foldLearningWeight: 0.92,
                explorationFeedbackDiscount: 0.78
            )
        case .balanced:
            return AIStyleLearningProfile(
                aggressiveThreshold: 0.52,
                passiveThreshold: 0.26,
                aggressionChance: 0.58,
                continueChance: 0.72,
                bluffThreshold: 0.18,
                bluffChance: 0.18,
                learningRate: 0.40,
                memoryWindow: 60,
                adjustmentCap: 0.25,
                initialEpsilon: 0.30,
                minimumEpsilon: 0.08,
                explorationDecayMultiplier: 0.82,
                aggressiveLearningWeight: 1.00,
                passiveLearningWeight: 1.00,
                foldLearningWeight: 1.00,
                explorationFeedbackDiscount: 0.90
            )
        }
    }
}

extension HandType {
    var aiStrengthScore: Double {
        switch self {
        case .highCard: return 0.18
        case .onePair: return 0.34
        case .twoPair: return 0.50
        case .threeOfAKind: return 0.62
        case .straight: return 0.72
        case .flush: return 0.78
        case .fullHouse: return 0.88
        case .fourOfAKind: return 0.95
        case .straightFlush: return 0.98
        case .royalFlush: return 1.0
        }
    }
}
