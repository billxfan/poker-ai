import {
  currentAIExplorationRate,
  getAIDecisionTuning,
  type AIDecisionTuning,
} from "./aiLearning.ts";
import { evaluateBest } from "./evaluator.ts";
import { legalActions } from "./engine.ts";
import type {
  AIActionKind,
  AIArchetype,
  AILearningState,
  AIStyle,
  GameState,
  PlayerAction,
} from "./types.ts";

type DecisionIntent = "fold" | "passive" | "aggressive";

type DecisionContext = {
  state: GameState;
  playerId: number;
  strength: number;
  pressure: number;
  positionBonus: number;
  boardWetness: number;
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

function drawPotential(state: GameState, playerId: number): number {
  if (state.communityCards.length < 3 || state.communityCards.length >= 5) {
    return 0;
  }
  const cards = [
    ...state.players[playerId].holeCards,
    ...state.communityCards,
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

function handStrength(state: GameState, playerId: number): number {
  const player = state.players[playerId];
  if (state.communityCards.length < 3) {
    return preflopStrength(
      player.holeCards.map((card) => card.rank),
      player.holeCards[0]?.rank === player.holeCards[1]?.rank,
      player.holeCards[0]?.suit === player.holeCards[1]?.suit,
    );
  }

  const evaluated = evaluateBest([
    ...player.holeCards,
    ...state.communityCards,
  ]);
  const kicker = (evaluated.values[0] ?? 2) / 80;
  return Math.min(
    1,
    0.12 + evaluated.category * 0.115 + kicker + drawPotential(state, playerId),
  );
}

function boardWetness(state: GameState): number {
  const cards = state.communityCards;
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

function learningContextKey(
  state: GameState,
  playerId: number,
  strength: number,
): string {
  const legal = legalActions(state, playerId);
  const aggressions = state.actionLog.filter(
    (entry) =>
      entry.street === state.street &&
      !entry.label.includes("盲") &&
      ["raise", "all-in"].includes(entry.action),
  ).length;
  const pressure =
    legal.toCall === 0
      ? "unopened"
      : aggressions <= 1
        ? "facing-bet"
        : "facing-raise";
  const activePlayers = state.players.filter(
    (player) => player.status !== "folded" && player.status !== "out",
  ).length;
  return [
    state.street,
    state.players[playerId].position,
    pressure,
    strengthBucket(strength),
    activePlayers <= 2 ? "hu" : "mw",
  ].join("|");
}

function tightAggressivePolicy(context: DecisionContext): DecisionIntent {
  const { strength, pressure, tuning, random, state, playerId } = context;
  const legal = legalActions(state, playerId);
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
    state,
    playerId,
  } = context;
  const legal = legalActions(state, playerId);
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
  const { strength, pressure, tuning, random, state, playerId } = context;
  const legal = legalActions(state, playerId);
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
  const { strength, pressure, tuning, random, state, playerId } = context;
  const legal = legalActions(state, playerId);
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
    state,
    playerId,
  } = context;
  const legal = legalActions(state, playerId);
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
  const { state, playerId, strength, random } = context;
  const legal = legalActions(state, playerId);
  if (intent === "aggressive" && legal.canRaise) {
    const desired = Math.round(
      state.currentBet +
        Math.max(
          state.minimumRaiseIncrement,
          state.pot * betFraction(style, strength, random),
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

export function chooseAIAction(
  state: GameState,
  playerId: number,
  random: () => number = Math.random,
  learning?: AILearningState,
): PlayerAction {
  const player = state.players[playerId];
  const style = player.style;
  const legal = legalActions(state, playerId);
  if (!style || (!legal.canCheck && !legal.canCall && !legal.canFold)) {
    return { playerId, type: legal.canCheck ? "check" : "fold" };
  }

  const strength = handStrength(state, playerId);
  const contextKey = learningContextKey(state, playerId, strength);
  const tuning = getAIDecisionTuning(style, learning, contextKey);
  const pressure = legal.toCall / Math.max(1, state.pot + legal.toCall);
  const context: DecisionContext = {
    state,
    playerId,
    strength,
    pressure,
    positionBonus: positionBonus(player.position),
    boardWetness: boardWetness(state),
    tuning,
    random,
  };
  const usedExploration =
    random() < currentAIExplorationRate(style, learning);
  const intent = usedExploration
    ? explorationIntent(style, random)
    : POLICY_ENGINES[style.key](context);
  const action = actionForIntent(context, style, intent);

  return {
    ...action,
    aiDecision: {
      contextKey,
      strengthBucket: strengthBucket(strength),
      actionKind: actionKind(action),
      usedExploration,
    },
  };
}
