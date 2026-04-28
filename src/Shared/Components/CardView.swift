import SwiftUI

struct CardView: View {
    let card: Card?
    let width: CGFloat
    let height: CGFloat

    init(card: Card?, width: CGFloat = GameConstants.cardWidth, height: CGFloat = GameConstants.cardHeight) {
        self.card = card
        self.width = width
        self.height = height
    }

    var body: some View {
        Group {
            if let card = card {
                cardContent(card)
            } else {
                placeholderCard
            }
        }
        .frame(width: width, height: height)
    }

    private func cardContent(_ card: Card) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.white)
                .shadow(color: .black.opacity(0.2), radius: 2, x: 0, y: 1)

            VStack(spacing: 2) {
                Text(card.displayRank)
                    .font(.system(size: height * 0.3, weight: .bold, design: .rounded))
                    .foregroundColor(card.suit.color == "red" ? .red : .black)

                Text(card.suit.rawValue)
                    .font(.system(size: height * 0.25))
                    .foregroundColor(card.suit.color == "red" ? .red : .black)
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.gray.opacity(0.3), lineWidth: 1)
        )
    }

    private var placeholderCard: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.gray.opacity(0.3))

            Text("??")
                .font(.system(size: height * 0.3, weight: .bold))
                .foregroundColor(.gray)
        }
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.gray.opacity(0.5), lineWidth: 1)
        )
    }
}

extension Suit {
    var swiftUIColor: Color {
        switch self {
        case .spades, .clubs: return .black
        case .hearts, .diamonds: return .red
        }
    }
}

extension Card {
    var swiftUIColor: Color {
        suit.swiftUIColor
    }
}

struct HoleCardsView: View {
    let holeCards: HoleCards?
    let isRevealed: Bool
    let width: CGFloat
    let height: CGFloat

    init(holeCards: HoleCards?, isRevealed: Bool = true, width: CGFloat = GameConstants.holeCardWidth, height: CGFloat = GameConstants.holeCardHeight) {
        self.holeCards = holeCards
        self.isRevealed = isRevealed
        self.width = width
        self.height = height
    }

    var body: some View {
        HStack(spacing: 4) {
            if let cards = holeCards, isRevealed {
                CardView(card: cards.card1, width: width, height: height)
                CardView(card: cards.card2, width: width, height: height)
            } else if holeCards != nil, !isRevealed {
                CardView(card: nil, width: width, height: height)
                CardView(card: nil, width: width, height: height)
            } else {
                CardView(card: nil, width: width, height: height)
                CardView(card: nil, width: width, height: height)
            }
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        HStack {
            CardView(card: Card(suit: .spades, rank: 14))
            CardView(card: Card(suit: .hearts, rank: 13))
            CardView(card: Card(suit: .diamonds, rank: 12))
            CardView(card: Card(suit: .clubs, rank: 11))
        }

        CardView(card: nil)

        HoleCardsView(holeCards: HoleCards(Card(suit: .spades, rank: 14), Card(suit: .hearts, rank: 13)))
    }
    .padding()
    .background(Color.tableGreen)
}
