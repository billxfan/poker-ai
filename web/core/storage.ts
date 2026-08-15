import type { GameState } from "./types.ts";
import { aiStyleForPlayerId } from "./aiProfiles.ts";
import { handIdForSession } from "./engine.ts";

const STORAGE_KEY = "poker-ai-web/session";
const VERSION = 2;
const SUPPORTED_VERSIONS = new Set([1, VERSION]);

type Snapshot = {
  version: number;
  savedAt: string;
  game: GameState;
};

function isPlausibleState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<GameState>;
  return (
    Array.isArray(state.players) &&
    state.players.length === 6 &&
    typeof state.handNumber === "number" &&
    typeof state.pot === "number" &&
    Array.isArray(state.communityCards) &&
    Array.isArray(state.deck)
  );
}

function legacySessionId(game: GameState): string {
  const fingerprint = JSON.stringify({
    handNumber: game.handNumber,
    dealerId: game.dealerId,
    players: game.players.map((player) => ({
      id: player.id,
      chips: player.chips,
      holeCards: player.holeCards,
    })),
    communityCards: game.communityCards,
    deck: game.deck,
    actionSequence: game.actionSequence,
  });
  let hash = 0x811c9dc5;
  for (let index = 0; index < fingerprint.length; index += 1) {
    hash ^= fingerprint.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `legacy-session-${(hash >>> 0).toString(36)}`;
}

export function loadSession(): GameState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as Snapshot;
    if (!SUPPORTED_VERSIONS.has(snapshot.version) || !isPlausibleState(snapshot.game)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const sessionId =
      typeof snapshot.game.sessionId === "string" && snapshot.game.sessionId
        ? snapshot.game.sessionId
        : legacySessionId(snapshot.game);
    const handId =
      typeof snapshot.game.handId === "string" && snapshot.game.handId
        ? snapshot.game.handId
        : handIdForSession(sessionId, snapshot.game.handNumber);
    return {
      ...snapshot.game,
      sessionId,
      handId,
      phase:
        (snapshot.game.phase as string) === "table-complete"
          ? "result"
          : snapshot.game.phase,
      players: snapshot.game.players.map((player) => ({
        ...player,
        style: player.isHuman ? undefined : aiStyleForPlayerId(player.id),
      })),
      rebuyPlayerIds: Array.isArray(snapshot.game.rebuyPlayerIds)
        ? snapshot.game.rebuyPlayerIds
        : [],
    };
  } catch {
    return null;
  }
}

export function saveSession(game: GameState): boolean {
  try {
    const snapshot: Snapshot = {
      version: VERSION,
      savedAt: new Date().toISOString(),
      game,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function clearSession() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // The in-memory reset still succeeds.
  }
}

export function hasSavedSession(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}
