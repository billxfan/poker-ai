import SwiftUI

struct GameCommunitySection: View {
    let pot: Int
    let callAmount: Int
    let streetName: String
    let communityCards: [Card]

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(L10n.t("game.pot"))
                        .font(.caption2)
                        .foregroundColor(.textOnDark.opacity(0.6))
                    Text("\(pot)")
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .foregroundColor(.chipGold)
                }

                Spacer()

                if callAmount > 0 {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(L10n.t("action.call"))
                            .font(.caption2)
                            .foregroundColor(.textOnDark.opacity(0.6))
                        Text("\(callAmount)")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.callButton)
                    }
                }

                Text(streetName)
                    .font(.caption2)
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.black.opacity(0.4))
                    .cornerRadius(8)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.black.opacity(0.3))
            .cornerRadius(10)

            CommunityCardsView(cards: communityCards)
        }
        .padding(.horizontal, 4)
        .padding(.top, 8)
    }
}
