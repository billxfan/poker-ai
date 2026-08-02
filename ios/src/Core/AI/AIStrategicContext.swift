import Foundation

struct AIBoardTexture {
    let wetness: Double
    let highCardPressure: Double
    let flushPressure: Double
    let straightPressure: Double
    let pairedBoard: Bool
    let monotoneBoard: Bool
    let connectedBoard: Bool
    let rangeAdvantageScore: Double

    var boardPressureScore: Double {
        clamp(
            max(flushPressure, straightPressure) * 0.70
                + highCardPressure * 0.40
                + (connectedBoard ? 0.10 : 0.0)
                + (pairedBoard ? 0.06 : 0.0),
            min: 0,
            max: 1
        )
    }

    var isDryHighCard: Bool {
        wetness < 0.32 && rangeAdvantageScore > 0.48
    }

    static func analyze(communityCards: [Card]) -> AIBoardTexture? {
        guard communityCards.count >= 3 else { return nil }

        let suitCounts = Dictionary(grouping: communityCards, by: \.suit).mapValues(\.count)
        let maxSuitCount = suitCounts.values.max() ?? 0
        let monotoneBoard = maxSuitCount == communityCards.count && communityCards.count >= 3
        let flushPressure: Double
        switch maxSuitCount {
        case 5...:
            flushPressure = 1.0
        case 4:
            flushPressure = 0.82
        case 3 where communityCards.count == 3:
            flushPressure = 0.68
        case 3:
            flushPressure = 0.42
        case 2 where communityCards.count == 3:
            flushPressure = 0.18
        default:
            flushPressure = 0.0
        }

        let originalRanks = Array(Set(communityCards.map(\.rank))).sorted()
        var straightRanks = Set(originalRanks)
        if straightRanks.contains(14) {
            straightRanks.insert(1)
        }

        var straightPressure = 0.0
        for start in 1...10 {
            let coverage = Double(Set(start...(start + 4)).intersection(straightRanks).count) / 5.0
            straightPressure = max(straightPressure, coverage)
        }

        let highCardWeight = communityCards.reduce(0.0) { partial, card in
            partial + {
                switch card.rank {
                case 14: return 1.0
                case 13: return 0.85
                case 12: return 0.70
                case 11: return 0.50
                default: return 0.0
                }
            }()
        }
        let highCardPressure = clamp(
            highCardWeight / Double(max(1, communityCards.count)),
            min: 0,
            max: 1
        )

        let rankCounts = Dictionary(grouping: communityCards.map(\.rank), by: { $0 }).mapValues(\.count)
        let pairedBoard = rankCounts.values.contains(where: { $0 >= 2 })

        let connectedBoard = {
            guard originalRanks.count >= 3 else { return false }
            for startIndex in 0...(originalRanks.count - 3) {
                let slice = Array(originalRanks[startIndex...Swift.min(startIndex + 2, originalRanks.count - 1)])
                if let first = slice.first, let last = slice.last, last - first <= 4 {
                    return true
                }
            }
            return false
        }()

        let wetness = clamp(
            straightPressure * 0.58
                + flushPressure * 0.45
                + (connectedBoard ? 0.14 : 0.0)
                + (monotoneBoard ? 0.10 : 0.0)
                - (pairedBoard ? 0.08 : 0.0),
            min: 0,
            max: 1
        )

        let topRank = communityCards.map(\.rank).max() ?? 0
        let topCardBonus: Double
        switch topRank {
        case 14: topCardBonus = 0.24
        case 13: topCardBonus = 0.18
        case 12: topCardBonus = 0.12
        default: topCardBonus = 0.0
        }

        let rangeAdvantageScore = clamp(
            highCardPressure * 1.10
                + topCardBonus
                + (pairedBoard ? 0.12 : 0.0)
                - straightPressure * 0.30
                - flushPressure * 0.25,
            min: 0,
            max: 1
        )

        return AIBoardTexture(
            wetness: wetness,
            highCardPressure: highCardPressure,
            flushPressure: flushPressure,
            straightPressure: straightPressure,
            pairedBoard: pairedBoard,
            monotoneBoard: monotoneBoard,
            connectedBoard: connectedBoard,
            rangeAdvantageScore: rangeAdvantageScore
        )
    }
}

struct AIStrategicContext {
    let street: Street
    let playerPosition: Position
    let isHeadsUp: Bool
    let isLatePositionStealSpot: Bool
    let isContinuationBetSpot: Bool
    let isTurnBarrelSpot: Bool
    let boardTexture: AIBoardTexture?
    let previousBoardTexture: AIBoardTexture?
}
