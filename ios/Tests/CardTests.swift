import XCTest
@testable import PokerAI

final class CardTests: XCTestCase {

    func testCardCreation() {
        let card = Card(suit: .spades, rank: 14)
        XCTAssertEqual(card.suit, .spades)
        XCTAssertEqual(card.rank, 14)
    }

    func testCardDisplayRank() {
        let ace = Card(suit: .hearts, rank: 14)
        XCTAssertEqual(ace.displayRank, "A")

        let king = Card(suit: .clubs, rank: 13)
        XCTAssertEqual(king.displayRank, "K")

        let ten = Card(suit: .diamonds, rank: 10)
        XCTAssertEqual(ten.displayRank, "10")

        let five = Card(suit: .spades, rank: 5)
        XCTAssertEqual(five.displayRank, "5")
    }

    func testCardDisplay() {
        let card = Card(suit: .hearts, rank: 14)
        XCTAssertEqual(card.display, "A♥")
    }

    func testSuitColor() {
        XCTAssertEqual(Suit.spades.color, "black")
        XCTAssertEqual(Suit.clubs.color, "black")
        XCTAssertEqual(Suit.hearts.color, "red")
        XCTAssertEqual(Suit.diamonds.color, "red")
    }

    func testDeckCreation() {
        let deck = Card.createDeck()
        XCTAssertEqual(deck.count, 52)

        let suits = Set(deck.map { $0.suit })
        XCTAssertEqual(suits.count, 4)

        for suit in Suit.allCases {
            let suitCards = deck.filter { $0.suit == suit }
            XCTAssertEqual(suitCards.count, 13)
        }
    }

    func testHoleCards() {
        let card1 = Card(suit: .spades, rank: 14)
        let card2 = Card(suit: .hearts, rank: 13)
        let holeCards = HoleCards(card1, card2)

        XCTAssertEqual(holeCards.card1, card1)
        XCTAssertEqual(holeCards.card2, card2)
    }

    func testHoleCardsTuple() {
        let card1 = Card(suit: .spades, rank: 14)
        let card2 = Card(suit: .hearts, rank: 13)
        let holeCards = HoleCards(card1, card2)

        let (c1, c2) = holeCards.cards
        XCTAssertEqual(c1, card1)
        XCTAssertEqual(c2, card2)
    }
}
