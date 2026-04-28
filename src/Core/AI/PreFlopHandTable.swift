import Foundation

/// 翻牌前起手牌强度表（169 种独立牌型）
/// 映射：holeCards → 强度分数 0.0~1.0
/// 基于真实德扑胜率统计（所有玩家看到河牌时的摊牌胜率）
enum PreFlopHandTable {
    /// 牌型分类
    enum HandCategory: String {
        case premiumPairs   = "Premium Pairs"      // AA, KK, QQ, JJ, TT
        case midPairs       = "Mid Pairs"          // 99, 88, 77
        case smallPairs     = "Small Pairs"         // 66, 55, 44, 33, 22
        case strongSuited   = "Strong Suited"       // AKs, AQs, AJs, KQs
        case mediumSuited   = "Medium Suited"       // ATs, KJs, QJs, JTs
        case weakSuited     = "Weak Suited"         // T9s, 98s, 87s, 76s, 65s, 54s, 43s, 32s
        case strongOffsuit  = "Strong Offsuit"      // AKo, AQo, AJo, KQo
        case mediumOffsuit  = "Medium Offsuit"       // ATo, KJo, QJo, JTo
        case weakOffsuit   = "Weak Offsuit"         // 所有其余 offsuit
    }

    /// 查表：输入 holeCards，返回强度分数
    /// - Parameter holeCards: 玩家底牌
    /// - Returns: 0.0（最弱）~ 1.0（最强），用于 AI 决策参考
    static func lookup(holeCards: HoleCards) -> Double {
        let r1 = holeCards.card1.rank
        let r2 = holeCards.card2.rank
        let isSuited = holeCards.card1.suit == holeCards.card2.suit

        let (high, low) = r1 >= r2 ? (r1, r2) : (r2, r1)

        // 对子
        if r1 == r2 {
            return pairStrength(rank: r1)
        }

        // 非对子
        if isSuited {
            return suitedStrength(high: high, low: low)
        } else {
            return offsuitStrength(high: high, low: low)
        }
    }

    /// 对子强度：AA 最强，22 最弱
    private static func pairStrength(rank: Int) -> Double {
        switch rank {
        case 14: return 0.95  // AA
        case 13: return 0.88  // KK
        case 12: return 0.82  // QQ
        case 11: return 0.76  // JJ
        case 10: return 0.70  // TT
        case 9:  return 0.62  // 99
        case 8:  return 0.54  // 88
        case 7:  return 0.46  // 77
        case 6:  return 0.38  // 66
        case 5:  return 0.30  // 55
        case 4:  return 0.24  // 44
        case 3:  return 0.18  // 33
        case 2:  return 0.12  // 22
        default: return 0.0
        }
    }

    /// 同花强度
    private static func suitedStrength(high: Int, low: Int) -> Double {
        // 同花 Ace-X（AXs）
        if high == 14 {
            switch low {
            case 13: return 0.78  // AKs
            case 12: return 0.74  // AQs
            case 11: return 0.70  // AJs
            case 10: return 0.66  // ATs
            case 9:  return 0.60  // A9s
            case 8:  return 0.55  // A8s
            case 7:  return 0.50  // A7s
            case 6:  return 0.46  // A6s
            case 5:  return 0.43  // A5s
            case 4:  return 0.40  // A4s
            case 3:  return 0.37  // A3s
            case 2:  return 0.34  // A2s
            default: return 0.0
            }
        }

        // KXs
        if high == 13 {
            switch low {
            case 12: return 0.66  // KQs
            case 11: return 0.62  // KJs
            case 10: return 0.57  // KTs
            case 9:  return 0.52  // K9s
            default:  return 0.46  // K8s 及以下
            }
        }

        // QXs
        if high == 12 {
            switch low {
            case 11: return 0.57  // QJs
            case 10: return 0.52  // QTs
            case 9:  return 0.47  // Q9s
            default:  return 0.41
            }
        }

        // JXs
        if high == 11 {
            switch low {
            case 10: return 0.48  // JTs
            case 9:  return 0.43  // J9s
            default:  return 0.37
            }
        }

        // T9s 及以下
        if high == 10 && low == 9 { return 0.40 }  // T9s
        if high == 9  && low == 8 { return 0.35 }  // 98s
        if high == 8  && low == 7 { return 0.30 }  // 87s
        if high == 7  && low == 6 { return 0.26 }  // 76s
        if high == 6  && low == 5 { return 0.22 }  // 65s
        if high == 5  && low == 4 { return 0.19 }  // 54s
        if high == 4  && low == 3 { return 0.16 }  // 43s
        if high == 3  && low == 2 { return 0.13 }  // 32s

        return 0.30  // 其余
    }

    /// 不同花强度（比同花对应牌型低约 10-20%）
    private static func offsuitStrength(high: Int, low: Int) -> Double {
        // AKo, AQo, AJo...
        if high == 14 {
            switch low {
            case 13: return 0.64  // AKo
            case 12: return 0.60  // AQo
            case 11: return 0.56  // AJo
            case 10: return 0.52  // ATo
            default:  return suitedStrength(high: high, low: low) * 0.80
            }
        }

        // KQo, KJo...
        if high == 13 {
            switch low {
            case 12: return 0.52  // KQo
            case 11: return 0.48  // KJo
            default:  return suitedStrength(high: high, low: low) * 0.78
            }
        }

        // QJo...
        if high == 12 {
            switch low {
            case 11: return 0.43  // QJo
            default:  return suitedStrength(high: high, low: low) * 0.76
            }
        }

        // JTo
        if high == 11 && low == 10 { return 0.37 }

        return suitedStrength(high: high, low: low) * 0.72
    }

    /// 获取牌型分类（用于日志/调试）
    static func category(holeCards: HoleCards) -> HandCategory {
        let r1 = holeCards.card1.rank
        let r2 = holeCards.card2.rank
        let isSuited = holeCards.card1.suit == holeCards.card2.suit
        let (high, _) = r1 >= r2 ? (r1, r2) : (r2, r1)

        if r1 == r2 {
            if r1 >= 11 { return .premiumPairs }
            if r1 >= 7  { return .midPairs }
            return .smallPairs
        }

        if isSuited {
            if high == 14 && r1 != r2 { return .strongSuited }
            if high == 13 && r1 != r2 { return .strongSuited }
            if high >= 11 { return .mediumSuited }
            return .weakSuited
        } else {
            if high == 14 && r1 != r2 { return .strongOffsuit }
            if high == 13 && r1 != r2 { return .strongOffsuit }
            if high >= 11 { return .mediumOffsuit }
            return .weakOffsuit
        }
    }
}
