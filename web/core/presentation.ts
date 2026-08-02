import type {
  ActionType,
  GamePhase,
  GameState,
  PlayerStatus,
  Street,
} from "./types.ts";

export type PublicPresentationPlayer = {
  id: number;
  name: string;
  isHuman: boolean;
  chips: number;
  status: PlayerStatus;
  bet: number;
  totalContribution: number;
};

export type PublicPresentationAction = {
  id: string;
  playerId: number;
  playerName: string;
  street: Street;
  action: ActionType;
  amount: number;
  label: string;
};

export type PublicPresentationResult = {
  winnerIds: number[];
  payouts: Record<number, number>;
  humanDelta: number;
  showdown: boolean;
};

export type PublicPresentationSnapshot = {
  handId: string;
  handNumber: number;
  actionSequence: number;
  street: Street;
  phase: GamePhase;
  communityCardCount: number;
  currentActor: number | null;
  currentBet: number;
  pot: number;
  players: PublicPresentationPlayer[];
  latestAction: PublicPresentationAction | null;
  result: PublicPresentationResult | null;
};

export type PresentationEvent =
  | {
      id: string;
      kind: "deal";
      handId: string;
      cardCount: number;
    }
  | {
      id: string;
      kind: "action";
      handId: string;
      seatId: number;
      action: ActionType;
      amount: number;
      street: Street;
    }
  | {
      id: string;
      kind: "street";
      handId: string;
      street: Exclude<Street, "preflop">;
      cardCount: number;
    }
  | {
      id: string;
      kind: "your-turn";
      handId: string;
      seatId: 0;
    }
  | {
      id: string;
      kind: "result";
      handId: string;
      winnerIds: number[];
      netBySeat: Record<number, number>;
      showdown: boolean;
      humanDelta: number;
    };

export function buildPublicPresentationSnapshot(
  game: GameState,
): PublicPresentationSnapshot {
  const latest = game.actionLog.find((entry) => !entry.label.includes("盲"));
  return {
    handId: game.handId,
    handNumber: game.handNumber,
    actionSequence: game.actionSequence,
    street: game.street,
    phase: game.phase,
    communityCardCount: game.communityCards.length,
    currentActor: game.currentActor,
    currentBet: game.currentBet,
    pot: game.pot,
    players: game.players.map((player) => ({
      id: player.id,
      name: player.name,
      isHuman: player.isHuman,
      chips: player.chips,
      status: player.status,
      bet: player.bet,
      totalContribution: player.totalContribution,
    })),
    latestAction: latest
      ? {
          id: latest.id,
          playerId: latest.playerId,
          playerName: latest.playerName,
          street: latest.street,
          action: latest.action,
          amount: latest.amount,
          label: latest.label,
        }
      : null,
    result: game.result
      ? {
          winnerIds: [...game.result.winnerIds],
          payouts: { ...game.result.payouts },
          humanDelta: game.result.humanDelta,
          showdown: game.result.showdown,
        }
      : null,
  };
}

export function derivePresentationEvents(
  previous: PublicPresentationSnapshot | null,
  next: PublicPresentationSnapshot,
): PresentationEvent[] {
  if (!previous) return [];
  const events: PresentationEvent[] = [];

  if (previous.handId !== next.handId) {
    events.push({
      id: `${next.handId}:deal`,
      kind: "deal",
      handId: next.handId,
      cardCount: next.players.filter((player) => player.status !== "out").length * 2,
    });
  }

  if (
    next.latestAction &&
    next.latestAction.id !== previous.latestAction?.id &&
    next.actionSequence > previous.actionSequence
  ) {
    events.push({
      id: next.latestAction.id,
      kind: "action",
      handId: next.handId,
      seatId: next.latestAction.playerId,
      action: next.latestAction.action,
      amount: next.latestAction.amount,
      street: next.latestAction.street,
    });
  }

  if (
    next.handId === previous.handId &&
    next.street !== previous.street &&
    next.street !== "preflop"
  ) {
    events.push({
      id: `${next.handId}:street:${next.street}`,
      kind: "street",
      handId: next.handId,
      street: next.street,
      cardCount: Math.max(1, next.communityCardCount - previous.communityCardCount),
    });
  }

  if (
    next.phase === "playing" &&
    next.currentActor === 0 &&
    previous.currentActor !== 0
  ) {
    events.push({
      id: `${next.handId}:turn:${next.actionSequence}`,
      kind: "your-turn",
      handId: next.handId,
      seatId: 0,
    });
  }

  if (previous.phase === "playing" && next.phase !== "playing" && next.result) {
    const netBySeat = Object.fromEntries(
      next.players.map((player) => [
        player.id,
        (next.result?.payouts[player.id] ?? 0) - player.totalContribution,
      ]),
    );
    events.push({
      id: `${next.handId}:result`,
      kind: "result",
      handId: next.handId,
      winnerIds: [...next.result.winnerIds],
      netBySeat,
      showdown: next.result.showdown,
      humanDelta: next.result.humanDelta,
    });
  }

  return events;
}
