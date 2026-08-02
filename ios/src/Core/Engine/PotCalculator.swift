import Foundation

struct PotCalculator {
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
