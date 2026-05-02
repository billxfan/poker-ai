import Foundation

struct HandSettlement {
    let winningPlayerIds: [Int]
    let payouts: [Int: Int]
    let handsByPlayer: [Int: Hand]
    let totalPot: Int
    let isSplitPot: Bool

    func profit(for playerId: Int, contributions: [Int: Int]) -> Int {
        payouts[playerId, default: 0] - contributions[playerId, default: 0]
    }
}

struct EngineSnapshot {
    let gameState: GameState
    let remainingDeck: [Card]
}

actor PokerEngine {
    var deck: [Card] = []
    var gameState: GameState

    init() {
        self.gameState = GameState()
    }
}
