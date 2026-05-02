import Foundation

extension PokerEngine {
    // MARK: - Street Progression

    func dealCommunityCards() {
        let neededCount: Int

        switch gameState.currentStreet {
        case .preFlop:
            neededCount = 3
        case .flop, .turn:
            neededCount = 1
        case .river:
            return
        }

        for _ in 0..<neededCount {
            if let card = dealCard() {
                gameState.communityCards.append(card)
            }
        }

        if let nextStreet = gameState.currentStreet.next() {
            gameState.currentStreet = nextStreet
        }

        gameState.currentBet = 0
        gameState.minimumRaiseIncrement = GameConstants.bigBlind
        gameState.playerBets = [:]
        gameState.playersActedThisStreet = []
        gameState.playerBetsAtLastAction = [:]

        let postFlopOrder = Street.flop.actionOrder
        if let sbIndex = gameState.players.firstIndex(where: { $0.position == .sb && $0.canAct }) {
            gameState.currentActorIndex = sbIndex
        } else {
            var fallbackIndex: Int?
            for pos in postFlopOrder {
                if let idx = gameState.players.firstIndex(where: { $0.position == pos && $0.canAct }) {
                    fallbackIndex = idx
                    break
                }
            }
            gameState.currentActorIndex = fallbackIndex ?? 0
        }
    }

    /// 发完剩余所有公共牌（全员 all-in 场景）
    func dealAllRemainingCommunityCards() {
        while gameState.currentStreet != .river {
            dealCommunityCards()
        }
    }

    // MARK: - Round End Detection

    /// 回合结束条件：所有可行动玩家的注额一致（都已行动且匹配 currentBet）
    func isRoundComplete() -> Bool {
        let actionablePlayers = gameState.players.filter { $0.canAct }
        guard !actionablePlayers.isEmpty else { return true }

        // Single actionable player: round ends only if they've matched the current bet
        if actionablePlayers.count == 1, let lonePlayer = actionablePlayers.first {
            let lastBet = gameState.playerBetsAtLastAction[lonePlayer.id] ?? 0
            return lastBet >= gameState.currentBet
        }

        for player in actionablePlayers {
            let hasActed = gameState.playersActedThisStreet.contains(player.id)
            let lastBet = gameState.playerBetsAtLastAction[player.id] ?? 0
            if !hasActed || lastBet < gameState.currentBet {
                return false
            }
        }

        return true
    }

    /// 按座位顺序找到下一个需要行动的玩家（从上一个行动者的下一位开始搜索）
    func getNextActor() -> Int? {
        let activePlayers = gameState.activePlayers
        guard activePlayers.count > 1 else { return nil }

        let actionOrder = gameState.currentStreet.actionOrder

        // 按座位顺序排序所有活跃玩家
        let sortedActive = activePlayers.sorted { p1, p2 in
            let i1 = actionOrder.firstIndex(of: p1.position) ?? 0
            let i2 = actionOrder.firstIndex(of: p2.position) ?? 0
            return i1 < i2
        }

        let canActPlayers = sortedActive.filter { $0.canAct }

        // 只剩一人可行动
        if canActPlayers.count == 1, let lonePlayer = canActPlayers.first {
            let currentPlayerBet = gameState.playerBets[lonePlayer.id] ?? 0
            if currentPlayerBet >= gameState.currentBet {
                return nil
            }
            if let index = gameState.players.firstIndex(where: { $0.id == lonePlayer.id }) {
                gameState.currentActorIndex = index
            }
            return lonePlayer.id
        }

        // 所有可行动玩家都已行动且注额一致，回合结束
        let allMatched = canActPlayers.allSatisfy { player in
            let lastBet = gameState.playerBetsAtLastAction[player.id] ?? 0
            return lastBet >= gameState.currentBet
        }
        let allActed = canActPlayers.allSatisfy { gameState.playersActedThisStreet.contains($0.id) }

        if allActed && allMatched && !canActPlayers.isEmpty {
            return nil
        }

        // 从上一个行动者的位置开始搜索
        let lastActorPosition = gameState.players[gameState.currentActorIndex].position
        guard let lastActorOrderIndex = actionOrder.firstIndex(of: lastActorPosition) else {
            return findFirstUnmetPlayer(in: sortedActive)
        }

        let orderCount = actionOrder.count

        // 如果上一个行动者还未行动（初始状态），从其位置本身开始搜索；否则从下一个位置开始
        let lastActorId = gameState.players[gameState.currentActorIndex].id
        let lastActorHasActed = gameState.playersActedThisStreet.contains(lastActorId)
        let searchStartOffset = lastActorHasActed ? 1 : 0

        for offset in 0..<orderCount {
            let orderIndex = (lastActorOrderIndex + searchStartOffset + offset) % orderCount
            let targetPosition = actionOrder[orderIndex]

            if let player = sortedActive.first(where: { $0.position == targetPosition && $0.canAct }) {
                let hasActed = gameState.playersActedThisStreet.contains(player.id)
                let lastBet = gameState.playerBetsAtLastAction[player.id] ?? 0

                if !hasActed || lastBet < gameState.currentBet {
                    if let index = gameState.players.firstIndex(where: { $0.id == player.id }) {
                        gameState.currentActorIndex = index
                    }
                    return player.id
                }
            }
        }

        return nil
    }

    /// 从排序列表中找第一个未满足条件的玩家（兜底）
    private func findFirstUnmetPlayer(in sortedActive: [Player]) -> Int? {
        for player in sortedActive where player.canAct {
            let hasActed = gameState.playersActedThisStreet.contains(player.id)
            let lastBet = gameState.playerBetsAtLastAction[player.id] ?? 0
            if !hasActed || lastBet < gameState.currentBet {
                if let index = gameState.players.firstIndex(where: { $0.id == player.id }) {
                    gameState.currentActorIndex = index
                }
                return player.id
            }
        }
        return nil
    }

}
