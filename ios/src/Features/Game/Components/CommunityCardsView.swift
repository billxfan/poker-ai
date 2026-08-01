import SwiftUI

struct CommunityCardsView: View {
    let cards: [Card]

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: GameConstants.cardSpacing) {
                ForEach(0..<5) { index in
                    if index < cards.count {
                        CardView(card: cards[index])
                    } else {
                        CardView(card: nil)
                    }
                }
            }
        }
        .padding(12)
        .background(Color.black.opacity(0.3))
        .cornerRadius(12)
    }
}

#Preview {
    ZStack {
        Color.tableGreen
            .ignoresSafeArea()

        CommunityCardsView(cards: [
            Card(suit: .spades, rank: 7),
            Card(suit: .spades, rank: 8),
            Card(suit: .hearts, rank: 11),
            Card(suit: .hearts, rank: 12),
            Card(suit: .diamonds, rank: 13)
        ])
    }
}
