import SwiftUI

struct StatisticsRecentHandsTabView: View {
    let hands: [HandRecord]

    var body: some View {
        ScrollView {
            if hands.isEmpty {
                VStack(spacing: 12) {
                    Text("🗂️")
                        .font(.system(size: 36))

                    Text(L10n.t("statistics.recent.empty_title"))
                        .font(.headline)
                        .foregroundColor(.textSecondary)

                    Text(L10n.t("statistics.recent.empty_body"))
                        .font(.subheadline)
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 120)
            } else {
                LazyVStack(spacing: 12) {
                    ForEach(hands) { hand in
                        StatisticsHandRecordCard(record: hand)
                    }
                }
                .padding(16)
            }
        }
        .background(Color.background)
    }
}
