import Foundation

struct AIPattern: Codable {
    /// 入池次数（用于计算 VPIP = vpipCount / handsPlayed）
    var vpipCount: Int = 0
    /// 翻牌前加注次数（用于计算 PFR = pfrCount / handsPlayed）
    var pfrCount: Int = 0
    /// 3-bet 次数
    var threeBetCount: Int = 0
    /// 激进动作次数（用于计算 AF = afCount / handsPlayed）
    var afCount: Int = 0
    /// 总参与手数
    var handsPlayed: Int = 0

    /// 累计盈亏（结果驱动学习的核心反馈）
    var totalProfit: Int = 0
    /// 摊牌赢/输次数
    var showdownWins: Int = 0
    var showdownLosses: Int = 0
    /// 非摊牌赢/输次数（代表施压成功/失败）
    var nonShowdownWins: Int = 0
    var nonShowdownLosses: Int = 0
    /// 激进行动参与并赢/输的手数
    var aggressiveWins: Int = 0
    var aggressiveLosses: Int = 0
    /// 近似诈唬/施压成功与失败
    var bluffSuccessCount: Int = 0
    var bluffPunishedCount: Int = 0
    /// 归一化学习偏移（最终应用时再乘风格 cap）
    var learnedAggressionBias: Double = 0
    var learnedTightnessBias: Double = 0
    var learnedBluffBias: Double = 0
    /// AI 观察到的对手画像（人类与其他机器人）
    var observedOpponents: [Int: AIOpponentProfile] = [:]
    /// 按手沉淀的学习快照，用于趋势展示
    var learningSnapshots: [AILearningSnapshot] = []

    var lastUpdated: Date = Date()

    private enum CodingKeys: String, CodingKey {
        case vpipCount
        case pfrCount
        case threeBetCount
        case afCount
        case handsPlayed
        case totalProfit
        case showdownWins
        case showdownLosses
        case nonShowdownWins
        case nonShowdownLosses
        case aggressiveWins
        case aggressiveLosses
        case bluffSuccessCount
        case bluffPunishedCount
        case learnedAggressionBias
        case learnedTightnessBias
        case learnedBluffBias
        case observedOpponents
        case learningSnapshots
        case lastUpdated
    }

