import Foundation

enum HandType: Int, Codable, Comparable {
    case highCard = 1
    case onePair = 2
    case twoPair = 3
    case threeOfAKind = 4
    case straight = 5
    case flush = 6
    case fullHouse = 7
    case fourOfAKind = 8
    case straightFlush = 9
    case royalFlush = 10

    var displayName: String {
        switch self {
        case .highCard: return L10n.t("hand_type.high_card")
        case .onePair: return L10n.t("hand_type.one_pair")
        case .twoPair: return L10n.t("hand_type.two_pair")
        case .threeOfAKind: return L10n.t("hand_type.three_of_a_kind")
        case .straight: return L10n.t("hand_type.straight")
        case .flush: return L10n.t("hand_type.flush")
        case .fullHouse: return L10n.t("hand_type.full_house")
        case .fourOfAKind: return L10n.t("hand_type.four_of_a_kind")
        case .straightFlush: return L10n.t("hand_type.straight_flush")
        case .royalFlush: return L10n.t("hand_type.royal_flush")
        }
    }

    static func < (lhs: HandType, rhs: HandType) -> Bool {
        lhs.rawValue < rhs.rawValue
    }

    static func > (lhs: HandType, rhs: HandType) -> Bool {
        lhs.rawValue > rhs.rawValue
    }
}
