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
        case .fold: return L10n.t("action.fold")
        case .call: return L10n.t("action.call")
        case .raise: return L10n.t("action.raise")
        case .allIn: return L10n.t("action.all_in")
        case .check: return L10n.t("action.check")
        case .bet: return L10n.t("action.bet")
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
            return L10n.t("action.fold")
        case .call:
            if let amount = amount {
                return L10n.f("action.call_amount", amount)
            }
            return L10n.t("action.call")
        case .raise:
            if let amount = amount {
                return L10n.f("action.raise_to_amount", amount)
            }
            return L10n.t("action.raise")
        case .allIn:
            if let amount = amount {
                return L10n.f("action.all_in_amount", amount)
            }
            return L10n.t("action.all_in")
        case .check:
            return L10n.t("action.check")
        case .bet:
            if let amount = amount {
                return L10n.f("action.bet_to_amount", amount)
            }
            return L10n.t("action.bet")
        }
    }
}
