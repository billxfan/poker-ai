import Foundation

extension PokerEngine {
    // MARK: - Action Processing

    private func makePassiveAction(playerId: Int, street: Street) -> Action {
        let currentPlayerBet = gameState.playerBets[playerId] ?? 0
        let callAmount = max(0, gameState.currentBet - currentPlayerBet)

        if callAmount == 0 {
            gameState.playersActedThisStreet.insert(playerId)
            gameState.playerBetsAtLastAction[playerId] = currentPlayerBet
            return Action(playerId: playerId, street: street, type: .check)
        }

        guard let playerIndex = gameState.players.firstIndex(where: { $0.id == playerId }) else {
            return Action(playerId: playerId, street: street, type: .fold)
        }

        let actualCall = min(callAmount, gameState.players[playerIndex].chips)
        gameState.players[playerIndex].chips -= actualCall
        let newBet = currentPlayerBet + actualCall
        gameState.playerBets[playerId] = newBet
        gameState.pot += actualCall
        gameState.handBets[playerId] = (gameState.handBets[playerId] ?? 0) + actualCall

        if gameState.players[playerIndex].chips == 0, actualCall > 0 {
            gameState.players[playerIndex].goAllIn()
            gameState.playersActedThisStreet.insert(playerId)
            gameState.playerBetsAtLastAction[playerId] = newBet
            // 玩家 all-in 但筹码不足以完成最小加注时，更新 currentBet
            // 防止 currentBet 停留在旧值导致回合无法结束
            if newBet > gameState.currentBet {
                gameState.currentBet = newBet
            }
            return Action(playerId: playerId, street: street, type: .allIn, amount: actualCall)
        }

        gameState.playersActedThisStreet.insert(playerId)
        gameState.playerBetsAtLastAction[playerId] = newBet
        return Action(playerId: playerId, street: street, type: .call, amount: actualCall)
    }

    private func makeAggressiveAction(playerId: Int, street: Street, requestedTarget: Int?) -> Action {
        guard let playerIndex = gameState.players.firstIndex(where: { $0.id == playerId }) else {
            return Action(playerId: playerId, street: street, type: .fold)
        }

        let currentPlayerBet = gameState.playerBets[playerId] ?? 0
        let currentBetBeforeAction = gameState.currentBet
        let maxTarget = currentPlayerBet + gameState.players[playerIndex].chips
        let minimumTarget = PotCalculator.calculateMinRaise(
            playerId: playerId,
            playerBets: gameState.playerBets,
            currentBet: currentBetBeforeAction,
            minimumRaiseIncrement: gameState.minimumRaiseIncrement
        )
        let desiredTarget = requestedTarget ?? minimumTarget

        if desiredTarget <= currentBetBeforeAction {
            return makePassiveAction(playerId: playerId, street: street)
        }

        let targetBet: Int
        if desiredTarget >= minimumTarget {
            targetBet = min(desiredTarget, maxTarget)
        } else if maxTarget > currentBetBeforeAction {
            targetBet = maxTarget
        } else {
            return makePassiveAction(playerId: playerId, street: street)
        }

        let additionalAmount = max(0, targetBet - currentPlayerBet)
        let raiseIncrement = max(0, targetBet - currentBetBeforeAction)
        let requiredIncrement = currentBetBeforeAction == 0
            ? GameConstants.bigBlind
            : gameState.minimumRaiseIncrement

        gameState.players[playerIndex].chips -= additionalAmount
        gameState.playerBets[playerId] = targetBet
        gameState.pot += additionalAmount
        gameState.handBets[playerId] = (gameState.handBets[playerId] ?? 0) + additionalAmount
        gameState.currentBet = max(gameState.currentBet, targetBet)
        gameState.playersActedThisStreet.insert(playerId)
        gameState.playerBetsAtLastAction[playerId] = targetBet

        if raiseIncrement >= requiredIncrement {
            gameState.minimumRaiseIncrement = max(GameConstants.bigBlind, raiseIncrement)
        }

        if gameState.players[playerIndex].chips == 0, additionalAmount > 0 {
            gameState.players[playerIndex].goAllIn()
            return Action(playerId: playerId, street: street, type: .allIn, amount: additionalAmount)
        }

        let actionType: ActionType = currentBetBeforeAction == 0 ? .bet : .raise
        return Action(playerId: playerId, street: street, type: actionType, amount: targetBet)
    }

    func processAction(playerId: Int, action: Action) -> GameState {
        guard let playerIndex = gameState.players.firstIndex(where: { $0.id == playerId }) else {
            return gameState
        }

        let street = gameState.currentStreet
        let resolvedAction: Action

        switch action.type {
        case .fold:
            gameState.players[playerIndex].fold()
            gameState.playersActedThisStreet.insert(playerId)
            gameState.playerBetsAtLastAction[playerId] = gameState.playerBets[playerId] ?? 0
            resolvedAction = Action(playerId: playerId, street: street, type: .fold)

        case .check:
            resolvedAction = makePassiveAction(playerId: playerId, street: street)

        case .call:
            resolvedAction = makePassiveAction(playerId: playerId, street: street)

        case .raise, .bet:
            resolvedAction = makeAggressiveAction(playerId: playerId, street: street, requestedTarget: action.amount)

        case .allIn:
            let currentPlayerBet = gameState.playerBets[playerId] ?? 0
            let maxTarget = currentPlayerBet + gameState.players[playerIndex].chips

            if maxTarget <= gameState.currentBet {
                let allInAmount = gameState.players[playerIndex].chips
                gameState.players[playerIndex].chips = 0
                gameState.players[playerIndex].goAllIn()
                let newBet = currentPlayerBet + allInAmount
                gameState.playerBets[playerId] = newBet
                gameState.pot += allInAmount
                gameState.handBets[playerId] = (gameState.handBets[playerId] ?? 0) + allInAmount
                gameState.playersActedThisStreet.insert(playerId)
                gameState.playerBetsAtLastAction[playerId] = newBet
                // all-in 金额超过 currentBet 时需更新（筹码不足以完成最小加注的场景）
                if newBet > gameState.currentBet {
                    gameState.currentBet = newBet
                }
                resolvedAction = Action(playerId: playerId, street: street, type: .allIn, amount: allInAmount)
            } else {
                resolvedAction = makeAggressiveAction(playerId: playerId, street: street, requestedTarget: maxTarget)
            }
        }

        gameState.actionLog.append(resolvedAction)
        return gameState
    }

}
