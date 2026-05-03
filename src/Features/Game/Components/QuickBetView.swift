import SwiftUI

struct QuickBetView: View {
    let potSize: Int
    let minimumAmount: Int
    let callAmount: Int
    let currentRoundBet: Int
    let playerChips: Int
    let onSelect: (Int) -> Void
    let onCancel: () -> Void

    private let options: [(label: String, value: Double)] = [
        ("1/3", GameConstants.quickBetMultipliers[0]),
        ("1/2", GameConstants.quickBetMultipliers[1]),
        ("1x", GameConstants.quickBetMultipliers[2]),
        ("2x", GameConstants.quickBetMultipliers[3]),
        ("3x", GameConstants.quickBetMultipliers[4]),
    ]

    private var resolvedOptions: [(label: String, amount: Int)] {
        var previousAmount = currentRoundBet
        let maxTotalBet = currentRoundBet + playerChips
        let minimumIncrement = QuickBetCalculator.minimumRaiseIncrement(
            minimumAmount: minimumAmount,
            callAmount: callAmount,
            currentRoundBet: currentRoundBet
        )

        return options.map { option in
            let rawAmount = QuickBetCalculator.targetAmount(
                potSize: potSize,
                callAmount: callAmount,
                currentRoundBet: currentRoundBet,
                playerChips: playerChips,
                minimumAmount: minimumAmount,
                potMultiplier: option.value
            )

            let adjustedAmount: Int
            if rawAmount <= previousAmount {
                adjustedAmount = min(maxTotalBet, previousAmount + minimumIncrement)
            } else {
                adjustedAmount = rawAmount
            }

            previousAmount = adjustedAmount
            return (option.label, adjustedAmount)
        }
    }

    var body: some View {
        VStack(spacing: 10) {
            Text(L10n.t("quick_bet.title"))
                .font(.subheadline.weight(.semibold))
                .foregroundColor(.textOnDark.opacity(0.82))

            HStack(spacing: 8) {
                ForEach(resolvedOptions, id: \.label) { option in
                    Button {
                        onSelect(option.amount)
                    } label: {
                        VStack(spacing: 4) {
                            Text(option.label)
                                .font(.subheadline.weight(.semibold))
                                .foregroundColor(.white)

                            Text("\(option.amount)")
                                .font(.system(size: 16, weight: .bold, design: .rounded))
                                .foregroundColor(.textOnDark.opacity(0.9))
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(Color.raiseButton.opacity(0.8))
                        .cornerRadius(8)
                    }
                    .disabled(option.amount <= currentRoundBet)
                    .opacity(option.amount <= currentRoundBet ? 0.5 : 1.0)
                }
            }

            Button(L10n.t("common.cancel"), action: onCancel)
                .font(.subheadline)
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

    static func minimumRaiseIncrement(
        minimumAmount: Int,
        callAmount: Int,
        currentRoundBet: Int
    ) -> Int {
        let matchedAmount = currentRoundBet + max(0, callAmount)
        return max(1, minimumAmount - matchedAmount)
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
