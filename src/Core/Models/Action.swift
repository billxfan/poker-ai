import Foundation

enum ActionType: String, Codable {
    case fold
    case call
    case raise
    case allIn
    case check
    case bet

    var displayName: String {
        switch self {
        case .fold: return "弃牌"
        case .call: return "跟注"
        case .raise: return "加注"
        case .allIn: return "全下"
        case .check: return "过牌"
        case .bet: return "下注"
        }
    }
}

struct Action: Codable, Identifiable {
    let id: UUID
    let playerId: Int
    let street: Street
    let type: ActionType
    let amount: Int?

    init(playerId: Int, street: Street, type: ActionType, amount: Int? = nil) {
        self.id = UUID()
        self.playerId = playerId
        self.street = street
        self.type = type
        self.amount = amount
    }

    var displayText: String {
        switch type {
        case .fold:
            return "弃牌"
        case .call:
            if let amount = amount {
                return "跟注 \(amount)"
            }
            return "跟注"
        case .raise:
            if let amount = amount {
                return "加到 \(amount)"
            }
            return "加注"
        case .allIn:
            if let amount = amount {
                return "全下 \(amount)"
            }
            return "全下"
        case .check:
            return "过牌"
        case .bet:
            if let amount = amount {
                return "下注到 \(amount)"
            }
            return "下注"
        }
    }
}
