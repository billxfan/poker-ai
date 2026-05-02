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
        let sortedRanks = sortedCards.map { $0.rank }

        let flushSuit = detectFlushSuit(cards)
        let (isStraight, straightHighCard) = isStraightFromSortedRanks(sortedRanks)
        let rankCounts = Dictionary(grouping: sortedRanks, by: { $0 }).mapValues { $0.count }
        let counts = rankCounts.values.sorted(by: >)

        if flushSuit != nil && isStraight {
            if straightHighCard == 14 {
                return (sortedCards, .royalFlush, [])
            }
            return (sortedCards, .straightFlush, [straightHighCard])
        }

        if counts.first == 4 {
            let quadRank = findRankForCount(rankCounts, count: 4) ?? 0
            let kicker = sortedRanks.first { $0 != quadRank } ?? 0
            return (sortedCards, .fourOfAKind, [quadRank, kicker])
        }

        if counts.first == 3 && counts.count > 1 && counts[1] >= 2 {
            let tripRank = findRankForCount(rankCounts, count: 3) ?? 0
            let pairRank = findRankForCount(rankCounts, count: 2) ?? 0
            return (sortedCards, .fullHouse, [tripRank, pairRank])
        }

        if flushSuit != nil {
            return (sortedCards, .flush, Array(sortedRanks.prefix(5)))
        }

        if isStraight {
            return (sortedCards, .straight, [straightHighCard])
        }

        if counts.first == 3 {
            let tripRank = findRankForCount(rankCounts, count: 3) ?? 0
            var kickers: [Int] = []
            for rank in sortedRanks where rank != tripRank {
                kickers.append(rank)
                if kickers.count == 2 { break }
            }
            return (sortedCards, .threeOfAKind, [tripRank] + kickers)
        }

        let pairCount = counts.filter { $0 == 2 }.count
        if pairCount == 2 {
            let pairs = rankCounts.filter { $0.value == 2 }.keys.sorted(by: >)
            let kicker = sortedRanks.first { !pairs.contains($0) } ?? 0
            return (sortedCards, .twoPair, [pairs[0], pairs[1], kicker])
        }

        if counts.first == 2 {
            let pairRank = findRankForCount(rankCounts, count: 2) ?? 0
            var kickers: [Int] = []
            for rank in sortedRanks where rank != pairRank {
                kickers.append(rank)
                if kickers.count == 3 { break }
            }
            return (sortedCards, .onePair, [pairRank] + kickers)
        }

        return (sortedCards, .highCard, Array(sortedRanks.prefix(5)))
    }

    private static func detectFlushSuit(_ cards: [Card]) -> Suit? {
        guard cards.count >= 5 else { return nil }
        let suits = cards.map { $0.suit }
        return suits.allSatisfy { $0 == suits[0] } ? suits[0] : nil
    }

    /// 从已排序的 ranks 判断是否为顺子，返回 (是否为顺子, 顺子最大牌 rank)
    private static func isStraightFromSortedRanks(_ sortedRanks: [Int]) -> (Bool, Int) {
        guard sortedRanks.count >= 5 else { return (false, 0) }
        let uniqueRanks = Array(Set(sortedRanks)).sorted(by: >)
        guard uniqueRanks.count >= 5 else { return (false, 0) }

        // 普通顺子：连续5张
        for i in 0...(uniqueRanks.count - 5) {
            if uniqueRanks[i] - uniqueRanks[i + 4] == 4 {
                return (true, uniqueRanks[i])
            }
        }

        // A-2-3-4-5 轮子顺子（wheel）
        if uniqueRanks.first == 14 && uniqueRanks.count >= 5
            && uniqueRanks[1] == 5 && uniqueRanks[4] == 2 {
            return (true, 5)
        }

        return (false, 0)
    }

    private static func findRankForCount(_ dict: [Int: Int], count: Int) -> Int? {
        dict.first { $0.value == count }?.key
    }
}
