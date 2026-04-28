import Foundation

enum Street: String, Codable, CaseIterable {
    case preFlop = "preFlop"
    case flop = "flop"
    case turn = "turn"
    case river = "river"

    var displayName: String {
        switch self {
        case .preFlop: return "预翻牌"
        case .flop: return "翻牌"
        case .turn: return "转牌"
        case .river: return "河牌"
        }
    }

    var cardCount: Int {
        switch self {
        case .preFlop: return 0
        case .flop: return 3
        case .turn: return 4
        case .river: return 5
        }
    }

    func actionOrder(btnPosition: Position) -> [Position] {
        switch self {
        case .preFlop:
            return Position.preFlopOrder
        default:
            return Position.postFlopOrder
        }
    }

    func next() -> Street? {
        switch self {
        case .preFlop: return .flop
        case .flop: return .turn
        case .turn: return .river
        case .river: return nil
        }
    }
}
