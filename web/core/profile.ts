import { evaluateBest } from "./evaluator.ts";
import {
  defaultAILearningState,
  normalizeAILearningState,
  updateAILearningAfterHand,
} from "./aiLearning.ts";
import { aiStyleForPlayerId } from "./aiProfiles.ts";
import type {
  ActionLogEntry,
  AILearningState,
  Card,
  GameState,
} from "./types.ts";

const PROFILE_KEY = "poker-ai-web/profile";
const PROFILE_VERSION = 1;
export const DAILY_FREE_CHIPS = 2000;
export const DAILY_SIGN_IN_BONUS = 1000;

export type HandHistoryRecord = {
  id: string;
  handNumber: number;
  savedAt: string;
  title: string;
  detail: string;
  humanDelta: number;
  showdown: boolean;
  communityCards: Card[];
  holeCards: Card[];
  actions: ActionLogEntry[];
  participants: HandHistoryParticipant[];
};

export type HandHistoryParticipant = {
  playerId: number;
  name: string;
  isHuman: boolean;
  contribution: number;
  payout: number;
  net: number;
  holeCards: Card[];
  handName: string | null;
  isWinner: boolean;
  status?: string;
};

export type AIProfileStats = {
  playerId: number;
  name: string;
  avatar: string;
  styleName: string;
  handsPlayed: number;
  vpipHands: number;
  pfrHands: number;
  threeBetHands: number;
  aggressiveActions: number;
  callActions: number;
  totalProfit: number;
  learning: AILearningState;
};

export type LocalProfile = {
  version: number;
  chips: number;
  lastDailyGrant: string | null;
  lastSignIn: string | null;
  history: HandHistoryRecord[];
  aiProfiles: Record<number, AIProfileStats>;
};

function localDay(now = new Date()): string {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultProfile(now = new Date()): LocalProfile {
  return {
    version: PROFILE_VERSION,
    chips: 2000,
    lastDailyGrant: now.getHours() >= 10 ? localDay(now) : null,
    lastSignIn: null,
    history: [],
    aiProfiles: {},
  };
}

function isPlausibleProfile(value: unknown): value is LocalProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<LocalProfile>;
  return (
    profile.version === PROFILE_VERSION &&
    typeof profile.chips === "number" &&
    Array.isArray(profile.history) &&
    !!profile.aiProfiles &&
    typeof profile.aiProfiles === "object"
  );
}

export function loadProfile(now = new Date()): LocalProfile {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return defaultProfile(now);
    const parsed = JSON.parse(raw) as unknown;
    if (!isPlausibleProfile(parsed)) return defaultProfile(now);
    const aiProfiles = Object.fromEntries(
      Object.entries(parsed.aiProfiles).map(([key, stored]) => {
        const playerId = Number(key);
        return [
          playerId,
          {
            ...stored,
            learning: normalizeAILearningState(stored.learning),
          },
        ];
      }),
    );
    return {
      ...parsed,
      history: parsed.history.map((record) => ({
        ...record,
        actions: Array.isArray(record.actions) ? record.actions : [],
        participants: Array.isArray(record.participants)
          ? record.participants
          : [],
      })),
      aiProfiles,
    };
  } catch {
    return defaultProfile(now);
  }
}

