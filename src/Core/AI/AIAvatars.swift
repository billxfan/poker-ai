import Foundation

enum AIAvatars {
    static let avatars: [Int: (name: String, avatar: String, style: AIStyle)] = [
        1: ("老K", "👴", .tightAggressive),
        2: ("小马", "🧑", .looseAggressive),
        3: ("大叔", "🧔", .tightWeak),
        4: ("小鱼", "👧", .looseWeak),
        5: ("狐狸", "🦊", .balanced)
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
        case .tightAggressive: return "紧凶型"
        case .looseAggressive: return "松凶型"
        case .tightWeak: return "紧弱型"
        case .looseWeak: return "松弱型"
        case .balanced: return "平衡型"
        }
    }
}
