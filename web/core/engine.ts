import { cardLabel, shuffledDeck } from "./cards.ts";
import { aiStyleForPlayerId } from "./aiProfiles.ts";
import { compareHands, evaluateBest } from "./evaluator.ts";
import type {
  ActionLogEntry,
  GameState,
  LegalActions,
  Player,
  PlayerAction,
  Street,
} from "./types.ts";

export const SMALL_BLIND = 10;
export const BIG_BLIND = 20;
export const STARTING_CHIPS = 2000;
export const AI_REBUY_CHIPS = STARTING_CHIPS;
const DEFAULT_SIMULATION_SEED = 20260723;
const HUMAN_ID = 0;

export function sessionIdFromSeed(seed: number): string {
  const normalized = Number.isFinite(seed)
    ? Math.trunc(seed)
    : DEFAULT_SIMULATION_SEED;
  const token =
    normalized < 0
      ? `negative-${Math.abs(normalized).toString(36)}`
      : normalized.toString(36);
  return `session-${token}`;
}

export function handIdForSession(
  sessionId: string,
  handNumber: number,
): string {
  return `${sessionId}-hand-${handNumber}`;
}

const PLAYER_BLUEPRINTS = [
  { name: "你", avatar: "你", isHuman: true },
  {
    name: "老 K",
    avatar: "K",
    isHuman: false,
    style: aiStyleForPlayerId(1),
  },
  {
    name: "小马",
    avatar: "M",
    isHuman: false,
    style: aiStyleForPlayerId(2),
  },
  {
    name: "大叔",
    avatar: "D",
    isHuman: false,
    style: aiStyleForPlayerId(3),
  },
  {
    name: "小鱼",
    avatar: "F",
    isHuman: false,
    style: aiStyleForPlayerId(4),
  },
  {
    name: "狐狸",
    avatar: "狐",
    isHuman: false,
    style: aiStyleForPlayerId(5),
  },
] as const;

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

function activeSeatIds(players: Player[]): number[] {
  return players.filter((player) => player.chips > 0).map((player) => player.id);
}

function nextSeat(
  players: Player[],
  fromId: number,
  predicate: (player: Player) => boolean,
): number | null {
  for (let offset = 1; offset <= players.length; offset += 1) {
    const id = (fromId + offset) % players.length;
    if (predicate(players[id])) return id;
  }
  return null;
}

function assignPositions(players: Player[], dealerId: number): Player[] {
  const activeIds = activeSeatIds(players);
  const labelsByPlayerCount: Record<number, string[]> = {
    2: ["BTN/SB", "BB"],
    3: ["BTN", "SB", "BB"],
    4: ["BTN", "SB", "BB", "CO"],
    5: ["BTN", "SB", "BB", "UTG", "CO"],
    6: ["BTN", "SB", "BB", "UTG", "HJ", "CO"],
  };
  const labels = labelsByPlayerCount[activeIds.length] ?? [];
  const dealerOffset = activeIds.indexOf(dealerId);
  const ordered = [
    ...activeIds.slice(dealerOffset),
    ...activeIds.slice(0, dealerOffset),
  ];
  const byId = new Map(ordered.map((id, index) => [id, labels[index] ?? "—"]));

  return players.map((player) => ({
    ...player,
    position: byId.get(player.id) ?? "OUT",
  }));
}

function payChips(state: GameState, playerId: number, amount: number): number {
  const player = state.players[playerId];
  const paid = Math.max(0, Math.min(amount, player.chips));
  player.chips -= paid;
  player.bet += paid;
  player.totalContribution += paid;
  state.pot += paid;
  if (player.chips === 0 && player.status === "active") {
    player.status = "all-in";
  }
  return paid;
}

function actionLabel(action: PlayerAction, paid: number): string {
  switch (action.type) {
    case "fold":
      return "弃牌";
    case "check":
      return "过牌";
    case "call":
      return `跟注 ${paid}`;
    case "raise":
      return `加注至 ${action.amount ?? 0}`;
    case "all-in":
      return `全下 ${paid}`;
  }
}

