import Foundation

actor AIDecisionMaker {
    func makeDecisionPlan(
        playerId: Int,
        gameState: GameState,
        style: AIStyle,
        patterns: AIPattern?
    ) -> AIDecisionPlan {
        let currentPlayer = gameState.players.first { $0.id == playerId }
        guard let player = currentPlayer, player.canAct else {
            let fallbackAction = Action(playerId: playerId, street: gameState.currentStreet, type: .fold)
            let fallbackContext = AILearningContext(
                street: gameState.currentStreet,
                position: currentPlayer?.position ?? .utg,
                pressure: .unopened,
                strengthBucket: .weak,
                isHeadsUp: gameState.activePlayers.count <= 2
            )
            return AIDecisionPlan(
                action: fallbackAction,
                learningPoint: AILearningDecisionPoint(
                    context: fallbackContext,
                    actionKind: .fold,
                    handStrength: 0,
                    committedAmount: 0,
                    usedExploration: false,
                    createdAt: Date()
                )
            )
        }

        let callAmount = PotCalculator.calculateCallAmount(
            playerId: playerId,
            playerBets: gameState.playerBets,
            currentBet: gameState.currentBet
        )

        let currentPlayerBet = gameState.playerBets[playerId] ?? 0
        let minRaise = PotCalculator.calculateMinRaise(
            playerId: playerId,
            playerBets: gameState.playerBets,
            currentBet: gameState.currentBet,
            minimumRaiseIncrement: gameState.minimumRaiseIncrement
        )

        let handStrength = evaluateHandStrength(
            holeCards: player.holeCards,
            communityCards: gameState.communityCards,
            callAmount: callAmount,
            currentPot: gameState.pot,
            position: player.position,
            playersToAct: gameState.activePlayers.count - 1,
            street: gameState.currentStreet
        )
        let learningContext = makeLearningContext(
            handStrength: handStrength,
            street: gameState.currentStreet,
            position: player.position,
            callAmount: callAmount,
            actionLog: gameState.actionLog,
            activeOpponentCount: max(1, gameState.activePlayers.count - 1)
        )

        let explorationRate = patterns?.explorationRate(for: style) ?? style.learningProfile.initialEpsilon
        if Double.random(in: 0...1) < explorationRate {
            let action = makeRandomAction(
                playerId: playerId,
                street: gameState.currentStreet,
                callAmount: callAmount,
                minRaise: minRaise,
                playerChips: player.chips,
                currentPlayerBet: currentPlayerBet
            )
            return AIDecisionPlan(
                action: action,
                learningPoint: makeLearningPoint(
                    context: learningContext,
                    action: action,
                    handStrength: handStrength,
                    usedExploration: true
                )
            )
        }

        let action = makeStyledAction(
            playerId: playerId,
            street: gameState.currentStreet,
            style: style,
            callAmount: callAmount,
            minRaise: minRaise,
            playerChips: player.chips,
            currentPlayerBet: currentPlayerBet,
            holeCards: player.holeCards,
            communityCards: gameState.communityCards,
            patterns: patterns,
            currentPot: gameState.pot,
            playerPosition: player.position,
            playersToAct: gameState.activePlayers.count - 1,
            players: gameState.players,
            actionLog: gameState.actionLog,
            learningContext: learningContext
        )
        return AIDecisionPlan(
            action: action,
            learningPoint: makeLearningPoint(
                context: learningContext,
                action: action,
                handStrength: handStrength,
                usedExploration: false
            )
        )
    }

    private func makeRandomAction(
        playerId: Int,
        street: Street,
        callAmount: Int,
        minRaise: Int,
        playerChips: Int,
        currentPlayerBet: Int
    ) -> Action {
        let canCheck = callAmount == 0
        let canCall = callAmount > 0 && playerChips > 0
        let canRaise = playerChips + currentPlayerBet >= minRaise
        let canAllIn = playerChips > 0

        var availableActions: [ActionType] = []
        if canCheck { availableActions.append(.check) }
        if canCall { availableActions.append(.call) }
        if canRaise { availableActions.append(callAmount == 0 ? .bet : .raise) }
        if canAllIn { availableActions.append(.allIn) }
        if !canCheck { availableActions.append(.fold) }

        let randomAction = availableActions.randomElement() ?? (callAmount == 0 ? .check : .fold)

        switch randomAction {
        case .fold:
            return Action(playerId: playerId, street: street, type: .fold)
        case .check:
            return Action(playerId: playerId, street: street, type: .check)
        case .call:
            return Action(playerId: playerId, street: street, type: .call, amount: callAmount)
        case .raise, .bet:
            let raiseAmount = min(minRaise, playerChips + currentPlayerBet)
            return Action(playerId: playerId, street: street, type: randomAction, amount: raiseAmount)
        case .allIn:
            return Action(playerId: playerId, street: street, type: .allIn, amount: playerChips)
        }
    }

    /// 根据位置和剩余玩家数，计算位置修正系数（late position = 更好）
    private func calculatePositionMultiplier(position: Position, playersToAct: Int, street _: Street) -> Double {
        let preFlopPositionBonus: Double
        switch position {
        case .bb: preFlopPositionBonus = 0.08
        case .sb: preFlopPositionBonus = 0.04
        case .btn: preFlopPositionBonus = 0.10
        case .co: preFlopPositionBonus = 0.06
        case .mp: preFlopPositionBonus = 0.0
        case .utg: preFlopPositionBonus = -0.04
        }

        let playersRemainingFactor = max(0.0, 1.0 - Double(playersToAct) * 0.03)
        return 1.0 + preFlopPositionBonus * playersRemainingFactor
    }

    private func makeStyledAction(
        playerId: Int,
        street: Street,
        style: AIStyle,
        callAmount: Int,
        minRaise: Int,
        playerChips: Int,
        currentPlayerBet: Int,
        holeCards: HoleCards?,
        communityCards: [Card],
        patterns: AIPattern?,
        currentPot: Int,
        playerPosition: Position,
        playersToAct: Int,
        players: [Player],
        actionLog: [Action],
        learningContext: AILearningContext
    ) -> Action {
        guard let holeCards else {
            return Action(playerId: playerId, street: street, type: .fold)
        }
        let handStrength = learningContext.strengthBucket == .weak ? 0 : evaluateHandStrength(
            holeCards: holeCards,
            communityCards: communityCards,
            callAmount: callAmount,
            currentPot: currentPot,
            position: playerPosition,
            playersToAct: playersToAct,
            street: street
        )

        let observableOpponents = players.filter {
            $0.id != playerId && !$0.isFolded && !$0.isOut
        }
        let tuning = (patterns ?? AIPattern()).decisionTuning(
            for: style,
            against: observableOpponents,
            actionLog: actionLog,
            street: street,
            selfPlayerId: playerId,
            communityCards: communityCards,
            playerPosition: playerPosition,
            learningContext: learningContext
        )
        return adaptiveDecision(
            playerId: playerId,
            street: street,
            handStrength: handStrength,
            tuning: tuning,
            callAmount: callAmount,
            minRaise: minRaise,
            playerChips: playerChips,
            currentPlayerBet: currentPlayerBet,
            currentPot: currentPot
        )
    }

    private func evaluateHandStrength(
        holeCards: HoleCards?,
        communityCards: [Card],
        callAmount: Int,
        currentPot: Int,
        position: Position,
        playersToAct: Int,
        street: Street
    ) -> Double {
        guard let holeCards else { return 0 }
        if communityCards.isEmpty {
            return PreFlopHandTable.lookup(holeCards: holeCards)
        }

        let evaluatedHand = HandEvaluator.evaluate(holeCards: holeCards, communityCards: communityCards)
        var strength = evaluatedHand.handType.aiStrengthScore

        if let primaryKicker = evaluatedHand.kickers.first {
            strength += Double(primaryKicker - 2) / 12.0 * 0.08
        }

        if communityCards.count < 5 {
            strength += calculateDrawPotential(
                holeCards: holeCards,
                communityCards: communityCards,
                madeHandType: evaluatedHand.handType
            )
        }

        if callAmount > 0 && currentPot > 0 {
            let potOdds = Double(callAmount) / Double(currentPot + callAmount)
            if strength > potOdds {
                strength += 0.06
            } else {
                strength -= min(0.10, (potOdds - strength) * 0.18)
            }
        }

        let positionMultiplier = calculatePositionMultiplier(position: position, playersToAct: playersToAct, street: street)
        return clamp(strength * positionMultiplier, min: 0.0, max: 1.0)
    }

    private func calculateDrawPotential(
        holeCards: HoleCards,
        communityCards: [Card],
        madeHandType: HandType
    ) -> Double {
        let allCards = [holeCards.card1, holeCards.card2] + communityCards
        var bonus = 0.0

        if madeHandType < .flush {
            let suitCounts = Dictionary(grouping: allCards, by: { $0.suit }).mapValues(\.count)
            if suitCounts.values.max() == 4 {
                bonus += 0.08
            }
        }

        if madeHandType < .straight {
            var ranks = Set(allCards.map(\.rank))
            if ranks.contains(14) {
                ranks.insert(1)
            }

            let sortedRanks = ranks.sorted()
            for start in 1...10 {
                let needed = Set(start...(start + 4))
                let matched = needed.intersection(sortedRanks).sorted()
                guard matched.count == 4 else { continue }

                let isOpenEnded = (matched.last ?? 0) - (matched.first ?? 0) == 3
                bonus = max(bonus, isOpenEnded ? 0.08 : 0.05)
            }
        }

        return bonus
    }

    /// 计算本次激进行动后的目标总下注额。
    private func calculateBetSize(
        handStrength: Double,
        currentPot: Int,
        minRaise: Int,
        availableTotalBet: Int
    ) -> Int {
        guard availableTotalBet >= minRaise else { return 0 }

        let potFraction: Double
        if handStrength > 0.75 {
            potFraction = 0.75 + Double.random(in: 0...0.25)
        } else if handStrength > 0.5 {
            potFraction = 0.5 + Double.random(in: 0...0.15)
        } else {
            potFraction = 0.4 + Double.random(in: 0...0.1)
        }

        let referencePot = max(currentPot, GameConstants.bigBlind)
        let targetAmount = Int(Double(referencePot) * potFraction)
        return max(minRaise, min(targetAmount, availableTotalBet))
    }

    private func passiveAction(playerId: Int, street: Street, callAmount: Int, playerChips: Int) -> Action {
        if callAmount == 0 {
            return Action(playerId: playerId, street: street, type: .check)
        }

        if playerChips > 0 {
            return Action(playerId: playerId, street: street, type: .call, amount: callAmount)
        }

        return Action(playerId: playerId, street: street, type: .fold)
    }

    private func aggressiveAction(
        playerId: Int,
        street: Street,
        callAmount: Int,
        minRaise: Int,
        playerChips: Int,
        currentPlayerBet: Int,
        currentPot: Int,
        handStrength: Double
    ) -> Action {
        let availableTotalBet = playerChips + currentPlayerBet
        guard availableTotalBet >= minRaise else {
            if playerChips > 0 {
                return Action(playerId: playerId, street: street, type: .allIn, amount: playerChips)
            }
            return passiveAction(playerId: playerId, street: street, callAmount: callAmount, playerChips: playerChips)
        }

        let betSize = calculateBetSize(
            handStrength: handStrength,
            currentPot: currentPot,
            minRaise: minRaise,
            availableTotalBet: availableTotalBet
        )
        let actionType: ActionType = callAmount == 0 ? .bet : .raise
        return Action(playerId: playerId, street: street, type: actionType, amount: max(minRaise, betSize))
    }

    private func adaptiveDecision(
        playerId: Int,
        street: Street,
        handStrength: Double,
        tuning: AIDecisionTuning,
        callAmount: Int,
        minRaise: Int,
        playerChips: Int,
        currentPlayerBet: Int,
        currentPot: Int
    ) -> Action {
        let canCheck = callAmount == 0
        let potPressure = (callAmount > 0 && currentPot > 0)
            ? Double(callAmount) / Double(currentPot + callAmount)
            : 0.0

        let adjustedPassiveThreshold = clamp(
            tuning.passiveThreshold + potPressure * 0.18,
            min: 0.05,
            max: 0.95
        )
        let adjustedContinueChance = clamp(
            tuning.continueChance - potPressure * 0.40,
            min: 0.05,
            max: 0.98
        )

        if handStrength >= tuning.aggressiveThreshold {
            let shouldAggress = Double.random(in: 0...1) < tuning.aggressionChance
                || (canCheck && handStrength > tuning.aggressiveThreshold + 0.12)

            if shouldAggress {
                return aggressiveAction(
                    playerId: playerId,
                    street: street,
                    callAmount: callAmount,
                    minRaise: minRaise,
                    playerChips: playerChips,
                    currentPlayerBet: currentPlayerBet,
                    currentPot: currentPot,
                    handStrength: handStrength
                )
            }

            return passiveAction(playerId: playerId, street: street, callAmount: callAmount, playerChips: playerChips)
        }

        if handStrength >= adjustedPassiveThreshold {
            if canCheck || Double.random(in: 0...1) < adjustedContinueChance {
                return passiveAction(playerId: playerId, street: street, callAmount: callAmount, playerChips: playerChips)
            }

            if canCheck && handStrength >= tuning.bluffThreshold && Double.random(in: 0...1) < tuning.bluffChance * 0.65 {
                return aggressiveAction(
                    playerId: playerId,
                    street: street,
                    callAmount: callAmount,
                    minRaise: minRaise,
                    playerChips: playerChips,
                    currentPlayerBet: currentPlayerBet,
                    currentPot: currentPot,
                    handStrength: handStrength
                )
            }

            return canCheck
                ? Action(playerId: playerId, street: street, type: .check)
                : Action(playerId: playerId, street: street, type: .fold)
        }

        if handStrength >= tuning.bluffThreshold {
            let hasFoldEquity = canCheck || potPressure < 0.18
            if hasFoldEquity && Double.random(in: 0...1) < tuning.bluffChance {
                return aggressiveAction(
                    playerId: playerId,
                    street: street,
                    callAmount: callAmount,
                    minRaise: minRaise,
                    playerChips: playerChips,
                    currentPlayerBet: currentPlayerBet,
                    currentPot: currentPot,
                    handStrength: handStrength
                )
            }
        }

        return canCheck
            ? Action(playerId: playerId, street: street, type: .check)
            : Action(playerId: playerId, street: street, type: .fold)
    }

    private func makeLearningContext(
        handStrength: Double,
        street: Street,
        position: Position,
        callAmount: Int,
        actionLog: [Action],
        activeOpponentCount: Int
    ) -> AILearningContext {
        let aggressiveTypes: Set<ActionType> = [.bet, .raise, .allIn]
        let aggressionsOnStreet = actionLog.filter { $0.street == street && aggressiveTypes.contains($0.type) }
        let pressure: AIPressureState
        if callAmount == 0 {
            pressure = .unopened
        } else if aggressionsOnStreet.count <= 1 {
            pressure = .facingBet
        } else {
            pressure = .facingRaise
        }

        return AILearningContext(
            street: street,
            position: position,
            pressure: pressure,
            strengthBucket: AIHandStrengthBucket.from(strength: handStrength),
            isHeadsUp: activeOpponentCount == 1
        )
    }

    private func makeLearningPoint(
        context: AILearningContext,
        action: Action,
        handStrength: Double,
        usedExploration: Bool
    ) -> AILearningDecisionPoint {
        AILearningDecisionPoint(
            context: context,
            actionKind: AILearningActionKind.from(action: action),
            handStrength: handStrength,
            committedAmount: action.amount ?? 0,
            usedExploration: usedExploration,
            createdAt: Date()
        )
    }
}
