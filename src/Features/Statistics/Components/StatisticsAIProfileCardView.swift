import SwiftUI
import Charts

struct StatisticsAIProfileCardView: View {
    let profile: AIProfileSummary
    @State private var explanation: MetricExplanation?
    @State private var humanExplanation: MetricExplanation?

    var body: some View {
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
                StatisticsMiniValueTile(label: "VPIP", value: String(format: "%.1f%%", profile.vpip * 100), explanation: .vpip, selection: $explanation)
                StatisticsMiniValueTile(label: "PFR", value: String(format: "%.1f%%", profile.pfr * 100), explanation: .pfr, selection: $explanation)
                StatisticsMiniValueTile(label: "3Bet", value: String(format: "%.1f%%", profile.threeBet * 100), explanation: .threeBet, selection: $explanation)
                StatisticsMiniValueTile(label: "AF", value: String(format: "%.2f", profile.af), explanation: .af, selection: $explanation)
                StatisticsMiniValueTile(label: "累计盈亏", value: "\(profile.totalProfit)", explanation: .totalProfit, selection: $explanation)
            }

            if let explanation {
                MetricExplanationToast(explanation: explanation)
            }

            Text(profile.learningSummaryText)
                .font(.caption2)
                .foregroundColor(.textSecondary)

            if !profile.learningSnapshots.isEmpty {
                StatisticsLearningBiasChart(profile: profile)
            }

            if profile.hasHumanTrendData {
                StatisticsHumanTrendChart(profile: profile)
            }

            if let humanRead = profile.observedHumanProfile {
                Divider()

                VStack(alignment: .leading, spacing: 8) {
                    Text("对你的画像 · 已观察 \(humanRead.handsObserved) 手")
                        .font(.caption)
                        .foregroundColor(.textSecondary)

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                        StatisticsMiniValueTile(label: "你的VPIP", value: String(format: "%.1f%%", humanRead.vpip * 100), explanation: .humanVpip, selection: $humanExplanation)
                        StatisticsMiniValueTile(label: "你的PFR", value: String(format: "%.1f%%", humanRead.pfr * 100), explanation: .humanPfr, selection: $humanExplanation)
                        StatisticsMiniValueTile(label: "受压弃牌", value: String(format: "%.1f%%", humanRead.foldToAggressionRate * 100), explanation: .humanFoldToAggression, selection: $humanExplanation)
                        StatisticsMiniValueTile(label: "诈唬成功", value: String(format: "%.1f%%", humanRead.bluffRate * 100), explanation: .humanBluffRate, selection: $humanExplanation)
                    }

                    if let humanExplanation {
                        MetricExplanationToast(explanation: humanExplanation)
                    }

                    if humanRead.defaultWinCount > 0 {
                        Text("被动赢 \(humanRead.defaultWinCount) 次（对手弃牌到你）")
                            .font(.caption2)
                            .foregroundColor(.textSecondary)
                    }

                    Text("AI判断：\(humanRead.readSummaryText)")
                        .font(.caption2)
                        .foregroundColor(.textSecondary)

                    Text("针对性策略：\(humanRead.counterStrategyText)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(12)
        .background(Color.cardBackground)
        .cornerRadius(12)
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
            Text("学习曲线")
                .font(.caption)
                .foregroundColor(.textSecondary)

            Chart {
                RuleMark(y: .value("中性", 0))
                    .foregroundStyle(Color.textSecondary.opacity(0.35))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))

                ForEach(profile.learningSnapshots) { snapshot in
                    LineMark(
                        x: .value("手数", snapshot.handIndex),
                        y: .value("偏移", snapshot.aggressionBias * 100),
                        series: .value("类型", "进攻偏移")
                    )
                    .foregroundStyle(Color.statistics)

                    LineMark(
                        x: .value("手数", snapshot.handIndex),
                        y: .value("偏移", snapshot.tightnessBias * 100),
                        series: .value("类型", "紧度偏移")
                    )
                    .foregroundStyle(Color.warning)
                }
            }
            .chartLegend(position: .bottom, spacing: 8)
            .frame(height: 120)

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Circle().fill(Color.statistics).frame(width: 6, height: 6)
                    Text("进攻偏移：>0 偏激进（爱加注），<0 偏保守（爱过牌/跟注）")
                }
                HStack(spacing: 4) {
                    Circle().fill(Color.warning).frame(width: 6, height: 6)
                    Text("紧度偏移：>0 偏紧（只玩好牌），<0 偏松（什么牌都入池）")
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
            Text("AI 眼中的你")
                .font(.caption)
                .foregroundColor(.textSecondary)

            Chart {
                ForEach(profile.learningSnapshots) { snapshot in
                    if let vpip = snapshot.observedHumanVPIP {
                        LineMark(
                            x: .value("手数", snapshot.handIndex),
                            y: .value("百分比", vpip * 100),
                            series: .value("指标", "你的 VPIP")
                        )
                        .foregroundStyle(Color.success)
                    }

                    if let foldRate = snapshot.observedHumanFoldToAggression {
                        LineMark(
                            x: .value("手数", snapshot.handIndex),
                            y: .value("百分比", foldRate * 100),
                            series: .value("指标", "受压弃牌率")
                        )
                        .foregroundStyle(Color.error)
                    }
                }
            }
            .chartLegend(position: .bottom, spacing: 8)
            .frame(height: 120)

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Circle().fill(Color.success).frame(width: 6, height: 6)
                    Text("你的 VPIP：你主动入池的频率，越高越松")
                }
                HStack(spacing: 4) {
                    Circle().fill(Color.error).frame(width: 6, height: 6)
                    Text("受压弃牌率：面对加注/全压时弃牌的比例，越高越容易被逼退")
                }
            }
            .font(.caption2)
            .foregroundColor(.textSecondary)
        }
    }
}
