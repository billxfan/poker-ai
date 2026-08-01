import SwiftUI
import Charts

struct StatisticsAIProfileCardView: View {
    let profile: AIProfileSummary
    @State private var explanation: MetricExplanation?
    @State private var humanExplanation: MetricExplanation?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            profileHeader

            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text(L10n.t("statistics.game_data"))
                        .font(.headline)
                        .foregroundColor(.textPrimary)
                    Spacer()
                }

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    StatisticsValueTile(label: "VPIP", value: String(format: "%.1f%%", profile.vpip * 100), explanation: .vpip, selection: $explanation)
                    StatisticsValueTile(label: "PFR", value: String(format: "%.1f%%", profile.pfr * 100), explanation: .pfr, selection: $explanation)
                    StatisticsValueTile(label: "3Bet", value: String(format: "%.1f%%", profile.threeBet * 100), explanation: .threeBet, selection: $explanation)
                    StatisticsValueTile(label: "AF", value: String(format: "%.2f", profile.af), explanation: .af, selection: $explanation)
                    StatisticsValueTile(label: L10n.t("metric.total_profit"), value: "\(profile.totalProfit)", explanation: .totalProfit, selection: $explanation)
                }

                if let explanation {
                    MetricExplanationToast(explanation: explanation)
                }
            }

            sectionCard(title: L10n.t("ai_profile.learning_curve")) {
                Text(profile.learningSummaryText)
                    .font(.caption2)
                    .foregroundColor(.textSecondary)

                if !profile.learningSnapshots.isEmpty {
                    StatisticsLearningBiasChart(profile: profile)
                }
            }

            sectionCard(title: L10n.f("ai_profile.read_on_you", profile.observedHumanProfile?.handsObserved ?? 0)) {
                if let humanRead = profile.observedHumanProfile {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                        StatisticsMiniValueTile(label: L10n.t("metric.human_vpip"), value: String(format: "%.1f%%", humanRead.vpip * 100), explanation: .humanVpip, selection: $humanExplanation)
                        StatisticsMiniValueTile(label: L10n.t("metric.human_pfr"), value: String(format: "%.1f%%", humanRead.pfr * 100), explanation: .humanPfr, selection: $humanExplanation)
                        StatisticsMiniValueTile(label: L10n.t("metric.fold_to_pressure"), value: String(format: "%.1f%%", humanRead.foldToAggressionRate * 100), explanation: .humanFoldToAggression, selection: $humanExplanation)
                        StatisticsMiniValueTile(label: L10n.t("metric.bluff_success"), value: String(format: "%.1f%%", humanRead.bluffRate * 100), explanation: .humanBluffRate, selection: $humanExplanation)
                    }

                    if let humanExplanation {
                        MetricExplanationToast(explanation: humanExplanation)
                    }

                    if profile.hasHumanTrendData {
                        StatisticsHumanTrendChart(profile: profile)
                    }

                    if humanRead.defaultWinCount > 0 {
                        Text(L10n.f("ai_profile.default_wins", humanRead.defaultWinCount))
                            .font(.caption2)
                            .foregroundColor(.textSecondary)
                    }

                    emphasisBlock(
                        title: "AI判断",
                        body: humanRead.readSummaryText,
                        tint: .statistics
                    )

                    emphasisBlock(
                        title: "针对性策略",
                        body: humanRead.counterStrategyText,
                        tint: .warning
                    )
                } else {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                        StatisticsStaticMiniValueTile(label: L10n.t("metric.human_vpip"), value: "0.0%")
                        StatisticsStaticMiniValueTile(label: L10n.t("metric.human_pfr"), value: "0.0%")
                        StatisticsStaticMiniValueTile(label: L10n.t("metric.fold_to_pressure"), value: "0.0%")
                        StatisticsStaticMiniValueTile(label: L10n.t("metric.bluff_success"), value: "0.0%")
                    }

                    Text(L10n.t("common.no_data"))
                        .font(.caption2)
                        .foregroundColor(.textSecondary)
                }
            }
        }
        .padding(12)
        .background(Color.cardBackground)
        .cornerRadius(12)
    }

    private var profileHeader: some View {
        HStack(spacing: 10) {
            AvatarView(avatar: profile.avatar, displayName: profile.name, size: 40, backgroundColor: Color.background)

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(profile.name)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.textPrimary)

                    Text(profile.styleName)
                        .font(.caption2)
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.statistics)
                        .cornerRadius(4)
                }

                Text(L10n.f("ai_profile.sample_status", profile.learningStatusText, profile.handsPlayed))
                    .font(.caption)
                    .foregroundColor(.textSecondary)
            }

            Spacer()
        }
    }

    @ViewBuilder
    private func sectionCard<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
                Text(title)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.textSecondary)

            content()
        }
        .padding(12)
        .background(Color.background)
        .cornerRadius(10)
    }

    @ViewBuilder
    private func emphasisBlock(title: String, body: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption2)
                .fontWeight(.bold)
                .foregroundColor(tint)

            Text(body)
                .font(.caption)
                .foregroundColor(.textPrimary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tint.opacity(0.10))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(tint.opacity(0.25), lineWidth: 1)
        )
        .cornerRadius(8)
    }
}

