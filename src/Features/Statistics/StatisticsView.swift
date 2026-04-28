import SwiftUI
import Charts

struct StatisticsView: View {
    @State private var viewModel = StatisticsViewModel()

    var body: some View {
        VStack(spacing: 0) {
            tabSelector

            if viewModel.isLoading {
                loadingView
            } else if let error = viewModel.error {
                errorView(error)
            } else {
                TabView(selection: $viewModel.selectedTab) {
                    StatsTabView(
                        statistics: viewModel.statistics,
                        recentHands: viewModel.recentHands,
                        aiProfiles: viewModel.aiProfiles,
                        chips: viewModel.chips
                    )
                    .tag(0)

                    RecentHandsTabView(hands: viewModel.recentHands)
                        .tag(1)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
        }
        .navigationTitle("我的统计")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadData()
        }
    }

    private var tabSelector: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                tabButton("📊 数据统计", index: 0)
                tabButton("🃏 最近30手", index: 1)
            }

            Rectangle()
                .fill(Color.secondary)
                .frame(width: UIScreen.main.bounds.width / 2, height: 2)
                .offset(x: viewModel.selectedTab == 0 ? -UIScreen.main.bounds.width / 4 : UIScreen.main.bounds.width / 4)
                .animation(.easeInOut(duration: 0.2), value: viewModel.selectedTab)
        }
        .background(Color.cardBackground)
    }

    private func tabButton(_ title: String, index: Int) -> some View {
        Button {
            viewModel.selectedTab = index
        } label: {
            Text(title)
                .font(.subheadline)
                .fontWeight(viewModel.selectedTab == index ? .semibold : .regular)
                .foregroundColor(viewModel.selectedTab == index ? .secondary : .textSecondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
        }
    }

    private var loadingView: some View {
        VStack {
            Spacer()
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle())
            Text("加载中...")
                .font(.caption)
                .foregroundColor(.textSecondary)
                .padding(.top, 8)
            Spacer()
        }
    }

    private func errorView(_ error: String) -> some View {
        VStack {
            Spacer()
            Text("⚠️ \(error)")
                .foregroundColor(.error)
            Spacer()
        }
    }
}

struct StatsTabView: View {
    let statistics: GameStatistics?
    let recentHands: [HandRecord]
    let aiProfiles: [AIProfileSummary]
    let chips: Int

    private struct ProfitTrendPoint: Identifiable {
        let id: Int
        let handIndex: Int
        let cumulativeProfit: Int
    }

    private var recentProfitTrend: [ProfitTrendPoint] {
        var runningProfit = 0

        return recentHands
            .reversed()
            .enumerated()
            .map { index, hand in
                runningProfit += hand.profit
                return ProfitTrendPoint(
                    id: hand.id,
                    handIndex: index + 1,
                    cumulativeProfit: runningProfit
                )
            }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                summaryCard

                profitTrendChart

                detailedStats

                aiProfilesSection
            }
            .padding(16)
        }
        .background(Color.background)
    }

    private var summaryCard: some View {
        VStack(spacing: 12) {
            HStack {
                Text("💰 当前筹码")
                    .font(.subheadline)
                Spacer()
                Text("\(chips)")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.chipGold)
            }

            Divider()

            HStack {
                Text("📈 累计盈亏")
                    .font(.subheadline)
                Spacer()
                Text("\(statistics?.totalProfit ?? 0)")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor((statistics?.totalProfit ?? 0) >= 0 ? .success : .error)
            }
        }
        .padding(16)
        .background(Color.cardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    private var profitTrendChart: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("最近30手盈亏趋势")
                .font(.headline)

            if !recentProfitTrend.isEmpty {
                Chart {
                    RuleMark(y: .value("盈亏平衡", 0))
                        .foregroundStyle(Color.textSecondary.opacity(0.5))
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [5, 5]))

                    ForEach(recentProfitTrend) { point in
                        LineMark(
                            x: .value("手数", point.handIndex),
                            y: .value("累计盈亏", point.cumulativeProfit)
                        )
                        .foregroundStyle(point.cumulativeProfit >= 0 ? Color.success : Color.error)

                        AreaMark(
                            x: .value("手数", point.handIndex),
                            y: .value("累计盈亏", point.cumulativeProfit)
                        )
                        .foregroundStyle(
                            LinearGradient(
                                colors: [
                                    (point.cumulativeProfit >= 0 ? Color.success : Color.error).opacity(0.18),
                                    .clear
                                ],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                    }
                }
                .frame(height: 150)

                Text("最近 \(recentProfitTrend.count) 手累计: \(recentProfitTrend.last?.cumulativeProfit ?? 0)")
                    .font(.caption)
                    .foregroundColor(.textSecondary)
            } else {
                Text("暂无数据")
                    .font(.caption)
                    .foregroundColor(.textSecondary)
                    .frame(height: 150)
            }
        }
        .padding(16)
        .background(Color.cardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    private var detailedStats: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("对局数据")
                .font(.headline)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                statItem("总局数", "\(statistics?.totalHands ?? 0)")
                statItem("总胜率", String(format: "%.1f%%", (statistics?.winRate ?? 0) * 100))
                statItem("VPIP", String(format: "%.1f%%", (statistics?.vpip ?? 0) * 100))
                statItem("PFR", String(format: "%.1f%%", (statistics?.pfr ?? 0) * 100))
                statItem("3Bet率", String(format: "%.1f%%", (statistics?.threeBetRate ?? 0) * 100))
                statItem("摊牌胜率", String(format: "%.1f%%", (statistics?.showdownWinRate ?? 0) * 100))
            }
        }
        .padding(16)
        .background(Color.cardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    private var aiProfilesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("AI画像")
                .font(.headline)

            ForEach(aiProfiles) { profile in
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 10) {
                        Text(profile.avatar)
                            .font(.title2)

                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 6) {
                                Text(profile.name)
                                    .font(.subheadline)
                                    .fontWeight(.semibold)

                                Text(profile.styleName)
                                    .font(.caption2)
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.statistics)
                                    .cornerRadius(4)
                            }

                            Text("\(profile.learningStatusText) · 样本 \(profile.handsPlayed) 手")
                                .font(.caption)
                                .foregroundColor(.textSecondary)
                        }

                        Spacer()
                    }

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                        statMiniItem("VPIP", value: String(format: "%.1f%%", profile.vpip * 100))
                        statMiniItem("PFR", value: String(format: "%.1f%%", profile.pfr * 100))
                        statMiniItem("3Bet", value: String(format: "%.1f%%", profile.threeBet * 100))
                        statMiniItem("AF", value: String(format: "%.2f", profile.af))
                    }
                }
                .padding(12)
                .background(Color.cardBackground)
                .cornerRadius(12)
            }
        }
    }

    private func statItem(_ label: String, _ value: String) -> some View {
        VStack(spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundColor(.textSecondary)
            Text(value)
                .font(.headline)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color.background)
        .cornerRadius(8)
    }

    private func statMiniItem(_ label: String, value: String) -> some View {
        VStack(spacing: 4) {
            Text(label)
                .font(.caption2)
                .foregroundColor(.textSecondary)
            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color.background)
        .cornerRadius(8)
    }
}

struct RecentHandsTabView: View {
    let hands: [HandRecord]

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(hands) { hand in
                    HandRecordCard(record: hand)
                }
            }
            .padding(16)
        }
        .background(Color.background)
    }
}

struct HandRecordCard: View {
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

#Preview {
    NavigationStack {
        StatisticsView()
    }
}
