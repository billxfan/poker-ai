import { legalActions } from "./engine.ts";
import type {
  BotObservation,
  BotObservedAction,
  BotObservedPlayer,
  GameState,
  Player,
} from "./types.ts";

function observePlayer(player: Player): BotObservedPlayer {
  return {
    id: player.id,
    name: player.name,
    isHuman: player.isHuman,
    position: player.position,
    chips: player.chips,
    status: player.status,
    bet: player.bet,
    totalContribution: player.totalContribution,
    lastActedBet: player.lastActedBet,
    lastAction: player.lastAction,
  };
}

function observeAction(entry: GameState["actionLog"][number]): BotObservedAction {
  return {
    id: entry.id,
    playerId: entry.playerId,
    playerName: entry.playerName,
    street: entry.street,
    action: entry.action,
    amount: entry.amount,
    label: entry.label,
    isBlind: entry.label.includes("盲"),
  };
}

/**
 * Constructs the complete and only supported policy input from an omniscient
 * engine state. Every field is copied through an explicit allowlist so adding
 * hidden state to GameState cannot silently expose it to a bot.
 */
export function buildBotObservation(
  state: GameState,
  playerId: number,
): BotObservation {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error(`Unknown bot player id: ${playerId}`);

  return {
    playerId,
    self: {
      ...observePlayer(player),
      holeCards: player.holeCards.map((card) => ({ ...card })),
    },
    opponents: state.players
      .filter((candidate) => candidate.id !== playerId)
      .map(observePlayer),
    communityCards: state.communityCards.map((card) => ({ ...card })),
    street: state.street,
    phase: state.phase,
    pot: state.pot,
    currentBet: state.currentBet,
    minimumRaiseIncrement: state.minimumRaiseIncrement,
    currentActor: state.currentActor,
    dealerId: state.dealerId,
    actedSinceRaise: [...state.actedSinceRaise],
    handNumber: state.handNumber,
    actionSequence: state.actionSequence,
    actionLog: state.actionLog.map(observeAction),
    legalActions: { ...legalActions(state, playerId) },
  };
}