private struct StatisticsMiniValueTile: View {
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
                    .font(.caption2)
                    .foregroundColor(.textSecondary)
                Text(value)
                    .font(.subheadline)
                    .fontWeight(.semibold)
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

private struct StatisticsStaticMiniValueTile: View {
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: 4) {
            Text(label)
                .font(.caption2)
                .foregroundColor(.textSecondary)
            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(.textPrimary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color.background)
        .cornerRadius(8)
    }
}

private struct StatisticsLearningBiasChart: View {
    let profile: AIProfileSummary

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Chart {
                RuleMark(y: .value(L10n.t("ai_profile.chart.neutral"), 0))
                    .foregroundStyle(Color.textSecondary.opacity(0.35))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))

                ForEach(profile.learningSnapshots) { snapshot in
                    LineMark(
                        x: .value(L10n.t("statistics.chart.hand_count"), snapshot.handIndex),
                        y: .value(L10n.t("ai_profile.chart.bias"), snapshot.aggressionBias * 100),
                        series: .value(L10n.t("ai_profile.chart.type"), L10n.t("ai_profile.chart.aggression_bias"))
                    )
                    .foregroundStyle(Color.statistics)

                    LineMark(
                        x: .value(L10n.t("statistics.chart.hand_count"), snapshot.handIndex),
                        y: .value(L10n.t("ai_profile.chart.bias"), snapshot.tightnessBias * 100),
                        series: .value(L10n.t("ai_profile.chart.type"), L10n.t("ai_profile.chart.tightness_bias"))
                    )
                    .foregroundStyle(Color.warning)
                }
            }
            .chartLegend(.hidden)
            .chartForegroundStyleScale([
                L10n.t("ai_profile.chart.aggression_bias"): Color.statistics,
                L10n.t("ai_profile.chart.tightness_bias"): Color.warning
            ])
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
            .frame(height: 120)

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Circle().fill(Color.statistics).frame(width: 6, height: 6)
                    Text(L10n.t("ai_profile.aggression_bias_hint"))
                }
                HStack(spacing: 4) {
                    Circle().fill(Color.warning).frame(width: 6, height: 6)
                    Text(L10n.t("ai_profile.tightness_bias_hint"))
                }
            }
            .font(.caption2)
            .foregroundColor(.textSecondary)
        }
    }
}

private struct StatisticsHumanTrendChart: View {
    let profile: AIProfileSummary

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Chart {
                ForEach(profile.learningSnapshots) { snapshot in
                    if let vpip = snapshot.observedHumanVPIP {
                        LineMark(
                            x: .value(L10n.t("statistics.chart.hand_count"), snapshot.handIndex),
                            y: .value(L10n.t("statistics.chart.percentage"), vpip * 100),
                            series: .value(L10n.t("statistics.chart.metric"), L10n.t("metric.human_vpip_spaced"))
                        )
                        .foregroundStyle(Color.success)
                    }

                    if let foldRate = snapshot.observedHumanFoldToAggression {
                        LineMark(
                            x: .value(L10n.t("statistics.chart.hand_count"), snapshot.handIndex),
                            y: .value(L10n.t("statistics.chart.percentage"), foldRate * 100),
                            series: .value(L10n.t("statistics.chart.metric"), L10n.t("metric.fold_to_pressure_rate"))
                        )
                        .foregroundStyle(Color.error)
                    }
                }
            }
            .chartLegend(.hidden)
            .chartForegroundStyleScale([
                L10n.t("metric.human_vpip_spaced"): Color.success,
                L10n.t("metric.fold_to_pressure_rate"): Color.error
            ])
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
            .frame(height: 120)

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Circle().fill(Color.success).frame(width: 6, height: 6)
                    Text(L10n.t("ai_profile.human_vpip_hint"))
                }
                HStack(spacing: 4) {
                    Circle().fill(Color.error).frame(width: 6, height: 6)
                    Text(L10n.t("ai_profile.fold_to_pressure_hint"))
                }
            }
            .font(.caption2)
            .foregroundColor(.textSecondary)
        }
    }
}
