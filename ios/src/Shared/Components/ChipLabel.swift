import SwiftUI

struct ChipLabel: View {
    let amount: Int
    let style: ChipLabelStyle

    enum ChipLabelStyle {
        case large
        case medium
        case small

        var fontSize: CGFloat {
            switch self {
            case .large: return 42
            case .medium: return 28
            case .small: return 18
            }
        }

        var iconSize: CGFloat {
            switch self {
            case .large: return 34
            case .medium: return 26
            case .small: return 18
            }
        }
    }

    init(amount: Int, style: ChipLabelStyle = .medium) {
        self.amount = amount
        self.style = style
    }

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "bitcoinsign.circle.fill")
                .font(.system(size: style.iconSize))
                .foregroundColor(.chipGold)

            Text(formattedAmount)
                .font(.system(size: style.fontSize, weight: .bold, design: .rounded))
                .monospacedDigit()
                .foregroundColor(.textGold)
        }
    }

    private var formattedAmount: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        return formatter.string(from: NSNumber(value: amount)) ?? "\(amount)"
    }
}

struct ChipCard: View {
    let chips: Int
    let title: String

    init(chips: Int, title: String = L10n.t("chip.virtual_training_points")) {
        self.chips = chips
        self.title = title
    }

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "bitcoinsign.circle.fill")
                .font(.system(size: 36))
                .foregroundColor(.chipGold)

            Text(formattedChips)
                .font(.system(size: 44, weight: .bold, design: .rounded))
                .monospacedDigit()
                .foregroundColor(.textOnDark)

            Text(title)
                .font(.subheadline)
                .foregroundColor(.textOnDark.opacity(0.8))
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(Color.primary)
        .cornerRadius(20)
        .shadow(color: Color.primary.opacity(0.3), radius: 8, x: 0, y: 4)
    }

    private var formattedChips: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        return formatter.string(from: NSNumber(value: chips)) ?? "\(chips)"
    }
}

#Preview {
    VStack(spacing: 20) {
        ChipLabel(amount: 3500, style: .large)
        ChipLabel(amount: 1500, style: .medium)
        ChipLabel(amount: 500, style: .small)

        ChipCard(chips: 3500)
    }
    .padding()
}
