import XCTest
@testable import PokerAI

final class HandEvaluatorTests: XCTestCase {

    func testHighCard() {
        let holeCards = HoleCards(Card(suit: .spades, rank: 5), Card(suit: .hearts, rank: 9))
        let communityCards: [Card] = [
            Card(suit: .clubs, rank: 2),
            Card(suit: .diamonds, rank: 7),
            Card(suit: .spades, rank: 10)
        ]

        let hand = HandEvaluator.evaluate(holeCards: holeCards, communityCards: communityCards)
        XCTAssertEqual(hand.handType, .highCard)
        XCTAssertEqual(hand.bestFive.count, 5)
    }

    func testOnePair() {
        let holeCards = HoleCards(Card(suit: .spades, rank: 10), Card(suit: .hearts, rank: 10))
        let communityCards: [Card] = [
            Card(suit: .clubs, rank: 2),
            Card(suit: .diamonds, rank: 7),
            Card(suit: .spades, rank: 3)
        ]

        let hand = HandEvaluator.evaluate(holeCards: holeCards, communityCards: communityCards)
        XCTAssertEqual(hand.handType, .onePair)
        XCTAssertEqual(hand.kickers.first, 10)
    }

    func testTwoPair() {
        let holeCards = HoleCards(Card(suit: .spades, rank: 10), Card(suit: .hearts, rank: 5))
        let communityCards: [Card] = [
            Card(suit: .clubs, rank: 10),
            Card(suit: .diamonds, rank: 5),
            Card(suit: .spades, rank: 3)
        ]

        let hand = HandEvaluator.evaluate(holeCards: holeCards, communityCards: communityCards)
        XCTAssertEqual(hand.handType, .twoPair)
    }

    func testThreeOfAKind() {
        let holeCards = HoleCards(Card(suit: .spades, rank: 10), Card(suit: .hearts, rank: 10))
        let communityCards: [Card] = [
            Card(suit: .clubs, rank: 10),
            Card(suit: .diamonds, rank: 5),
            Card(suit: .spades, rank: 3)
        ]

        let hand = HandEvaluator.evaluate(holeCards: holeCards, communityCards: communityCards)
        XCTAssertEqual(hand.handType, .threeOfAKind)
    }

    func testStraight() {
        let holeCards = HoleCards(Card(suit: .spades, rank: 5), Card(suit: .hearts, rank: 6))
        let communityCards: [Card] = [
            Card(suit: .clubs, rank: 7),
            Card(suit: .diamonds, rank: 8),
            Card(suit: .spades, rank: 4)
        ]

        let hand = HandEvaluator.evaluate(holeCards: holeCards, communityCards: communityCards)
        XCTAssertEqual(hand.handType, .straight)
    }

    func testWheelStraight() {
        let holeCards = HoleCards(Card(suit: .spades, rank: 14), Card(suit: .hearts, rank: 2))
        let communityCards: [Card] = [
            Card(suit: .clubs, rank: 3),
            Card(suit: .diamonds, rank: 4),
            Card(suit: .spades, rank: 5)
        ]

        let hand = HandEvaluator.evaluate(holeCards: holeCards, communityCards: communityCards)
        XCTAssertEqual(hand.handType, .straight)
    }

    func testFlush() {
        let holeCards = HoleCards(Card(suit: .spades, rank: 5), Card(suit: .spades, rank: 9))
        let communityCards: [Card] = [
            Card(suit: .spades, rank: 2),
            Card(suit: .spades, rank: 7),
            Card(suit: .spades, rank: 3)
        ]

        let hand = HandEvaluator.evaluate(holeCards: holeCards, communityCards: communityCards)
        XCTAssertEqual(hand.handType, .flush)
    }

    func testFullHouse() {
        let holeCards = HoleCards(Card(suit: .spades, rank: 10), Card(suit: .hearts, rank: 10))
        let communityCards: [Card] = [
            Card(suit: .clubs, rank: 10),
            Card(suit: .diamonds, rank: 5),
            Card(suit: .spades, rank: 5)
        ]

        let hand = HandEvaluator.evaluate(holeCards: holeCards, communityCards: communityCards)
        XCTAssertEqual(hand.handType, .fullHouse)
    }

    func testFourOfAKind() {
        let holeCards = HoleCards(Card(suit: .spades, rank: 10), Card(suit: .hearts, rank: 10))
        let communityCards: [Card] = [
            Card(suit: .clubs, rank: 10),
            Card(suit: .diamonds, rank: 10),
            Card(suit: .spades, rank: 5)
        ]

        let hand = HandEvaluator.evaluate(holeCards: holeCards, communityCards: communityCards)
        XCTAssertEqual(hand.handType, .fourOfAKind)
    }

    func testStraightFlush() {
        let holeCards = HoleCards(Card(suit: .spades, rank: 5), Card(suit: .spades, rank: 6))
        let communityCards: [Card] = [
            Card(suit: .spades, rank: 7),
            Card(suit: .spades, rank: 8),
            Card(suit: .spades, rank: 4)
        ]

        let hand = HandEvaluator.evaluate(holeCards: holeCards, communityCards: communityCards)
        XCTAssertEqual(hand.handType, .straightFlush)
    }

    func testRoyalFlush() {
        let holeCards = HoleCards(Card(suit: .spades, rank: 14), Card(suit: .spades, rank: 13))
        let communityCards: [Card] = [
            Card(suit: .spades, rank: 12),
            Card(suit: .spades, rank: 11),
            Card(suit: .spades, rank: 10)
        ]

        let hand = HandEvaluator.evaluate(holeCards: holeCards, communityCards: communityCards)
        XCTAssertEqual(hand.handType, .royalFlush)
    }

    func testRoyalFlushWithUnorderedCards() {
        let holeCards = HoleCards(Card(suit: .spades, rank: 14), Card(suit: .spades, rank: 12))
        let communityCards: [Card] = [
            Card(suit: .spades, rank: 13),
            Card(suit: .spades, rank: 11),
            Card(suit: .spades, rank: 10)
        ]

        let hand = HandEvaluator.evaluate(holeCards: holeCards, communityCards: communityCards)
        XCTAssertEqual(hand.handType, .royalFlush)
    }

    func testHandComparison() {
        let straightFlush = Hand(
            holeCards: nil,
            bestFive: [],
            handType: .straightFlush,
            kickers: [10]
        )
        let fourOfAKind = Hand(
            holeCards: nil,
            bestFive: [],
            handType: .fourOfAKind,
            kickers: [10, 5]
        )

        XCTAssertEqual(straightFlush.compare(to: fourOfAKind), .orderedDescending)
        XCTAssertEqual(fourOfAKind.compare(to: straightFlush), .orderedAscending)
    }

    func testHandComparisonSameType() {
        let pair1 = Hand(
            holeCards: nil,
            bestFive: [],
            handType: .onePair,
            kickers: [10, 8, 5]
        )
        let pair2 = Hand(
            holeCards: nil,
            bestFive: [],
            handType: .onePair,
            kickers: [10, 7, 5]
        )

        XCTAssertEqual(pair1.compare(to: pair2), .orderedDescending)
    }
}
