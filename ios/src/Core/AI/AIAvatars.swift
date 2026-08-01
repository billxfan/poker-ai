import Foundation

enum AIAvatars {
    static let avatars: [Int: (name: String, avatar: String, style: AIStyle)] = [
        1: (L10n.t("ai.old_k"), "ai_old_k", .tightAggressive),
        2: (L10n.t("ai.pony"), "ai_pony", .looseAggressive),
        3: (L10n.t("ai.uncle"), "ai_uncle", .tightWeak),
        4: (L10n.t("ai.fish"), "ai_fish", .looseWeak),
        5: (L10n.t("ai.fox"), "ai_fox", .balanced)
    ]

    static func getAvatar(for id: Int) -> (name: String, avatar: String, style: AIStyle) {
        avatars[id] ?? ("AI-\(id)", "🤖", .balanced)
    }
}

enum AIStyle {
    case tightAggressive
    case looseAggressive
    case tightWeak
    case looseWeak
    case balanced

    var displayName: String {
        switch self {
        case .tightAggressive: return L10n.t("ai_style.tight_aggressive")
        case .looseAggressive: return L10n.t("ai_style.loose_aggressive")
        case .tightWeak: return L10n.t("ai_style.tight_weak")
        case .looseWeak: return L10n.t("ai_style.loose_weak")
        case .balanced: return L10n.t("ai_style.balanced")
        }
    }
}
