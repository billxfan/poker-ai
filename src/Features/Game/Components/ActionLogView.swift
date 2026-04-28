import SwiftUI

struct ActionLogView: View {
    let actions: [Action]
    let players: [Player]
    let communityCards: [Card]
    let onDismiss: () -> Void

    private var groupedActions: [(street: Street, actions: [Action])] {
        var result: [(street: Street, actions: [Action])] = []
        var currentStreet: Street?
        var currentActions: [Action] = []

        for action in actions {
            if action.street != currentStreet {
                if let street = currentStreet, !currentActions.isEmpty {
                    result.append((street: street, actions: currentActions))
                }
                currentStreet = action.street
                currentActions = [action]
            } else {
                currentActions.append(action)
            }
        }

        if let street = currentStreet, !currentActions.isEmpty {
            result.append((street: street, actions: currentActions))
        }

        return result
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .trailing) {
                Color.black.opacity(0.3)
                    .ignoresSafeArea()
                    .contentShape(Rectangle())
                    .onTapGesture(perform: onDismiss)

                VStack(spacing: 0) {
                    HStack {
                        Text("本局行动记录")
                            .font(.headline)

                        Spacer()
                    }
                    .padding()
                    .background(Color.white)

                    Divider()

                    ScrollView {
                        VStack(alignment: .leading, spacing: 16) {
                            ForEach(groupedActions, id: \.street) { group in
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(streetLabel(group.street, cards: getCommunityCards(for: group.street)))
                                        .font(.subheadline)
                                        .fontWeight(.semibold)
                                        .foregroundColor(.primary)
                                        .padding(.horizontal)

                                    ForEach(group.actions) { action in
                                        if let player = players.first(where: { $0.id == action.playerId }) {
                                            actionRow(player: player, action: action)
                                        }
                                    }
                                }
                            }
                        }
                        .padding(.vertical)
                    }
                }
                .frame(width: min(geometry.size.width * 0.8, 300))
                .frame(height: geometry.size.height)
                .background(Color.background)
                .shadow(color: .black.opacity(0.15), radius: 12, x: -4, y: 0)
            }
        }
    }

    private func streetLabel(_ street: Street, cards: [Card]) -> String {
        var label = street.displayName

        if !cards.isEmpty {
            let cardStrs = cards.map { $0.display }
            label += " \(cardStrs.joined(separator: " "))"
        }

        return label
    }

    private func getCommunityCards(for street: Street) -> [Card] {
        Array(communityCards.prefix(street.cardCount))
    }

    private func actionRow(player: Player, action: Action) -> some View {
        HStack {
            Text(player.avatar)
            Text(player.name)
                .font(.subheadline)
            Spacer()
            Text(action.displayText)
                .font(.caption)
                .foregroundColor(.textSecondary)
        }
        .padding(.horizontal)
    }
}

#Preview {
    ZStack {
        Color.black.opacity(0.3)
            .ignoresSafeArea()

        ActionLogView(
            actions: [
                Action(playerId: 1, street: .preFlop, type: .fold),
                Action(playerId: 2, street: .preFlop, type: .call, amount: 20),
                Action(playerId: 0, street: .preFlop, type: .raise, amount: 60)
            ],
            players: [
                Player.createHuman(position: .bb, chips: 1500),
                Player.createAI(id: 1, name: "老K", avatar: "👴", position: .utg, chips: 3000),
                Player.createAI(id: 2, name: "小马", avatar: "🧑", position: .mp, chips: 2000)
            ],
            communityCards: [],
            onDismiss: {}
        )
        .frame(width: 300)
    }
}
