import SwiftUI

extension GameViewModel {
    @MainActor
    func humanFold() async {
        let action = Action(playerId: Player.humanPlayerId, street: gameState.currentStreet, type: .fold)
        _ = await pokerEngine.processAction(playerId: Player.humanPlayerId, action: action)
        await refreshFromEngine()
        analytics.logHandAction(action: "fold", street: gameState.currentStreet.displayName, potSize: gameState.pot)

        if gameState.activePlayers.count == 1 {
            await handleEarlyWin()
        } else {
            updateBettingInfo()
            syncArchiveForInProgressGame()
            await proceedToNextActor()
        }
    }

    @MainActor
    func humanCall() async {
        let actionType: ActionType = callAmount == 0 ? .check : .call
        let action = Action(playerId: Player.humanPlayerId, street: gameState.currentStreet, type: actionType, amount: callAmount)
        _ = await pokerEngine.processAction(playerId: Player.humanPlayerId, action: action)
        await refreshFromEngine()
        let actionName = callAmount == 0 ? "check" : "call"
        analytics.logHandAction(action: actionName, street: gameState.currentStreet.displayName, potSize: gameState.pot)
        updateBettingInfo()
        syncArchiveForInProgressGame()
        await proceedToNextActor()
    }

    @MainActor
    func humanRaise(amount: Int) async {
        let actionType: ActionType = gameState.currentBet == 0 ? .bet : .raise
        let action = Action(playerId: Player.humanPlayerId, street: gameState.currentStreet, type: actionType, amount: amount)
        _ = await pokerEngine.processAction(playerId: Player.humanPlayerId, action: action)
        await refreshFromEngine()
        let actionName = gameState.currentBet == 0 ? "bet" : "raise"
        analytics.logHandAction(action: actionName, street: gameState.currentStreet.displayName, potSize: gameState.pot)
        updateBettingInfo()
        syncArchiveForInProgressGame()
        await proceedToNextActor()
    }

    @MainActor
    func humanAllIn() async {
        guard let player = humanPlayer else { return }
        let action = Action(playerId: Player.humanPlayerId, street: gameState.currentStreet, type: .allIn, amount: player.chips)
        _ = await pokerEngine.processAction(playerId: Player.humanPlayerId, action: action)
        await refreshFromEngine()
        analytics.logHandAction(action: "all_in", street: gameState.currentStreet.displayName, potSize: gameState.pot)
        updateBettingInfo()
        syncArchiveForInProgressGame()
        await proceedToNextActor()
    }

}
