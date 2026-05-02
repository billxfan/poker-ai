import SwiftUI

struct StatisticsRecentHandsTabView: View {
    let hands: [HandRecord]

    var body: some View {
        ScrollView {
            if hands.isEmpty {
                VStack(spacing: 12) {
                    Text("🗂️")
                        .font(.system(size: 36))

                    Text("最近30手暂无记录")
                        .font(.headline)
                        .foregroundColor(.textSecondary)

                    Text("先开始几局训练，再回来复盘每一手的盈亏、公共牌和已知对手手牌。")
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
