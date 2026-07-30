import type {
  AIActionKind,
  AIContextPolicy,
  AILearningState,
  AIStyle,
  GameState,
  HumanOpponentRead,
} from "./types.ts";

export type AIDecisionTuning = {
  aggressiveThreshold: number;
  passiveThreshold: number;
  aggressionChance: number;
  continueChance: number;
  bluffThreshold: number;
  bluffChance: number;
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function emptyHumanRead(): HumanOpponentRead {
  return {
    handsObserved: 0,
    vpipHands: 0,
    pfrHands: 0,
    aggressiveActions: 0,
    totalActions: 0,
    pressureOpportunities: 0,
    foldsToAggression: 0,
    continuesVsAggression: 0,
  };
}

export function defaultAILearningState(): AILearningState {
  return {
    handsPlayed: 0,
    totalProfit: 0,
    aggressionBias: 0,
    tightnessBias: 0,
    bluffBias: 0,
    humanRead: emptyHumanRead(),
    contextPolicies: {},
    snapshots: [],
  };
}

export function normalizeAILearningState(
  value: AILearningState | null | undefined,
): AILearningState {
  const fallback = defaultAILearningState();
  if (!value || typeof value !== "object") return fallback;
  return {
    handsPlayed: Number.isFinite(value.handsPlayed)
      ? Math.max(0, value.handsPlayed)
      : 0,
    totalProfit: Number.isFinite(value.totalProfit) ? value.totalProfit : 0,
    aggressionBias: clamp(value.aggressionBias ?? 0, -1, 1),
    tightnessBias: clamp(value.tightnessBias ?? 0, -1, 1),
    bluffBias: clamp(value.bluffBias ?? 0, -1, 1),
    humanRead: {
      ...fallback.humanRead,
      ...(value.humanRead ?? {}),
    },
    contextPolicies:
      value.contextPolicies && typeof value.contextPolicies === "object"
        ? value.contextPolicies
        : {},
    snapshots: Array.isArray(value.snapshots) ? value.snapshots.slice(-60) : [],
  };
}

export function aiLearningConfidence(
  style: AIStyle,
  learning: AILearningState | null | undefined,
): number {
  const state = normalizeAILearningState(learning);
  return clamp(state.handsPlayed / Math.max(1, style.memoryWindow), 0, 1);
}

export function currentAILearningRate(
  style: AIStyle,
  learning: AILearningState | null | undefined,
): number {
  const state = normalizeAILearningState(learning);
  const decaySteps = Math.floor(
    state.handsPlayed / Math.max(1, style.memoryWindow),
  );
  return style.learningRate * 0.9 ** decaySteps;
}

export function currentAIExplorationRate(
  style: AIStyle,
  learning: AILearningState | null | undefined,
): number {
  const state = normalizeAILearningState(learning);
  const decaySteps = Math.floor(
    state.handsPlayed / Math.max(1, style.memoryWindow),
  );
  return Math.max(
    style.minimumExploration,
    style.initialExploration * style.explorationDecay ** decaySteps,
  );
}

function policyAdjustment(
  policy: AIContextPolicy | undefined,
): Partial<AIDecisionTuning> {
  if (!policy || policy.sampleCount <= 0) return {};
  const confidence = clamp(policy.sampleCount / 8, 0, 1);
  const aggressiveEdge =
    (policy.aggressiveScore -
      Math.max(policy.passiveScore, policy.foldScore)) *
    confidence;
  const foldEdge =
    (policy.foldScore -
      Math.max(policy.passiveScore, policy.aggressiveScore)) *
    confidence;
  const passiveEdge =
    (policy.passiveScore -
      Math.max(policy.foldScore, policy.aggressiveScore)) *
    confidence;

  return {
    aggressiveThreshold: -aggressiveEdge * 0.14,
    aggressionChance: aggressiveEdge * 0.18,
    passiveThreshold: foldEdge * 0.12 - aggressiveEdge * 0.05,
    continueChance: passiveEdge * 0.08 - foldEdge * 0.16,
    bluffThreshold: -aggressiveEdge * 0.1,
    bluffChance: aggressiveEdge * 0.2,
  };
}

function opponentAdjustment(read: HumanOpponentRead): Partial<AIDecisionTuning> {
  if (read.handsObserved <= 0) return {};
  const confidence = clamp(read.handsObserved / 12, 0, 1);
  const aggressionRate =
    read.totalActions > 0 ? read.aggressiveActions / read.totalActions : 0;
  const foldRate =
    read.pressureOpportunities > 0
      ? read.foldsToAggression / read.pressureOpportunities
      : 0;
  const continueRate =
    read.pressureOpportunities > 0
      ? read.continuesVsAggression / read.pressureOpportunities
      : 0;

  let aggressiveThreshold = 0;
  let passiveThreshold = 0;
  let aggressionChance = 0;
  let continueChance = 0;
  let bluffThreshold = 0;
  let bluffChance = 0;

  if (foldRate > 0.48) {
    const strength = (foldRate - 0.48) * 0.45 * confidence;
    aggressionChance += strength * 0.3;
    bluffChance += strength;
    bluffThreshold -= strength * 0.55;
  }
  if (continueRate > 0.52) {
    const strength = (continueRate - 0.52) * 0.45 * confidence;
    aggressiveThreshold += strength * 0.28;
    bluffChance -= strength;
    bluffThreshold += strength * 0.6;
  }
  if (aggressionRate > 0.4) {
    const strength = (aggressionRate - 0.4) * 0.25 * confidence;
    passiveThreshold += strength * 0.35;
    continueChance -= strength * 0.65;
  }

  return {
    aggressiveThreshold,
    passiveThreshold,
    aggressionChance,
    continueChance,
    bluffThreshold,
    bluffChance,
  };
}

export function getAIDecisionTuning(
  style: AIStyle,
  learning: AILearningState | null | undefined,
  contextKey: string,
): AIDecisionTuning {
  const state = normalizeAILearningState(learning);
  const confidence = aiLearningConfidence(style, state);
  const cap = style.adjustmentCap * confidence;
  const aggressionBias = state.aggressionBias * cap;
  const tightnessBias = state.tightnessBias * cap;
  const bluffBias = state.bluffBias * cap;
  const contextual = policyAdjustment(state.contextPolicies[contextKey]);
  const opponent = opponentAdjustment(state.humanRead);

  const delta = (key: keyof AIDecisionTuning) =>
    (contextual[key] ?? 0) + (opponent[key] ?? 0);

  return {
    aggressiveThreshold: clamp(
      style.aggressiveThreshold -
        aggressionBias * 0.6 +
        tightnessBias * 0.9 +
        delta("aggressiveThreshold"),
      0.08,
      0.95,
    ),
    passiveThreshold: clamp(
      style.passiveThreshold -
        aggressionBias * 0.25 +
        tightnessBias * 0.7 +
        delta("passiveThreshold"),
      0.05,
      0.9,
    ),
    aggressionChance: clamp(
      style.aggressionChance +
        aggressionBias * 1.4 -
        tightnessBias * 0.45 +
        delta("aggressionChance"),
      0.02,
      0.98,
    ),
    continueChance: clamp(
      style.continueChance +
        aggressionBias * 0.3 -
        tightnessBias * 0.95 +
        delta("continueChance"),
      0.05,
      0.98,
    ),
    bluffThreshold: clamp(
      style.bluffThreshold -
        bluffBias * 0.8 +
        tightnessBias * 0.25 +
        delta("bluffThreshold"),
      0,
      0.75,
    ),
    bluffChance: clamp(
      style.bluffChance +
        bluffBias * 1.4 +
        aggressionBias * 0.25 -
        tightnessBias * 0.4 +
        delta("bluffChance"),
      0,
      0.8,
    ),
  };
}

function visibleActionsForObserver(game: GameState, observerId: number) {
  const chronological = [...game.actionLog].reverse();
  const observerFoldIndex = chronological.findIndex(
    (entry) => entry.playerId === observerId && entry.action === "fold",
  );
  return observerFoldIndex >= 0
    ? chronological.slice(0, observerFoldIndex + 1)
    : chronological;
}

function updateHumanRead(
  game: GameState,
  observerId: number,
  previous: HumanOpponentRead,
): HumanOpponentRead {
  const visible = visibleActionsForObserver(game, observerId);
  const humanActions = visible.filter(
    (entry) => entry.playerId === 0 && !entry.label.includes("盲"),
  );
  const preflop = humanActions.filter((entry) => entry.street === "preflop");
  const voluntary = preflop.some((entry) =>
    ["call", "raise", "all-in"].includes(entry.action),
  );
  const raised = preflop.some((entry) =>
    ["raise", "all-in"].includes(entry.action),
  );
  const aggressiveActions = humanActions.filter((entry) =>
    ["raise", "all-in"].includes(entry.action),
  ).length;

  let pressureOpportunities = 0;
  let foldsToAggression = 0;
  let continuesVsAggression = 0;
  let street = "";
  let lastAggressor: number | null = null;
  visible.forEach((entry) => {
    if (entry.street !== street) {
      street = entry.street;
      lastAggressor = null;
    }
    if (entry.playerId === 0 && lastAggressor !== null && lastAggressor !== 0) {
      pressureOpportunities += 1;
      if (entry.action === "fold") foldsToAggression += 1;
      else if (entry.action !== "check") continuesVsAggression += 1;
    }
    if (
      !entry.label.includes("盲") &&
      ["raise", "all-in"].includes(entry.action)
    ) {
      lastAggressor = entry.playerId;
    }
  });

  return {
    handsObserved: previous.handsObserved + (humanActions.length > 0 ? 1 : 0),
    vpipHands: previous.vpipHands + (voluntary ? 1 : 0),
    pfrHands: previous.pfrHands + (raised ? 1 : 0),
    aggressiveActions: previous.aggressiveActions + aggressiveActions,
    totalActions: previous.totalActions + humanActions.length,
    pressureOpportunities:
      previous.pressureOpportunities + pressureOpportunities,
    foldsToAggression: previous.foldsToAggression + foldsToAggression,
    continuesVsAggression:
      previous.continuesVsAggression + continuesVsAggression,
  };
}

function actionLearningWeight(style: AIStyle, kind: AIActionKind): number {
  if (kind === "fold") return style.foldLearningWeight;
  if (kind === "passive") return style.passiveLearningWeight;
  return style.aggressiveLearningWeight;
}

function rewardForDecision(
  kind: AIActionKind,
  bucket: "weak" | "marginal" | "strong" | "premium",
  signedOutcome: number,
  didWin: boolean,
): number {
  if (kind === "fold") {
    const bucketReward = {
      weak: 0.18,
      marginal: 0.08,
      strong: -0.1,
      premium: -0.24,
    }[bucket];
    return clamp(0.04 + bucketReward - signedOutcome * 0.12, -1, 1);
  }
  if (kind === "passive") {
    const valueBonus =
      didWin && (bucket === "strong" || bucket === "premium") ? 0.08 : 0;
    return clamp(signedOutcome * 0.55 + valueBonus, -1, 1);
  }
  const bluffBonus =
    didWin && (bucket === "weak" || bucket === "marginal") ? 0.1 : 0;
  const premiumBonus = didWin && bucket === "premium" ? 0.05 : 0;
  return clamp(signedOutcome + bluffBonus + premiumBonus, -1, 1);
}

function refreshBiases(contextPolicies: Record<string, AIContextPolicy>) {
  const values = Object.entries(contextPolicies);
  if (!values.length) {
    return { aggressionBias: 0, tightnessBias: 0, bluffBias: 0 };
  }

  let aggressionTotal = 0;
  let aggressionWeight = 0;
  let tightnessTotal = 0;
  let tightnessWeight = 0;
  let bluffTotal = 0;
  let bluffWeight = 0;

  values.forEach(([key, policy]) => {
    const weight = Math.max(1, policy.sampleCount);
    const aggressiveEdge =
      policy.aggressiveScore -
      Math.max(policy.passiveScore, policy.foldScore);
    const foldEdge =
      policy.foldScore -
      Math.max(policy.passiveScore, policy.aggressiveScore);
    const [street, , , bucket] = key.split("|");

    aggressionTotal += aggressiveEdge * weight;
    aggressionWeight += weight;
    tightnessTotal +=
      (street === "preflop"
        ? foldEdge - aggressiveEdge * 0.35
        : foldEdge * 0.35) * weight;
    tightnessWeight += weight;
    if (street !== "preflop" && ["weak", "marginal"].includes(bucket)) {
      bluffTotal += aggressiveEdge * weight;
      bluffWeight += weight;
    }
  });

  return {
    aggressionBias: clamp(
      aggressionWeight ? aggressionTotal / aggressionWeight : 0,
      -1,
      1,
    ),
    tightnessBias: clamp(
      tightnessWeight ? tightnessTotal / tightnessWeight : 0,
      -1,
      1,
    ),
    bluffBias: clamp(
      bluffWeight ? bluffTotal / bluffWeight : 0,
      -1,
      1,
    ),
  };
}

export function updateAILearningAfterHand(
  game: GameState,
  playerId: number,
  style: AIStyle,
  previousLearning: AILearningState | null | undefined,
): AILearningState {
  if (!game.result) return normalizeAILearningState(previousLearning);
  const previous = normalizeAILearningState(previousLearning);
  const payout = game.result.payouts[playerId] ?? 0;
  const profit = payout - game.players[playerId].totalContribution;
  const totalPot = game.players.reduce(
    (sum, player) => sum + player.totalContribution,
    0,
  );
  const normalizedProfit = clamp(profit / Math.max(totalPot, 80), -1, 1);
  const signedOutcome =
    profit > 0
      ? Math.max(0.25, Math.abs(normalizedProfit))
      : profit < 0
        ? -Math.max(0.25, Math.abs(normalizedProfit))
        : game.result.winnerIds.includes(playerId)
          ? 0.1
          : -0.1;
  const didWin = game.result.winnerIds.includes(playerId);
  const learningRate = currentAILearningRate(style, previous);
  const contextPolicies = structuredClone(previous.contextPolicies);

  [...game.actionLog]
    .reverse()
    .filter(
      (entry) => entry.playerId === playerId && entry.aiDecision !== undefined,
    )
    .forEach((entry) => {
      const decision = entry.aiDecision!;
      const reward =
        rewardForDecision(
          decision.actionKind,
          decision.strengthBucket,
          signedOutcome,
          didWin,
        ) *
        actionLearningWeight(style, decision.actionKind) *
        (decision.usedExploration ? 0.9 : 1);
      const policy = contextPolicies[decision.contextKey] ?? {
        foldScore: 0,
        passiveScore: 0,
        aggressiveScore: 0,
        sampleCount: 0,
      };
      const key = `${decision.actionKind}Score` as
        | "foldScore"
        | "passiveScore"
        | "aggressiveScore";
      policy[key] += (clamp(reward, -1, 1) - policy[key]) * learningRate;
      policy.sampleCount += 1;
      contextPolicies[decision.contextKey] = policy;
    });

  const biases = refreshBiases(contextPolicies);
  const handsPlayed = previous.handsPlayed + 1;
  const effectiveCap =
    style.adjustmentCap *
    clamp(handsPlayed / Math.max(1, style.memoryWindow), 0, 1);
  const nextBase: AILearningState = {
    handsPlayed,
    totalProfit: previous.totalProfit + profit,
    ...biases,
    humanRead: updateHumanRead(game, playerId, previous.humanRead),
    contextPolicies,
    snapshots: previous.snapshots,
  };
  const snapshot = {
    handIndex: handsPlayed,
    totalProfit: nextBase.totalProfit,
    aggressionBias: biases.aggressionBias * effectiveCap,
    tightnessBias: biases.tightnessBias * effectiveCap,
    bluffBias: biases.bluffBias * effectiveCap,
    explorationRate: currentAIExplorationRate(style, nextBase),
  };

  return {
    ...nextBase,
    snapshots: [...previous.snapshots, snapshot].slice(-60),
  };
}

export function describeHumanRead(read: HumanOpponentRead): string {
  if (read.handsObserved < 3) return "正在观察你的行动习惯";
  const vpip = read.vpipHands / Math.max(1, read.handsObserved);
  const aggression =
    read.aggressiveActions / Math.max(1, read.totalActions);
  const range = vpip > 0.55 ? "入池偏宽" : vpip < 0.28 ? "选牌偏紧" : "范围均衡";
  const tempo =
    aggression > 0.38
      ? "进攻积极"
      : aggression < 0.18
        ? "行动偏被动"
        : "攻守适中";
  return `对你的判断：${range} · ${tempo}`;
}
