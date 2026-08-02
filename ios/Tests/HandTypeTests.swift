import XCTest
@testable import PokerAI

final class HandTypeTests: XCTestCase {

    func testHandTypeOrdering() {
        XCTAssertLessThan(HandType.highCard, HandType.onePair)
        XCTAssertLessThan(HandType.onePair, HandType.twoPair)
        XCTAssertLessThan(HandType.twoPair, HandType.threeOfAKind)
        XCTAssertLessThan(HandType.threeOfAKind, HandType.straight)
        XCTAssertLessThan(HandType.straight, HandType.flush)
        XCTAssertLessThan(HandType.flush, HandType.fullHouse)
        XCTAssertLessThan(HandType.fullHouse, HandType.fourOfAKind)
        XCTAssertLessThan(HandType.fourOfAKind, HandType.straightFlush)
        XCTAssertLessThan(HandType.straightFlush, HandType.royalFlush)
    }

    func testHandTypeDisplayName() {
        XCTAssertEqual(HandType.highCard.displayName, "高牌")
        XCTAssertEqual(HandType.onePair.displayName, "一对")
        XCTAssertEqual(HandType.twoPair.displayName, "两对")
        XCTAssertEqual(HandType.threeOfAKind.displayName, "三条")
        XCTAssertEqual(HandType.straight.displayName, "顺子")
        XCTAssertEqual(HandType.flush.displayName, "同花")
        XCTAssertEqual(HandType.fullHouse.displayName, "葫芦")
        XCTAssertEqual(HandType.fourOfAKind.displayName, "四条")
        XCTAssertEqual(HandType.straightFlush.displayName, "同花顺")
        XCTAssertEqual(HandType.royalFlush.displayName, "皇家同花顺")
    }
}
