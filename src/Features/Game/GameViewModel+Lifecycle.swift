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
