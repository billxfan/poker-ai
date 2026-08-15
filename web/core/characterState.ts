import type { PresentationEvent } from "./presentation.ts";
import type { TableInteractionKind } from "./dialogueCatalogs.ts";

export type PersonaEmotion =
  | "neutral"
  | "confident"
  | "excited"
  | "uneasy"
  | "irritated";

export type PersonaMonologueTopic = "running-hot" | "rough-run" | null;

export type PersonaState = {
  emotion: PersonaEmotion;
  /** Short-lived activation used by presentation pacing, never by poker policy. */
  arousal: number;
  /** Public result streak, bounded so a character never becomes permanently tilted. */
  momentum: number;
  monologueTopic: PersonaMonologueTopic;
  topicHandsLeft: number;
  lastNet: number;
};

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function defaultPersonaState(): PersonaState {
  return {
    emotion: "neutral",
    arousal: 0,
    momentum: 0,
    monologueTopic: null,
    topicHandsLeft: 0,
    lastNet: 0,
  };
}

/**
 * Applies a visible table gesture to a character's social presentation only.
 * It has no connection to private cards or the decision policy.
 */
export function reactToTableInteraction(
  current: PersonaState,
  kind: TableInteractionKind,
): PersonaState {
  if (kind === "flower") {
    return {
      ...current,
      emotion: "confident",
      arousal: clamp(current.arousal + 0.1),
    };
  }

  const arousalDelta = kind === "slipper" ? 0.32 : 0.24;
  return {
    ...current,
    emotion: "irritated",
    arousal: clamp(current.arousal + arousalDelta),
    monologueTopic: "rough-run",
    topicHandsLeft: Math.max(1, current.topicHandsLeft),
  };
}

function emotionAfterCooling(state: PersonaState): PersonaEmotion {
  if (state.arousal > 0.34) return state.emotion;
  if (state.momentum >= 2) return "confident";
  if (state.momentum <= -2) return "uneasy";
  return "neutral";
}

/**
 * Advances a character from public table events only. This intentionally has
 * no access to cards, the deck, or an AI decision trace.
 */
export function advancePersonaState(
  current: PersonaState,
  event: PresentationEvent,
  seatId: number,
  bigBlind = 20,
): PersonaState {
  if (event.kind === "deal") {
    const topicHandsLeft = Math.max(0, current.topicHandsLeft - 1);
    const cooled = {
      ...current,
      arousal: clamp(current.arousal * 0.58),
      topicHandsLeft,
      monologueTopic:
        topicHandsLeft > 0 ? current.monologueTopic : null,
    };
    return { ...cooled, emotion: emotionAfterCooling(cooled) };
  }

  if (event.kind === "action" && event.seatId === seatId) {
    const arousalDelta =
      event.action === "all-in"
        ? 0.34
        : event.action === "raise"
          ? 0.16
          : event.action === "fold"
            ? -0.1
            : 0.04;
    const arousal = clamp(current.arousal + arousalDelta);
    const emotion =
      event.action === "all-in" && current.momentum >= 0
        ? "excited"
        : event.action === "all-in"
          ? "uneasy"
          : current.emotion;
    return { ...current, arousal, emotion };
  }

  if (event.kind !== "result") return current;
  const net = event.netBySeat[seatId] ?? 0;
  if (net === 0) {
    return {
      ...current,
      arousal: clamp(current.arousal * 0.72),
      emotion: emotionAfterCooling({
        ...current,
        arousal: clamp(current.arousal * 0.72),
      }),
      lastNet: 0,
    };
  }

  const sizeInBlinds = Math.abs(net) / Math.max(1, bigBlind);
  const direction = net > 0 ? 1 : -1;
  const streakStep = sizeInBlinds >= 8 ? 2 : 1;
  const continuedStreak = Math.sign(current.momentum) === direction;
  const momentum = Math.max(
    -3,
    Math.min(3, (continuedStreak ? current.momentum : 0) + direction * streakStep),
  );
  const isLarge = sizeInBlinds >= 8;

  return {
    emotion:
      net > 0
        ? isLarge
          ? "excited"
          : "confident"
        : isLarge || momentum <= -2
          ? "irritated"
          : "uneasy",
    arousal: clamp(0.34 + sizeInBlinds / 20),
    momentum,
    monologueTopic:
      net > 0 && (isLarge || momentum >= 2)
        ? "running-hot"
        : net < 0 && (isLarge || momentum <= -2)
          ? "rough-run"
          : current.monologueTopic,
    topicHandsLeft:
      isLarge || Math.abs(momentum) >= 2
        ? 3
        : Math.max(0, current.topicHandsLeft),
    lastNet: net,
  };
}
