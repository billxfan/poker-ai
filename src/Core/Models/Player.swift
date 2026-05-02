import Foundation

enum PlayerStatus: String, Codable {
    case active
    case folded
    case allIn
    case out
}

struct Player: Identifiable, Codable {
    let id: Int
    let name: String
    let avatar: String
    var position: Position
    var chips: Int
    var holeCards: HoleCards?
    var status: PlayerStatus

    var isActive: Bool {
        status == .active
    }

    var isFolded: Bool {
        status == .folded
    }

    var isAllIn: Bool {
        status == .allIn
    }

    var isOut: Bool {
        status == .out
    }

    var canAct: Bool {
        isActive && chips > 0
    }

    mutating func fold() {
        status = .folded
    }

    mutating func goAllIn() {
        status = .allIn
    }

    mutating func reset() {
        holeCards = nil
        status = chips > 0 ? .active : .out
    }
}

extension Player {
    static let humanPlayerId = 0

    static func createHuman(position: Position, chips: Int) -> Player {
        Player(
            id: humanPlayerId,
            name: "你",
            avatar: "🧑",
            position: position,
            chips: chips,
            holeCards: nil,
            status: .active
        )
    }

    static func createAI(id: Int, name: String, avatar: String, position: Position, chips: Int) -> Player {
        Player(
            id: id,
            name: name,
            avatar: avatar,
            position: position,
            chips: chips,
            holeCards: nil,
            status: .active
        )
    }
}