function appendLog(
  state: GameState,
  playerId: number,
  action: PlayerAction,
  paid: number,
) {
  state.actionSequence += 1;
  const player = state.players[playerId];
  const entry: ActionLogEntry = {
    id: `${state.handId}-action-${state.actionSequence}`,
    playerId,
    playerName: player.name,
    street: state.street,
    action: action.type,
    amount: paid,
    label: actionLabel(action, paid),
    aiDecision: action.aiDecision,
  };
  state.actionLog = [entry, ...state.actionLog];
  player.lastAction = entry.label;
}

function postBlind(
  state: GameState,
  playerId: number,
  amount: number,
  blind: "small" | "big",
) {
  const paid = payChips(state, playerId, amount);
  state.actionSequence += 1;
  const player = state.players[playerId];
  player.lastAction = blind === "small" ? `小盲 ${paid}` : `大盲 ${paid}`;
  const entry: ActionLogEntry = {
    id: `${state.handId}-action-${state.actionSequence}`,
    playerId,
    playerName: player.name,
    street: "preflop",
    action: "raise",
    amount: paid,
    label: player.lastAction,
  };
  state.actionLog = [entry, ...state.actionLog];
}

function firstActorForStreet(state: GameState): number | null {
  const from =
    state.street === "preflop"
      ? state.players.find((player) => player.position === "BB")?.id ??
        state.dealerId
      : state.dealerId;
  return nextSeat(
    state.players,
    from,
    (player) => player.status === "active" && player.chips > 0,
  );
}

function drawBoard(state: GameState, count: number) {
  state.deck.shift();
  for (let index = 0; index < count; index += 1) {
    const card = state.deck.shift();
    if (card) state.communityCards.push(card);
  }
}

function nextStreet(state: GameState) {
  state.players.forEach((player) => {
    player.bet = 0;
    player.lastActedBet = null;
    player.lastAction = "";
  });
  state.currentBet = 0;
  state.minimumRaiseIncrement = BIG_BLIND;
  state.actedSinceRaise = [];

  if (state.street === "preflop") {
    state.street = "flop";
    drawBoard(state, 3);
  } else if (state.street === "flop") {
    state.street = "turn";
    drawBoard(state, 1);
  } else if (state.street === "turn") {
    state.street = "river";
    drawBoard(state, 1);
  }
}

function actionablePlayers(state: GameState): Player[] {
  return state.players.filter(
    (player) => player.status === "active" && player.chips > 0,
  );
}

function bettingClosed(state: GameState): boolean {
  const actionable = actionablePlayers(state);
  if (actionable.length === 0) return true;
  return actionable.every(
    (player) =>
      player.bet === state.currentBet &&
      state.actedSinceRaise.includes(player.id),
  );
}

function findNextActor(state: GameState, fromId: number): number | null {
  return nextSeat(
    state.players,
    fromId,
    (player) =>
      player.status === "active" &&
      player.chips > 0 &&
      (player.bet < state.currentBet ||
        !state.actedSinceRaise.includes(player.id)),
  );
}

export function contributionPots(state: GameState) {
  const levels = [
    ...new Set(
      state.players
        .map((player) => player.totalContribution)
        .filter((amount) => amount > 0),
    ),
  ].sort((a, b) => a - b);

  let previous = 0;
  return levels.map((level) => {
    const contributors = state.players.filter(
      (player) => player.totalContribution >= level,
    );
    const amount = (level - previous) * contributors.length;
    previous = level;
    return {
      amount,
      eligible: contributors.filter((player) => player.status !== "folded"),
    };
  });
}

