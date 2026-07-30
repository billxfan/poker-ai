import type { GameState } from "./types.ts";
import { aiStyleForPlayerId } from "./aiProfiles.ts";

const STORAGE_KEY = "poker-ai-web/session";
const VERSION = 1;

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

export function loadSession(): GameState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as Snapshot;
    if (snapshot.version !== VERSION || !isPlausibleState(snapshot.game)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return {
      ...snapshot.game,
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
