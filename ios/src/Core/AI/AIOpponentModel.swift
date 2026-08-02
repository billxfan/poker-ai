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
        case 0.65...: looseness = L10n.t("opponent_read.tight")
        case ..<0.35: looseness = L10n.t("opponent_read.loose")
        default: looseness = L10n.t("opponent_read.medium_vpip")
        }

        let aggression: String
        switch aggressionRate {
        case ..<0.18: aggression = L10n.t("opponent_read.passive")
        case 0.38...: aggression = L10n.t("opponent_read.aggressive")
        default: aggression = L10n.t("opponent_read.medium_aggression")
        }

        let pressure: String
        switch foldToAggressionRate {
        case 0.55...: pressure = L10n.t("opponent_read.folds_to_pressure")
        case ..<0.28 where continueFacingAggressionRate > 0.45: pressure = L10n.t("opponent_read.resists_pressure")
        default: pressure = L10n.t("opponent_read.medium_pressure")
        }

        let bluff: String
        switch bluffRate {
        case 0.45...: bluff = L10n.t("opponent_read.bluffs_often")
        case ..<0.18: bluff = L10n.t("opponent_read.bluffs_rarely")
        default: bluff = L10n.t("opponent_read.medium_bluff")
        }

        return "\(looseness) · \(aggression) · \(pressure) · \(bluff)"
    }

    var counterStrategyText: String {
        if foldToAggressionRate >= 0.50 {
            return L10n.t("opponent_strategy.steal_more")
        }

        if continueFacingAggressionRate >= 0.55 {
            return L10n.t("opponent_strategy.value_bet_more")
        }

        if bluffRate >= 0.40 {
            return L10n.t("opponent_strategy.call_down_more")
        }

        if aggressionRate >= 0.38, bluffRate < 0.22 {
            return L10n.t("opponent_strategy.respect_aggression")
        }

        return L10n.t("opponent_strategy.baseline")
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