export function settleShowdown(state: GameState): GameState {
  const payouts: Record<number, number> = {};
  const hands = new Map(
    state.players
      .filter((player) => player.status !== "folded" && player.holeCards.length)
      .map((player) => [
        player.id,
        evaluateBest([...player.holeCards, ...state.communityCards]),
      ]),
  );

  contributionPots(state).forEach((pot) => {
    if (!pot.eligible.length) return;
    const best = pot.eligible.reduce((winner, candidate) => {
      const comparison = compareHands(
        hands.get(candidate.id)!,
        hands.get(winner.id)!,
      );
      return comparison > 0 ? candidate : winner;
    });
    const winners = pot.eligible.filter(
      (player) =>
        compareHands(hands.get(player.id)!, hands.get(best.id)!) === 0,
    );
    const share = Math.floor(pot.amount / winners.length);
    winners.forEach((winner) => {
      payouts[winner.id] = (payouts[winner.id] ?? 0) + share;
    });
    const remainder = pot.amount - share * winners.length;
    if (remainder > 0) {
      const winnerIds = new Set(winners.map((winner) => winner.id));
      const clockwiseWinners: Player[] = [];
      for (let offset = 1; offset <= state.players.length; offset += 1) {
        const player = state.players[
          (state.dealerId + offset) % state.players.length
        ];
        if (winnerIds.has(player.id)) clockwiseWinners.push(player);
      }
      for (let chip = 0; chip < remainder; chip += 1) {
        const winner = clockwiseWinners[chip];
        payouts[winner.id] += 1;
      }
    }
  });

  Object.entries(payouts).forEach(([id, amount]) => {
    state.players[Number(id)].chips += amount;
  });

  const winnerIds = Object.keys(payouts)
    .map(Number)
    .filter((id) => payouts[id] > 0);
  const humanPayout = payouts[HUMAN_ID] ?? 0;
  const humanContribution = state.players[HUMAN_ID].totalContribution;
  const humanDelta = humanPayout - humanContribution;
  state.humanSessionProfit += humanDelta;
  const humanHand = hands.get(HUMAN_ID);
  const winningNames = winnerIds.map((id) => state.players[id].name).join("、");

  state.result = {
    title: winnerIds.includes(HUMAN_ID) ? "这一手赢了" : `${winningNames} 获胜`,
    detail: winnerIds.includes(HUMAN_ID)
      ? `${humanHand?.categoryName ?? "牌型"} · ${
          humanDelta >= 0 ? "+" : ""
        }${humanDelta} 筹码`
      : `${winningNames} 赢得底池`,
    winnerIds,
    payouts,
    humanDelta,
    showdown: true,
  };
  state.pot = 0;
  state.currentActor = null;
  state.phase = state.players[HUMAN_ID].chips > 0 ? "result" : "busted";
  return state;
}

function settleUncontested(state: GameState, winner: Player): GameState {
  const payout = state.pot;
  winner.chips += payout;
  const humanContribution = state.players[HUMAN_ID].totalContribution;
  const humanDelta =
    winner.id === HUMAN_ID ? payout - humanContribution : -humanContribution;
  state.humanSessionProfit += humanDelta;
  state.result = {
    title: winner.id === HUMAN_ID ? "收下底池" : `${winner.name} 收下底池`,
    detail:
      winner.id === HUMAN_ID
        ? `其他玩家已弃牌 · +${humanDelta} 筹码`
        : `${winner.name} 赢得 ${payout} 筹码`,
    winnerIds: [winner.id],
    payouts: { [winner.id]: payout },
    humanDelta,
    showdown: false,
  };
  state.pot = 0;
  state.currentActor = null;
  state.phase = state.players[HUMAN_ID].chips > 0 ? "result" : "busted";
  return state;
}

function runBoardAndSettle(state: GameState): GameState {
  while (state.communityCards.length < 5) {
    if (state.communityCards.length === 0) drawBoard(state, 3);
    else drawBoard(state, 1);
  }
  state.street = "river";
  return settleShowdown(state);
}

function progressAfterAction(state: GameState, actorId: number): GameState {
  const remaining = state.players.filter(
    (player) => player.status !== "folded" && player.status !== "out",
  );
  if (remaining.length === 1) return settleUncontested(state, remaining[0]);

  if (bettingClosed(state)) {
    if (state.street === "river") return settleShowdown(state);
    nextStreet(state);
    if (actionablePlayers(state).length < 2) return runBoardAndSettle(state);
    state.currentActor = firstActorForStreet(state);
    return state;
  }

  state.currentActor = findNextActor(state, actorId);
  if (state.currentActor === null) {
    if (state.street === "river") return settleShowdown(state);
    nextStreet(state);
    if (actionablePlayers(state).length < 2) return runBoardAndSettle(state);
    state.currentActor = firstActorForStreet(state);
  }
  return state;
}

