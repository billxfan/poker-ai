import Foundation

struct HandSettlement {
    let winningPlayerIds: [Int]
    let payouts: [Int: Int]
    let handsByPlayer: [Int: Hand]
    let totalPot: Int

    func profit(for playerId: Int, contributions: [Int: Int]) -> Int {
        payouts[playerId, default: 0] - contributions[playerId, default: 0]
    }
}

actor PokerEngine {
    private var deck: [Card] = []
    private var gameState: GameState

    init() {
        self.gameState = GameState()
    }

    // MARK: - Game Setup

    func setupGame(humanChips: Int) {
        gameState = GameState()
        gameState.handNumber = 1

        var players = [Player]()
        players.append(Player.createHuman(position: .bb, chips: humanChips))

        let aiConfigs: [(Int, String, String, Position)] = [
            (1, "老K", "👴", .utg),
            (2, "小马", "🧑", .mp),
            (3, "大叔", "🧔", .co),
            (4, "小鱼", "👧", .btn),
            (5, "狐狸", "🦊", .sb)
        ]

        for (id, name, avatar, position) in aiConfigs {
            players.append(
                Player.createAI(
                    id: id,
                    name: name,
                    avatar: avatar,
                    position: position,
                    chips: GameConstants.startingChips
                )
            )
        }

        gameState.players = players
        gameState.buttonPosition = .btn
    }

    // MARK: - Deck Management

    private func shuffleDeck() {
        deck = Card.createDeck()
        deck.shuffle()
    }

    private func dealCard() -> Card? {
        guard !deck.isEmpty else { return nil }
        return deck.removeFirst()
    }

    private func rotatePlayerPositions() {
        for index in gameState.players.indices {
            gameState.players[index].position = gameState.players[index].position.next()
        }
    }

    private func normalizeBettingState() {
        gameState.currentBet = gameState.playerBets.values.max() ?? 0
        gameState.minimumRaiseIncrement = max(GameConstants.bigBlind, gameState.minimumRaiseIncrement)
    }

    private func postForcedBet(for playerIndex: Int, amount: Int) {
        let playerId = gameState.players[playerIndex].id
        let actualAmount = min(amount, max(0, gameState.players[playerIndex].chips))

        gameState.players[playerIndex].chips -= actualAmount
        gameState.playerBets[playerId] = actualAmount
        gameState.handBets[playerId] = actualAmount
        gameState.playerBetsAtLastAction[playerId] = actualAmount
        gameState.pot += actualAmount

        if gameState.players[playerIndex].chips == 0, actualAmount > 0 {
            gameState.players[playerIndex].goAllIn()
        }
    }

    // MARK: - Hand Setup

    func startNewHand(advanceTable: Bool = false) {
        if advanceTable {
            rotatePlayerPositions()
            gameState.handNumber += 1
        }

        shuffleDeck()
        gameState.currentStreet = .preFlop
        gameState.communityCards = []
        gameState.pot = 0
        gameState.sidePots = []
        gameState.currentBet = 0
        gameState.minimumRaiseIncrement = GameConstants.bigBlind
        gameState.playerBets = [:]
        gameState.actionLog = []
        gameState.buttonPosition = .btn
        gameState.playersActedThisStreet = []
        gameState.playerBetsAtLastAction = [:]
        gameState.handBets = [:]

        for index in gameState.players.indices {
            gameState.players[index].reset()
        }

        dealBlinds()
        dealHoleCards()

        gameState.currentActorIndex = gameState.players.firstIndex { $0.position == .utg } ?? 0
    }

    private func dealBlinds() {
        for index in gameState.players.indices {
            let player = gameState.players[index]

            switch player.position {
            case .sb:
                postForcedBet(for: index, amount: GameConstants.smallBlind)
            case .bb:
                postForcedBet(for: index, amount: GameConstants.bigBlind)
            default:
                continue
            }
        }

        gameState.currentBet = gameState.playerBets.values.max() ?? 0
    }

    private func dealHoleCards() {
        for index in gameState.players.indices {
            guard gameState.players[index].chips > 0 || gameState.players[index].isAllIn else { continue }
            guard let card1 = dealCard(), let card2 = dealCard() else { continue }
            gameState.players[index].holeCards = HoleCards(card1, card2)
        }
    }

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

        gameState.currentActorIndex = gameState.players.firstIndex { $0.position == .sb } ?? 0
    }

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
                resolvedAction = Action(playerId: playerId, street: street, type: .allIn, amount: allInAmount)
            } else {
                resolvedAction = makeAggressiveAction(playerId: playerId, street: street, requestedTarget: maxTarget)
            }
        }

        gameState.actionLog.append(resolvedAction)
        return gameState
    }

    // MARK: - Round End Detection

    func isRoundComplete() -> Bool {
        let actionablePlayers = gameState.players.filter { $0.canAct }
        guard actionablePlayers.count > 1 else { return true }

        for player in actionablePlayers {
            let hasActed = gameState.playersActedThisStreet.contains(player.id)
            let lastBet = gameState.playerBetsAtLastAction[player.id] ?? 0
            if !hasActed || lastBet < gameState.currentBet {
                return false
            }
        }

        return true
    }

    func getNextActor() -> Int? {
        let activePlayers = gameState.activePlayers
        guard activePlayers.count > 1 else { return nil }

        let positionOrder: [Position] = gameState.currentStreet == .preFlop
            ? Position.preFlopOrder
            : Position.postFlopOrder

        let sortedActive = activePlayers.sorted { p1, p2 in
            let i1 = positionOrder.firstIndex(of: p1.position) ?? 0
            let i2 = positionOrder.firstIndex(of: p2.position) ?? 0
            return i1 < i2
        }

        let canActPlayers = sortedActive.filter { $0.canAct }

        if canActPlayers.count == 1, let lonePlayer = canActPlayers.first {
            let currentPlayerBet = gameState.playerBets[lonePlayer.id] ?? 0

            if currentPlayerBet < gameState.currentBet {
                if let index = gameState.players.firstIndex(where: { $0.id == lonePlayer.id }) {
                    gameState.currentActorIndex = index
                }
                return lonePlayer.id
            }

            return nil
        }

        let canActCount = canActPlayers.count
        let actedCanActCount = canActPlayers.filter { gameState.playersActedThisStreet.contains($0.id) }.count
        let hasUncalledBet = sortedActive.contains { player in
            guard player.canAct else { return false }
            let lastBet = gameState.playerBetsAtLastAction[player.id] ?? 0
            return lastBet < gameState.currentBet
        }

        if actedCanActCount >= canActCount && canActCount > 0 && !hasUncalledBet {
            return nil
        }

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

    // MARK: - Game State Access

    func getState() -> GameState {
        normalizeBettingState()
        return gameState
    }

    func restoreState(_ state: GameState) {
        gameState = state
        normalizeBettingState()
    }

    // MARK: - Hand Evaluation

    func evaluateHand(holeCards: HoleCards?, communityCards: [Card]) -> Hand {
        HandEvaluator.evaluate(holeCards: holeCards, communityCards: communityCards)
    }

    // MARK: - Showdown / Settlement

    func determineWinner() -> [(playerId: Int, hand: Hand)] {
        let contenders = gameState.players.filter { !$0.isFolded && $0.holeCards != nil }
        return contenders
            .map { player in
                let hand = HandEvaluator.evaluate(holeCards: player.holeCards, communityCards: gameState.communityCards)
                return (playerId: player.id, hand: hand)
            }
            .sorted { $0.hand.compare(to: $1.hand) == .orderedDescending }
    }

    private func applyPayouts(_ payouts: [Int: Int]) {
        for index in gameState.players.indices {
            let playerId = gameState.players[index].id
            gameState.players[index].chips += payouts[playerId, default: 0]
            if gameState.players[index].chips <= 0 {
                gameState.players[index].status = .out
            }
        }
    }

    func settleUncontestedHand() -> HandSettlement {
        guard let winner = gameState.activePlayers.first else {
            return HandSettlement(winningPlayerIds: [], payouts: [:], handsByPlayer: [:], totalPot: gameState.pot)
        }

        let payouts = [winner.id: gameState.pot]
        applyPayouts(payouts)

        return HandSettlement(
            winningPlayerIds: [winner.id],
            payouts: payouts,
            handsByPlayer: [:],
            totalPot: gameState.pot
        )
    }

    func settleShowdown() -> HandSettlement {
        let contenders = gameState.players.filter { !$0.isFolded && $0.holeCards != nil }
        let handsByPlayer = Dictionary(uniqueKeysWithValues: contenders.map { player in
            (player.id, HandEvaluator.evaluate(holeCards: player.holeCards, communityCards: gameState.communityCards))
        })

        let contributions = gameState.handBets.filter { $0.value > 0 }
        let levels = Array(Set(contributions.values)).sorted()
        var previousLevel = 0
        var payouts: [Int: Int] = [:]

        for level in levels {
            let layerSize = level - previousLevel
            guard layerSize > 0 else { continue }

            let contributorIds = contributions.compactMap { playerId, contribution in
                contribution >= level ? playerId : nil
            }
            let potAtLevel = layerSize * contributorIds.count
            guard potAtLevel > 0 else {
                previousLevel = level
                continue
            }

            let eligibleIds = contributorIds.filter { handsByPlayer[$0] != nil }
            guard let bestId = eligibleIds.max(by: { lhs, rhs in
                guard let leftHand = handsByPlayer[lhs], let rightHand = handsByPlayer[rhs] else { return false }
                return leftHand.compare(to: rightHand) == .orderedAscending
            }), let bestHand = handsByPlayer[bestId] else {
                previousLevel = level
                continue
            }

            let winnerIds = eligibleIds.filter { playerId in
                guard let hand = handsByPlayer[playerId] else { return false }
                return hand.compare(to: bestHand) == .orderedSame
            }.sorted()

            let share = potAtLevel / winnerIds.count
            let remainder = potAtLevel % winnerIds.count

            for (offset, winnerId) in winnerIds.enumerated() {
                payouts[winnerId, default: 0] += share + (offset < remainder ? 1 : 0)
            }

            previousLevel = level
        }

        applyPayouts(payouts)

        return HandSettlement(
            winningPlayerIds: payouts.filter { $0.value > 0 }.map(\.key).sorted(),
            payouts: payouts,
            handsByPlayer: handsByPlayer,
            totalPot: gameState.pot
        )
    }
}
