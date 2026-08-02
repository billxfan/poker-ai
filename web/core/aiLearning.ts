import type {
  AIActionKind,
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
  };
}

export function defaultAILearningState(): AILearningState {
  return {
    handsPlayed: 0,
    totalProfit: 0,
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
  const normalizeRead = (read: OpponentRead | null | undefined): OpponentRead => {
    const candidate = { ...emptyOpponentRead(), ...(read ?? {}) };
    return {
      handsObserved: normalizeCount(candidate.handsObserved),
      vpipHands: normalizeCount(candidate.vpipHands),
      pfrHands: normalizeCount(candidate.pfrHands),
      aggressiveActions: normalizeCount(candidate.aggressiveActions),
      totalActions: normalizeCount(candidate.totalActions),
      pressureOpportunities: normalizeCount(candidate.pressureOpportunities),
      foldsToAggression: normalizeCount(candidate.foldsToAggression),
      continuesVsAggression: normalizeCount(candidate.continuesVsAggression),
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
  const state = normalizeAILearningState(learning);
  const confidence = aiLearningConfidence(style, state);
  const cap = style.adjustmentCap * confidence;
  const aggressionBias = state.aggressionBias * cap;
  const tightnessBias = state.tightnessBias * cap;
  const bluffBias = state.bluffBias * cap;
  const contextual = policyAdjustment(state.contextPolicies[contextKey]);
  const opponent = opponentGroupAdjustment(
    state,
    opponents?.activeIds,
    opponents?.primaryId,
  );

  // Every learned contribution—not only the aggregate bias—must remain inside
  // the persona envelope. This prevents long sessions from converging all five
  // rivals toward the same exploit policy.
  const delta = (key: keyof AIDecisionTuning) =>
    clamp((contextual[key] ?? 0) + (opponent[key] ?? 0), -cap, cap);

  const withinPersona = (
    key: keyof AIDecisionTuning,
    value: number,
    hardMinimum: number,
    hardMaximum: number,
  ) =>
    clamp(
      value,
      Math.max(hardMinimum, style[key] - cap),
      Math.min(hardMaximum, style[key] + cap),
    );

  return {
    aggressiveThreshold: withinPersona(
      "aggressiveThreshold",
      style.aggressiveThreshold -
        aggressionBias * 0.6 +
        tightnessBias * 0.9 +
        delta("aggressiveThreshold"),
      0.08,
      0.95,
    ),
    passiveThreshold: withinPersona(
      "passiveThreshold",
      style.passiveThreshold -
        aggressionBias * 0.25 +
        tightnessBias * 0.7 +
        delta("passiveThreshold"),
      0.05,
      0.9,
    ),
    aggressionChance: withinPersona(
      "aggressionChance",
      style.aggressionChance +
        aggressionBias * 1.4 -
        tightnessBias * 0.45 +
        delta("aggressionChance"),
      0.02,
      0.98,
    ),
    continueChance: withinPersona(
      "continueChance",
      style.continueChance +
        aggressionBias * 0.3 -
        tightnessBias * 0.95 +
        delta("continueChance"),
      0.05,
      0.98,
    ),
    bluffThreshold: withinPersona(
      "bluffThreshold",
      style.bluffThreshold -
        bluffBias * 0.8 +
        tightnessBias * 0.25 +
        delta("bluffThreshold"),
      0,
      0.75,
    ),
    bluffChance: withinPersona(
      "bluffChance",
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

  return {
    handsObserved:
      previous.handsObserved + (opponentActions.length > 0 ? 1 : 0),
    vpipHands: previous.vpipHands + (voluntary ? 1 : 0),
    pfrHands: previous.pfrHands + (raised ? 1 : 0),
    aggressiveActions: previous.aggressiveActions + aggressiveActions,
    totalActions: previous.totalActions + opponentActions.length,
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

  const decisions = [...game.actionLog]
    .reverse()
    .filter(
      (entry) => entry.playerId === playerId && entry.aiDecision !== undefined,
    );
  decisions.forEach((entry, index) => {
      const decision = entry.aiDecision!;
      const stepsFromOutcome = decisions.length - index - 1;
      const temporalCredit = 0.7 + 0.3 * 0.86 ** stepsFromOutcome;
      const reward =
        rewardForDecision(
          decision.actionKind,
          decision.strengthBucket,
          signedOutcome,
          didWin,
        ) *
        actionLearningWeight(style, decision.actionKind) *
        temporalCredit *
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
    ...biases,
    humanRead,
    opponentReads,
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