export function createGame(
  seed = 20260723,
  humanStartingChips = STARTING_CHIPS,
): GameState {
  const sessionId = sessionIdFromSeed(seed);
  const players: Player[] = PLAYER_BLUEPRINTS.map((blueprint, id) => ({
    ...blueprint,
    id,
    position: "",
    chips: id === HUMAN_ID ? Math.max(1, humanStartingChips) : STARTING_CHIPS,
    holeCards: [],
    status: "active",
    bet: 0,
    totalContribution: 0,
    lastActedBet: null,
    lastAction: "",
  }));

  const base: GameState = {
    sessionId,
    handId: handIdForSession(sessionId, 0),
    players,
    rebuyPlayerIds: [],
    deck: [],
    communityCards: [],
    street: "preflop",
    phase: "playing",
    pot: 0,
    currentBet: 0,
    minimumRaiseIncrement: BIG_BLIND,
    currentActor: null,
    dealerId: 5,
    actedSinceRaise: [],
    handNumber: 0,
    actionSequence: 0,
    actionLog: [],
    result: null,
    humanSessionProfit: 0,
    saveWarning: false,
  };

  return startNewHand(base, seed, false);
}

export function startNewHand(
  previous: GameState,
  seed = DEFAULT_SIMULATION_SEED,
  rotateDealer = true,
  rebuyAI = true,
): GameState {
  const state = cloneState(previous);
  if (!state.sessionId) state.sessionId = sessionIdFromSeed(seed);
  state.rebuyPlayerIds = rebuyAI
    ? state.players
        .filter((player) => !player.isHuman && player.chips <= 0)
        .map((player) => player.id)
    : [];
  const rebuyIds = new Set(state.rebuyPlayerIds);
  state.players = state.players.map((player) =>
    rebuyIds.has(player.id)
      ? { ...player, chips: AI_REBUY_CHIPS, status: "active" }
      : player,
  );
  const available = activeSeatIds(state.players);
  if (!available.includes(HUMAN_ID)) {
    state.phase = "busted";
    return state;
  }
  if (available.length < 2) return previous;

  if (rotateDealer) {
    state.dealerId =
      nextSeat(state.players, state.dealerId, (player) => player.chips > 0) ??
      state.dealerId;
  } else if (!available.includes(state.dealerId)) {
    state.dealerId = available[0];
  }

  state.handNumber += 1;
  state.handId = handIdForSession(state.sessionId, state.handNumber);
  state.deck = shuffledDeck(seed + state.handNumber);
  state.communityCards = [];
  state.street = "preflop";
  state.phase = "playing";
  state.pot = 0;
  state.currentBet = 0;
  state.minimumRaiseIncrement = BIG_BLIND;
  state.currentActor = null;
  state.actedSinceRaise = [];
  state.result = null;
  state.actionSequence = 0;
  state.actionLog = [];
  state.players = assignPositions(
    state.players.map((player) => ({
      ...player,
      status: player.chips > 0 ? "active" : "out",
      holeCards: [],
      bet: 0,
      totalContribution: 0,
      lastActedBet: null,
      lastAction: "",
    })),
    state.dealerId,
  );

  for (let round = 0; round < 2; round += 1) {
    for (let offset = 1; offset <= state.players.length; offset += 1) {
      const id = (state.dealerId + offset) % state.players.length;
      const player = state.players[id];
      if (player.status !== "out") {
        const card = state.deck.shift();
        if (card) player.holeCards.push(card);
      }
    }
  }

  const activePlayers = state.players.filter((player) => player.status !== "out");
  const smallBlindId =
    activePlayers.length === 2
      ? state.dealerId
      : (nextSeat(
          state.players,
          state.dealerId,
          (player) => player.status !== "out",
        ) ?? state.dealerId);
  const bigBlindId =
    nextSeat(state.players, smallBlindId, (player) => player.status !== "out") ??
    smallBlindId;
  postBlind(state, smallBlindId, SMALL_BLIND, "small");
  postBlind(state, bigBlindId, BIG_BLIND, "big");
  state.currentBet =
    activePlayers.length >= 2
      ? BIG_BLIND
      : Math.max(...state.players.map((player) => player.bet));
  state.currentActor = firstActorForStreet(state);
  return state;
}

export function rebuyHumanAndStartNextHand(
  previous: GameState,
  amount = STARTING_CHIPS,
  seed = DEFAULT_SIMULATION_SEED,
): GameState {
  if (previous.phase !== "busted" || previous.players[HUMAN_ID].chips > 0) {
    return previous;
  }

  const funded = cloneState(previous);
  funded.players[HUMAN_ID].chips = Math.max(1, amount);
  funded.players[HUMAN_ID].status = "active";
  return startNewHand(funded, seed, true, true);
}

