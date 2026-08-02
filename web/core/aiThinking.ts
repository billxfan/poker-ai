import { aiStyleForPlayerId } from "./aiProfiles.ts";
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
import { buildBotObservation } from "./observation.ts";
import type {
  AIArchetype,
  AILearningState,
  AIStyle,
  BotObservation,
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
  observation: BotObservation,
  recentSteps: readonly string[],
  random: () => number,
): string | null {
  const latest = observation.actionLog.find(
    (entry) =>
      entry.street === observation.street &&
      entry.playerId !== observation.playerId &&
      !entry.isBlind,
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

function tablePressure(observation: BotObservation): number {
  const legal = observation.legalActions;
  const player = observation.self;
  const pricePressure =
    legal.toCall / Math.max(1, observation.pot + legal.toCall);
  const stackPressure = legal.toCall / Math.max(1, player.chips);
  const raises = observation.actionLog.filter(
    (entry) =>
      entry.street === observation.street &&
      !entry.isBlind &&
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
      streetPressure[observation.street],
  );
}

function chooseThinkingMode(
  observation: BotObservation,
  style: AIStyle,
  archetype: AIArchetype,
  pressure: number,
  random: () => number,
): AIThinkingMode {
  const legal = observation.legalActions;
  const rhythm = THINKING_RHYTHMS[archetype];
  const tankChance = clamp(
    style.tankChance +
      pressure * 0.24 +
      (observation.street === "river" ? 0.06 : 0),
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
  observation: BotObservation,
  style: AIStyle,
  mode: AIThinkingMode,
  random: () => number,
  learning?: AILearningState,
  recentSteps: readonly string[] = [],
): string[] {
  const player = observation.self;
  const archetype = style.key;
  const legal = observation.legalActions;
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
    observation,
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
    STREET_OPENERS[observation.street],
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
        ? 420 + random() * 300
        : mode === "tank"
          ? finalStep
            ? 700 + random() * 500
            : 900 + random() * 850
          : finalStep
            ? 560 + random() * 400
            : 700 + random() * 650;
    const tankBonus =
      index === tankIndex ? 900 + random() * (1100 + pressure * 900) : 0;
    const visibleMinimum =
      mode === "snap"
        ? 420 + random() * 100
        : mode === "tank"
          ? 520
          : 420;
    return Math.round(
      Math.max(
        visibleMinimum,
        Math.min(
          2200,
          baseline * pace * (1 + pressure * (mode === "snap" ? 0.08 : 0.3)) +
            tankBonus,
        ),
      ),
    );
  });

  const total = durations.reduce((sum, value) => sum + value, 0);
  const baseCeiling =
    mode === "tank" ? 3900 : mode === "measured" ? 1800 : 720;
  const pressureStretch =
    mode === "tank" ? 0.18 : mode === "measured" ? 0.12 : 0.05;
  const ceiling = Math.round(baseCeiling * (1 + pressure * pressureStretch));
  if (total <= ceiling) return durations;
  const scale = ceiling / total;
  return durations.map((duration) =>
    Math.max(
      mode === "snap" ? 420 : mode === "tank" ? 500 : 390,
      Math.round(duration * scale),
    ),
  );
}

/**
 * Presentation-only behavior sequence. Its input is the same allowlisted
 * observation boundary as the policy, so presentation code cannot inspect an
 * opponent's cards, the deck, or a private decision trace.
 */
export function createAIThinkingPlanFromObservation(
  observation: BotObservation,
  style: AIStyle,
  random: () => number,
  learning?: AILearningState,
  recentSteps: readonly string[] = [],
): AIThinkingPlan {
  const archetype = style.key;
  const pressure = tablePressure(observation);
  const mode = chooseThinkingMode(
    observation,
    style,
    archetype,
    pressure,
    random,
  );
  const rawSteps = makeSteps(
    observation,
    style,
    mode,
    random,
    learning,
    recentSteps,
  );
  // One or two physical tells read as human; a seven-line inner monologue reads
  // as a blocking loading screen. High-pressure spots may keep a third beat.
  const steps = rawSteps.slice(
    0,
    mode === "tank" ? 3 : mode === "measured" ? 2 : 1,
  );
  const stepDurations = makeStepDurations(
    steps,
    mode,
    style.thinkingPace,
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

/** Compatibility boundary for existing full-state callers. */
export function createAIThinkingPlan(
  state: GameState,
  playerId: number,
  random: () => number,
  learning?: AILearningState,
  recentSteps: readonly string[] = [],
): AIThinkingPlan {
  const observation = buildBotObservation(state, playerId);
  const style =
    state.players.find((player) => player.id === playerId)?.style ??
    aiStyleForPlayerId(playerId);
  return createAIThinkingPlanFromObservation(
    observation,
    style,
    random,
    learning,
    recentSteps,
  );
}
