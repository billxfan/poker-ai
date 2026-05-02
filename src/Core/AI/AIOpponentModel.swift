import Foundation

struct AIOpponentProfile: Codable {
    var handsObserved: Int = 0
    var vpipCount: Int = 0
    var pfrCount: Int = 0
    var aggressiveActionCount: Int = 0
    var totalActionCount: Int = 0
    var pressureOpportunities: Int = 0
    var foldFacingAggressionCount: Int = 0
    var continueFacingAggressionCount: Int = 0
    var showdownCount: Int = 0
    var showdownWins: Int = 0
    var bluffLikeAttempts: Int = 0
    var bluffLikeSuccesses: Int = 0
    var defaultWinCount: Int = 0
    var lastShownHandType: HandType?
    var lastUpdated: Date = Date()

    var vpip: Double { handsObserved > 0 ? Double(vpipCount) / Double(handsObserved) : 0 }
    var pfr: Double { handsObserved > 0 ? Double(pfrCount) / Double(handsObserved) : 0 }
    var aggressionRate: Double { totalActionCount > 0 ? Double(aggressiveActionCount) / Double(totalActionCount) : 0 }
    var foldToAggressionRate: Double {
        pressureOpportunities > 0 ? Double(foldFacingAggressionCount) / Double(pressureOpportunities) : 0
    }
    var continueFacingAggressionRate: Double {
        pressureOpportunities > 0 ? Double(continueFacingAggressionCount) / Double(pressureOpportunities) : 0
    }
    var showdownWinRate: Double {
        showdownCount > 0 ? Double(showdownWins) / Double(showdownCount) : 0
    }
    var bluffRate: Double {
        bluffLikeAttempts > 0 ? Double(bluffLikeSuccesses) / Double(bluffLikeAttempts) : 0
    }
    var sampleConfidence: Double {
        clamp(Double(handsObserved) / 12.0, min: 0, max: 1)
    }

    /// Perceived tightness considering both VPIP and default wins (winning without action = tight image)
    var perceivedTightness: Double {
        guard handsObserved > 0 else { return 0 }
        let vpipComponent = 1.0 - vpip
        let defaultWinComponent = Double(defaultWinCount) / Double(handsObserved)
        return (vpipComponent * 0.6 + defaultWinComponent * 0.4)
    }

    var readSummaryText: String {
        let looseness: String
        switch perceivedTightness {
        case 0.65...: looseness = "偏紧"
        case ..<0.35: looseness = "偏松"
        default: looseness = "中等入局"
        }

        let aggression: String
        switch aggressionRate {
        case ..<0.18: aggression = "偏被动"
        case 0.38...: aggression = "偏激进"
        default: aggression = "进攻中等"
        }

        let pressure: String
        switch foldToAggressionRate {
        case 0.55...: pressure = "受压易弃牌"
        case ..<0.28 where continueFacingAggressionRate > 0.45: pressure = "抗压偏强"
        default: pressure = "抗压一般"
        }

        let bluff: String
        switch bluffRate {
        case 0.45...: bluff = "诈唬偏多"
        case ..<0.18: bluff = "诈唬较少"
        default: bluff = "诈唬适中"
        }

        return "\(looseness) · \(aggression) · \(pressure) · \(bluff)"
    }

    var counterStrategyText: String {
        if foldToAggressionRate >= 0.50 {
            return "AI 会增加偷池与持续下注频率"
        }

        if continueFacingAggressionRate >= 0.55 {
            return "AI 会减少纯诈唬，转向价值下注"
        }

        if bluffRate >= 0.40 {
            return "AI 会更愿意跟注到底，减少被诈唬"
        }

        if aggressionRate >= 0.38, bluffRate < 0.22 {
            return "AI 会更尊重你的进攻，适当收紧跟注"
        }

        return "AI 会保持基线策略，继续观察你的倾向"
    }

    mutating func observeHand(
        playerId: Int,
        playerActions: [Action],
        allActions: [Action],
        didWin: Bool,
        showdown: Bool,
        shownHandType: HandType?
    ) {
        handsObserved += 1

        let aggressiveTypes: Set<ActionType> = [.raise, .bet, .allIn]
        let voluntaryTypes: Set<ActionType> = [.call, .raise, .bet, .allIn]
        let preFlopActions = playerActions.filter { $0.street == .preFlop }

        if preFlopActions.contains(where: { voluntaryTypes.contains($0.type) }) {
            vpipCount += 1
        }

        if preFlopActions.contains(where: { aggressiveTypes.contains($0.type) }) {
            pfrCount += 1
        }

        aggressiveActionCount += playerActions.filter { aggressiveTypes.contains($0.type) }.count
        totalActionCount += playerActions.count

        var currentStreet: Street?
        var hadAggressionThisStreet = false
        var lastAggressorId: Int?

        for action in allActions {
            if action.street != currentStreet {
                currentStreet = action.street
                hadAggressionThisStreet = false
                lastAggressorId = nil
            }

            if action.playerId == playerId, hadAggressionThisStreet, lastAggressorId != playerId {
                pressureOpportunities += 1

                if action.type == .fold {
                    foldFacingAggressionCount += 1
                } else if action.type != .check {
                    continueFacingAggressionCount += 1
                }
            }

            if aggressiveTypes.contains(action.type) {
                hadAggressionThisStreet = true
                lastAggressorId = action.playerId
            }
        }

        if showdown {
            showdownCount += 1
            if didWin {
                showdownWins += 1
            }
            lastShownHandType = shownHandType
        }

        let wasAggressiveOverall = playerActions.contains { aggressiveTypes.contains($0.type) }
        let weakShowdown = showdown && (shownHandType?.rawValue ?? 0) <= HandType.onePair.rawValue
        if wasAggressiveOverall && (!showdown || weakShowdown) {
            bluffLikeAttempts += 1
            if didWin {
                bluffLikeSuccesses += 1
            }
        }

        // Track "default wins" — opponent won without taking any action (e.g. everyone folded to their blind)
        if playerActions.isEmpty && didWin {
            defaultWinCount += 1
        }

        lastUpdated = Date()
    }
}

struct AILearningSnapshot: Codable, Identifiable {
    let handIndex: Int
    let totalProfit: Int
    let aggressionBias: Double
    let tightnessBias: Double
    let bluffBias: Double
    let explorationRate: Double
    let observedHumanVPIP: Double?
    let observedHumanPFR: Double?
    let observedHumanFoldToAggression: Double?
    let observedHumanBluffRate: Double?
    let createdAt: Date

    var id: Int { handIndex }
}
