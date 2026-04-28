import Foundation

struct PotCalculator {
    /// 计算主池：只包括当前轮所有还"活着"的玩家（bet > 0）
    /// 场景：A全下100，B跟注100，C fold(0) → 主池 = 100*2 = 200（只有A、B能赢）
    static func calculateMainPot(playerBets: [Int: Int]) -> Int {
        let activeBets = playerBets.filter { $0.value > 0 }
        guard activeBets.count > 1 else { return 0 }

        let minBet = activeBets.values.min() ?? 0
        return minBet * activeBets.count
    }

    /// 计算边池列表：每轮只由当前还活着（remaining > 0）的玩家争夺
    /// 算法：逐层剥去最小下注额，形成独立边池
    /// - Parameter activePlayerIds: 本轮仍然在局中的玩家ID（bet > 0 且未 fold）
    static func calculateSidePots(playerBets: [Int: Int], activePlayerIds: Set<Int>) -> [Int] {
        var sidePots: [Int] = []
        var remainingBets = playerBets

        // 每轮：找出还有筹码的玩家，计算本层池子，然后扣减
        var currentContenders = activePlayerIds.filter { (remainingBets[$0] ?? 0) > 0 }

        while currentContenders.count > 1 {
            // 本层最小下注额
            let minBet = currentContenders.compactMap { remainingBets[$0] }.min() ?? 0
            guard minBet > 0 else { break }

            // 边池 = minBet × 本层还在争的玩家数
            let potAtLevel = minBet * currentContenders.count
            sidePots.append(potAtLevel)

            // 所有人扣减最小注
            for playerId in currentContenders {
                remainingBets[playerId] = (remainingBets[playerId] ?? 0) - minBet
            }

            // 更新下一轮玩家：还有剩余筹码的继续
            currentContenders = currentContenders.filter { (remainingBets[$0] ?? 0) > 0 }
        }

        return sidePots
    }

    static func calculateCallAmount(playerId: Int, playerBets: [Int: Int], currentBet: Int) -> Int {
        let playerBet = playerBets[playerId] ?? 0
        return max(0, currentBet - playerBet)
    }

    /// 返回本次激进行动后的最小总下注额（不是额外补入额）。
    static func calculateMinRaise(
        playerId: Int,
        playerBets: [Int: Int],
        currentBet: Int,
        minimumRaiseIncrement: Int
    ) -> Int {
        if currentBet == 0 {
            return max(GameConstants.bigBlind, minimumRaiseIncrement)
        }

        return currentBet + max(GameConstants.bigBlind, minimumRaiseIncrement)
    }
}
