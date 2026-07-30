import type { Card } from "./types.ts";

export type EvaluatedHand = {
  category: number;
  categoryName: string;
  values: number[];
  cards: Card[];
};

const CATEGORY_NAMES = [
  "高牌",
  "一对",
  "两对",
  "三条",
  "顺子",
  "同花",
  "葫芦",
  "四条",
  "同花顺",
];

function compareValues(left: number[], right: number[]): number {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

export function compareHands(left: EvaluatedHand, right: EvaluatedHand): number {
  if (left.category !== right.category) {
    return Math.sign(left.category - right.category);
  }
  return compareValues(left.values, right.values);
}

function straightHigh(ranks: number[]): number {
  const unique = [...new Set(ranks)].sort((a, b) => b - a);
  if (unique.includes(14)) unique.push(1);
  for (let index = 0; index <= unique.length - 5; index += 1) {
    if (unique[index] - unique[index + 4] === 4) return unique[index];
  }
  return 0;
}

export function evaluateFive(cards: Card[]): EvaluatedHand {
  if (cards.length !== 5) {
    throw new Error("evaluateFive requires exactly five cards");
  }

  const ranks = cards.map((card) => card.rank).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  ranks.forEach((rank) => counts.set(rank, (counts.get(rank) ?? 0) + 1));
  const groups = [...counts.entries()].sort(
    (left, right) => right[1] - left[1] || right[0] - left[0],
  );
  const isFlush = cards.every((card) => card.suit === cards[0].suit);
  const highStraight = straightHigh(ranks);

  let category = 0;
  let values = ranks;

  if (isFlush && highStraight) {
    category = 8;
    values = [highStraight];
  } else if (groups[0][1] === 4) {
    category = 7;
    values = [groups[0][0], groups[1][0]];
  } else if (groups[0][1] === 3 && groups[1][1] === 2) {
    category = 6;
    values = [groups[0][0], groups[1][0]];
  } else if (isFlush) {
    category = 5;
    values = ranks;
  } else if (highStraight) {
    category = 4;
    values = [highStraight];
  } else if (groups[0][1] === 3) {
    category = 3;
    values = [
      groups[0][0],
      ...groups.filter((group) => group[1] === 1).map((group) => group[0]),
    ];
  } else if (groups[0][1] === 2 && groups[1][1] === 2) {
    category = 2;
    const pairs = groups
      .filter((group) => group[1] === 2)
      .map((group) => group[0])
      .sort((a, b) => b - a);
    const kicker = groups.find((group) => group[1] === 1)?.[0] ?? 0;
    values = [...pairs, kicker];
  } else if (groups[0][1] === 2) {
    category = 1;
    values = [
      groups[0][0],
      ...groups.filter((group) => group[1] === 1).map((group) => group[0]),
    ];
  }

  return {
    category,
    categoryName: CATEGORY_NAMES[category],
    values,
    cards,
  };
}

function combinations<T>(items: T[], choose: number): T[][] {
  const output: T[][] = [];

  function visit(start: number, current: T[]) {
    if (current.length === choose) {
      output.push([...current]);
      return;
    }
    for (
      let index = start;
      index <= items.length - (choose - current.length);
      index += 1
    ) {
      current.push(items[index]);
      visit(index + 1, current);
      current.pop();
    }
  }

  visit(0, []);
  return output;
}

export function evaluateBest(cards: Card[]): EvaluatedHand {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error("evaluateBest requires five to seven cards");
  }

  const hands = combinations(cards, 5).map(evaluateFive);
  return hands.reduce((best, candidate) =>
    compareHands(candidate, best) > 0 ? candidate : best,
  );
}