    init() {}

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        vpipCount = try container.decodeIfPresent(Int.self, forKey: .vpipCount) ?? 0
        pfrCount = try container.decodeIfPresent(Int.self, forKey: .pfrCount) ?? 0
        threeBetCount = try container.decodeIfPresent(Int.self, forKey: .threeBetCount) ?? 0
        afCount = try container.decodeIfPresent(Int.self, forKey: .afCount) ?? 0
        handsPlayed = try container.decodeIfPresent(Int.self, forKey: .handsPlayed) ?? 0
        totalProfit = try container.decodeIfPresent(Int.self, forKey: .totalProfit) ?? 0
        showdownWins = try container.decodeIfPresent(Int.self, forKey: .showdownWins) ?? 0
        showdownLosses = try container.decodeIfPresent(Int.self, forKey: .showdownLosses) ?? 0
        nonShowdownWins = try container.decodeIfPresent(Int.self, forKey: .nonShowdownWins) ?? 0
        nonShowdownLosses = try container.decodeIfPresent(Int.self, forKey: .nonShowdownLosses) ?? 0
        aggressiveWins = try container.decodeIfPresent(Int.self, forKey: .aggressiveWins) ?? 0
        aggressiveLosses = try container.decodeIfPresent(Int.self, forKey: .aggressiveLosses) ?? 0
        bluffSuccessCount = try container.decodeIfPresent(Int.self, forKey: .bluffSuccessCount) ?? 0
        bluffPunishedCount = try container.decodeIfPresent(Int.self, forKey: .bluffPunishedCount) ?? 0
        learnedAggressionBias = try container.decodeIfPresent(Double.self, forKey: .learnedAggressionBias) ?? 0
        learnedTightnessBias = try container.decodeIfPresent(Double.self, forKey: .learnedTightnessBias) ?? 0
        learnedBluffBias = try container.decodeIfPresent(Double.self, forKey: .learnedBluffBias) ?? 0
        observedOpponents = try container.decodeIfPresent([Int: AIOpponentProfile].self, forKey: .observedOpponents) ?? [:]
        learningSnapshots = try container.decodeIfPresent([AILearningSnapshot].self, forKey: .learningSnapshots) ?? []
        lastUpdated = try container.decodeIfPresent(Date.self, forKey: .lastUpdated) ?? Date()
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(vpipCount, forKey: .vpipCount)
        try container.encode(pfrCount, forKey: .pfrCount)
        try container.encode(threeBetCount, forKey: .threeBetCount)
        try container.encode(afCount, forKey: .afCount)
        try container.encode(handsPlayed, forKey: .handsPlayed)
        try container.encode(totalProfit, forKey: .totalProfit)
        try container.encode(showdownWins, forKey: .showdownWins)
        try container.encode(showdownLosses, forKey: .showdownLosses)
        try container.encode(nonShowdownWins, forKey: .nonShowdownWins)
        try container.encode(nonShowdownLosses, forKey: .nonShowdownLosses)
        try container.encode(aggressiveWins, forKey: .aggressiveWins)
        try container.encode(aggressiveLosses, forKey: .aggressiveLosses)
        try container.encode(bluffSuccessCount, forKey: .bluffSuccessCount)
        try container.encode(bluffPunishedCount, forKey: .bluffPunishedCount)
        try container.encode(learnedAggressionBias, forKey: .learnedAggressionBias)
        try container.encode(learnedTightnessBias, forKey: .learnedTightnessBias)
        try container.encode(learnedBluffBias, forKey: .learnedBluffBias)
        try container.encode(observedOpponents, forKey: .observedOpponents)
        try container.encode(learningSnapshots, forKey: .learningSnapshots)
        try container.encode(lastUpdated, forKey: .lastUpdated)
    }

    var vpip: Double { handsPlayed > 0 ? Double(vpipCount) / Double(handsPlayed) : 0 }
    var pfr: Double { handsPlayed > 0 ? Double(pfrCount) / Double(handsPlayed) : 0 }
    var threeBet: Double { pfrCount > 0 ? Double(threeBetCount) / Double(pfrCount) : 0 }
    /// 激进频率：激进动作占比
    var af: Double { handsPlayed > 0 ? Double(afCount) / Double(handsPlayed) : 0 }
    var aggressionFactor: Double { clamp(af + learnedAggressionBias * 0.15, min: 0, max: 1) }
    var showdownWinRate: Double {
        let total = showdownWins + showdownLosses
        return total > 0 ? Double(showdownWins) / Double(total) : 0
    }
    var nonShowdownWinRate: Double {
        let total = nonShowdownWins + nonShowdownLosses
        return total > 0 ? Double(nonShowdownWins) / Double(total) : 0
    }
    var averageProfitPerHand: Double {
        handsPlayed > 0 ? Double(totalProfit) / Double(handsPlayed) : 0
    }

    func sampleConfidence(for style: AIStyle) -> Double {
        let window = max(1, style.learningProfile.memoryWindow)
        return clamp(Double(handsPlayed) / Double(window), min: 0, max: 1)
    }

    func currentLearningRate(for style: AIStyle) -> Double {
        let profile = style.learningProfile
        let decaySteps = handsPlayed / max(1, profile.memoryWindow)
        return profile.learningRate * pow(0.9, Double(decaySteps))
    }

    func explorationRate(for style: AIStyle) -> Double {
        let profile = style.learningProfile
        let decaySteps = handsPlayed / max(1, profile.memoryWindow)
        let raw = profile.initialEpsilon * pow(profile.explorationDecayMultiplier, Double(decaySteps))
        return max(profile.minimumEpsilon, raw)
    }

    func decisionTuning(for style: AIStyle) -> AIDecisionTuning {
        let profile = style.learningProfile
        let confidence = sampleConfidence(for: style)
        let cap = profile.adjustmentCap * confidence

        let aggressionBias = learnedAggressionBias * cap
        let tightnessBias = learnedTightnessBias * cap
        let bluffBias = learnedBluffBias * cap

        return AIDecisionTuning(
            aggressiveThreshold: clamp(
                profile.aggressiveThreshold - aggressionBias * 0.60 + tightnessBias * 0.90,
                min: 0.08,
                max: 0.95
            ),
            passiveThreshold: clamp(
                profile.passiveThreshold - aggressionBias * 0.25 + tightnessBias * 0.70,
                min: 0.05,
                max: 0.90
            ),
            aggressionChance: clamp(
                profile.aggressionChance + aggressionBias * 1.40 - tightnessBias * 0.45,
                min: 0.02,
                max: 0.98
            ),
            continueChance: clamp(
                profile.continueChance + aggressionBias * 0.30 - tightnessBias * 0.95,
                min: 0.05,
                max: 0.98
            ),
            bluffThreshold: clamp(
                profile.bluffThreshold - bluffBias * 0.80 + tightnessBias * 0.25,
                min: 0.0,
                max: 0.75
            ),
            bluffChance: clamp(
                profile.bluffChance + bluffBias * 1.40 + aggressionBias * 0.25 - tightnessBias * 0.40,
                min: 0.0,
                max: 0.80
            )
        )
    }

    func decisionTuning(
        for style: AIStyle,
        against opponents: [Player],
        actionLog: [Action],
        street: Street,
        selfPlayerId: Int,
        communityCards: [Card] = [],
        playerPosition: Position = .utg
    ) -> AIDecisionTuning {
        let baseTuning = decisionTuning(for: style)
        let adjustment = opponentAdjustment(
            against: opponents,
            actionLog: actionLog,
            street: street,
            selfPlayerId: selfPlayerId
        )
        let contextualAdjustment = strategicAdjustment(
            against: opponents,
            actionLog: actionLog,
            street: street,
            selfPlayerId: selfPlayerId,
            communityCards: communityCards,
            playerPosition: playerPosition
        )
        let combinedAdjustment = adjustment.adding(contextualAdjustment)

        return AIDecisionTuning(
            aggressiveThreshold: clamp(
                baseTuning.aggressiveThreshold + combinedAdjustment.aggressiveThresholdDelta,
                min: 0.08,
                max: 0.95
            ),
            passiveThreshold: clamp(
                baseTuning.passiveThreshold + combinedAdjustment.passiveThresholdDelta,
                min: 0.05,
                max: 0.90
            ),
            aggressionChance: clamp(
                baseTuning.aggressionChance + combinedAdjustment.aggressionChanceDelta,
                min: 0.02,
                max: 0.98
            ),
            continueChance: clamp(
                baseTuning.continueChance + combinedAdjustment.continueChanceDelta,
                min: 0.05,
                max: 0.98
            ),
            bluffThreshold: clamp(
                baseTuning.bluffThreshold + combinedAdjustment.bluffThresholdDelta,
                min: 0.0,
                max: 0.75
            ),
            bluffChance: clamp(
                baseTuning.bluffChance + combinedAdjustment.bluffChanceDelta,
                min: 0.0,
                max: 0.80
            )
        )
    }

    func observedProfile(for opponentId: Int) -> AIOpponentProfile? {
        observedOpponents[opponentId]
    }

    func recentLearningSnapshots(limit: Int = 20) -> [AILearningSnapshot] {
        Array(learningSnapshots.suffix(max(0, limit)))
    }

    private mutating func appendLearningSnapshot(for style: AIStyle) {
        let effectiveCap = style.learningProfile.adjustmentCap * sampleConfidence(for: style)
        let observedHuman = observedOpponents[Player.humanPlayerId]
        let snapshot = AILearningSnapshot(
            handIndex: handsPlayed,
            totalProfit: totalProfit,
            aggressionBias: learnedAggressionBias * effectiveCap,
            tightnessBias: learnedTightnessBias * effectiveCap,
            bluffBias: learnedBluffBias * effectiveCap,
            explorationRate: explorationRate(for: style),
            observedHumanVPIP: observedHuman?.vpip,
            observedHumanPFR: observedHuman?.pfr,
            observedHumanFoldToAggression: observedHuman?.foldToAggressionRate,
            observedHumanBluffRate: observedHuman?.bluffRate,
            createdAt: Date()
        )

        learningSnapshots.append(snapshot)

        let maxSnapshots = 60
        if learningSnapshots.count > maxSnapshots {
            learningSnapshots.removeFirst(learningSnapshots.count - maxSnapshots)
        }
    }

    private func opponentAdjustment(
        against opponents: [Player],
        actionLog: [Action],
        street: Street,
        selfPlayerId: Int
    ) -> AIOpponentDecisionAdjustment {
        let activeProfiles = opponents.compactMap { player -> AIOpponentProfile? in
            guard let profile = observedOpponents[player.id], profile.sampleConfidence > 0 else { return nil }
            return profile
        }

        guard !activeProfiles.isEmpty else {
            return AIOpponentDecisionAdjustment()
        }

        func weightedAverage(_ value: (AIOpponentProfile) -> Double) -> Double {
            let totalWeight = activeProfiles.reduce(0.0) { $0 + $1.sampleConfidence }
            guard totalWeight > 0 else { return 0 }

            let totalValue = activeProfiles.reduce(0.0) { partial, profile in
                partial + value(profile) * profile.sampleConfidence
            }
            return totalValue / totalWeight
        }

        var adjustment = AIOpponentDecisionAdjustment()
        let averageFoldToAggression = weightedAverage(\.foldToAggressionRate)
        let averageContinueVsAggression = weightedAverage(\.continueFacingAggressionRate)
        let averageAggression = weightedAverage(\.aggressionRate)
        let averageBluff = weightedAverage(\.bluffRate)

        if averageFoldToAggression > 0.48 {
            let strength = (averageFoldToAggression - 0.48) * 0.45
            adjustment.bluffChanceDelta += strength
            adjustment.bluffThresholdDelta -= strength * 0.55
            adjustment.aggressionChanceDelta += strength * 0.30
        }

        if averageContinueVsAggression > 0.52 {
            let strength = (averageContinueVsAggression - 0.52) * 0.45
            adjustment.bluffChanceDelta -= strength
            adjustment.bluffThresholdDelta += strength * 0.60
            adjustment.aggressiveThresholdDelta += strength * 0.28
        }

        if averageBluff > 0.38 {
            let strength = (averageBluff - 0.38) * 0.35
            adjustment.passiveThresholdDelta -= strength * 0.65
            adjustment.continueChanceDelta += strength
        }

        if averageAggression > 0.40, averageBluff < 0.22 {
            let strength = (averageAggression - 0.40) * 0.25
            adjustment.passiveThresholdDelta += strength * 0.35
            adjustment.continueChanceDelta -= strength * 0.65
        }

        if let aggressorId = actionLog
            .last(where: { $0.street == street && [.raise, .bet, .allIn].contains($0.type) && $0.playerId != selfPlayerId })?
            .playerId,
           let aggressorProfile = observedOpponents[aggressorId]
        {
            let confidence = aggressorProfile.sampleConfidence

            if aggressorProfile.bluffRate > 0.42 {
                let strength = (aggressorProfile.bluffRate - 0.42) * confidence
                adjustment.passiveThresholdDelta -= strength * 0.10
                adjustment.continueChanceDelta += strength * 0.22
            }

            if aggressorProfile.aggressionRate > 0.42, aggressorProfile.bluffRate < 0.20 {
                let strength = (aggressorProfile.aggressionRate - 0.42) * confidence
                adjustment.passiveThresholdDelta += strength * 0.05
                adjustment.continueChanceDelta -= strength * 0.14
            }
        }

        return adjustment
    }

    private func strategicAdjustment(
        against opponents: [Player],
        actionLog: [Action],
        street: Street,
        selfPlayerId: Int,
        communityCards: [Card],
        playerPosition: Position
    ) -> AIOpponentDecisionAdjustment {
        let context = buildStrategicContext(
            against: opponents,
            actionLog: actionLog,
            street: street,
            selfPlayerId: selfPlayerId,
            communityCards: communityCards,
            playerPosition: playerPosition
        )

        var adjustment = AIOpponentDecisionAdjustment()

        if context.isLatePositionStealSpot {
            let positionStrength: Double
            switch context.playerPosition {
            case .btn: positionStrength = 0.12
            case .co: positionStrength = 0.09
            case .sb: positionStrength = 0.06
            default: positionStrength = 0.0
            }

            adjustment.aggressiveThresholdDelta -= positionStrength * 0.45
            adjustment.aggressionChanceDelta += positionStrength
            adjustment.bluffThresholdDelta -= positionStrength * 0.22
            adjustment.bluffChanceDelta += positionStrength * 0.48
        }

        if context.isContinuationBetSpot, let boardTexture = context.boardTexture {
            let headsUpFactor = context.isHeadsUp ? 1.0 : 0.65

            if boardTexture.rangeAdvantageScore > 0.42 {
                let strength = (boardTexture.rangeAdvantageScore - 0.42) * 0.60 * headsUpFactor
                adjustment.aggressiveThresholdDelta -= strength * 0.35
                adjustment.aggressionChanceDelta += strength * 0.60
                adjustment.bluffChanceDelta += strength * 0.72
            }

            if boardTexture.isDryHighCard {
                adjustment.aggressionChanceDelta += 0.04 * headsUpFactor
                adjustment.bluffChanceDelta += 0.06 * headsUpFactor
            }

            if boardTexture.wetness > 0.52 {
                let strength = (boardTexture.wetness - 0.52) * (context.isHeadsUp ? 0.38 : 0.62)
                adjustment.bluffChanceDelta -= strength
                adjustment.bluffThresholdDelta += strength * 0.62
                adjustment.aggressiveThresholdDelta += strength * 0.18
            }
        }

        if context.isTurnBarrelSpot, let boardTexture = context.boardTexture {
            let previousPressure = context.previousBoardTexture?.boardPressureScore ?? 0
            let pressureDelta = max(0, boardTexture.boardPressureScore - previousPressure)

            if pressureDelta > 0.05 {
                let strength = (pressureDelta - 0.05) * 0.85
                adjustment.aggressionChanceDelta += strength * 0.55
                adjustment.bluffChanceDelta += strength * 0.78
                adjustment.bluffThresholdDelta -= strength * 0.26
            } else if boardTexture.wetness > 0.65 {
                let strength = (boardTexture.wetness - 0.65) * 0.55
                adjustment.bluffChanceDelta -= strength
                adjustment.bluffThresholdDelta += strength * 0.65
            }
        }

        return adjustment
    }

    private func buildStrategicContext(
        against opponents: [Player],
        actionLog: [Action],
        street: Street,
        selfPlayerId: Int,
        communityCards: [Card],
        playerPosition: Position
    ) -> AIStrategicContext {
        let aggressiveTypes: Set<ActionType> = [.raise, .bet, .allIn]
        let lastAggressorOnStreet = actionLog.last {
            $0.street == street && aggressiveTypes.contains($0.type)
        }?.playerId
        let preFlopAggressor = actionLog.last {
            $0.street == .preFlop && aggressiveTypes.contains($0.type)
        }?.playerId
        let flopAggressor = actionLog.last {
            $0.street == .flop && aggressiveTypes.contains($0.type)
        }?.playerId

        let boardTexture = AIBoardTexture.analyze(communityCards: communityCards)
        let previousBoardTexture: AIBoardTexture? = {
            guard communityCards.count > 3 else { return nil }
            return AIBoardTexture.analyze(communityCards: Array(communityCards.dropLast()))
        }()

        return AIStrategicContext(
            street: street,
            playerPosition: playerPosition,
            isHeadsUp: opponents.count == 1,
            isLatePositionStealSpot: street == .preFlop
                && lastAggressorOnStreet == nil
                && [.co, .btn, .sb].contains(playerPosition),
            isContinuationBetSpot: street == .flop
                && lastAggressorOnStreet == nil
                && preFlopAggressor == selfPlayerId,
            isTurnBarrelSpot: street == .turn
                && lastAggressorOnStreet == nil
                && preFlopAggressor == selfPlayerId
                && flopAggressor == selfPlayerId,
            boardTexture: boardTexture,
            previousBoardTexture: previousBoardTexture
        )
    }

    mutating func updateAfterHand(
        playerId: Int,
        style: AIStyle,
        playerActions: [Action],
        allActions: [Action],
        players: [Player],
        profit: Int,
        didWin: Bool,
        showdown: Bool,
        shownHandType: HandType?,
        winningPlayerIds: Set<Int>,
        shownHandTypes: [Int: HandType],
        potSize: Int
    ) {
        handsPlayed += 1
        totalProfit += profit

        let preFlopActions = playerActions.filter { $0.street == .preFlop }
        let aggressiveTypes: Set<ActionType> = [.raise, .bet, .allIn]
        let voluntaryTypes: Set<ActionType> = [.call, .raise, .bet, .allIn]

        let enteredPotVoluntarily = preFlopActions.contains { voluntaryTypes.contains($0.type) }
        let wasAggressivePreFlop = preFlopActions.contains { aggressiveTypes.contains($0.type) }
        let wasAggressiveOverall = playerActions.contains { aggressiveTypes.contains($0.type) }

        if enteredPotVoluntarily {
            vpipCount += 1
        }

        if wasAggressivePreFlop {
            pfrCount += 1
        }

        let preFlopAggressions = allActions.filter { $0.street == .preFlop && aggressiveTypes.contains($0.type) }
        if let firstAggressionIndex = preFlopAggressions.firstIndex(where: { $0.playerId == playerId }), firstAggressionIndex > 0 {
            threeBetCount += 1
        }

        afCount += playerActions.filter { aggressiveTypes.contains($0.type) }.count

        if showdown {
            if didWin {
                showdownWins += 1
            } else {
                showdownLosses += 1
            }
        } else {
            if didWin {
                nonShowdownWins += 1
            } else if profit < 0 {
                nonShowdownLosses += 1
            }
        }

        if wasAggressiveOverall {
            if profit > 0 {
                aggressiveWins += 1
            } else if profit < 0 {
                aggressiveLosses += 1
            }
        }

        if wasAggressiveOverall && !showdown {
            if didWin {
                bluffSuccessCount += 1
            } else if profit < 0 {
                bluffPunishedCount += 1
            }
        }

        let learningRate = currentLearningRate(for: style)
        let normalizedProfit = clamp(
            Double(profit) / Double(max(potSize, GameConstants.bigBlind * 4)),
            min: -1,
            max: 1
        )

        let signedOutcome: Double
        if profit > 0 {
            signedOutcome = max(0.25, abs(normalizedProfit))
        } else if profit < 0 {
            signedOutcome = -max(0.25, abs(normalizedProfit))
        } else if didWin {
            signedOutcome = 0.10
        } else {
            signedOutcome = -0.10
        }

        let shownStrength = shownHandType?.aiStrengthScore ?? 0.0
        let weakShowdownLossPenalty = showdown && !didWin && shownStrength > 0 && shownStrength < 0.45 ? 0.25 : 0.0
        let strongValueWinBonus = showdown && didWin && shownStrength >= 0.72 ? 0.12 : 0.0

        if wasAggressiveOverall {
            learnedAggressionBias = clamp(
                learnedAggressionBias + (signedOutcome + strongValueWinBonus) * learningRate * 0.55,
                min: -1,
                max: 1
            )
        }

        if enteredPotVoluntarily {
            let tightnessSignal = (-signedOutcome + weakShowdownLossPenalty - strongValueWinBonus * 0.5) * learningRate * 0.50
            learnedTightnessBias = clamp(
                learnedTightnessBias + tightnessSignal,
                min: -1,
                max: 1
            )
        }

        if wasAggressiveOverall {
            let bluffSignal: Double
            if !showdown {
                bluffSignal = signedOutcome
            } else if shownStrength < 0.45 {
                bluffSignal = signedOutcome * 0.70
            } else {
                bluffSignal = signedOutcome * 0.15
            }

            learnedBluffBias = clamp(
                learnedBluffBias + bluffSignal * learningRate * 0.45,
                min: -1,
                max: 1
            )
        }

        let groupedActions = Dictionary(grouping: allActions, by: \.playerId)
        for opponent in players where opponent.id != playerId {
            let opponentActions = groupedActions[opponent.id] ?? []
            let opponentShownHandType = shownHandTypes[opponent.id]
            let opponentReachedShowdown = showdown && opponentShownHandType != nil
            let opponentDidWin = winningPlayerIds.contains(opponent.id)

            // Skip only if opponent had no actions AND didn't reach showdown AND didn't win
            // This ensures we observe even passive wins (e.g. everyone folds to BB)
            if opponentActions.isEmpty && !opponentReachedShowdown && !opponentDidWin {
                continue
            }

            var observed = observedOpponents[opponent.id] ?? AIOpponentProfile()
            observed.observeHand(
                playerId: opponent.id,
                playerActions: opponentActions,
                allActions: allActions,
                didWin: opponentDidWin,
                showdown: opponentReachedShowdown,
                shownHandType: opponentShownHandType
            )
            observedOpponents[opponent.id] = observed
        }

        appendLearningSnapshot(for: style)
        lastUpdated = Date()
    }
}
