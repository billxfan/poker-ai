import SwiftUI

struct StatisticsHandRecordCard: View {
    let record: HandRecord

    private var resultText: String {
        switch record.result {
        case .win:
            return L10n.f("hand_record.win_profit", record.profit)
        case .lose:
            return L10n.f("hand_record.lose_profit", record.profit)
        case .tie:
            return record.profit >= 0 ? L10n.f("hand_record.tie_profit_plus", record.profit) : L10n.f("hand_record.tie_profit", record.profit)
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
                Text(record.showdown ? L10n.t("hand_record.showdown") : L10n.t("hand_record.no_showdown"))
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
                Text(L10n.f("game.pot_amount", record.pot))
                    .font(.caption)
                    .foregroundColor(.textPrimary)
                Spacer()
                Text(L10n.t("game.community_cards_colon"))
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
                    Text(L10n.t("hand_record.your_hole_cards"))
                        .font(.caption)
                        .foregroundColor(.textSecondary)

                    CardView(card: holeCards.card1, width: 24, height: 32)
                    CardView(card: holeCards.card2, width: 24, height: 32)

                    if let handType = record.playerHandType {
                        Text("(\(handType.displayName))")
                            .font(.caption)
                            .foregroundColor(.textPrimary)
                    }
                }
            }

            if !opponentRevealedHands.isEmpty {
                Divider()

                VStack(alignment: .leading, spacing: 8) {
                    Text(L10n.t("hand_record.known_opponent_hands"))
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
                                        .foregroundColor(.textPrimary)

                                    if hand.isWinner {
                                        Text(L10n.t("common.win_badge"))
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
