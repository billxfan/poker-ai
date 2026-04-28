import SwiftUI

struct QuickBetView: View {
    let referenceAmount: Int
    let minimumAmount: Int
    let currentRoundBet: Int
    let playerChips: Int
    let onSelect: (Int) -> Void
    let onCancel: () -> Void

    private let multipliers: [(label: String, value: Double)] = [
        ("1/3", 0.33),
        ("1/2", 0.5),
        ("2/3", 0.67),
        ("1x", 1.0),
        ("1.2x", 1.2)
    ]

    var body: some View {
        VStack(spacing: 8) {
            Text("快捷下注")
                .font(.caption)
                .foregroundColor(.textOnDark.opacity(0.7))

            HStack(spacing: 8) {
                ForEach(multipliers, id: \.label) { option in
                    let amount = calculateAmount(multiplier: option.value)

                    Button {
                        onSelect(amount)
                    } label: {
                        VStack(spacing: 2) {
                            Text(option.label)
                                .font(.caption)
                                .foregroundColor(.white)

                            Text("到 \(amount)")
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
                    .disabled(amount > maxTotalBet || amount <= currentRoundBet)
                    .opacity(amount > maxTotalBet || amount <= currentRoundBet ? 0.5 : 1.0)
                }
            }

            Button("取消", action: onCancel)
                .font(.caption)
                .foregroundColor(.textOnDark.opacity(0.6))
        }
        .padding(12)
        .background(Color.black.opacity(0.6))
        .cornerRadius(12)
    }

    private var maxTotalBet: Int {
        currentRoundBet + playerChips
    }

    private func calculateAmount(multiplier: Double) -> Int {
        let amount = Int(Double(referenceAmount) * multiplier)
        let legalAmount = max(minimumAmount, amount)
        return min(legalAmount, maxTotalBet)
    }
}

#Preview {
    ZStack {
        Color.tableGreen
            .ignoresSafeArea()

        QuickBetView(
            referenceAmount: 790,
            minimumAmount: 200,
            currentRoundBet: 20,
            playerChips: 2500,
            onSelect: { _ in },
            onCancel: {}
        )
    }
}
