import { legalActions } from "./engine.ts";
import {
  EARLY_POSITION_THOUGHTS,
  ENDINGS,
  HESITATIONS,
  LATE_POSITION_THOUGHTS,
  PUBLIC_FREE_THOUGHTS,
  PUBLIC_PRICE_THOUGHTS,
  SNAP_TELLS,
  STREET_OPENERS,
  STYLE_THOUGHTS,
  TABLE_THOUGHTS,
  THINKING_RHYTHMS,
} from "./aiThinkingPhrases.ts";
import type {
  AIArchetype,
  AILearningState,
  GameState,
  Street,
} from "./types.ts";

export type AIThinkingMode = "snap" | "measured" | "tank";

export type AIThinkingPlan = {
  steps: string[];
  stepDurations: number[];
  totalMs: number;
  mode: AIThinkingMode;
};

function sample<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}

function withoutRecent(
  items: readonly string[],
  recentSteps: readonly string[],
): string[] {
  const unique = [...new Set(items)];
  const recent = new Set(recentSteps);
  const fresh = unique.filter((item) => !recent.has(item));
  return fresh.length ? fresh : unique;
}

function sampleAvoiding(
  items: readonly string[],
  recentSteps: readonly string[],
  random: () => number,
): string {
  return sample(withoutRecent(items, recentSteps), random);
}

