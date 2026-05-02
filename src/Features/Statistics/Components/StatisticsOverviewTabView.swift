import SwiftUI
import Charts

struct StatisticsOverviewTabView: View {
    let statistics: GameStatistics?
    let recentHands: [HandRecord]
    let chips: Int

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
                StatisticsSummaryCard(
                    chips: chips,
                    totalProfit: statistics?.totalProfit ?? 0
                )

                StatisticsProfitTrendCard(points: recentProfitTrend)

                StatisticsDetailedStatsCard(statistics: statistics)
            }
            .padding(16)
        }
        .background(Color.background)
    }
}

private struct ProfitTrendPoint: Identifiable {
    let id: Int
    let handIndex: Int
    let cumulativeProfit: Int
}

private struct StatisticsSummaryCard: View {
    let chips: Int
    let totalProfit: Int

    var body: some View {
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
                Text("\(totalProfit)")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(totalProfit >= 0 ? .success : .error)
            }
        }
        .padding(16)
        .background(Color.cardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

private struct StatisticsProfitTrendCard: View {
    let points: [ProfitTrendPoint]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("最近30手盈亏趋势")
                .font(.headline)

            if !points.isEmpty {
                Chart {
                    RuleMark(y: .value("盈亏平衡", 0))
                        .foregroundStyle(Color.textSecondary.opacity(0.5))
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [5, 5]))

                    ForEach(points) { point in
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

                Text("最近 \(points.count) 手累计: \(points.last?.cumulativeProfit ?? 0)")
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
}

private struct StatisticsDetailedStatsCard: View {
    let statistics: GameStatistics?
    @State private var explanation: MetricExplanation?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("对局数据")
                    .font(.headline)
                Spacer()
            }

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                StatisticsValueTile(label: "总局数", value: "\(statistics?.totalHands ?? 0)", explanation: .totalHands, selection: $explanation)
                StatisticsValueTile(label: "总胜率", value: String(format: "%.1f%%", (statistics?.winRate ?? 0) * 100), explanation: .winRate, selection: $explanation)
                StatisticsValueTile(label: "VPIP", value: String(format: "%.1f%%", (statistics?.vpip ?? 0) * 100), explanation: .vpip, selection: $explanation)
                StatisticsValueTile(label: "PFR", value: String(format: "%.1f%%", (statistics?.pfr ?? 0) * 100), explanation: .pfr, selection: $explanation)
                StatisticsValueTile(label: "3Bet率", value: String(format: "%.1f%%", (statistics?.threeBetRate ?? 0) * 100), explanation: .threeBet, selection: $explanation)
                StatisticsValueTile(label: "摊牌胜率", value: String(format: "%.1f%%", (statistics?.showdownWinRate ?? 0) * 100), explanation: .showdownWinRate, selection: $explanation)
            }

            if let explanation {
                MetricExplanationToast(explanation: explanation)
            }
        }
        .padding(16)
        .background(Color.cardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

struct StatisticsValueTile: View {
    let label: String
    let value: String
    let explanation: MetricExplanation
    @Binding var selection: MetricExplanation?

    var body: some View {
        Button {
            selection = selection == explanation ? nil : explanation
        } label: {
            VStack(spacing: 4) {
                Text(label)
                    .font(.caption)
                    .foregroundColor(.textSecondary)
                Text(value)
                    .font(.headline)
                    .foregroundColor(.primary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(selection == explanation ? Color.secondary.opacity(0.12) : Color.background)
            .cornerRadius(8)
        }
        .buttonStyle(.plain)
    }
}

struct MetricExplanationToast: View {
    let explanation: MetricExplanation

    var body: some View {
        Text(explanation.text)
            .font(.caption)
            .foregroundColor(.textOnDark)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(10)
            .background(Color.black.opacity(0.78))
            .cornerRadius(8)
            .transition(.opacity.combined(with: .move(edge: .top)))
    }
}

enum MetricExplanation: String, Identifiable {
    case totalHands
    case winRate
    case vpip
    case pfr
    case threeBet
    case showdownWinRate
    case af
    case totalProfit
    case humanVpip
    case humanPfr
    case humanFoldToAggression
    case humanBluffRate

    var id: String { rawValue }

    var text: String {
        switch self {
        case .totalHands:
            return "总局数：已记录的完整手牌数量。"
        case .winRate:
            return "总胜率：你赢下或平分底池的手牌占比。"
        case .vpip:
            return "VPIP：翻牌前主动投入筹码入池的比例，不含被迫下盲注。"
        case .pfr:
            return "PFR：翻牌前主动加注的比例，用来看进攻性。"
        case .threeBet:
            return "3Bet率：面对别人首次加注后再次加注的比例。"
        case .showdownWinRate:
            return "摊牌胜率：进入摊牌后没有输掉的比例。"
        case .af:
            return "AF：攻击因子，下注/加注次数相对跟注次数的比例。"
        case .totalProfit:
            return "累计盈亏：该对象已记录手牌的筹码净变化。"
        case .humanVpip:
            return "你的VPIP：AI观察到你翻牌前主动入池的比例，越高越松。"
        case .humanPfr:
            return "你的PFR：AI观察到你翻牌前加注的比例，反映进攻倾向。"
        case .humanFoldToAggression:
            return "受压弃牌率：AI观察到你面对加注时弃牌的比例，越高越容易被逼退。"
        case .humanBluffRate:
            return "诈唬成功率：AI观察到你诈唬（弱牌激进）后赢下底池的比例。"
        }
    }
}
