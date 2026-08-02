import {
  currentAIExplorationRate,
  getAIDecisionTuning,
  type AIDecisionTuning,
} from "./aiLearning.ts";
import { evaluateBest } from "./evaluator.ts";
import { buildBotObservation } from "./observation.ts";
import type {
  AIActionKind,
  AIArchetype,
  AILearningState,
  AIStyle,
  BotObservation,
  GameState,
  PlayerAction,
} from "./types.ts";

type DecisionIntent = "fold" | "passive" | "aggressive";
const AI_POLICY_VERSION = "humanlike-core-v2";

type DecisionContext = {
  observation: BotObservation;
  strength: number;
  pressure: number;
  positionBonus: number;
  boardWetness: number;
  stackToPotRatio: number;
  tuning: AIDecisionTuning;
  random: () => number;
};

export const AI_ENGINE_NAMES: Record<AIArchetype, string> = {
  "tight-aggressive": "价值施压引擎",
  "loose-aggressive": "宽范围进攻引擎",
  "tight-weak": "风险控制引擎",
  "loose-weak": "赔率跟注引擎",
  balanced: "情境混合引擎",
};

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function publicStateDigest(observation: BotObservation): string {
  const publicPayload = JSON.stringify({
    street: observation.street,
    communityCards: observation.communityCards,
    pot: observation.pot,
    currentBet: observation.currentBet,
    dealerId: observation.dealerId,
    seats: [observation.self, ...observation.opponents].map((seat) => ({
      id: seat.id,
      position: seat.position,
      chips: seat.chips,
      status: seat.status,
      bet: seat.bet,
      totalContribution: seat.totalContribution,
    })),
    actions: observation.actionLog,
    legal: observation.legalActions,
  });
  let hash = 0x811c9dc5;
  for (let index = 0; index < publicPayload.length; index += 1) {
    hash ^= publicPayload.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function preflopStrength(ranks: number[], paired: boolean, suited: boolean) {
  const [high, low] = [...ranks].sort((a, b) => b - a);
  let score = 0.08 + (high / 14) * 0.34 + (low / 14) * 0.18;
  if (paired) score += 0.26 + high / 70;
  if (suited) score += 0.06;
  if (high - low <= 2) score += 0.04;
  if (high >= 12 && low >= 10) score += 0.08;
  if (high === 14) score += 0.04;
  return Math.min(1, score);
}

function drawPotential(observation: BotObservation): number {
  if (
    observation.communityCards.length < 3 ||
    observation.communityCards.length >= 5
  ) {
    return 0;
  }
  const cards = [
    ...observation.self.holeCards,
    ...observation.communityCards,
  ];
  const suitCounts = Object.values(
    cards.reduce<Record<string, number>>((counts, card) => {
      counts[card.suit] = (counts[card.suit] ?? 0) + 1;
      return counts;
    }, {}),
  );
  let bonus = suitCounts.some((count) => count === 4) ? 0.08 : 0;
  const ranks = new Set(cards.map((card) => card.rank));
  if (ranks.has(14)) ranks.add(1);
  for (let start = 1; start <= 10; start += 1) {
    const matched = Array.from({ length: 5 }, (_, index) => start + index)
      .filter((rank) => ranks.has(rank))
      .length;
    if (matched === 4) bonus = Math.max(bonus, 0.07);
  }
  return bonus;
}

function handStrength(observation: BotObservation): number {
  const player = observation.self;
  if (observation.communityCards.length < 3) {
    return preflopStrength(
      player.holeCards.map((card) => card.rank),
      player.holeCards[0]?.rank === player.holeCards[1]?.rank,
      player.holeCards[0]?.suit === player.holeCards[1]?.suit,
    );
  }

  const evaluated = evaluateBest([
    ...player.holeCards,
    ...observation.communityCards,
  ]);
  const kicker = (evaluated.values[0] ?? 2) / 80;
  return Math.min(
    1,
    0.12 + evaluated.category * 0.115 + kicker + drawPotential(observation),
  );
}

function boardWetness(observation: BotObservation): number {
  const cards = observation.communityCards;
  if (cards.length < 3) return 0;
  const suits = Object.values(
    cards.reduce<Record<string, number>>((counts, card) => {
      counts[card.suit] = (counts[card.suit] ?? 0) + 1;
      return counts;
    }, {}),
  );
  const flushPressure = Math.max(...suits) / cards.length;
  const ranks = [...new Set(cards.map((card) => card.rank))].sort(
    (left, right) => left - right,
  );
  const connected =
    ranks.length >= 3 && ranks[ranks.length - 1] - ranks[0] <= 5 ? 0.32 : 0;
  const paired = ranks.length < cards.length ? -0.08 : 0;
  return clamp(flushPressure * 0.48 + connected + paired);
}

function positionBonus(position: string): number {
  if (position.includes("BTN")) return 0.1;
  if (position === "CO") return 0.07;
  if (position === "SB") return 0.04;
  if (position === "UTG") return -0.04;
  return 0;
}

function strengthBucket(strength: number) {
  if (strength < 0.33) return "weak" as const;
  if (strength < 0.58) return "marginal" as const;
  if (strength < 0.8) return "strong" as const;
  return "premium" as const;
}

function stackMetrics(observation: BotObservation) {
  const player = observation.self;
  const opponents = observation.opponents.filter(
    (opponent) => opponent.status !== "folded" && opponent.status !== "out",
  );
  const deepestOpponentStack = Math.max(
    0,
    ...opponents.map((opponent) => opponent.chips),
  );
  const shortestOpponentStack = opponents.length
    ? Math.min(...opponents.map((opponent) => opponent.chips))
    : 0;
  const effectiveStack = Math.min(player.chips, deepestOpponentStack);
  const stackToPotRatio = effectiveStack / Math.max(1, observation.pot);
  const shortestOpponentStackToPotRatio =
    Math.min(player.chips, shortestOpponentStack) /
    Math.max(1, observation.pot);
  return {
    activeOpponentIds: opponents.map((opponent) => opponent.id),
    stackToPotRatio,
    shortestOpponentStackToPotRatio,
    stackBucket:
      stackToPotRatio <= 1.5
        ? "short"
        : stackToPotRatio <= 4
          ? "medium"
          : "deep",
  };
}

function hasBettingInitiative(observation: BotObservation) {
  const previousStreet = {
    flop: "preflop",
    turn: "flop",
    river: "turn",
    preflop: null,
  }[observation.street];
  if (!previousStreet) return false;
  const currentStreetAggression = observation.actionLog.some(
    (entry) =>
      entry.street === observation.street &&
      !entry.isBlind &&
      ["raise", "all-in"].includes(entry.action),
  );
  if (currentStreetAggression) return false;
  return (
    observation.actionLog.find(
      (entry) =>
        entry.street === previousStreet &&
        !entry.isBlind &&
        ["raise", "all-in"].includes(entry.action),
    )?.playerId === observation.playerId
  );
}

function latestAggressorId(observation: BotObservation) {
  return observation.actionLog.find(
    (entry) =>
      entry.street === observation.street &&
      entry.playerId !== observation.playerId &&
      !entry.isBlind &&
      ["raise", "all-in"].includes(entry.action),
  )?.playerId;
}

function learningContextKey(
  observation: BotObservation,
  strength: number,
): string {
  const legal = observation.legalActions;
  const aggressions = observation.actionLog.filter(
    (entry) =>
      entry.street === observation.street &&
      !entry.isBlind &&
      ["raise", "all-in"].includes(entry.action),
  ).length;
  const pressure =
    legal.toCall === 0
      ? "unopened"
      : aggressions <= 1
        ? "facing-bet"
        : "facing-raise";
  const activePlayers = [observation.self, ...observation.opponents].filter(
    (player) => player.status !== "folded" && player.status !== "out",
  ).length;
  const { stackBucket } = stackMetrics(observation);
  return [
    observation.street,
    observation.self.position,
    pressure,
    strengthBucket(strength),
    activePlayers <= 2 ? "hu" : "mw",
    stackBucket,
  ].join("|");
}

function tightAggressivePolicy(context: DecisionContext): DecisionIntent {
  const { strength, pressure, tuning, random, observation } = context;
  const legal = observation.legalActions;
  if (strength >= tuning.aggressiveThreshold) {
    return random() < tuning.aggressionChance ? "aggressive" : "passive";
  }
  if (strength >= tuning.passiveThreshold + pressure * 0.18) {
    return legal.canCheck || random() < tuning.continueChance
      ? "passive"
      : "fold";
  }
  if (
    legal.canCheck &&
    strength >= tuning.bluffThreshold &&
    random() < tuning.bluffChance * 0.55
  ) {
    return "aggressive";
  }
  return legal.canCheck ? "passive" : "fold";
}

function looseAggressivePolicy(context: DecisionContext): DecisionIntent {
  const {
    strength,
    pressure,
    positionBonus: position,
    tuning,
    random,
    observation,
  } = context;
  const legal = observation.legalActions;
  const effectiveStrength = strength + Math.max(0, position) * 0.8;
  if (
    effectiveStrength >= tuning.aggressiveThreshold ||
    (effectiveStrength >= tuning.bluffThreshold &&
      pressure < 0.22 &&
      random() < tuning.bluffChance)
  ) {
    return random() < tuning.aggressionChance ? "aggressive" : "passive";
  }
  if (
    legal.canCheck &&
    random() < tuning.bluffChance * (position > 0 ? 0.9 : 0.45)
  ) {
    return "aggressive";
  }
  return effectiveStrength + 0.18 >= pressure + 0.12
    ? "passive"
    : "fold";
}

function tightWeakPolicy(context: DecisionContext): DecisionIntent {
  const { strength, pressure, tuning, random, observation } = context;
  const legal = observation.legalActions;
  if (
    strength >= Math.max(0.8, tuning.aggressiveThreshold) &&
    random() < tuning.aggressionChance
  ) {
    return "aggressive";
  }
  if (legal.canCheck) return "passive";
  if (
    strength >= tuning.passiveThreshold + pressure * 0.3 &&
    random() < tuning.continueChance
  ) {
    return "passive";
  }
  return "fold";
}

function looseWeakPolicy(context: DecisionContext): DecisionIntent {
  const { strength, pressure, tuning, random, observation } = context;
  const legal = observation.legalActions;
  if (
    strength >= Math.max(0.82, tuning.aggressiveThreshold) &&
    random() < Math.max(0.08, tuning.aggressionChance)
  ) {
    return "aggressive";
  }
  if (legal.canCheck) return "passive";
  const priceLooksAcceptable = strength + 0.26 >= pressure + 0.08;
  if (priceLooksAcceptable && random() < tuning.continueChance) return "passive";
  return strength + 0.12 >= pressure ? "passive" : "fold";
}

function balancedPolicy(context: DecisionContext): DecisionIntent {
  const {
    strength,
    pressure,
    positionBonus: position,
    boardWetness: wetness,
    tuning,
    random,
    observation,
  } = context;
  const legal = observation.legalActions;
  const positionalStrength = strength + position * 0.7;
  const bluffPenalty = wetness > 0.6 ? (wetness - 0.6) * 0.25 : 0;
  if (positionalStrength >= tuning.aggressiveThreshold) {
    return random() < tuning.aggressionChance ? "aggressive" : "passive";
  }
  if (
    positionalStrength >= tuning.bluffThreshold &&
    pressure < 0.2 &&
    random() < Math.max(0, tuning.bluffChance - bluffPenalty)
  ) {
    return "aggressive";
  }
  if (
    legal.canCheck ||
    (positionalStrength >= tuning.passiveThreshold + pressure * 0.2 &&
      random() < tuning.continueChance)
  ) {
    return "passive";
  }
  return "fold";
}

const POLICY_ENGINES: Record<
  AIArchetype,
  (context: DecisionContext) => DecisionIntent
> = {
  "tight-aggressive": tightAggressivePolicy,
  "loose-aggressive": looseAggressivePolicy,
  "tight-weak": tightWeakPolicy,
  "loose-weak": looseWeakPolicy,
  balanced: balancedPolicy,
};

function explorationIntent(style: AIStyle, random: () => number): DecisionIntent {
  const roll = random();
  const [foldWeight, passiveWeight] = {
    "tight-aggressive": [0.34, 0.42],
    "loose-aggressive": [0.12, 0.32],
    "tight-weak": [0.48, 0.43],
    "loose-weak": [0.12, 0.76],
    balanced: [0.24, 0.42],
  }[style.key];
  if (roll < foldWeight) return "fold";
  if (roll < foldWeight + passiveWeight) return "passive";
  return "aggressive";
}

function betFraction(style: AIStyle, strength: number, random: () => number) {
  if (style.key === "tight-aggressive") {
    return strength > 0.8 ? 0.78 + random() * 0.22 : 0.55 + random() * 0.2;
  }
  if (style.key === "loose-aggressive") return 0.42 + random() * 0.68;
  if (style.key === "tight-weak") return 0.48 + random() * 0.18;
  if (style.key === "loose-weak") return 0.34 + random() * 0.18;
  const balancedSizes = [0.33, 0.5, 0.75, 1];
  return balancedSizes[
    Math.min(balancedSizes.length - 1, Math.floor(random() * balancedSizes.length))
  ];
}

function actionForIntent(
  context: DecisionContext,
  style: AIStyle,
  intent: DecisionIntent,
): PlayerAction {
  const { observation, strength, stackToPotRatio, random } = context;
  const playerId = observation.playerId;
  const legal = observation.legalActions;
  if (intent === "aggressive") {
    if (
      strength >= 0.72 &&
      stackToPotRatio <= 1.25 &&
      legal.canAllIn
    ) {
      return { playerId, type: "all-in" };
    }
    if (legal.canRaise) {
      const desired = Math.round(
        observation.currentBet +
          Math.max(
            observation.minimumRaiseIncrement,
            observation.pot * betFraction(style, strength, random),
          ),
      );
      const target = Math.min(
        legal.maxRaiseTarget,
        Math.max(legal.minRaiseTarget, desired),
      );
      if (target >= legal.maxRaiseTarget && legal.canAllIn) {
        return { playerId, type: "all-in" };
      }
      return { playerId, type: "raise", amount: target };
    }
    if (legal.canAllIn) {
      return { playerId, type: "all-in" };
    }
    if (legal.canCall) return { playerId, type: "call" };
  }
  if (intent === "passive") {
    if (legal.canCheck) return { playerId, type: "check" };
    if (legal.canCall) return { playerId, type: "call" };
  }
  if (legal.canCheck) return { playerId, type: "check" };
  return { playerId, type: "fold" };
}

function actionKind(action: PlayerAction): AIActionKind {
  if (action.type === "fold") return "fold";
  if (action.type === "check" || action.type === "call") return "passive";
  return "aggressive";
}

export function chooseAIActionFromObservation(
  observation: BotObservation,
  style: AIStyle,
  random: () => number,
  learning?: AILearningState,
  decisionSeed?: number,
): PlayerAction {
  const randomRolls: number[] = [];
  const tracedRandom = () => {
    const roll = random();
    randomRolls.push(roll);
    return roll;
  };
  const player = observation.self;
  const legal = observation.legalActions;
  if (!legal.canCheck && !legal.canCall && !legal.canFold) {
    return {
      playerId: observation.playerId,
      type: legal.canCheck ? "check" : "fold",
    };
  }

  const strength = handStrength(observation);
  const contextKey = learningContextKey(observation, strength);
  const stacks = stackMetrics(observation);
  const tuning = getAIDecisionTuning(style, learning, contextKey, {
    activeIds: stacks.activeOpponentIds,
    primaryId: latestAggressorId(observation),
  });
  const potPressure =
    legal.toCall / Math.max(1, observation.pot + legal.toCall);
  const stackPressure = legal.toCall / Math.max(1, player.chips);
  const pressure = Math.max(potPressure, stackPressure * 0.75);
  const activePlayerCount = stacks.activeOpponentIds.length + 1;
  const shortStackFactor = clamp(1 - stacks.stackToPotRatio / 3);
  const shortOpponentCallRisk = clamp(
    1 - stacks.shortestOpponentStackToPotRatio / 1.5,
  );
  const wetness = boardWetness(observation);
  const initiativeWeight = {
    "tight-aggressive": 0.75,
    "loose-aggressive": 1,
    "tight-weak": 0.1,
    "loose-weak": 0.15,
    balanced: 0.9,
  }[style.key];
  const initiativeFactor = hasBettingInitiative(observation)
    ? Math.max(0, 1 - wetness) *
      (activePlayerCount === 2 ? 1 : 0.6) *
      initiativeWeight
    : 0;
  const stackAwareTuning: AIDecisionTuning = {
    ...tuning,
    aggressiveThreshold: clamp(
      tuning.aggressiveThreshold -
        (legal.toCall === 0 ? shortStackFactor * 0.06 : 0) -
        initiativeFactor * 0.04,
      0.08,
      0.95,
    ),
    aggressionChance: clamp(
      tuning.aggressionChance +
        (legal.toCall === 0 ? shortStackFactor * 0.08 : 0) +
        initiativeFactor * 0.08,
    ),
    passiveThreshold: clamp(
      tuning.passiveThreshold + Math.max(0, stackPressure - 0.25) * 0.16,
      0.05,
      0.95,
    ),
    continueChance: clamp(
      tuning.continueChance - Math.max(0, stackPressure - 0.25) * 0.22,
      0.05,
      0.98,
    ),
    bluffThreshold: clamp(
      tuning.bluffThreshold + Math.max(0, activePlayerCount - 2) * 0.018,
      0,
      0.8,
    ),
    bluffChance: clamp(
      tuning.bluffChance *
        Math.max(0.55, 1 - Math.max(0, activePlayerCount - 2) * 0.12) *
        (1 - shortOpponentCallRisk * 0.18) +
        initiativeFactor * 0.08,
      0,
      0.8,
    ),
  };
  const context: DecisionContext = {
    observation,
    strength,
    pressure,
    positionBonus: positionBonus(player.position),
    boardWetness: wetness,
    stackToPotRatio: stacks.stackToPotRatio,
    tuning: stackAwareTuning,
    random: tracedRandom,
  };
  const explorationRate = currentAIExplorationRate(style, learning);
  const explorationRoll = tracedRandom();
  const usedExploration = explorationRoll < explorationRate;
  const intent = usedExploration
    ? explorationIntent(style, tracedRandom)
    : POLICY_ENGINES[style.key](context);
  const action = actionForIntent(context, style, intent);

  return {
    ...action,
    aiDecision: {
      contextKey,
      strengthBucket: strengthBucket(strength),
      actionKind: actionKind(action),
      usedExploration,
      policyVersion: AI_POLICY_VERSION,
      decisionSeed,
      publicStateDigest: publicStateDigest(observation),
      intent,
      explorationRate,
      explorationRoll,
      randomRolls,
      publicFactors: {
        pressure,
        positionBonus: context.positionBonus,
        boardWetness: wetness,
        stackToPotRatio: stacks.stackToPotRatio,
        activePlayerCount,
        hasInitiative: hasBettingInitiative(observation),
      },
      tuning: stackAwareTuning,
    },
  };
}

/**
 * Compatibility boundary for callers that own the full engine state. The
 * actual policy can only run after the state has been projected into a
 * BotObservation.
 */
export function chooseAIAction(
  state: GameState,
  playerId: number,
  random: () => number,
  learning?: AILearningState,
  decisionSeed?: number,
): PlayerAction {
  const observation = buildBotObservation(state, playerId);
  const style = state.players.find((player) => player.id === playerId)?.style;
  if (!style) {
    return {
      playerId,
      type: observation.legalActions.canCheck ? "check" : "fold",
    };
  }
  return chooseAIActionFromObservation(
    observation,
    style,
    random,
    learning,
    decisionSeed,
  );
}