function sampleDistinct(
  items: readonly string[],
  count: number,
  random: () => number,
  recentSteps: readonly string[] = [],
): string[] {
  const pool = withoutRecent(items, recentSteps);
  const selected: string[] = [];
  while (pool.length && selected.length < count) {
    const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
    selected.push(pool.splice(index, 1)[0]);
  }
  return selected;
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function learnedOpponentThought(
  learning: AILearningState | undefined,
  recentSteps: readonly string[],
  random: () => number,
): string | null {
  const read = learning?.humanRead;
  if (!read || read.handsObserved < 5) return null;
  const vpip = read.vpipHands / Math.max(1, read.handsObserved);
  const aggression = read.aggressiveActions / Math.max(1, read.totalActions);
  const foldRate =
    read.foldsToAggression / Math.max(1, read.pressureOpportunities);
  const variants =
    foldRate > 0.55
      ? [
          "他最近遇到压力常会退",
          "前几手加压后，他放弃得很快",
          "他面对持续下注时收得比较多",
        ]
      : aggression > 0.4
        ? [
            "他最近主动加压得很多",
            "前几手他的进攻频率不低",
            "他最近很愿意把底池做大",
          ]
        : vpip > 0.58
          ? [
              "他最近参与的底池很宽",
              "他前几手入池得相当积极",
              "最近不少起手牌他都会继续",
            ]
          : vpip < 0.28
            ? [
                "他最近的范围收得很紧",
                "前几手他很少主动入池",
                "他最近只挑少数底池参与",
              ]
            : [
                "他最近的行动比较均衡",
                "前几手还看不出明显偏向",
                "他最近在快慢节奏之间切换",
              ];
  return sampleAvoiding(variants, recentSteps, random);
}

function recentActionReaction(
  state: GameState,
  playerId: number,
  recentSteps: readonly string[],
  random: () => number,
): string | null {
  const latest = state.actionLog.find(
    (entry) =>
      entry.street === state.street &&
      entry.playerId !== playerId &&
      !entry.label.includes("盲"),
  );
  if (!latest) return null;
  const name = latest.playerName;
  if (latest.action === "all-in") {
    return sampleAvoiding(
      [
        `看了眼${name}推出的全部筹码`,
        `${name}全下后，桌面的节奏突然变了`,
        `重新数了一遍${name}的全下金额`,
        `视线跟着${name}推到桌中的筹码`,
      ],
      recentSteps,
      random,
    );
  }
  if (latest.action === "raise") {
    return sampleAvoiding(
      [
        `重新看了眼${name}的加注`,
        `${name}加注后，需要重算一次价格`,
        `留意到${name}把下注尺度抬高了`,
        `先判断${name}这次加速意味着什么`,
      ],
      recentSteps,
      random,
    );
  }
  if (latest.action === "call") {
    return sampleAvoiding(
      [
        `留意到${name}也跟了进来`,
        `${name}跟注后，底池又多了一层`,
        `看着${name}把跟注筹码推入底池`,
        `${name}继续留下，人数不能忽略`,
      ],
      recentSteps,
      random,
    );
  }
  if (latest.action === "check") {
    return sampleAvoiding(
      [
        `等${name}过牌后想了想`,
        `${name}让过行动，节奏慢了下来`,
        `留意到${name}没有主动下注`,
        `${name}过牌后，重新考虑是否拿回主动`,
      ],
      recentSteps,
      random,
    );
  }
  return null;
}

function tablePressure(state: GameState, playerId: number): number {
  const legal = legalActions(state, playerId);
  const player = state.players[playerId];
  const pricePressure = legal.toCall / Math.max(1, state.pot + legal.toCall);
  const stackPressure = legal.toCall / Math.max(1, player.chips);
  const raises = state.actionLog.filter(
    (entry) =>
      entry.street === state.street &&
      !entry.label.includes("盲") &&
      (entry.action === "raise" || entry.action === "all-in"),
  ).length;
  const streetPressure: Record<Street, number> = {
    preflop: 0,
    flop: 0.05,
    turn: 0.12,
    river: 0.2,
  };
  return clamp(
    pricePressure * 0.85 +
      stackPressure * 0.45 +
      Math.min(0.24, raises * 0.1) +
      streetPressure[state.street],
  );
}

function chooseThinkingMode(
  state: GameState,
  playerId: number,
  archetype: AIArchetype,
  pressure: number,
  random: () => number,
): AIThinkingMode {
  const style = state.players[playerId].style;
  const legal = legalActions(state, playerId);
  const rhythm = THINKING_RHYTHMS[archetype];
  const tankChance = clamp(
    (style?.tankChance ?? 0.16) +
      pressure * 0.24 +
      (state.street === "river" ? 0.06 : 0),
    0.04,
    0.46,
  );
  const snapChance =
    rhythm.snapChance *
      (pressure < 0.24 ? 1 : pressure < 0.42 ? 0.42 : 0.08) +
    (legal.canCheck && pressure < 0.18 ? 0.06 : 0);
  const roll = random();
  if (roll < tankChance) return "tank";
  if (roll < tankChance + snapChance) return "snap";
  return "measured";
}

function sessionThought(
  learning: AILearningState | undefined,
  recentSteps: readonly string[],
  random: () => number,
): string | null {
  if (!learning || learning.handsPlayed < 4) return null;
  const perHand = learning.totalProfit / Math.max(1, learning.handsPlayed);
  if (perHand > 24) {
    return sampleAvoiding(
      [
        "最近打得顺，也别着急",
        "前几手有收获，节奏不能飘",
        "筹码增加了，仍按计划行动",
      ],
      recentSteps,
      random,
    );
  }
  if (perHand < -24) {
    return sampleAvoiding(
      [
        "前几手不顺，先稳住",
        "最近丢了些筹码，不能急着追回",
        "上一段节奏不好，这手重新开始",
      ],
      recentSteps,
      random,
    );
  }
  return null;
}

function makeSteps(
  state: GameState,
  playerId: number,
  mode: AIThinkingMode,
  random: () => number,
  learning?: AILearningState,
  recentSteps: readonly string[] = [],
): string[] {
  const player = state.players[playerId];
  const archetype = player.style?.key ?? "balanced";
  const legal = legalActions(state, playerId);
  const mannerisms = THINKING_RHYTHMS[archetype].mannerisms;

  if (mode === "snap") {
    const count = random() < 0.68 ? 1 : 2;
    return sampleDistinct(
      [...SNAP_TELLS, ...mannerisms],
      count,
      random,
      recentSteps,
    );
  }

  const count =
    mode === "tank"
      ? 5 + Math.floor(random() * 3)
      : 3 + Math.floor(random() * 3);
  const learnedThought = learnedOpponentThought(learning, recentSteps, random);
  const reaction = recentActionReaction(
    state,
    playerId,
    recentSteps,
    random,
  );
  const mood = sessionThought(learning, recentSteps, random);
  const middlePool = [
    ...STYLE_THOUGHTS[archetype],
    ...(legal.toCall > 0 ? PUBLIC_PRICE_THOUGHTS : PUBLIC_FREE_THOUGHTS),
    ...TABLE_THOUGHTS,
    ...mannerisms,
    ...(mode === "tank" ? HESITATIONS : []),
    ...(learnedThought ? [learnedThought] : []),
    ...(reaction ? [reaction] : []),
    ...(mood ? [mood] : []),
    ...(player.position.includes("BTN") || player.position === "CO"
      ? LATE_POSITION_THOUGHTS
      : EARLY_POSITION_THOUGHTS),
  ];
  const middle = sampleDistinct(middlePool, count - 2, random, recentSteps);
  if (
    mode === "tank" &&
    !middle.some((step) => HESITATIONS.some((hesitation) => hesitation === step))
  ) {
    middle[Math.max(0, middle.length - 1)] = sampleAvoiding(
      HESITATIONS,
      [...recentSteps, ...middle],
      random,
    );
  }
  const opener = sampleAvoiding(
    STREET_OPENERS[state.street],
    [...recentSteps, ...middle],
    random,
  );
  const ending = sampleAvoiding(
    ENDINGS,
    [...recentSteps, opener, ...middle],
    random,
  );
  return [
    opener,
    ...middle,
    ending,
  ];
}

function makeStepDurations(
  steps: readonly string[],
  mode: AIThinkingMode,
  pace: number,
  pressure: number,
  random: () => number,
): number[] {
  const tankIndex =
    mode === "tank" && steps.length > 2
      ? 1 + Math.floor(random() * (steps.length - 2))
      : -1;
  const durations = steps.map((_, index) => {
    const finalStep = index === steps.length - 1;
    const baseline =
      mode === "snap"
        ? 220 + random() * 250
        : mode === "tank"
          ? finalStep
            ? 380 + random() * 420
            : 540 + random() * 690
          : finalStep
            ? 300 + random() * 330
            : 390 + random() * 510;
    const tankBonus =
      index === tankIndex ? 620 + random() * (760 + pressure * 620) : 0;
    const visibleMinimum =
      mode === "snap" ? 320 + random() * 120 : 260;
    return Math.round(
      Math.max(
        visibleMinimum,
        Math.min(
          2300,
          baseline * pace * (1 + pressure * (mode === "snap" ? 0.08 : 0.22)) +
            tankBonus,
        ),
      ),
    );
  });

  const total = durations.reduce((sum, value) => sum + value, 0);
  const ceiling = mode === "tank" ? 7600 : mode === "measured" ? 4800 : 1050;
  if (total <= ceiling) return durations;
  const scale = ceiling / total;
  return durations.map((duration) =>
    Math.max(mode === "snap" ? 320 : 220, Math.round(duration * scale)),
  );
}

/**
 * Presentation-only behavior sequence. It uses public table state and learned
 * public action tendencies, never private cards or the already chosen action.
 * The cadence intentionally mixes snap actions, normal decisions, and rare
 * tanks so an opponent does not behave like a fixed loading timer.
 */
export function createAIThinkingPlan(
  state: GameState,
  playerId: number,
  random: () => number = Math.random,
  learning?: AILearningState,
  recentSteps: readonly string[] = [],
): AIThinkingPlan {
  const player = state.players[playerId];
  const archetype = player.style?.key ?? "balanced";
  const pressure = tablePressure(state, playerId);
  const mode = chooseThinkingMode(
    state,
    playerId,
    archetype,
    pressure,
    random,
  );
  const steps = makeSteps(
    state,
    playerId,
    mode,
    random,
    learning,
    recentSteps,
  );
  const stepDurations = makeStepDurations(
    steps,
    mode,
    player.style?.thinkingPace ?? 1,
    pressure,
    random,
  );

  return {
    steps,
    stepDurations,
    totalMs: stepDurations.reduce((sum, value) => sum + value, 0),
    mode,
  };
}
