import Foundation

actor AIDecisionMaker {
    private let epsilon: Double = 0.1

    func makeDecision(
        playerId: Int,
        gameState: GameState,
        style: AIStyle,
        patterns: AIPattern?
    ) -> Action {
        let currentPlayer = gameState.players.first { $0.id == playerId }
        guard let player = currentPlayer, player.canAct else {
            return Action(playerId: playerId, street: gameState.currentStreet, type: .fold)
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

        if Double.random(in: 0...1) < epsilon {
            return makeRandomAction(
                playerId: playerId,
                street: gameState.currentStreet,
                callAmount: callAmount,
                minRaise: minRaise,
                playerChips: player.chips,
                currentPlayerBet: currentPlayerBet
            )
        }

        return makeStyledAction(
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
            playersToAct: gameState.activePlayers.count - 1
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
        playersToAct: Int
    ) -> Action {
        guard let holeCards = holeCards else {
            return Action(playerId: playerId, street: street, type: .fold)
        }

        let handStrength = evaluateHandStrength(
            holeCards: holeCards,
            communityCards: communityCards,
            callAmount: callAmount,
            currentPot: currentPot,
            position: playerPosition,
            playersToAct: playersToAct,
            street: street
        )

        switch style {
        case .tightAggressive:
            return tightAggressiveDecision(
                playerId: playerId,
                street: street,
                handStrength: handStrength,
                callAmount: callAmount,
                minRaise: minRaise,
                playerChips: playerChips,
                currentPlayerBet: currentPlayerBet,
                currentPot: currentPot
            )

        case .looseAggressive:
            return looseAggressiveDecision(
                playerId: playerId,
                street: street,
                handStrength: handStrength,
                callAmount: callAmount,
                minRaise: minRaise,
                playerChips: playerChips,
                currentPlayerBet: currentPlayerBet,
                currentPot: currentPot
            )

        case .tightWeak:
            return tightWeakDecision(
                playerId: playerId,
                street: street,
                handStrength: handStrength,
                callAmount: callAmount,
                playerChips: playerChips
            )

        case .looseWeak:
            return looseWeakDecision(
                playerId: playerId,
                street: street,
                handStrength: handStrength,
                callAmount: callAmount,
                playerChips: playerChips
            )

        case .balanced:
            return balancedDecision(
                playerId: playerId,
                street: street,
                handStrength: handStrength,
                callAmount: callAmount,
                minRaise: minRaise,
                playerChips: playerChips,
                currentPlayerBet: currentPlayerBet,
                patterns: patterns,
                currentPot: currentPot
            )
        }
    }

    private func evaluateHandStrength(
        holeCards: HoleCards,
        communityCards: [Card],
        callAmount: Int,
        currentPot: Int,
        position: Position,
        playersToAct: Int,
        street: Street
    ) -> Double {
        let isPaired = holeCards.card1.rank == holeCards.card2.rank

        var strength = 0.0

        if communityCards.isEmpty {
            return PreFlopHandTable.lookup(holeCards: holeCards)
        }

        let allCards = [holeCards.card1, holeCards.card2] + communityCards

        let matchedRanks = Dictionary(grouping: allCards, by: { $0.rank }).filter { $0.value.count >= 2 }
        strength += Double(matchedRanks.count) * 0.18

        let suitedCards = allCards.filter { $0.suit == holeCards.card1.suit }
        if suitedCards.count >= 4 && !isPaired {
            strength += 0.12
        }

        let uniqueRanks = Set(allCards.map { $0.rank })
        let sortedRanks = uniqueRanks.sorted(by: >)
        var straightOuts = 0
        for i in 0..<(sortedRanks.count - 1) {
            if sortedRanks[i] - sortedRanks[i + 1] == 1 {
                straightOuts += 1
            }
        }
        if straightOuts >= 3 {
            strength += 0.08
        }

        if callAmount > 0 && currentPot > 0 {
            let potOdds = Double(callAmount) / Double(currentPot + callAmount)
            let impliedOdds = strength * 1.5
            if impliedOdds > potOdds {
                strength += 0.1
            }
        }

        let positionMultiplier = calculatePositionMultiplier(position: position, playersToAct: playersToAct, street: street)
        return min(1.0, max(0.0, strength * positionMultiplier))
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
        let actualAmount = max(minRaise, min(targetAmount, availableTotalBet))
        return actualAmount
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

    private func tightAggressiveDecision(
        playerId: Int,
        street: Street,
        handStrength: Double,
        callAmount: Int,
        minRaise: Int,
        playerChips: Int,
        currentPlayerBet: Int,
        currentPot: Int
    ) -> Action {
        if handStrength > 0.6 {
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

        if handStrength > 0.3 {
            return passiveAction(playerId: playerId, street: street, callAmount: callAmount, playerChips: playerChips)
        }

        return callAmount == 0
            ? Action(playerId: playerId, street: street, type: .check)
            : Action(playerId: playerId, street: street, type: .fold)
    }

    private func looseAggressiveDecision(
        playerId: Int,
        street: Street,
        handStrength: Double,
        callAmount: Int,
        minRaise: Int,
        playerChips: Int,
        currentPlayerBet: Int,
        currentPot: Int
    ) -> Action {
        if handStrength > 0.4 {
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

        if handStrength > 0.2 {
            return passiveAction(playerId: playerId, street: street, callAmount: callAmount, playerChips: playerChips)
        }

        return callAmount == 0
            ? Action(playerId: playerId, street: street, type: .check)
            : Action(playerId: playerId, street: street, type: .fold)
    }

    private func tightWeakDecision(
        playerId: Int,
        street: Street,
        handStrength: Double,
        callAmount: Int,
        playerChips: Int
    ) -> Action {
        if handStrength > 0.7 {
            return passiveAction(playerId: playerId, street: street, callAmount: callAmount, playerChips: playerChips)
        }

        return callAmount == 0
            ? Action(playerId: playerId, street: street, type: .check)
            : Action(playerId: playerId, street: street, type: .fold)
    }

    private func looseWeakDecision(
        playerId: Int,
        street: Street,
        handStrength: Double,
        callAmount: Int,
        playerChips: Int
    ) -> Action {
        if handStrength > 0.3 {
            return passiveAction(playerId: playerId, street: street, callAmount: callAmount, playerChips: playerChips)
        }

        return callAmount == 0
            ? Action(playerId: playerId, street: street, type: .check)
            : Action(playerId: playerId, street: street, type: .fold)
    }

    private func balancedDecision(
        playerId: Int,
        street: Street,
        handStrength: Double,
        callAmount: Int,
        minRaise: Int,
        playerChips: Int,
        currentPlayerBet: Int,
        patterns: AIPattern?,
        currentPot: Int
    ) -> Action {
        let threshold = patterns?.aggressionFactor ?? 0.5

        if handStrength > 0.5 {
            if Double.random(in: 0...1) < threshold {
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

        if handStrength > 0.25 && Double.random(in: 0...1) < 0.7 {
            return passiveAction(playerId: playerId, street: street, callAmount: callAmount, playerChips: playerChips)
        }

        return callAmount == 0
            ? Action(playerId: playerId, street: street, type: .check)
            : Action(playerId: playerId, street: street, type: .fold)
    }
}

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
    var lastUpdated: Date = Date()

    var vpip: Double { handsPlayed > 0 ? Double(vpipCount) / Double(handsPlayed) : 0 }
    var pfr: Double { handsPlayed > 0 ? Double(pfrCount) / Double(handsPlayed) : 0 }
    var threeBet: Double { pfrCount > 0 ? Double(threeBetCount) / Double(pfrCount) : 0 }
    /// 激进频率：激进动作占比
    var af: Double { handsPlayed > 0 ? Double(afCount) / Double(handsPlayed) : 0 }
    var aggressionFactor: Double { af }

    mutating func updateAfterHand(playerId: Int, playerActions: [Action], allActions: [Action]) {
        handsPlayed += 1

        let preFlopActions = playerActions.filter { $0.street == .preFlop }
        let aggressiveTypes: Set<ActionType> = [.raise, .bet, .allIn]
        let voluntaryTypes: Set<ActionType> = [.call, .raise, .bet, .allIn]

        if preFlopActions.contains(where: { voluntaryTypes.contains($0.type) }) {
            vpipCount += 1
        }

        if preFlopActions.contains(where: { aggressiveTypes.contains($0.type) }) {
            pfrCount += 1
        }

        let preFlopAggressions = allActions.filter { $0.street == .preFlop && aggressiveTypes.contains($0.type) }
        if let firstAggressionIndex = preFlopAggressions.firstIndex(where: { $0.playerId == playerId }), firstAggressionIndex > 0 {
            threeBetCount += 1
        }

        afCount += playerActions.filter { aggressiveTypes.contains($0.type) }.count
        lastUpdated = Date()
    }
}
