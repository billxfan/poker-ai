import SwiftUI

@Observable
final class StatisticsViewModel {
    private let recordRepository: IGameRecordRepository
    private let patternRepository: IAIPatternRepository
    private let chipStorage: IChipStorage

    var isLoading: Bool = false
    var selectedTab: Int = 0
    var selectedAIProfileId: Int?
    var statistics: GameStatistics?
    var recentHands: [HandRecord] = []
    var aiProfiles: [AIProfileSummary] = []
    var chips: Int = 0
    var error: String?

    init(
        recordRepository: IGameRecordRepository = GameRecordRepository(),
        patternRepository: IAIPatternRepository = AIPatternRepository(),
        chipStorage: IChipStorage = ChipStorage()
    ) {
        self.recordRepository = recordRepository
        self.patternRepository = patternRepository
        self.chipStorage = chipStorage
    }

    @MainActor
    func loadData() async {
        isLoading = true
        error = nil

        do {
            statistics = try await recordRepository.getStatistics()
            recentHands = try await recordRepository.getRecentHands(limit: 30)
            aiProfiles = try await loadAIProfiles()
            if selectedAIProfileId == nil {
                selectedAIProfileId = aiProfiles.first?.id
            }
            chips = chipStorage.getChips()
        } catch {
            self.error = L10n.f("statistics.load_failed", error.localizedDescription)
        }

        isLoading = false
    }

    private func loadAIProfiles() async throws -> [AIProfileSummary] {
        let patterns = try await patternRepository.getAllPatterns()

        return AIAvatars.avatars.keys
            .sorted()
            .map { playerId in
                let info = AIAvatars.getAvatar(for: playerId)
                let pattern = patterns[playerId] ?? AIPattern()
                return AIProfileSummary(
                    id: playerId,
                    name: info.name,
                    avatar: info.avatar,
                    styleName: info.style.displayName,
                    handsPlayed: pattern.handsPlayed,
                    vpip: pattern.vpip,
                    pfr: pattern.pfr,
                    threeBet: pattern.threeBet,
                    af: pattern.af,
                    totalProfit: pattern.totalProfit,
                    learningRate: pattern.currentLearningRate(for: info.style),
                    explorationRate: pattern.explorationRate(for: info.style),
                    aggressionBias: pattern.learnedAggressionBias * info.style.learningProfile.adjustmentCap * pattern.sampleConfidence(for: info.style),
                    tightnessBias: pattern.learnedTightnessBias * info.style.learningProfile.adjustmentCap * pattern.sampleConfidence(for: info.style),
                    learningSnapshots: pattern.recentLearningSnapshots(limit: 60),
                    observedHumanProfile: pattern.observedProfile(for: 0).map { profile in
                        ObservedOpponentSummary(
                            handsObserved: profile.handsObserved,
                            vpip: profile.vpip,
                            pfr: profile.pfr,
                            aggressionRate: profile.aggressionRate,
                            foldToAggressionRate: profile.foldToAggressionRate,
                            bluffRate: profile.bluffRate,
                            defaultWinCount: profile.defaultWinCount,
                            perceivedTightness: profile.perceivedTightness,
                            readSummaryText: profile.readSummaryText,
                            counterStrategyText: profile.counterStrategyText
                        )
                    }
                )
            }
    }
}

struct ObservedOpponentSummary {
    let handsObserved: Int
    let vpip: Double
    let pfr: Double
    let aggressionRate: Double
    let foldToAggressionRate: Double
    let bluffRate: Double
    let defaultWinCount: Int
    let perceivedTightness: Double
    let readSummaryText: String
    let counterStrategyText: String
}

struct AIProfileSummary: Identifiable {
    let id: Int
    let name: String
    let avatar: String
    let styleName: String
    let handsPlayed: Int
    let vpip: Double
    let pfr: Double
    let threeBet: Double
    let af: Double
    let totalProfit: Int
    let learningRate: Double
    let explorationRate: Double
    let aggressionBias: Double
    let tightnessBias: Double
    let learningSnapshots: [AILearningSnapshot]
    let observedHumanProfile: ObservedOpponentSummary?

    var learningStatusText: String {
        switch handsPlayed {
        case 0:
            return L10n.t("ai_learning.no_sample")
        case 1..<10:
            return L10n.t("ai_learning.low_sample")
        case 10..<100:
            return L10n.t("ai_learning.learning")
        default:
            return L10n.t("ai_learning.enough_sample")
        }
    }

    var learningSummaryText: String {
        let aggressionText = String(format: "%+.1f%%", aggressionBias * 100)
        let tightnessText = String(format: "%+.1f%%", tightnessBias * 100)
        let epsilonText = String(format: "%.0f%%", explorationRate * 100)
        let rateText = String(format: "%.2f", learningRate)
        return L10n.f("ai_learning.summary", epsilonText, rateText, aggressionText, tightnessText)
    }

    var hasHumanTrendData: Bool {
        learningSnapshots.contains {
            $0.observedHumanVPIP != nil || $0.observedHumanFoldToAggression != nil
        }
    }
}
