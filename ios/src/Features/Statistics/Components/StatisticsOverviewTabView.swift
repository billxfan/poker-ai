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
        .foregroundColor(.textPrimary)
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
                Text(L10n.t("statistics.current_chips"))
                    .font(.subheadline)
                    .foregroundColor(.textPrimary)
                Spacer()
                Text("\(chips)")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.chipGold)
            }

            Divider()

            HStack {
                Text(L10n.t("statistics.total_profit"))
                    .font(.subheadline)
                    .foregroundColor(.textPrimary)
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
            Text(L10n.t("statistics.profit_trend.title"))
                .font(.headline)
                .foregroundColor(.textPrimary)

            if !points.isEmpty {
                Chart {
                    RuleMark(y: .value(L10n.t("statistics.chart.break_even"), 0))
                        .foregroundStyle(Color.textSecondary.opacity(0.5))
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [5, 5]))

                    ForEach(points) { point in
                        LineMark(
                            x: .value(L10n.t("statistics.chart.hand_count"), point.handIndex),
                            y: .value(L10n.t("statistics.chart.cumulative_profit"), point.cumulativeProfit)
                        )
                        .foregroundStyle(point.cumulativeProfit >= 0 ? Color.success : Color.error)

                        AreaMark(
                            x: .value(L10n.t("statistics.chart.hand_count"), point.handIndex),
                            y: .value(L10n.t("statistics.chart.cumulative_profit"), point.cumulativeProfit)
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
                .chartXAxis {
                    AxisMarks { _ in
                        AxisGridLine().foregroundStyle(Color.textSecondary.opacity(0.12))
                        AxisTick().foregroundStyle(Color.textSecondary.opacity(0.35))
                        AxisValueLabel()
                            .foregroundStyle(Color.textSecondary)
                    }
                }
                .chartYAxis {
                    AxisMarks(position: .leading) { _ in
                        AxisGridLine().foregroundStyle(Color.textSecondary.opacity(0.12))
                        AxisTick().foregroundStyle(Color.textSecondary.opacity(0.35))
                        AxisValueLabel()
                            .foregroundStyle(Color.textSecondary)
                    }
                }
                .frame(height: 150)

                Text(L10n.f("statistics.profit_trend.recent_total", points.count, points.last?.cumulativeProfit ?? 0))
                    .font(.caption)
                    .foregroundColor(.textSecondary)
            } else {
                Text(L10n.t("common.no_data"))
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
                Text(L10n.t("statistics.game_data"))
                    .font(.headline)
                    .foregroundColor(.textPrimary)
                Spacer()
            }

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                StatisticsValueTile(label: L10n.t("metric.total_hands"), value: "\(statistics?.totalHands ?? 0)", explanation: .totalHands, selection: $explanation)
                StatisticsValueTile(label: L10n.t("metric.win_rate"), value: String(format: "%.1f%%", (statistics?.winRate ?? 0) * 100), explanation: .winRate, selection: $explanation)
                StatisticsValueTile(label: "VPIP", value: String(format: "%.1f%%", (statistics?.vpip ?? 0) * 100), explanation: .vpip, selection: $explanation)
                StatisticsValueTile(label: "PFR", value: String(format: "%.1f%%", (statistics?.pfr ?? 0) * 100), explanation: .pfr, selection: $explanation)
                StatisticsValueTile(label: L10n.t("metric.three_bet_rate"), value: String(format: "%.1f%%", (statistics?.threeBetRate ?? 0) * 100), explanation: .threeBet, selection: $explanation)
                StatisticsValueTile(label: L10n.t("metric.showdown_win_rate"), value: String(format: "%.1f%%", (statistics?.showdownWinRate ?? 0) * 100), explanation: .showdownWinRate, selection: $explanation)
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
                    .foregroundColor(.textPrimary)
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
            return L10n.t("metric_explanation.total_hands")
        case .winRate:
            return L10n.t("metric_explanation.win_rate")
        case .vpip:
            return L10n.t("metric_explanation.vpip")
        case .pfr:
            return L10n.t("metric_explanation.pfr")
        case .threeBet:
            return L10n.t("metric_explanation.three_bet")
        case .showdownWinRate:
            return L10n.t("metric_explanation.showdown_win_rate")
        case .af:
            return L10n.t("metric_explanation.af")
        case .totalProfit:
            return L10n.t("metric_explanation.total_profit")
        case .humanVpip:
            return L10n.t("metric_explanation.human_vpip")
        case .humanPfr:
            return L10n.t("metric_explanation.human_pfr")
        case .humanFoldToAggression:
            return L10n.t("metric_explanation.human_fold_to_aggression")
        case .humanBluffRate:
            return L10n.t("metric_explanation.human_bluff_rate")
        }
    }
}
