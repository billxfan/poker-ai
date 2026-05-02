import SwiftUI

extension GameViewModel {
    /// 每局结束后，根据本局动作日志 + 盈亏结果更新所有 AI 的学习画像
    func updatePatternsAfterHand(settlement: HandSettlement, showdown: Bool) async {
        for player in gameState.players {
            guard player.id != 0 else { continue }

            var pattern = (try? await patternRepository.getPattern(for: player.id)) ?? AIPattern()
            let playerActions = gameState.actionLog.filter { $0.playerId == player.id }
            let playerStyle = AIAvatars.getAvatar(for: player.id).style
            let profit = settlement.profit(for: player.id, contributions: gameState.handBets)
            let didWin = settlement.winningPlayerIds.contains(player.id)
            let shownHandType = settlement.handsByPlayer[player.id]?.handType

            pattern.updateAfterHand(
                playerId: player.id,
                style: playerStyle,
                playerActions: playerActions,
                allActions: gameState.actionLog,
                players: gameState.players,
                profit: profit,
                didWin: didWin,
                showdown: showdown,
                shownHandType: shownHandType,
                winningPlayerIds: Set(settlement.winningPlayerIds),
                shownHandTypes: settlement.handsByPlayer.mapValues(\.handType),
                potSize: settlement.totalPot
            )
            try? await patternRepository.savePattern(pattern, for: player.id)
        }
    }

    func saveHandRecord(settlement: HandSettlement, showdown: Bool) async {
        let playerHoleCards = humanPlayer?.holeCards
        let humanWon = settlement.winningPlayerIds.contains(0)
        let isSplitPot = settlement.winningPlayerIds.count > 1 && humanWon
        let result: HandRecord.Result
        let revealedHands = showdown
            ? gameState.players
                .compactMap { player -> RevealedPlayerHand? in
                    guard !player.isFolded, let holeCards = player.holeCards else {
                        return nil
                    }

                    return RevealedPlayerHand(
                        playerId: player.id,
                        name: player.name,
                        avatar: player.avatar,
                        holeCards: holeCards,
                        handType: settlement.handsByPlayer[player.id]?.handType,
                        isWinner: settlement.winningPlayerIds.contains(player.id)
                    )
                }
                .sorted { lhs, rhs in
                    if lhs.isWinner != rhs.isWinner {
                        return lhs.isWinner && !rhs.isWinner
                    }
                    return lhs.playerId < rhs.playerId
                }
            : []

        if isSplitPot {
            result = .tie
        } else if lastProfit > 0 {
            result = .win
        } else if lastProfit < 0 {
            result = .lose
        } else {
            result = humanWon ? .tie : .lose
        }

        let record = HandRecord(
            id: Int(Date().timeIntervalSince1970 * 1000),
            result: result,
            profit: lastProfit,
            communityCards: gameState.communityCards,
            pot: settlement.totalPot,
            playerHoleCards: playerHoleCards,
            playerHandType: settlement.handsByPlayer[0]?.handType,
            actions: gameState.actionLog,
            winnerId: settlement.winningPlayerIds.count == 1 ? settlement.winningPlayerIds.first : nil,
            showdown: showdown,
            revealedHands: revealedHands
        )

        try? await recordRepository.saveHandRecord(record)
    }

}
