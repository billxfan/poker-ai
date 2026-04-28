import Foundation

enum HandEvaluator {
    static func evaluate(holeCards: HoleCards?, communityCards: [Card]) -> Hand {
        let allCards = (holeCards.map { [$0.card1, $0.card2] } ?? []) + communityCards

        guard allCards.count >= 5 else {
            return Hand(
                holeCards: holeCards,
                bestFive: allCards,
                handType: .highCard,
                kickers: allCards.sorted { $0.rank > $1.rank }.map { $0.rank }
            )
        }

        // 迭代 bitmask：7张牌取5张的 21 种组合，无递归、无中间数组拷贝
        let n = allCards.count
        let k = 5
        var bestHand: Hand?

        var mask = (1 << k) - 1  // 前 k 位为 1：00011100...
        while mask < (1 << n) {
            // 提取 bitmask 对应的 5 张牌
            var combo: [Card] = []
            combo.reserveCapacity(k)
            for i in 0..<n {
                if (mask >> i) & 1 == 1 {
                    combo.append(allCards[i])
                }
            }

            let evaluated = evaluateFiveCards(combo)
            let evaluatedHand = Hand(
                holeCards: holeCards,
                bestFive: evaluated.bestFive,
                handType: evaluated.handType,
                kickers: evaluated.kickers
            )
            if bestHand == nil || evaluatedHand.compare(to: bestHand!) == .orderedDescending {
                bestHand = evaluatedHand
            }

            // Gosper's hack：找下一个有 k 个 1 的 bitmask
            let c = mask & -mask
            let r = mask + c
            mask = (((r ^ mask) >> 2) / c) | r
        }

        return bestHand ?? Hand(
            holeCards: holeCards,
            bestFive: [],
            handType: .highCard,
            kickers: []
        )
    }

    private static func evaluateFiveCards(_ cards: [Card]) -> (bestFive: [Card], handType: HandType, kickers: [Int]) {
        let sortedCards = cards.sorted { $0.rank > $1.rank }

        let isFlush = isFlush(cards)
        let (isStraight, straightHighCard) = isStraight(cards)
        let ranks = cards.map { $0.rank }
        let rankCounts = Dictionary(grouping: ranks, by: { $0 }).mapValues { $0.count }
        let counts = rankCounts.values.sorted(by: >)

        if isFlush && isStraight {
            if Set(ranks) == Set([14, 13, 12, 11, 10]) {
                return (sortedCards, .royalFlush, [])
            }
            return (sortedCards, .straightFlush, [straightHighCard])
        }

        if counts.first == 4 {
            let quadRank = findRankForCount(rankCounts, count: 4) ?? 0
            let kicker = ranks.filter { $0 != quadRank }.max() ?? 0
            return (sortedCards, .fourOfAKind, [quadRank, kicker])
        }

        if counts.first == 3 && counts.count > 1 && counts[1] >= 2 {
            let tripRank = findRankForCount(rankCounts, count: 3) ?? 0
            let pairRank = findRankForCount(rankCounts, count: 2) ?? 0
            return (sortedCards, .fullHouse, [tripRank, pairRank])
        }

        if isFlush {
            return (sortedCards, .flush, Array(ranks.sorted(by: >).prefix(5)))
        }

        if isStraight {
            return (sortedCards, .straight, [straightHighCard])
        }

        if counts.first == 3 {
            let tripRank = findRankForCount(rankCounts, count: 3) ?? 0
            let kickers = ranks.filter { $0 != tripRank }.sorted(by: >).prefix(2)
            return (sortedCards, .threeOfAKind, [tripRank] + Array(kickers))
        }

        let pairCount = counts.filter { $0 == 2 }.count
        if pairCount == 2 {
            let pairs = rankCounts.filter { $0.value == 2 }.keys.sorted(by: >)
            let kicker = ranks.filter { !pairs.contains($0) }.max() ?? 0
            return (sortedCards, .twoPair, [pairs[0], pairs[1], kicker])
        }

        if counts.first == 2 {
            let pairRank = findRankForCount(rankCounts, count: 2) ?? 0
            let kickers = ranks.filter { $0 != pairRank }.sorted(by: >).prefix(3)
            return (sortedCards, .onePair, [pairRank] + Array(kickers))
        }

        return (sortedCards, .highCard, Array(ranks.sorted(by: >).prefix(5)))
    }

    private static func isFlush(_ cards: [Card]) -> Bool {
        guard cards.count >= 5 else { return false }
        let suits = cards.map { $0.suit }
        return suits.allSatisfy { $0 == suits[0] }
    }

    /// 返回 (是否为顺子, 顺子最大牌 rank)
    private static func isStraight(_ cards: [Card]) -> (Bool, Int) {
        guard cards.count >= 5 else { return (false, 0) }
        let ranks = Set(cards.map { $0.rank })
        guard ranks.count >= 5 else { return (false, 0) }

        let sortedRanks = ranks.sorted(by: >)

        // 普通顺子：连续5张
        var isConsecutive = true
        for i in 0..<(sortedRanks.count - 1) {
            if sortedRanks[i] - sortedRanks[i + 1] != 1 {
                isConsecutive = false
                break
            }
        }
        if isConsecutive {
            return (true, sortedRanks[0])
        }

        // A-2-3-4-5 轮子顺子（wheel）
        let aceLowRanks = Set(ranks.filter { $0 != 14 })
        if aceLowRanks.count >= 4 {
            let lowSorted = aceLowRanks.sorted(by: >)
            if lowSorted == [5, 4, 3, 2] {
                return (true, 5)  // wheel 的高牌是 5
            }
        }

        return (false, 0)
    }

    private static func findRankForCount(_ dict: [Int: Int], count: Int) -> Int? {
        dict.first { $0.value == count }?.key
    }
}
