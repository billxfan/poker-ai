import Foundation

extension PokerEngine {
    // MARK: - Showdown / Settlement

    func determineWinner() -> [(playerId: Int, hand: Hand)] {
        let contenders = gameState.players.filter { !$0.isFolded && $0.holeCards != nil }
        return contenders
            .map { player in
                let hand = HandEvaluator.evaluate(holeCards: player.holeCards, communityCards: gameState.communityCards)
                return (playerId: player.id, hand: hand)
            }
            .sorted { $0.hand.compare(to: $1.hand) == .orderedDescending }
    }

    private func applyPayouts(_ payouts: [Int: Int]) {
        for index in gameState.players.indices {
            let playerId = gameState.players[index].id
            gameState.players[index].chips += payouts[playerId, default: 0]
            if gameState.players[index].chips <= 0 {
                gameState.players[index].status = .out
            }
        }
    }

    func settleUncontestedHand() -> HandSettlement {
        guard let winner = gameState.activePlayers.first else {
            return HandSettlement(winningPlayerIds: [], payouts: [:], handsByPlayer: [:], totalPot: gameState.pot, isSplitPot: false)
        }

        let payouts = [winner.id: gameState.pot]
        applyPayouts(payouts)

        return HandSettlement(
            winningPlayerIds: [winner.id],
            payouts: payouts,
            handsByPlayer: [:],
            totalPot: gameState.pot,
            isSplitPot: false
        )
    }

    func settleShowdown() -> HandSettlement {
        let contenders = gameState.players.filter { !$0.isFolded && $0.holeCards != nil }
        let handsByPlayer = Dictionary(uniqueKeysWithValues: contenders.map { player in
            (player.id, HandEvaluator.evaluate(holeCards: player.holeCards, communityCards: gameState.communityCards))
        })

        let contributions = gameState.handBets.filter { $0.value > 0 }
        let levels = Array(Set(contributions.values)).sorted()
        var previousLevel = 0
        var payouts: [Int: Int] = [:]
        var hasTie = false

        for level in levels {
            let layerSize = level - previousLevel
            guard layerSize > 0 else { continue }

            let contributorIds = contributions.compactMap { playerId, contribution in
                contribution >= level ? playerId : nil
            }
            let potAtLevel = layerSize * contributorIds.count
            guard potAtLevel > 0 else {
                previousLevel = level
                continue
            }

            let eligibleIds = contributorIds.filter { handsByPlayer[$0] != nil }
            guard let bestId = eligibleIds.max(by: { lhs, rhs in
                guard let leftHand = handsByPlayer[lhs], let rightHand = handsByPlayer[rhs] else { return false }
                return leftHand.compare(to: rightHand) != .orderedDescending
            }), let bestHand = handsByPlayer[bestId] else {
                previousLevel = level
                continue
            }

            let winnerIds = eligibleIds.filter { playerId in
                guard let hand = handsByPlayer[playerId] else { return false }
                return hand.compare(to: bestHand) == .orderedSame
            }.sorted()

            if winnerIds.count > 1 {
                hasTie = true
            }

            let share = potAtLevel / winnerIds.count
            let remainder = potAtLevel % winnerIds.count

            for (offset, winnerId) in winnerIds.enumerated() {
                payouts[winnerId, default: 0] += share + (offset < remainder ? 1 : 0)
            }

            previousLevel = level
        }

        applyPayouts(payouts)

        return HandSettlement(
            winningPlayerIds: payouts.filter { $0.value > 0 }.map(\.key).sorted(),
            payouts: payouts,
            handsByPlayer: handsByPlayer,
            totalPot: gameState.pot,
            isSplitPot: hasTie
        )
    }
}