export function legalActions(
  state: GameState,
  playerId: number,
): LegalActions {
  const player = state.players[playerId];
  const isTurn =
    state.phase === "playing" &&
    state.currentActor === playerId &&
    player.status === "active";
  const toCall = Math.max(0, state.currentBet - player.bet);
  const callAmount = Math.min(toCall, player.chips);
  const maxRaiseTarget = player.bet + player.chips;
  const minRaiseTarget =
    state.currentBet === 0
      ? BIG_BLIND
      : state.currentBet < state.minimumRaiseIncrement
        ? state.minimumRaiseIncrement
        : state.currentBet + state.minimumRaiseIncrement;
  const hasActedSinceFullRaise = state.actedSinceRaise.includes(playerId);
  const lastActedBet = player.lastActedBet ?? null;
  const facedSinceLastAction =
    lastActedBet === null ? Number.POSITIVE_INFINITY : state.currentBet - lastActedBet;
  const raiseRightsOpen =
    !hasActedSinceFullRaise ||
    facedSinceLastAction >= state.minimumRaiseIncrement;
  const allInWouldRaise = maxRaiseTarget > state.currentBet;
  const hasRaiseResponder = state.players.some(
    (candidate) =>
      candidate.id !== playerId &&
      candidate.status === "active" &&
      candidate.chips > 0,
  );

  return {
    canFold: isTurn,
    canCheck: isTurn && toCall === 0,
    canCall: isTurn && toCall > 0 && player.chips > 0,
    canRaise:
      isTurn &&
      hasRaiseResponder &&
      raiseRightsOpen &&
      maxRaiseTarget >= minRaiseTarget,
    canAllIn:
      isTurn &&
      player.chips > 0 &&
      (!allInWouldRaise || (hasRaiseResponder && raiseRightsOpen)),
    toCall,
    callAmount,
    minRaiseTarget,
    maxRaiseTarget,
  };
}

export function applyAction(
  current: GameState,
  action: PlayerAction,
): GameState {
  const state = cloneState(current);
  if (state.currentActor !== action.playerId || state.phase !== "playing") {
    return current;
  }

  const player = state.players[action.playerId];
  const legal = legalActions(state, action.playerId);
  let paid = 0;

  if (action.type === "fold" && legal.canFold) {
    player.status = "folded";
  } else if (action.type === "check" && legal.canCheck) {
    // No chips move.
  } else if (action.type === "call" && legal.canCall) {
    paid = payChips(state, player.id, legal.callAmount);
  } else if (
    action.type === "raise" &&
    legal.canRaise &&
    typeof action.amount === "number" &&
    Number.isFinite(action.amount) &&
    Number.isInteger(action.amount) &&
    action.amount >= legal.minRaiseTarget &&
    action.amount <= legal.maxRaiseTarget
  ) {
    const target = action.amount;
    const previousBet = state.currentBet;
    paid = payChips(state, player.id, target - player.bet);
    state.currentBet = Math.max(state.currentBet, player.bet);
    const increment = state.currentBet - previousBet;
    if (increment >= state.minimumRaiseIncrement) {
      state.minimumRaiseIncrement = increment;
    }
    state.actedSinceRaise = [];
  } else if (action.type === "all-in" && legal.canAllIn) {
    const previousBet = state.currentBet;
    paid = payChips(state, player.id, player.chips);
    if (player.bet > state.currentBet) {
      state.currentBet = player.bet;
      const increment = state.currentBet - previousBet;
      if (increment >= state.minimumRaiseIncrement) {
        state.minimumRaiseIncrement = increment;
        state.actedSinceRaise = [];
      }
    }
  } else {
    return current;
  }

  player.lastActedBet = state.currentBet;
  state.actedSinceRaise = [...new Set([...state.actedSinceRaise, player.id])];
  appendLog(state, player.id, action, paid);
  return progressAfterAction(state, player.id);
}

export function boardSummary(state: GameState): string {
  if (!state.communityCards.length) return "翻牌前";
  return state.communityCards.map(cardLabel).join(" ");
}

export const STREET_LABELS: Record<Street, string> = {
  preflop: "翻牌前",
  flop: "翻牌",
  turn: "转牌",
  river: "河牌",
};