export function saveProfile(profile: LocalProfile): boolean {
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

export function refreshDailyBenefit(
  profile: LocalProfile,
  now = new Date(),
): LocalProfile {
  const today = localDay(now);
  if (now.getHours() < 10 || profile.lastDailyGrant === today) return profile;
  return {
    ...profile,
    chips: profile.chips + DAILY_FREE_CHIPS,
    lastDailyGrant: today,
  };
}

export function hasDailyBenefit(profile: LocalProfile, now = new Date()): boolean {
  return profile.lastDailyGrant === localDay(now);
}

export function hasSignedIn(profile: LocalProfile, now = new Date()): boolean {
  return profile.lastSignIn === localDay(now);
}

export function claimDailySignIn(
  profile: LocalProfile,
  now = new Date(),
): LocalProfile {
  if (hasSignedIn(profile, now)) return profile;
  return {
    ...profile,
    chips: profile.chips + DAILY_SIGN_IN_BONUS,
    lastSignIn: localDay(now),
  };
}

function emptyAIProfile(game: GameState, playerId: number): AIProfileStats {
  const player = game.players[playerId];
  return {
    playerId,
    name: player.name,
    avatar: player.avatar,
    styleName: player.style?.label ?? "自适应",
    handsPlayed: 0,
    vpipHands: 0,
    pfrHands: 0,
    threeBetHands: 0,
    aggressiveActions: 0,
    callActions: 0,
    totalProfit: 0,
    learning: defaultAILearningState(),
  };
}

export function recordCompletedHand(
  profile: LocalProfile,
  game: GameState,
): LocalProfile {
  if (!game.result) return profile;
  const recordId = `${game.handNumber}-${game.actionSequence}`;
  if (profile.history.some((record) => record.id === recordId)) return profile;

  const preflopRaises = game.actionLog.filter(
    (entry) =>
      entry.street === "preflop" &&
      (entry.action === "raise" || entry.action === "all-in") &&
      !entry.label.includes("盲"),
  );
  const aiProfiles = { ...profile.aiProfiles };

  game.players
    .filter((player) => !player.isHuman)
    .forEach((player) => {
      const previous = aiProfiles[player.id] ?? emptyAIProfile(game, player.id);
      const actions = game.actionLog.filter(
        (entry) => entry.playerId === player.id && !entry.label.includes("盲"),
      );
      const preflop = actions.filter((entry) => entry.street === "preflop");
      const voluntarilyEntered = preflop.some((entry) =>
        ["call", "raise", "all-in"].includes(entry.action),
      );
      const raisedPreflop = preflop.some((entry) =>
        ["raise", "all-in"].includes(entry.action),
      );
      const threeBet = preflopRaises.some(
        (entry, index) => index > 0 && entry.playerId === player.id,
      );
      const aggressiveActions = actions.filter((entry) =>
        ["raise", "all-in"].includes(entry.action),
      ).length;
      const callActions = actions.filter((entry) => entry.action === "call").length;
      const payout = game.result?.payouts[player.id] ?? 0;

      aiProfiles[player.id] = {
        ...previous,
        handsPlayed: previous.handsPlayed + 1,
        vpipHands: previous.vpipHands + (voluntarilyEntered ? 1 : 0),
        pfrHands: previous.pfrHands + (raisedPreflop ? 1 : 0),
        threeBetHands: previous.threeBetHands + (threeBet ? 1 : 0),
        aggressiveActions: previous.aggressiveActions + aggressiveActions,
        callActions: previous.callActions + callActions,
        totalProfit:
          previous.totalProfit + payout - player.totalContribution,
        learning: updateAILearningAfterHand(
          game,
          player.id,
          player.style ?? aiStyleForPlayerId(player.id),
          previous.learning,
        ),
      };
    });

  const history: HandHistoryRecord = {
    id: recordId,
    handNumber: game.handNumber,
    savedAt: new Date().toISOString(),
    title: game.result.title,
    detail: game.result.detail,
    humanDelta: game.result.humanDelta,
    showdown: game.result.showdown,
    communityCards: game.communityCards,
    holeCards: game.players[0].holeCards,
    actions: [...game.actionLog].reverse(),
    participants: game.players
      .map((player) => {
        const payout = game.result?.payouts[player.id] ?? 0;
        const revealCards =
          player.isHuman ||
          (game.result?.showdown === true &&
            player.status !== "folded" &&
            player.status !== "out");
        const hand =
          revealCards &&
          game.result?.showdown === true &&
          player.status !== "folded"
            ? evaluateBest([...player.holeCards, ...game.communityCards])
            : null;
        return {
          playerId: player.id,
          name: player.name,
          isHuman: player.isHuman,
          contribution: player.totalContribution,
          payout,
          net: payout - player.totalContribution,
          holeCards: revealCards ? [...player.holeCards] : [],
          handName: hand?.categoryName ?? null,
          isWinner: game.result?.winnerIds.includes(player.id) ?? false,
          status: player.status,
        };
      })
      .sort(
        (left, right) =>
          Number(right.isWinner) - Number(left.isWinner) ||
          right.net - left.net,
      ),
  };

  return {
    ...profile,
    chips: game.players[0].chips,
    history: [history, ...profile.history].slice(0, 30),
    aiProfiles,
  };
}

export function resetLearningData(profile: LocalProfile): LocalProfile {
  return {
    ...profile,
    history: [],
    aiProfiles: {},
  };
}

export function syncProfileChips(
  profile: LocalProfile,
  chips: number,
): LocalProfile {
  if (profile.chips === chips) return profile;
  return { ...profile, chips: Math.max(0, chips) };
}
