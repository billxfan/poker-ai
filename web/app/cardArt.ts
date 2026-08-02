import { rankLabel } from "../core/cards.ts";
import type { Card, Suit } from "../core/types.ts";

export const CAT_CARD_ART_BASE_PATH = "/cards/deck-v2";

const SUIT_NAMES: Record<Suit, string> = {
  spades: "黑桃",
  hearts: "红桃",
  diamonds: "方块",
  clubs: "梅花",
};

const CAT_BREEDS_BY_RANK: Record<number, string> = {
  14: "缅因猫",
  13: "英国短毛猫",
  12: "布偶猫",
  11: "暹罗猫",
  10: "孟加拉猫",
  9: "阿比西尼亚猫",
  8: "俄罗斯蓝猫",
  7: "斯芬克斯猫",
  6: "波斯猫",
  5: "苏格兰折耳猫",
  4: "德文卷毛猫",
  3: "三花猫",
  2: "橘猫",
};

export function cardArtRankToken(rank: number): string | null {
  if (rank === 14) return "a";
  if (rank === 13) return "k";
  if (rank === 12) return "q";
  if (rank === 11) return "j";
  if (rank >= 2 && rank <= 10) return String(rank);
  return null;
}

export function catCardArtSource(card: Card): string | null {
  const rank = cardArtRankToken(card.rank);
  return rank ? `${CAT_CARD_ART_BASE_PATH}/${card.suit}-${rank}.webp` : null;
}

export function catCardAccessibleLabel(card: Card): string {
  const breed = CAT_BREEDS_BY_RANK[card.rank];
  const base = `${SUIT_NAMES[card.suit]}${rankLabel(card.rank)}`;
  return breed ? `${base}，${breed}插画牌` : base;
}
