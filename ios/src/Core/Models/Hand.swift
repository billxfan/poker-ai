import Foundation

struct Hand {
    let holeCards: HoleCards?
    let bestFive: [Card]
    let handType: HandType
    let kickers: [Int]

    init(holeCards: HoleCards?, bestFive: [Card], handType: HandType, kickers: [Int]) {
        self.holeCards = holeCards
        self.bestFive = bestFive
        self.handType = handType
        self.kickers = kickers
    }

    func compare(to other: Hand) -> ComparisonResult {
        if handType != other.handType {
            return handType > other.handType ? .orderedDescending : .orderedAscending
        }

        for (a, b) in zip(kickers, other.kickers) {
            if a != b {
                return a > b ? .orderedDescending : .orderedAscending
            }
        }

        return .orderedSame
    }
}

struct RevealedPlayerHand: Codable, Identifiable {
    let playerId: Int
    let name: String
    let avatar: String
    let holeCards: HoleCards
    let handType: HandType?
    let isWinner: Bool

    var id: Int { playerId }
}

struct HandRecord: Codable, Identifiable {
    let id: Int
    let result: Result
    let profit: Int
    let communityCards: [Card]
    let pot: Int
    let playerHoleCards: HoleCards?
    let playerHandType: HandType?
    let actions: [Action]
    let winnerId: Int?
    let showdown: Bool
    let revealedHands: [RevealedPlayerHand]
    let createdAt: Date

    enum Result: String, Codable {
        case win
        case lose
        case tie
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case result
        case profit
        case communityCards
        case pot
        case playerHoleCards
        case playerHandType
        case actions
        case winnerId
        case showdown
        case revealedHands
        case createdAt
    }

    init(
        id: Int,
        result: Result,
        profit: Int,
        communityCards: [Card],
        pot: Int,
        playerHoleCards: HoleCards?,
        playerHandType: HandType?,
        actions: [Action],
        winnerId: Int?,
        showdown: Bool,
        revealedHands: [RevealedPlayerHand] = [],
        createdAt: Date = Date()
    ) {
        self.id = id
        self.result = result
        self.profit = profit
        self.communityCards = communityCards
        self.pot = pot
        self.playerHoleCards = playerHoleCards
        self.playerHandType = playerHandType
        self.actions = actions
        self.winnerId = winnerId
        self.showdown = showdown
        self.revealedHands = revealedHands
        self.createdAt = createdAt
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(Int.self, forKey: .id)
        result = try container.decode(Result.self, forKey: .result)
        profit = try container.decode(Int.self, forKey: .profit)
        communityCards = try container.decode([Card].self, forKey: .communityCards)
        pot = try container.decode(Int.self, forKey: .pot)
        playerHoleCards = try container.decodeIfPresent(HoleCards.self, forKey: .playerHoleCards)
        playerHandType = try container.decodeIfPresent(HandType.self, forKey: .playerHandType)
        actions = try container.decode([Action].self, forKey: .actions)
        winnerId = try container.decodeIfPresent(Int.self, forKey: .winnerId)
        showdown = try container.decode(Bool.self, forKey: .showdown)
        revealedHands = try container.decodeIfPresent([RevealedPlayerHand].self, forKey: .revealedHands) ?? []
        createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt) ?? Date()
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(result, forKey: .result)
        try container.encode(profit, forKey: .profit)
        try container.encode(communityCards, forKey: .communityCards)
        try container.encode(pot, forKey: .pot)
        try container.encodeIfPresent(playerHoleCards, forKey: .playerHoleCards)
        try container.encodeIfPresent(playerHandType, forKey: .playerHandType)
        try container.encode(actions, forKey: .actions)
        try container.encodeIfPresent(winnerId, forKey: .winnerId)
        try container.encode(showdown, forKey: .showdown)
        try container.encode(revealedHands, forKey: .revealedHands)
        try container.encode(createdAt, forKey: .createdAt)
    }
}

struct GameState: Codable {
    var players: [Player]
    var communityCards: [Card]
    var currentStreet: Street
    var pot: Int
    var sidePots: [Int]
    var currentBet: Int
    /// 当前 street 的最小加注增量（不是目标总下注额）
    var minimumRaiseIncrement: Int
    var playerBets: [Int: Int]
    var buttonPosition: Position
    var actionLog: [Action]
    var currentActorIndex: Int
    var handNumber: Int
    /// 记录本 street 每位玩家最后一次下注时的当前注额（用于判断是否需要再次行动）
    var playerBetsAtLastAction: [Int: Int]
    /// 当前 street 中已行动过的玩家 ID 集合
    var playersActedThisStreet: Set<Int>
    /// 本局累计下注（跨 street 累加，清零于 startNewHand）
    var handBets: [Int: Int]

