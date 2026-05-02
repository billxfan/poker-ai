import Foundation

extension PokerEngine {
    // MARK: - Game State Access

    func getState() -> GameState {
        reconcileCommunityCardsWithStreet()
        normalizeBettingState()
        return gameState
    }

    func getSnapshot() -> EngineSnapshot {
        reconcileCommunityCardsWithStreet()
        normalizeBettingState()
        return EngineSnapshot(gameState: gameState, remainingDeck: deck)
    }

    func restoreState(_ state: GameState, remainingDeck: [Card]? = nil) {
        gameState = state
        deck = remainingDeck ?? rebuildRemainingDeck(from: state)
        reconcileCommunityCardsWithStreet()
        normalizeBettingState()
    }

    // MARK: - Hand Evaluation

    func evaluateHand(holeCards: HoleCards?, communityCards: [Card]) -> Hand {
        HandEvaluator.evaluate(holeCards: holeCards, communityCards: communityCards)
    }

    private func rebuildRemainingDeck(from state: GameState) -> [Card] {
        let holeCards = state.players.flatMap { player -> [Card] in
            guard let holeCards = player.holeCards else { return [] }
            return [holeCards.card1, holeCards.card2]
        }
        let visibleCards = Set(state.communityCards + holeCards)

        var remainingDeck = Card.createDeck().filter { !visibleCards.contains($0) }
        remainingDeck.shuffle()
        return remainingDeck
    }

    private func reconcileCommunityCardsWithStreet() {
        let expectedCount = gameState.currentStreet.cardCount
        let currentCount = gameState.communityCards.count

        guard currentCount < expectedCount else { return }

        let missingCount = expectedCount - currentCount
        for _ in 0..<missingCount {
            guard let card = dealCard() else { break }
            gameState.communityCards.append(card)
        }
    }

}
