import type {
  AIContextPolicy,
  AILearningState,
  AIStyle,
  GameState,
  HumanOpponentRead,
  OpponentRead,
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

function emptyOpponentRead(): OpponentRead {
  return {
    handsObserved: 0,
    vpipHands: 0,
    pfrHands: 0,
    aggressiveActions: 0,
    totalActions: 0,
    pressureOpportunities: 0,
    foldsToAggression: 0,
    continuesVsAggression: 0,
    pressureWins: 0,
    pressureFailures: 0,
  };
}

export function defaultAILearningState(): AILearningState {
  return {
    handsPlayed: 0,
    totalProfit: 0,
    recentProfit: 0,
    bustCount: 0,
    rebuyCount: 0,
    recentBustPressure: 0,
    recentMomentum: 0,
    recentBadBeatPressure: 0,
    consecutiveLosses: 0,
    aggressionBias: 0,
    tightnessBias: 0,
    bluffBias: 0,
    humanRead: emptyOpponentRead(),
    opponentReads: {},
    contextPolicies: {},
    snapshots: [],
  };
}

export function normalizeAILearningState(
  value: AILearningState | null | undefined,
): AILearningState {
  const fallback = defaultAILearningState();
  if (!value || typeof value !== "object") return fallback;
  const normalizeCount = (count: number | null | undefined) =>
    Number.isFinite(count) ? clamp(Math.floor(count!), 0, 1_000_000) : 0;
  const normalizeMetric = (count: number | null | undefined) =>
    Number.isFinite(count) ? clamp(count!, 0, 1_000_000) : 0;
  const normalizeRead = (read: OpponentRead | null | undefined): OpponentRead => {
    const candidate = { ...emptyOpponentRead(), ...(read ?? {}) };
    return {
      handsObserved: normalizeMetric(candidate.handsObserved),
      vpipHands: normalizeMetric(candidate.vpipHands),
      pfrHands: normalizeMetric(candidate.pfrHands),
      aggressiveActions: normalizeMetric(candidate.aggressiveActions),
      totalActions: normalizeMetric(candidate.totalActions),
      pressureOpportunities: normalizeMetric(candidate.pressureOpportunities),
      foldsToAggression: normalizeMetric(candidate.foldsToAggression),
      continuesVsAggression: normalizeMetric(candidate.continuesVsAggression),
      pressureWins: normalizeMetric(candidate.pressureWins),
      pressureFailures: normalizeMetric(candidate.pressureFailures),
    };
  };
  const storedReads =
    value.opponentReads && typeof value.opponentReads === "object"
      ? Object.fromEntries(
          Object.entries(value.opponentReads).map(([id, read]) => [
            id,
            normalizeRead(read),
          ]),
        )
      : {};
  const humanRead = normalizeRead(storedReads[0] ?? value.humanRead);
  const contextPolicies =
    value.contextPolicies && typeof value.contextPolicies === "object"
      ? Object.fromEntries(
          Object.entries(value.contextPolicies)
            .filter(([, policy]) => !!policy && typeof policy === "object")
            .map(([key, policy]) => [
              key,
              {
                foldScore: clamp(
                  Number.isFinite(policy.foldScore) ? policy.foldScore : 0,
                  -1,
                  1,
                ),
                passiveScore: clamp(
                  Number.isFinite(policy.passiveScore) ? policy.passiveScore : 0,
                  -1,
                  1,
                ),
                aggressiveScore: clamp(
                  Number.isFinite(policy.aggressiveScore)
                    ? policy.aggressiveScore
                    : 0,
                  -1,
                  1,
                ),
                sampleCount: normalizeCount(policy.sampleCount),
              },
            ])
            .sort(
              ([, left], [, right]) =>
                (right as AIContextPolicy).sampleCount -
                (left as AIContextPolicy).sampleCount,
            )
            .slice(0, 256),
        )
      : {};
  return {
    handsPlayed: Number.isFinite(value.handsPlayed)
      ? Math.max(0, value.handsPlayed)
      : 0,
    totalProfit: Number.isFinite(value.totalProfit) ? value.totalProfit : 0,
    recentProfit: Number.isFinite(value.recentProfit) ? value.recentProfit : 0,
    bustCount: normalizeCount(value.bustCount),
    rebuyCount: normalizeCount(value.rebuyCount),
    recentBustPressure: Number.isFinite(value.recentBustPressure)
      ? clamp(value.recentBustPressure, 0, 8)
      : 0,
    recentMomentum: Number.isFinite(value.recentMomentum)
      ? clamp(value.recentMomentum, -4, 4)
      : 0,
    recentBadBeatPressure: Number.isFinite(value.recentBadBeatPressure)
      ? clamp(value.recentBadBeatPressure, 0, 8)
      : 0,
    consecutiveLosses: normalizeCount(value.consecutiveLosses),
    aggressionBias: clamp(value.aggressionBias ?? 0, -1, 1),
    tightnessBias: clamp(value.tightnessBias ?? 0, -1, 1),
    bluffBias: clamp(value.bluffBias ?? 0, -1, 1),
    humanRead,
    opponentReads: { ...storedReads, 0: humanRead },
    contextPolicies,
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
  // Preserve a small adaptation floor so a long-running rival can respond when
  // the human changes gears instead of freezing permanently after many hands.
  return Math.max(
    style.learningRate * 0.15,
    style.learningRate * 0.9 ** decaySteps,
  );
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

function opponentAdjustment(read: HumanOpponentRead): Partial<AIDecisionTuning> {
  if (read.handsObserved <= 0) return {};
  const confidence = clamp(read.handsObserved / 12, 0, 1);
  const aggressionRate =
    read.totalActions > 0 ? read.aggressiveActions / read.totalActions : 0;
  const vpipRate = read.vpipHands / Math.max(1, read.handsObserved);
  const pfrRate = read.pfrHands / Math.max(1, read.handsObserved);
  const foldRate =
    read.pressureOpportunities > 0
      ? read.foldsToAggression / read.pressureOpportunities
      : 0;
  const continueRate =
    read.pressureOpportunities > 0
      ? read.continuesVsAggression / read.pressureOpportunities
      : 0;
  const pressureEvidence = read.pressureWins + read.pressureFailures;
  const pressureConfidence = clamp(pressureEvidence / 4, 0, 1) * confidence;
  const pressureWinRate =
    pressureEvidence > 0 ? read.pressureWins / pressureEvidence : 0;

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
  if (vpipRate < 0.28) {
    const strength = (0.28 - vpipRate) * 0.22 * confidence;
    aggressionChance += strength * 0.45;
    bluffChance += strength;
    bluffThreshold -= strength * 0.35;
  }
  if (vpipRate > 0.58) {
    const strength = (vpipRate - 0.58) * 0.18 * confidence;
    aggressiveThreshold -= strength * 0.35;
    bluffChance -= strength * 0.55;
  }
  if (pfrRate > 0.34) {
    const strength = (pfrRate - 0.34) * 0.16 * confidence;
    passiveThreshold += strength * 0.3;
    continueChance -= strength * 0.55;
  }
  if (pressureWinRate > 0.64) {
    const strength = (pressureWinRate - 0.64) * 0.16 * pressureConfidence;
    passiveThreshold += strength;
    continueChance -= strength * 0.7;
  }
  if (pressureEvidence > 0 && pressureWinRate < 0.36) {
    const strength = (0.36 - pressureWinRate) * 0.16 * pressureConfidence;
    passiveThreshold -= strength;
    continueChance += strength * 0.55;
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

function opponentGroupAdjustment(
  learning: AILearningState,
  opponentIds: number[] | undefined,
  primaryOpponentId: number | null | undefined,
): Partial<AIDecisionTuning> {
  if (!opponentIds) return opponentAdjustment(learning.humanRead);
  const reads = opponentIds
    .map((id) => learning.opponentReads[id])
    .filter((read): read is OpponentRead => !!read && read.handsObserved > 0);
  if (!reads.length) return {};

  const keys: (keyof AIDecisionTuning)[] = [
    "aggressiveThreshold",
    "passiveThreshold",
    "aggressionChance",
    "continueChance",
    "bluffThreshold",
    "bluffChance",
  ];
  const weights = reads.map((read) => clamp(read.handsObserved / 12, 0, 1));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const group: Partial<AIDecisionTuning> = {};
  keys.forEach((key) => {
    group[key] = reads.reduce((sum, read, index) => {
      return sum + (opponentAdjustment(read)[key] ?? 0) * weights[index];
    }, 0) / Math.max(1, totalWeight);
  });

  const primary =
    primaryOpponentId === null || primaryOpponentId === undefined
      ? undefined
      : learning.opponentReads[primaryOpponentId];
  if (!primary || primary.handsObserved <= 0) return group;
  const targeted = opponentAdjustment(primary);
  keys.forEach((key) => {
    group[key] = (group[key] ?? 0) * 0.65 + (targeted[key] ?? 0) * 0.35;
  });
  return group;
}

export function getAIDecisionTuning(
  style: AIStyle,
  learning: AILearningState | null | undefined,
  contextKey: string,
  opponents?: {
    activeIds: number[];
    primaryId?: number | null;
  },
): AIDecisionTuning {
  void contextKey;
  const state = normalizeAILearningState(learning);
  const confidence = aiLearningConfidence(style, state);
  const recentLossPressure = clamp(-state.recentProfit / 700, 0, 1);
  const recentBustPressure = clamp(state.recentBustPressure / 1.8, 0, 1);
  const recentBadBeatPressure = clamp(state.recentBadBeatPressure / 1.2, 0, 1);
  const streakPressure = clamp((state.consecutiveLosses - 2) / 5, 0, 1);
  const emotionStrength =
    state.handsPlayed < 6
      ? 0
      : (recentLossPressure * 0.5 +
          recentBustPressure * 0.3 +
          recentBadBeatPressure * 0.15 +
          streakPressure * 0.05) *
        Math.min(0.025, Math.max(0.006, style.adjustmentCap * 0.12));
  const confidenceStrength =
    state.handsPlayed < 6
      ? 0
      : clamp(state.recentMomentum / 1.8, 0, 1) * 0.012;
  const opponent = opponentGroupAdjustment(
    state,
    opponents?.activeIds,
    opponents?.primaryId,
  );
  const exploitCap = Math.min(0.08, style.adjustmentCap * 0.35) * confidence;

  const emotionDirection: Record<
    AIStyle["key"],
    Partial<AIDecisionTuning>
  > = {
    "tight-aggressive": {
      aggressiveThreshold: 0.5,
      passiveThreshold: 0.4,
      aggressionChance: -0.4,
      continueChance: -0.25,
      bluffThreshold: 0.4,
      bluffChance: -0.5,
    },
    "loose-aggressive": {
      aggressiveThreshold: -0.2,
      passiveThreshold: -0.15,
      aggressionChance: 0.5,
      continueChance: 0.15,
      bluffThreshold: -0.15,
      bluffChance: 0.3,
    },
    "tight-weak": {
      aggressiveThreshold: 0.45,
      passiveThreshold: 0.5,
      aggressionChance: -0.2,
      continueChance: -0.3,
      bluffThreshold: 0.25,
      bluffChance: -0.2,
    },
    "loose-weak": {
      passiveThreshold: -0.15,
      continueChance: 0.3,
      aggressionChance: 0.05,
    },
    balanced: {
      aggressiveThreshold: 0.08,
      passiveThreshold: 0.08,
      aggressionChance: -0.05,
      continueChance: -0.05,
    },
  };
  const emotion = emotionDirection[style.key];
  const confidenceDirection: Record<
    AIStyle["key"],
    Partial<AIDecisionTuning>
  > = {
    "tight-aggressive": {
      aggressiveThreshold: -0.1,
      aggressionChance: 0.22,
      bluffChance: 0.08,
    },
    "loose-aggressive": {
      aggressiveThreshold: -0.08,
      aggressionChance: 0.3,
      bluffChance: 0.18,
    },
    "tight-weak": {
      passiveThreshold: -0.08,
      continueChance: 0.1,
    },
    "loose-weak": {
      continueChance: 0.15,
      bluffChance: 0.04,
    },
    balanced: {
      aggressiveThreshold: -0.04,
      aggressionChance: 0.1,
    },
  };
  const confidenceEmotion = confidenceDirection[style.key];

  const delta = (key: keyof AIDecisionTuning) =>
    clamp(opponent[key] ?? 0, -exploitCap, exploitCap) +
    (emotion[key] ?? 0) * emotionStrength +
    (confidenceEmotion[key] ?? 0) * confidenceStrength;

  const withinPersona = (
    key: keyof AIDecisionTuning,
    value: number,
    hardMinimum: number,
    hardMaximum: number,
  ) =>
    clamp(
      value,
      Math.max(hardMinimum, style[key] - style.adjustmentCap),
      Math.min(hardMaximum, style[key] + style.adjustmentCap),
    );

  return {
    aggressiveThreshold: withinPersona(
      "aggressiveThreshold",
      style.aggressiveThreshold + delta("aggressiveThreshold"),
      0.08,
      0.95,
    ),
    passiveThreshold: withinPersona(
      "passiveThreshold",
      style.passiveThreshold + delta("passiveThreshold"),
      0.05,
      0.9,
    ),
    aggressionChance: withinPersona(
      "aggressionChance",
      style.aggressionChance + delta("aggressionChance"),
      0.02,
      0.98,
    ),
    continueChance: withinPersona(
      "continueChance",
      style.continueChance + delta("continueChance"),
      0.05,
      0.98,
    ),
    bluffThreshold: withinPersona(
      "bluffThreshold",
      style.bluffThreshold + delta("bluffThreshold"),
      0,
      0.75,
    ),
    bluffChance: withinPersona(
      "bluffChance",
      style.bluffChance + delta("bluffChance"),
      0,
      0.8,
    ),
  };
}

function visibleActionsForObserver(game: GameState, observerId: number) {
  void observerId;
  // Folding a hand does not remove a seated human's ability to observe later
  // public bets and a public showdown. Hole cards remain governed separately.
  return [...game.actionLog].reverse();
}

function updateOpponentRead(
  game: GameState,
  observerId: number,
  opponentId: number,
  previous: OpponentRead,
): OpponentRead {
  const decay = 0.965;
  const visible = visibleActionsForObserver(game, observerId);
  const opponentActions = visible.filter(
    (entry) => entry.playerId === opponentId && !entry.label.includes("盲"),
  );
  const preflop = opponentActions.filter((entry) => entry.street === "preflop");
  const voluntary = preflop.some((entry) =>
    ["call", "raise", "all-in"].includes(entry.action),
  );
  const raised = preflop.some((entry) =>
    ["raise", "all-in"].includes(entry.action),
  );
  const aggressiveActions = opponentActions.filter((entry) =>
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
    if (
      entry.playerId === opponentId &&
      lastAggressor !== null &&
      lastAggressor !== opponentId
    ) {
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
  const finalAggressor = [...visible]
    .reverse()
    .find(
      (entry) =>
        !entry.label.includes("盲") &&
        ["raise", "all-in"].includes(entry.action),
    )?.playerId;
  const pressureWon =
    finalAggressor === opponentId && game.result?.winnerIds.includes(opponentId);
  const pressureFailed =
    finalAggressor === opponentId &&
    game.result?.showdown === true &&
    !game.result.winnerIds.includes(opponentId);

  return {
    handsObserved: previous.handsObserved * decay + 1,
    vpipHands: previous.vpipHands * decay + (voluntary ? 1 : 0),
    pfrHands: previous.pfrHands * decay + (raised ? 1 : 0),
    aggressiveActions:
      previous.aggressiveActions * decay + aggressiveActions,
    totalActions: previous.totalActions * decay + opponentActions.length,
    pressureOpportunities:
      previous.pressureOpportunities * decay + pressureOpportunities,
    foldsToAggression:
      previous.foldsToAggression * decay + foldsToAggression,
    continuesVsAggression:
      previous.continuesVsAggression * decay + continuesVsAggression,
    pressureWins: previous.pressureWins * decay + (pressureWon ? 1 : 0),
    pressureFailures:
      previous.pressureFailures * decay + (pressureFailed ? 1 : 0),
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
  const busted = game.players[playerId].chips <= 0;
  const latestDecision = game.actionLog.find(
    (entry) => entry.playerId === playerId && entry.aiDecision !== undefined,
  )?.aiDecision;
  const estimatedEquity = latestDecision?.publicFactors?.estimatedEquity ?? 0;
  const badBeat =
    profit < 0 && game.result.showdown && estimatedEquity >= 0.62;
  const handsPlayed = previous.handsPlayed + 1;
  const opponentReads = { ...previous.opponentReads };
  game.players
    .filter((player) => player.id !== playerId)
    .forEach((opponent) => {
      opponentReads[opponent.id] = updateOpponentRead(
        game,
        playerId,
        opponent.id,
        opponentReads[opponent.id] ?? emptyOpponentRead(),
      );
    });
  const humanRead = opponentReads[0] ?? previous.humanRead;
  const nextBase: AILearningState = {
    handsPlayed,
    totalProfit: previous.totalProfit + profit,
    recentProfit: previous.recentProfit * 0.72 + profit,
    bustCount: previous.bustCount + (busted ? 1 : 0),
    rebuyCount: previous.rebuyCount + (busted ? 1 : 0),
    recentBustPressure:
      previous.recentBustPressure * 0.72 + (busted ? 1 : 0),
    recentMomentum:
      previous.recentMomentum * 0.68 + clamp(profit / 450, -1, 1),
    recentBadBeatPressure:
      previous.recentBadBeatPressure * 0.7 + (badBeat ? 1 : 0),
    consecutiveLosses: profit < 0 ? previous.consecutiveLosses + 1 : 0,
    aggressionBias: 0,
    tightnessBias: 0,
    bluffBias: 0,
    humanRead,
    opponentReads,
    contextPolicies: {},
    snapshots: previous.snapshots,
  };
  const adaptedToHuman = getAIDecisionTuning(
    style,
    nextBase,
    "profile-summary",
    { activeIds: [0], primaryId: 0 },
  );
  const snapshot = {
    handIndex: handsPlayed,
    totalProfit: nextBase.totalProfit,
    aggressionBias: adaptedToHuman.aggressionChance - style.aggressionChance,
    tightnessBias: adaptedToHuman.passiveThreshold - style.passiveThreshold,
    bluffBias: adaptedToHuman.bluffChance - style.bluffChance,
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
