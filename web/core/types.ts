export type Suit = "spades" | "hearts" | "diamonds" | "clubs";
export type Street = "preflop" | "flop" | "turn" | "river";
export type PlayerStatus = "active" | "folded" | "all-in" | "out";
export type GamePhase = "playing" | "result" | "busted";
export type ActionType = "fold" | "check" | "call" | "raise" | "all-in";
export type AIArchetype =
  | "tight-aggressive"
  | "loose-aggressive"
  | "tight-weak"
  | "loose-weak"
  | "balanced";
export type AIActionKind = "fold" | "passive" | "aggressive";
export type AIHandStrengthBucket = "weak" | "marginal" | "strong" | "premium";

export type Card = {
  suit: Suit;
  rank: number;
};

export type AIStyle = {
  key: AIArchetype;
  label: string;
  summary: string;
  aggression: number;
  looseness: number;
  aggressiveThreshold: number;
  passiveThreshold: number;
  aggressionChance: number;
  continueChance: number;
  bluffThreshold: number;
  bluffChance: number;
  learningRate: number;
  memoryWindow: number;
  adjustmentCap: number;
  initialExploration: number;
  minimumExploration: number;
  explorationDecay: number;
  aggressiveLearningWeight: number;
  passiveLearningWeight: number;
  foldLearningWeight: number;
  thinkingPace: number;
  tankChance: number;
};

export type AIContextPolicy = {
  foldScore: number;
  passiveScore: number;
  aggressiveScore: number;
  sampleCount: number;
};

export type HumanOpponentRead = {
  handsObserved: number;
  vpipHands: number;
  pfrHands: number;
  aggressiveActions: number;
  totalActions: number;
  pressureOpportunities: number;
  foldsToAggression: number;
  continuesVsAggression: number;
};

export type AILearningSnapshot = {
  handIndex: number;
  totalProfit: number;
  aggressionBias: number;
  tightnessBias: number;
  bluffBias: number;
  explorationRate: number;
};

export type AILearningState = {
  handsPlayed: number;
  totalProfit: number;
  aggressionBias: number;
  tightnessBias: number;
  bluffBias: number;
  humanRead: HumanOpponentRead;
  contextPolicies: Record<string, AIContextPolicy>;
  snapshots: AILearningSnapshot[];
};

export type AIDecisionTrace = {
  contextKey: string;
  strengthBucket: AIHandStrengthBucket;
  actionKind: AIActionKind;
  usedExploration: boolean;
};

export type Player = {
  id: number;
  name: string;
  avatar: string;
  isHuman: boolean;
  style?: AIStyle;
  position: string;
  chips: number;
  holeCards: Card[];
  status: PlayerStatus;
  bet: number;
  totalContribution: number;
  lastActedBet: number | null;
  lastAction: string;
};

export type PlayerAction = {
  playerId: number;
  type: ActionType;
  amount?: number;
  aiDecision?: AIDecisionTrace;
};

export type ActionLogEntry = {
  id: string;
  playerId: number;
  playerName: string;
  street: Street;
  action: ActionType;
  amount: number;
  label: string;
  aiDecision?: AIDecisionTrace;
};

export type HandResult = {
  title: string;
  detail: string;
  winnerIds: number[];
  payouts: Record<number, number>;
  humanDelta: number;
  showdown: boolean;
};

export type GameState = {
  players: Player[];
  rebuyPlayerIds: number[];
  deck: Card[];
  communityCards: Card[];
  street: Street;
  phase: GamePhase;
  pot: number;
  currentBet: number;
  minimumRaiseIncrement: number;
  currentActor: number | null;
  dealerId: number;
  actedSinceRaise: number[];
  handNumber: number;
  actionSequence: number;
  actionLog: ActionLogEntry[];
  result: HandResult | null;
  humanSessionProfit: number;
  saveWarning: boolean;
};

export type LegalActions = {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  canRaise: boolean;
  canAllIn: boolean;
  toCall: number;
  callAmount: number;
  minRaiseTarget: number;
  maxRaiseTarget: number;
};
