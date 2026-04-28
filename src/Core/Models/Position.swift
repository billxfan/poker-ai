import Foundation

enum Position: String, Codable, CaseIterable {
    case utg = "UTG"
    case mp = "MP"
    case co = "CO"
    case btn = "BTN"
    case sb = "SB"
    case bb = "BB"

    var displayName: String {
        rawValue
    }

    var index: Int {
        switch self {
        case .utg: return 0
        case .mp: return 1
        case .co: return 2
        case .btn: return 3
        case .sb: return 4
        case .bb: return 5
        }
    }

    static func from(index: Int) -> Position {
        let normalizedIndex = ((index % 6) + 6) % 6
        switch normalizedIndex {
        case 0: return .utg
        case 1: return .mp
        case 2: return .co
        case 3: return .btn
        case 4: return .sb
        case 5: return .bb
        default: return .utg
        }
    }

    func next() -> Position {
        Position.from(index: index + 1)
    }

    func previous() -> Position {
        Position.from(index: index - 1)
    }
}

extension Position {
    static let preFlopOrder: [Position] = [.utg, .mp, .co, .btn, .sb, .bb]
    static let postFlopOrder: [Position] = [.sb, .bb, .utg, .mp, .co, .btn]
}
