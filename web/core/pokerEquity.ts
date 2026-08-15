import { createDeck, seededRandom } from "./cards.ts";
import { compareHands, evaluateBest } from "./evaluator.ts";
import type { BotObservation, Card } from "./types.ts";

export type PokerEquityEstimate = {
  rawEquity: number;
  adjustedEquity: number;
  rangePressure: number;
  samples: number;
};

const equityCache = new Map<string, { rawEquity: number; samples: number }>();

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function cardKey(card: Card): string {
  return `${card.rank}${card.suit[0]}`;
}

function stableSeed(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function sampleCountForBoard(boardCardCount: number): number {
  if (boardCardCount === 3) return 10;
  if (boardCardCount === 4) return 14;
  return 20;
}

function approximatePreflopEquity(cards: Card[], opponentCount: number): number {
  const [high, low] = cards.map((card) => card.rank).sort((a, b) => b - a);
  const paired = high === low;
  const suited = cards[0]?.suit === cards[1]?.suit;
  let score = 0.08 + (high / 14) * 0.34 + (low / 14) * 0.18;
  if (paired) score += 0.26 + high / 70;
  if (suited) score += 0.06;
  if (high - low <= 2) score += 0.04;
  if (high >= 12 && low >= 10) score += 0.08;
  if (high === 14) score += 0.04;
  const headsUpEquity = clamp(0.18 + Math.min(1, score) * 0.67, 0.25, 0.85);
  return headsUpEquity /
    (1 + Math.max(0, opponentCount - 1) * (1 - headsUpEquity));
}

function publicRangePressure(observation: BotObservation): number {
  const activeOpponentIds = new Set(
    observation.opponents
      .filter((player) => player.status !== "folded" && player.status !== "out")
      .map((player) => player.id),
  );
  const pressure = observation.actionLog
    .filter(
      (entry) =>
        entry.street === observation.street &&
        !entry.isBlind &&
        activeOpponentIds.has(entry.playerId),
    )
    .reduce((total, entry) => {
      if (entry.action === "all-in") return total + 0.055;
      if (entry.action === "raise") return total + 0.035;
      if (entry.action === "call") return total + 0.008;
      return total;
    }, 0);
  return clamp(pressure, 0, 0.18);
}

/**
 * Estimates showdown equity from a canonical unknown-card pool. It never reads
 * the engine deck or another player's hole cards, so the result is invariant to
 * hidden state while still accounting for draws and multiway competition.
 */
export function estimatePokerEquity(
  observation: BotObservation,
): PokerEquityEstimate {
  const activeOpponents = observation.opponents.filter(
    (player) => player.status !== "folded" && player.status !== "out",
  );
  if (!activeOpponents.length) {
    return { rawEquity: 1, adjustedEquity: 1, rangePressure: 0, samples: 1 };
  }

  const rangePressure = publicRangePressure(observation);
  if (observation.communityCards.length === 0) {
    const rawEquity = approximatePreflopEquity(
      observation.self.holeCards,
      activeOpponents.length,
    );
    return {
      rawEquity,
      adjustedEquity: clamp(rawEquity * (1 - rangePressure)),
      rangePressure,
      samples: 0,
    };
  }

  const knownCards = [
    ...observation.self.holeCards,
    ...observation.communityCards,
  ];
  const known = new Set(knownCards.map(cardKey));
  const unknownCards = createDeck().filter((card) => !known.has(cardKey(card)));
  const cacheKey = [
    observation.self.holeCards.map(cardKey).sort().join("."),
    observation.communityCards.map(cardKey).sort().join("."),
    activeOpponents.length,
  ].join("|");
  let cached = equityCache.get(cacheKey);

  if (!cached) {
    const samples = sampleCountForBoard(observation.communityCards.length);
    const random = seededRandom(stableSeed(cacheKey));
    const boardCardsNeeded = 5 - observation.communityCards.length;
    const cardsNeeded = boardCardsNeeded + activeOpponents.length * 2;
    let equityTotal = 0;

    for (let sample = 0; sample < samples; sample += 1) {
      const pool = [...unknownCards];
      for (let index = 0; index < cardsNeeded; index += 1) {
        const swapIndex =
          index + Math.floor(random() * Math.max(1, pool.length - index));
        [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
      }
      const completedBoard = [
        ...observation.communityCards,
        ...pool.slice(0, boardCardsNeeded),
      ];
      const selfHand = evaluateBest([
        ...observation.self.holeCards,
        ...completedBoard,
      ]);
      const opponentHands = activeOpponents.map((_, index) => {
        const offset = boardCardsNeeded + index * 2;
        return evaluateBest([
          pool[offset],
          pool[offset + 1],
          ...completedBoard,
        ]);
      });
      const bestOpponent = opponentHands.reduce((best, hand) =>
        compareHands(hand, best) > 0 ? hand : best,
      );
      const comparison = compareHands(selfHand, bestOpponent);
      if (comparison > 0) {
        equityTotal += 1;
      } else if (comparison === 0) {
        const tiedOpponents = opponentHands.filter(
          (hand) => compareHands(hand, selfHand) === 0,
        ).length;
        equityTotal += 1 / (tiedOpponents + 1);
      }
    }

    cached = { rawEquity: equityTotal / samples, samples };
    if (equityCache.size >= 2_048) equityCache.clear();
    equityCache.set(cacheKey, cached);
  }

  return {
    ...cached,
    rangePressure,
    adjustedEquity: clamp(cached.rawEquity * (1 - rangePressure)),
  };
}
