import SwiftUI

struct StatisticsHandRecordCard: View {
    let record: HandRecord

    private var resultText: String {
        switch record.result {
        case .win:
            return "胜 +\(record.profit)"
        case .lose:
            return "负 \(record.profit)"
        case .tie:
            return record.profit >= 0 ? "平 +\(record.profit)" : "平 \(record.profit)"
        }
    }

    private var resultColor: Color {
        switch record.result {
        case .win:
            return .success
        case .lose:
            return .error
        case .tie:
            return .statistics
        }
    }

    private var opponentRevealedHands: [RevealedPlayerHand] {
        record.revealedHands.filter { $0.playerId != 0 }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(record.showdown ? "摊牌局" : "未摊牌")
                    .font(.caption)
                    .foregroundColor(.textSecondary)

                Spacer()

                Text(resultText)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(resultColor)
            }

            Divider()

            HStack {
                Text("底池: \(record.pot)")
                    .font(.caption)
                Spacer()
                Text("公共牌:")
                    .font(.caption)
                    .foregroundColor(.textSecondary)

                ForEach(record.communityCards) { card in
                    CardView(card: card, width: 20, height: 28)
                }

                if record.communityCards.count < 5 {
                    ForEach(0..<(5 - record.communityCards.count), id: \.self) { _ in
                        CardView(card: nil, width: 20, height: 28)
                    }
                }
            }

            if let holeCards = record.playerHoleCards {
                HStack {
                    Text("你的手牌:")
                        .font(.caption)
                        .foregroundColor(.textSecondary)

                    CardView(card: holeCards.card1, width: 24, height: 32)
                    CardView(card: holeCards.card2, width: 24, height: 32)

                    if let handType = record.playerHandType {
                        Text("(\(handType.displayName))")
                            .font(.caption)
                    }
                }
            }

            if !opponentRevealedHands.isEmpty {
                Divider()

                VStack(alignment: .leading, spacing: 8) {
                    Text("已知对手手牌")
                        .font(.caption)
                        .foregroundColor(.textSecondary)

                    ForEach(opponentRevealedHands) { hand in
                        HStack(spacing: 8) {
                            Text(hand.avatar)
                                .font(.title3)

                            VStack(alignment: .leading, spacing: 2) {
                                HStack(spacing: 6) {
                                    Text(hand.name)
                                        .font(.caption)
                                        .fontWeight(.semibold)

                                    if hand.isWinner {
                                        Text("胜")
                                            .font(.caption2)
                                            .foregroundColor(.white)
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(Color.success)
                                            .cornerRadius(4)
                                    }
                                }

                                if let handType = hand.handType {
                                    Text(handType.displayName)
                                        .font(.caption2)
                                        .foregroundColor(.textSecondary)
                                }
                            }

                            Spacer()

                            CardView(card: hand.holeCards.card1, width: 24, height: 32)
                            CardView(card: hand.holeCards.card2, width: 24, height: 32)
                        }
                        .padding(8)
                        .background(Color.background)
                        .cornerRadius(8)
                    }
                }
            }
        }
        .padding(12)
        .background(Color.cardBackground)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
}
