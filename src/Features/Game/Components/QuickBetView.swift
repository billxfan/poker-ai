import SwiftUI

struct QuickBetView: View {
    let potSize: Int
    let minimumAmount: Int
    let callAmount: Int
    let currentRoundBet: Int
    let playerChips: Int
    let onSelect: (Int) -> Void
    let onCancel: () -> Void

    private let potMultipliers: [(label: String, value: Double)] = [
        ("1/3", 0.33),
        ("1/2", 0.5),
        ("2/3", 0.67),
    ]

    private let potRaiseMultipliers: [(label: String, value: Double)] = [
        ("1x", 1.0),
        ("1.2x", 1.2),
    ]

    var body: some View {
        VStack(spacing: 8) {
            Text(L10n.t("quick_bet.title"))
                .font(.caption)
                .foregroundColor(.textOnDark.opacity(0.7))

            HStack(spacing: 8) {
                ForEach(potMultipliers + potRaiseMultipliers, id: \.label) { option in
                    let amount = QuickBetCalculator.targetAmount(
                        potSize: potSize,
                        callAmount: callAmount,
                        currentRoundBet: currentRoundBet,
                        playerChips: playerChips,
                        minimumAmount: minimumAmount,
                        potMultiplier: option.value
                    )

                    Button {
                        onSelect(amount)
                    } label: {
                        VStack(spacing: 2) {
                            Text(option.label)
                                .font(.caption)
                                .foregroundColor(.white)

                            Text(L10n.f("quick_bet.to_amount", amount))
                                .font(.caption2)
                                .foregroundColor(.textOnDark.opacity(0.8))

                            Text("+\(max(0, amount - currentRoundBet))")
                                .font(.system(size: 10))
                                .foregroundColor(.textOnDark.opacity(0.55))
                        }
                        .frame(width: 56, height: 44)
                        .background(Color.raiseButton.opacity(0.8))
                        .cornerRadius(8)
                    }
                    .disabled(amount <= currentRoundBet)
                    .opacity(amount <= currentRoundBet ? 0.5 : 1.0)
                }
            }

            Button(L10n.t("common.cancel"), action: onCancel)
                .font(.caption)
                .foregroundColor(.textOnDark.opacity(0.6))
        }
        .padding(12)
        .background(Color.black.opacity(0.6))
        .cornerRadius(12)
    }

}

enum QuickBetCalculator {
    /// Returns the target total bet for this street, not the extra chips to add.
    static func targetAmount(
        potSize: Int,
        callAmount: Int,
        currentRoundBet: Int,
        playerChips: Int,
        minimumAmount: Int,
        potMultiplier: Double
    ) -> Int {
        let maxTotalBet = currentRoundBet + playerChips
        let callToMatch = min(max(0, callAmount), max(0, playerChips))
        let potAfterCall = potSize + callToMatch
        let raiseAfterCall = Int((Double(potAfterCall) * potMultiplier).rounded())
        let target = currentRoundBet + callToMatch + raiseAfterCall
        return min(max(minimumAmount, target), maxTotalBet)
    }
}

#Preview {
    ZStack {
        Color.tableGreen
            .ignoresSafeArea()

        QuickBetView(
            potSize: 790,
            minimumAmount: 200,
            callAmount: 180,
            currentRoundBet: 20,
            playerChips: 2500,
            onSelect: { _ in },
            onCancel: {}
        )
    }
}
