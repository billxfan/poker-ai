import SwiftUI

extension GameViewModel {
    @MainActor
    func applySnapshot(_ snapshot: EngineSnapshot) {
        gameState = snapshot.gameState
        remainingDeckSnapshot = snapshot.remainingDeck
    }

    @MainActor
    func refreshFromEngine() async {
        let snapshot = await pokerEngine.getSnapshot()
        applySnapshot(snapshot)
    }

    @MainActor
    func startGame() async {
        viewState = .dealing
        aiDecisionPointsByPlayer = [:]

        // 仅在“空状态恢复到新桌”这类兜底场景重建牌桌，
        // 不要在玩家本局 busted（输到 0）后点“下一局”时自动用 initialChips 重新开局，
        // 否则会出现桌内筹码、主页面筹码、统计三者不一致。
        let shouldRecoverIntoFreshTable = false

        if isRestoredGame {
            await pokerEngine.restoreState(gameState, remainingDeck: restoredRemainingDeck)
            if restoredResumeMode == .nextHand {
                await pokerEngine.startNewHand(advanceTable: true)
            }
            await refreshFromEngine()
            _isRestoredFromArchive = false
            restoredRemainingDeck = nil
            restoredResumeMode = .currentHand
            analytics.logGameStart(chips: humanPlayer?.chips ?? 0, source: "restored")
        } else if shouldRecoverIntoFreshTable {
            gameState = GameState()
            await pokerEngine.setupGame(humanChips: initialChips)
            await pokerEngine.startNewHand()
            await refreshFromEngine()
            analytics.logGameStart(chips: initialChips, source: "recovered_new_game")
        } else if gameState.players.isEmpty {
            await pokerEngine.setupGame(humanChips: initialChips)
            await pokerEngine.startNewHand()
            await refreshFromEngine()
            analytics.logGameStart(chips: initialChips, source: "new_game")
        } else {
            await pokerEngine.restoreState(gameState, remainingDeck: remainingDeckSnapshot)
            await pokerEngine.startNewHand(advanceTable: true)
            await refreshFromEngine()
            analytics.logGameStart(chips: humanPlayer?.chips ?? 0, source: "new_hand")
        }

        updateBettingInfo()
        viewState = .waitingForAction
        triggerNewHand = false
        syncArchiveForInProgressGame()

        await proceedToNextActor()
    }

    @MainActor
    func proceedToNextActor() async {
        guard let nextPlayerId = await pokerEngine.getNextActor() else {
            await handleRoundEnd()
            return
        }

        currentActor = gameState.players.first { $0.id == nextPlayerId }

        if nextPlayerId == Player.humanPlayerId {
            viewState = .playerActing
        } else {
            await handleAITurn(playerId: nextPlayerId)
            await proceedToNextActor()
        }
    }

    func updateBettingInfo() {
        callAmount = PotCalculator.calculateCallAmount(
            playerId: Player.humanPlayerId,
            playerBets: gameState.playerBets,
            currentBet: gameState.currentBet
        )

        minRaiseAmount = PotCalculator.calculateMinRaise(
            playerId: Player.humanPlayerId,
            playerBets: gameState.playerBets,
            currentBet: gameState.currentBet,
            minimumRaiseIncrement: gameState.minimumRaiseIncrement
        )
    }

}