    var activePlayers: [Player] {
        players.filter { $0.isActive || $0.isAllIn }
    }

    var foldedPlayers: [Player] {
        players.filter { $0.isFolded }
    }

    private enum CodingKeys: String, CodingKey {
        case players
        case communityCards
        case currentStreet
        case pot
        case sidePots
        case currentBet
        case minimumRaiseIncrement
        case playerBets
        case buttonPosition
        case actionLog
        case currentActorIndex
        case handNumber
        case playerBetsAtLastAction
        case playersActedThisStreet
        case handBets
    }

    init(
        players: [Player] = [],
        communityCards: [Card] = [],
        currentStreet: Street = .preFlop,
        pot: Int = 0,
        sidePots: [Int] = [],
        currentBet: Int = 0,
        minimumRaiseIncrement: Int = GameConstants.bigBlind,
        playerBets: [Int: Int] = [:],
        buttonPosition: Position = .btn,
        actionLog: [Action] = [],
        currentActorIndex: Int = 0,
        handNumber: Int = 1,
        playerBetsAtLastAction: [Int: Int] = [:],
        playersActedThisStreet: Set<Int> = [],
        handBets: [Int: Int] = [:]
    ) {
        self.players = players
        self.communityCards = communityCards
        self.currentStreet = currentStreet
        self.pot = pot
        self.sidePots = sidePots
        self.currentBet = currentBet
        self.minimumRaiseIncrement = minimumRaiseIncrement
        self.playerBets = playerBets
        self.buttonPosition = buttonPosition
        self.actionLog = actionLog
        self.currentActorIndex = currentActorIndex
        self.handNumber = handNumber
        self.playerBetsAtLastAction = playerBetsAtLastAction
        self.playersActedThisStreet = playersActedThisStreet
        self.handBets = handBets
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        players = try container.decode([Player].self, forKey: .players)
        communityCards = try container.decode([Card].self, forKey: .communityCards)
        currentStreet = try container.decode(Street.self, forKey: .currentStreet)
        pot = try container.decode(Int.self, forKey: .pot)
        sidePots = try container.decode([Int].self, forKey: .sidePots)
        currentBet = try container.decode(Int.self, forKey: .currentBet)
        minimumRaiseIncrement = try container.decodeIfPresent(Int.self, forKey: .minimumRaiseIncrement) ?? GameConstants.bigBlind
        playerBets = try container.decode([Int: Int].self, forKey: .playerBets)
        buttonPosition = try container.decode(Position.self, forKey: .buttonPosition)
        actionLog = try container.decode([Action].self, forKey: .actionLog)
        currentActorIndex = try container.decode(Int.self, forKey: .currentActorIndex)
        handNumber = try container.decode(Int.self, forKey: .handNumber)
        playerBetsAtLastAction = try container.decode([Int: Int].self, forKey: .playerBetsAtLastAction)
        playersActedThisStreet = try container.decode(Set<Int>.self, forKey: .playersActedThisStreet)
        handBets = try container.decode([Int: Int].self, forKey: .handBets)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(players, forKey: .players)
        try container.encode(communityCards, forKey: .communityCards)
        try container.encode(currentStreet, forKey: .currentStreet)
        try container.encode(pot, forKey: .pot)
        try container.encode(sidePots, forKey: .sidePots)
        try container.encode(currentBet, forKey: .currentBet)
        try container.encode(minimumRaiseIncrement, forKey: .minimumRaiseIncrement)
        try container.encode(playerBets, forKey: .playerBets)
        try container.encode(buttonPosition, forKey: .buttonPosition)
        try container.encode(actionLog, forKey: .actionLog)
        try container.encode(currentActorIndex, forKey: .currentActorIndex)
        try container.encode(handNumber, forKey: .handNumber)
        try container.encode(playerBetsAtLastAction, forKey: .playerBetsAtLastAction)
        try container.encode(playersActedThisStreet, forKey: .playersActedThisStreet)
        try container.encode(handBets, forKey: .handBets)
    }
}
