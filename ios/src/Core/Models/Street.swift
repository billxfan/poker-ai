import Foundation

enum Street: String, Codable, CaseIterable {
    case preFlop = "preFlop"
    case flop = "flop"
    case turn = "turn"
    case river = "river"

    var displayName: String {
        switch self {
        case .preFlop: return L10n.t("street.pre_flop")
        case .flop: return L10n.t("street.flop")
        case .turn: return L10n.t("street.turn")
        case .river: return L10n.t("street.river")
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

    var actionOrder: [Position] {
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
