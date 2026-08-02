import Foundation

enum Suit: String, Codable, CaseIterable, Hashable {
    case spades = "♠"
    case hearts = "♥"
    case diamonds = "♦"
    case clubs = "♣"

    var color: String {
        switch self {
        case .spades, .clubs: return "black"
        case .hearts, .diamonds: return "red"
        }
    }
}

struct Card: Hashable, Codable, Identifiable {
    let suit: Suit
    let rank: Int // 2-14 (2=2, ..., 14=A)

    var id: String { "\(suit.rawValue)\(rank)" }

    var displayRank: String {
        switch rank {
        case 2...10: return "\(rank)"
        case 11: return "J"
        case 12: return "Q"
        case 13: return "K"
        case 14: return "A"
        default: return "\(rank)"
        }
    }

    var display: String {
        "\(displayRank)\(suit.rawValue)"
    }

    static func rankName(_ rank: Int) -> String {
        switch rank {
        case 2...10: return "\(rank)"
        case 11: return "J"
        case 12: return "Q"
        case 13: return "K"
        case 14: return "A"
        default: return "\(rank)"
        }
    }
}

struct HoleCards: Codable, Hashable {
    let card1: Card
    let card2: Card

    var cards: (Card, Card) {
        (card1, card2)
    }

    init(_ card1: Card, _ card2: Card) {
        self.card1 = card1
        self.card2 = card2
    }

    init?(from tuple: (Card, Card)?) {
        guard let tuple = tuple else { return nil }
        self.card1 = tuple.0
        self.card2 = tuple.1
    }
}

extension Card {
    static let allSuits: [Suit] = Suit.allCases
    static let allRanks: [Int] = Array(2...14)

    static func createDeck() -> [Card] {
        var deck: [Card] = []
        for suit in allSuits {
            for rank in allRanks {
                deck.append(Card(suit: suit, rank: rank))
            }
        }
        return deck
    }
}
