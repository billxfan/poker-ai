import SwiftUI

struct StatisticsTabSelectorView: View {
    @Binding var selectedTab: Int

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                tabButton("📊 数据统计", index: 0)
                tabButton("🤖 AI画像", index: 1)
                tabButton("🃏 最近30手", index: 2)
            }

            Rectangle()
                .fill(Color.secondary)
                .frame(width: UIScreen.main.bounds.width / 3, height: 2)
                .offset(x: indicatorOffset)
                .animation(.easeInOut(duration: 0.2), value: selectedTab)
        }
        .background(Color.cardBackground)
    }

    private var indicatorOffset: CGFloat {
        let width = UIScreen.main.bounds.width
        switch selectedTab {
        case 0:
            return -width / 3
        case 2:
            return width / 3
        default:
            return 0
        }
    }

    private func tabButton(_ title: String, index: Int) -> some View {
        Button {
            selectedTab = index
        } label: {
            Text(title)
                .font(.subheadline)
                .fontWeight(selectedTab == index ? .semibold : .regular)
                .foregroundColor(selectedTab == index ? .secondary : .textSecondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
        }
    }
}
