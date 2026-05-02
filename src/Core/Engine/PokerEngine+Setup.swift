import Foundation

extension PokerEngine {
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

    func dealCard() -> Card? {
        guard !deck.isEmpty else { return nil }
        return deck.removeFirst()
    }

    private func rotatePlayerPositions() {
        for index in gameState.players.indices {
            gameState.players[index].position = gameState.players[index].position.next()
        }
    }

    func normalizeBettingState() {
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
            // AI 玩家出局后自动补充筹码
            if gameState.players[index].id != Player.humanPlayerId
                && gameState.players[index].status == .out {
                gameState.players[index].chips = GameConstants.startingChips
            }
            gameState.players[index].reset()
        }

        dealBlinds()
        dealHoleCards()

        gameState.currentActorIndex = gameState.players.firstIndex {
            $0.position == .utg && $0.canAct
        } ?? gameState.players.firstIndex(where: { $0.canAct }) ?? 0
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

}
