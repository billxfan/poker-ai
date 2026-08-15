import type { PresentationEvent } from "./presentation.ts";
import type { TableInteractionKind } from "./dialogueCatalogs.ts";
import type { Player } from "./types.ts";

export type AutomatedTableInteraction = {
  sourceId: number;
  targetId: number;
  kind: TableInteractionKind;
};

function stableSeed(value: string): number {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

/**
 * Selects a presentation-only interaction from public settlement data. Losing
 * bots may react to the winner; no cards, deck state, or policy trace is read.
 */
export function automatedInteractionAfterResult(
  event: Extract<PresentationEvent, { kind: "result" }>,
  players: readonly Player[],
): AutomatedTableInteraction | null {
  const seed = stableSeed(`${event.id}:social`);
  const chance =
    Math.abs(event.humanDelta) >= 400 ? 0.5 : event.showdown ? 0.34 : 0.24;
  if ((seed % 10_000) / 10_000 >= chance) return null;
  const losingBots = players.filter(
    (player) => !player.isHuman && (event.netBySeat[player.id] ?? 0) < 0,
  );
  if (!losingBots.length) return null;
  const source = losingBots[seed % losingBots.length];
  const targetId =
    event.winnerIds.find((playerId) => playerId !== source.id) ?? 0;
  const choices: Record<
    NonNullable<Player["style"]>["key"],
    TableInteractionKind[]
  > = {
    "tight-aggressive": ["flower", "egg", "flower", "tomato"],
    "loose-aggressive": ["tomato", "slipper", "egg", "flower"],
    "tight-weak": ["flower", "egg", "flower", "tomato"],
    "loose-weak": ["egg", "tomato", "flower", "slipper"],
    balanced: ["flower", "tomato", "egg", "flower"],
  };
  const kinds = choices[source.style?.key ?? "balanced"];
  return {
    sourceId: source.id,
    targetId,
    kind: kinds[Math.floor(seed / 17) % kinds.length],
  };
}
