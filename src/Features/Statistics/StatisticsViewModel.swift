import SwiftUI

@Observable
final class StatisticsViewModel {
    private let recordRepository: IGameRecordRepository
    private let patternRepository: IAIPatternRepository
    private let chipStorage: IChipStorage

    var isLoading: Bool = false
    var selectedTab: Int = 0
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
            chips = chipStorage.getChips()
        } catch {
            self.error = "加载失败: \(error.localizedDescription)"
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
                    af: pattern.af
                )
            }
    }
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

    var learningStatusText: String {
        switch handsPlayed {
        case 0:
            return "暂无样本"
        case 1..<10:
            return "样本较少"
        case 10..<30:
            return "学习中"
        default:
            return "画像已成型"
        }
    }
}
