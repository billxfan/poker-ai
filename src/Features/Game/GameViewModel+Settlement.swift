import SwiftUI

extension GameViewModel {
    @MainActor
    func handleRoundEnd() async {
        let isComplete = await pokerEngine.isRoundComplete()

        if !isComplete {
            if let nextPlayerId = await pokerEngine.getNextActor() {
                currentActor = gameState.players.first { $0.id == nextPlayerId }

                if nextPlayerId == Player.humanPlayerId {
                    viewState = .playerActing
                } else {
                    await handleAITurn(playerId: nextPlayerId)
                    await handleRoundEnd()
                }
            }
            return
        }

        let nonFoldedPlayers = gameState.players.filter { !$0.isFolded }

        if nonFoldedPlayers.count <= 1 {
            await handleEarlyWin()
        } else if gameState.currentStreet == .river || !gameState.players.contains(where: { $0.canAct }) {
            // 全员 all-in 时，先发完剩余公共牌再摊牌
            if gameState.currentStreet != .river {
                await pokerEngine.dealAllRemainingCommunityCards()
                await refreshFromEngine()
            }
            await handleShowdown()
        } else {
            await pokerEngine.dealCommunityCards()
            await refreshFromEngine()
            updateBettingInfo()
            syncArchiveForInProgressGame()
            await proceedToNextActor()
        }
    }

    @MainActor
    func handleEarlyWin() async {
        let settlement = await pokerEngine.settleUncontestedHand()
        await finalizeHand(with: settlement, showdown: false)
    }

    @MainActor
    func handleShowdown() async {
        let settlement = await pokerEngine.settleShowdown()
        await finalizeHand(with: settlement, showdown: true)
    }

    @MainActor
    func finalizeHand(with settlement: HandSettlement, showdown: Bool) async {
        await refreshFromEngine()
        updateBettingInfo()
        thinkingPlayerId = nil
        currentActor = nil
        showActionLog = false

        lastWinningPlayerIds = settlement.winningPlayerIds
        lastIsSplitPot = settlement.isSplitPot
        lastPayouts = settlement.payouts
        lastWasShowdown = showdown
        if settlement.winningPlayerIds.count == 1, let winnerId = settlement.winningPlayerIds.first {
            lastWinner = gameState.players.first { $0.id == winnerId }
        } else {
            lastWinner = nil
        }
        lastProfit = settlement.profit(for: Player.humanPlayerId, contributions: gameState.handBets)

        // Analytics: track hand result
        let humanWon = settlement.winningPlayerIds.contains(Player.humanPlayerId)
        let result: String = humanWon ? "win" : (settlement.isSplitPot ? "tie" : "lose")
        analytics.logHandResult(
            handNumber: gameState.handNumber,
            result: result,
            profit: lastProfit,
            handType: nil,
            showdown: showdown,
            potSize: settlement.totalPot,
            aiProfile: nil
        )

        await updatePatternsAfterHand(settlement: settlement, showdown: showdown)
        await saveHandRecord(settlement: settlement, showdown: showdown)

        onGameEnd(lastProfit)
        saveGame(resumeMode: .nextHand)

        showRoundEndModal = true
        viewState = .roundEnd
    }

}
