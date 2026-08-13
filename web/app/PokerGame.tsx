"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, ReactNode } from "react";
import {
  loadSoundPreference,
  outcomeSoundForHumanDelta,
  playDealSequence,
  playGameEventSound,
  playGameSound,
  saveSoundPreference,
  syncTableAmbience,
  unlockGameAudio,
  type GameSound,
} from "./gameAudio";
import {
  characterGestureLabel,
  performancesForEvent,
  type CharacterPerformance,
} from "./characterPresentation";
import {
  buildPublicPresentationSnapshot,
  derivePresentationEvents,
  type PresentationEvent,
} from "../core/presentation";
import {
  choosePersonaDialogue,
  type DialogueChoice,
  type DialogueTrigger,
} from "../core/dialogue";
import {
  advancePersonaState,
  defaultPersonaState,
  type PersonaState,
} from "../core/characterState";
import { AVATAR_SOURCES } from "./characterAssets";
import { AI_ENGINE_NAMES, chooseAIAction } from "../core/ai";
import {
  currentAIExplorationRate,
  defaultAILearningState,
  describeHumanRead,
} from "../core/aiLearning";
import {
  createAIThinkingPlan,
  type AIThinkingMode,
  type AIThinkingPlan,
} from "../core/aiThinking";
import { rankLabel, SUIT_SYMBOLS } from "../core/cards";
import {
  CAT_CARD_ART_SOURCES,
  catCardAccessibleLabel,
  catCardArtSource,
} from "./cardArt";
import {
  applyAction,
  BIG_BLIND,
  createGame,
  legalActions,
  rebuyHumanAndStartNextHand,
  SMALL_BLIND,
  startNewHand,
  STARTING_CHIPS,
  STREET_LABELS,
} from "../core/engine";
import { evaluateBest, type EvaluatedHand } from "../core/evaluator";
import {
  claimDailySignIn,
  DAILY_FREE_CHIPS,
  DAILY_SIGN_IN_BONUS,
  hasDailyBenefit,
  hasSignedIn,
  loadProfile,
  recordCompletedHand,
  refreshDailyBenefit,
  resetLearningData,
  saveProfile,
  syncProfileChips,
  type AIProfileStats,
  type HandHistoryRecord,
  type LocalProfile,
} from "../core/profile";
import {
  clearSession,
  hasSavedSession,
  loadSession,
  saveSession,
} from "../core/storage";
import type { ActionType, Card, GameState, Player } from "../core/types";

const HUMAN_ID = 0;
const EMPTY_THINKING_STEPS: readonly string[] = [];
const SUIT_NAMES: Record<Card["suit"], string> = {
  spades: "黑桃",
  hearts: "红桃",
  diamonds: "方块",
  clubs: "梅花",
};

function readableCardLabel(card: Card): string {
  return `${SUIT_NAMES[card.suit]}${rankLabel(card.rank)}`;
}

function readableCardsLabel(cards: Card[]): string {
  return cards.map(readableCardLabel).join("、");
}

type DialogInertLock = {
  count: number;
  originalValue: boolean;
};

const dialogInertLocks = new Map<HTMLElement, DialogInertLock>();

function lockDialogBranch(element: HTMLElement) {
  const existing = dialogInertLocks.get(element);
  if (existing) {
    existing.count += 1;
    return;
  }
  dialogInertLocks.set(element, {
    count: 1,
    originalValue: element.inert,
  });
  element.inert = true;
}

function unlockDialogBranch(element: HTMLElement) {
  const existing = dialogInertLocks.get(element);
  if (!existing) return;
  existing.count -= 1;
  if (existing.count > 0) return;
  element.inert = existing.originalValue;
  dialogInertLocks.delete(element);
}

function useDialogFocus<T extends HTMLElement>(
  active: boolean,
  onClose: () => void,
) {
  const rootRef = useRef<T>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active || !rootRef.current) return;
    const root = rootRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overlay = root.closest<HTMLElement>(
      ".drawer-backdrop, .modal-backdrop, .table-interaction-overlay",
    ) ?? root;
    const outsideBranches = new Set<HTMLElement>();
    let branch: HTMLElement = overlay;
    while (branch.parentElement && branch.parentElement !== document.body) {
      Array.from(branch.parentElement.children).forEach((element) => {
        if (element instanceof HTMLElement && element !== branch) {
          outsideBranches.add(element);
        }
      });
      branch = branch.parentElement;
    }
    if (branch.parentElement === document.body) {
      Array.from(document.body.children).forEach((element) => {
        if (element instanceof HTMLElement && element !== branch) {
          outsideBranches.add(element);
        }
      });
    }
    outsideBranches.forEach(lockDialogBranch);

    const focusable = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.inert);
    window.requestAnimationFrame(() => {
      (focusable()[0] ?? root).focus();
    });

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) {
        event.preventDefault();
        root.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      outsideBranches.forEach(unlockDialogBranch);
      window.requestAnimationFrame(() => {
        if (
          previousFocus?.isConnected &&
          !previousFocus.inert &&
          !previousFocus.closest("[inert]")
        ) {
          previousFocus.focus();
        }
      });
    };
  }, [active]);

  return rootRef;
}

function describeEvaluatedHand(hand: EvaluatedHand): string {
  const [primary, secondary] = hand.values.map(rankLabel);

  switch (hand.category) {
    case 8:
      return `${primary} 高同花顺`;
    case 7:
      return `四条 ${primary}`;
    case 6:
      return `${primary} 带 ${secondary} 的葫芦`;
    case 5:
      return `${primary} 高同花`;
    case 4:
      return `${primary} 高顺子`;
    case 3:
      return `三条 ${primary}`;
    case 2:
      return `两对 ${primary} 和 ${secondary}`;
    case 1:
      return `一对 ${primary}`;
    default:
      return `${primary} 高牌`;
  }
}

function evaluateRecordedHand(
  holeCards: Card[],
  communityCards: Card[],
): EvaluatedHand | null {
  const cards = [...holeCards, ...communityCards];
  return holeCards.length === 2 && cards.length >= 5 && cards.length <= 7
    ? evaluateBest(cards)
    : null;
}

function formatSignedChips(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString()}`;
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function aiTurnSeed(game: GameState, playerId: number, stream: number): number {
  return (
    (Math.imul(game.handNumber + 1, 1_000_003) ^
      Math.imul(game.actionSequence + 1, 97_409) ^
      Math.imul(playerId + 1, 65_537) ^
      stream) >>>
    0
  );
}

function stableTextSeed(value: string): number {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function actionSound(type: ActionType): GameSound {
  if (type === "fold") return "fold";
  if (type === "check") return "check";
  if (type === "call") return "call";
  if (type === "all-in") return "all-in";
  return "raise";
}
const CAT_CHARACTER_PROFILES: Record<
  number,
  { seatAsset: string; breed: string; persona: string }
> = {
  0: {
    seatAsset: "/characters/v3/golden-player-back.webp",
    breed: "金色英短",
    persona: "沉着的新牌手",
  },
  1: {
    seatAsset: "/characters/v3/british-left-side.webp",
    breed: "蓝灰英短",
    persona: "谨慎的价值派",
  },
  2: {
    seatAsset: "/characters/v3/siamese-far-left.webp",
    breed: "暹罗猫",
    persona: "敏捷的进攻派",
  },
  3: {
    seatAsset: "/characters/v3/maine-coon-far-center.webp",
    breed: "缅因猫",
    persona: "稳健的分析派",
  },
  4: {
    seatAsset: "/characters/v3/orange-far-right.webp",
    breed: "橘猫",
    persona: "好奇的松弛派",
  },
  5: {
    seatAsset: "/characters/v3/abyssinian-right-side.webp",
    breed: "阿比西尼亚猫",
    persona: "难测的诈唬派",
  },
};

const TABLE_CHARACTER_ASSET_SOURCES = Object.freeze(
  Object.values(CAT_CHARACTER_PROFILES).map(({ seatAsset }) => seatAsset),
);

async function warmImageCache(
  sources: readonly string[],
  { concurrency }: { concurrency: number },
) {
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, sources.length) },
    async () => {
      while (nextIndex < sources.length) {
        const source = sources[nextIndex];
        nextIndex += 1;
        await new Promise<void>((resolve) => {
          const image = new Image();
          image.decoding = "async";
          image.onload = () => resolve();
          image.onerror = () => resolve();
          image.src = source;
        });
      }
    },
  );
  await Promise.all(workers);
}

function currentHandCardArtSources(game: GameState): string[] {
  const upcomingBoardCards = [
    game.deck[1],
    game.deck[2],
    game.deck[3],
    game.deck[5],
    game.deck[7],
  ].filter((card): card is Card => !!card);
  return [
    ...game.players[HUMAN_ID].holeCards,
    ...game.communityCards,
    ...upcomingBoardCards,
  ]
    .map(catCardArtSource)
    .filter((source): source is string => !!source);
}

type TableInteractionKind = "egg" | "tomato" | "flower" | "slipper";

type TableInteraction = {
  eventId: number;
  targetId: number;
  kind: TableInteractionKind;
};

type TableOverlayState =
  | { kind: "interaction"; seatId: number }
  | { kind: "quick-bet" }
  | { kind: "action-log" }
  | null;

const TABLE_INTERACTIONS: ReadonlyArray<{
  kind: TableInteractionKind;
  label: string;
  projectile: string;
  impact: string;
}> = [
  { kind: "egg", label: "鸡蛋", projectile: "🥚", impact: "🍳" },
  { kind: "tomato", label: "番茄", projectile: "🍅", impact: "💥" },
  { kind: "flower", label: "鲜花", projectile: "🌹", impact: "💖" },
  { kind: "slipper", label: "拖鞋", projectile: "🩴", impact: "💫" },
];

type AppScreen = "home" | "game" | "welfare" | "statistics";
const ACTIVE_SCREEN_KEY = "poker-ai-web/active-screen";

function screenPath(screen: AppScreen): string {
  if (screen === "welfare") return "/rewards";
  if (screen === "statistics") return "/stats";
  if (screen === "game") return "/game";
  return "/";
}

function screenFromPath(pathname: string): AppScreen {
  if (pathname.startsWith("/rewards")) return "welfare";
  if (pathname.startsWith("/stats")) return "statistics";
  if (pathname.startsWith("/game")) return "game";
  return "home";
}

const CardPreviewContext = createContext<((card: Card) => void) | null>(null);
type StatisticsTab = "overview" | "profiles" | "recent";
type GlossaryItem = {
  term: string;
  name: string;
  description: string;
  detail: string;
};

const POKER_GLOSSARY: Record<string, GlossaryItem> = {
  VPIP: {
    term: "VPIP",
    name: "主动入池率",
    description: "翻牌前自愿投入小鱼干的手数占比。",
    detail: "跟注、加注或全下会计入；强制投入的小盲和大盲本身不计入。",
  },
  PFR: {
    term: "PFR",
    name: "翻前加注率",
    description: "翻牌前至少加注一次的手数占比。",
    detail: "包含首次加注、再加注和翻前全下，通常会低于或等于 VPIP。",
  },
  "3Bet": {
    term: "3Bet",
    name: "翻前再加注率",
    description: "面对一次翻前加注后再次加注的频率。",
    detail: "当前训练器按全部记录手数显示占比，样本少时波动会比较明显。",
  },
  AF: {
    term: "AF",
    name: "进攻系数",
    description: "加注与全下次数，相对于跟注次数的比值。",
    detail: "数值越高通常代表行动越主动；它不是胜率，也不直接代表水平。",
  },
};

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function DriedFishIcon() {
  return (
    <svg className="dried-fish-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path className="fish-tail" d="M6.3 8.7 2.4 6.2 3.2 12l-.8 5.8 3.9-2.5" />
      <path
        className="fish-body"
        d="M5.4 12c2.2-3.8 5.2-5.7 9-5.7 2.5 0 4.6 1.4 6.2 5.7-1.6 4.3-3.7 5.7-6.2 5.7-3.8 0-6.8-1.9-9-5.7Z"
      />
      <path className="fish-bones" d="M8.2 12h7.2M10 9.1v5.8M12.4 8.1v7.8" />
      <circle className="fish-eye" cx="17.2" cy="10.3" r="1" />
    </svg>
  );
}

function SoundIcon({ enabled }: { enabled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 5 6.8 8.5H3v7h3.8L11 19V5Z" />
      {enabled ? (
        <>
          <path d="M15 9.3a4 4 0 0 1 0 5.4" />
          <path d="M18 6.5a8 8 0 0 1 0 11" />
        </>
      ) : (
        <>
          <path d="m16 10 5 5" />
          <path d="m21 10-5 5" />
        </>
      )}
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" />
    </svg>
  );
}

type AppIconName =
  | "play"
  | "refresh"
  | "gift"
  | "history"
  | "calendar"
  | "chip"
  | "check"
  | "detail"
  | "profile"
  | "cards";

function AppIcon({ name }: { name: AppIconName }) {
  const paths: Record<AppIconName, ReactNode> = {
    play: (
      <>
        <rect x="3.5" y="4.5" width="17" height="15" rx="4" />
        <path
          d="m10 8.6 5.6 3.4-5.6 3.4V8.6Z"
          fill="currentColor"
          stroke="none"
        />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5" />
        <path d="M19.2 12a7.3 7.3 0 0 0-12.4-4.7L4 10" />
        <path d="M4 17v-5h5" />
        <path d="M4.8 12a7.3 7.3 0 0 0 12.4 4.7L20 14" />
      </>
    ),
    gift: (
      <>
        <rect x="4" y="9" width="16" height="11" rx="2" />
        <path d="M3 9h18M12 9v11" />
        <path d="M12 9H8.8a2.8 2.8 0 1 1 2.6-3.8L12 9Zm0 0h3.2a2.8 2.8 0 1 0-2.6-3.8L12 9Z" />
      </>
    ),
    history: (
      <>
        <path d="M4 19V5M4 19h16" />
        <path d="m7.5 15 3.6-4 3 2.2L19 7.5" />
        <path d="M16.5 7.5H19V10" />
      </>
    ),
    calendar: (
      <>
        <path d="M5 5h14v14H5V5ZM8 3v4M16 3v4M5 9h14" />
        <path d="M9 13h2v2H9z" />
      </>
    ),
    chip: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="m12 4 .8 3.1M20 12l-3.1.8M12 20l-.8-3.1M4 12l3.1-.8" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    detail: (
      <>
        <path d="M6 4h12v16H6V4Z" />
        <path d="M9 9h6M9 13h6M9 17h4" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
      </>
    ),
    cards: (
      <>
        <rect x="5" y="3.5" width="11" height="16" rx="2.2" />
        <path d="m9 7 1.5 1.8L12 7" />
        <path d="m16 7 3 1.1v11.4H8.5" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function PlayingCard({
  card,
  hidden = false,
  compact = false,
  previewable = true,
  motion = "none",
  motionIndex = 0,
}: {
  card?: Card;
  hidden?: boolean;
  compact?: boolean;
  previewable?: boolean;
  motion?: "none" | "deal" | "reveal";
  motionIndex?: number;
}) {
  const openPreview = useContext(CardPreviewContext);
  const [artLoaded, setArtLoaded] = useState(false);
  const motionClass = motion === "none" ? "" : `card-motion card-${motion}`;
  const motionStyle =
    motion === "none"
      ? undefined
      : ({
          "--card-delay": `${Math.min(12, Math.max(0, motionIndex)) * 62}ms`,
        } as CSSProperties);

  if (hidden || !card) {
    return (
      <span
        className={`playing-card card-back ${compact ? "card-compact" : ""} ${motionClass}`}
        aria-label="背面朝上的牌"
        style={motionStyle}
      >
        <span className="card-back-pattern" aria-hidden="true">
          <svg viewBox="0 0 32 32">
            <ellipse cx="16" cy="20.2" rx="7.2" ry="6.1" />
            <ellipse
              cx="7.6"
              cy="14.1"
              rx="3.2"
              ry="4"
              transform="rotate(-24 7.6 14.1)"
            />
            <ellipse
              cx="13.2"
              cy="8.7"
              rx="3.1"
              ry="4.1"
              transform="rotate(-7 13.2 8.7)"
            />
            <ellipse
              cx="19.2"
              cy="8.7"
              rx="3.1"
              ry="4.1"
              transform="rotate(7 19.2 8.7)"
            />
            <ellipse
              cx="24.6"
              cy="14.1"
              rx="3.2"
              ry="4"
              transform="rotate(24 24.6 14.1)"
            />
          </svg>
        </span>
      </span>
    );
  }

  const isRed = card.suit === "hearts" || card.suit === "diamonds";
  const rank = rankLabel(card.rank);
  const suit = SUIT_SYMBOLS[card.suit];
  const catArtSource = catCardArtSource(card);
  const canPreview = previewable && !!catArtSource && !!openPreview;
  const accessibleLabel = catCardAccessibleLabel(card);
  return (
    <span
      className={`playing-card card-face card-${card.suit} ${
        card.rank >= 11 ? "card-honor" : ""
      } ${catArtSource ? "card-illustrated" : ""} ${isRed ? "card-red" : ""} ${
        compact ? "card-compact" : ""
      } ${canPreview ? "is-previewable" : ""} ${motionClass}`}
      aria-label={
        canPreview ? `${accessibleLabel}，点击查看大图` : accessibleLabel
      }
      role={canPreview ? "button" : undefined}
      tabIndex={canPreview ? 0 : undefined}
      title={canPreview ? "点击查看大牌面" : undefined}
      style={motionStyle}
      onClick={
        canPreview
          ? (event) => {
              event.stopPropagation();
              openPreview(card);
            }
          : undefined
      }
      onKeyDown={
        canPreview
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                openPreview(card);
              }
            }
          : undefined
      }
    >
      {catArtSource ? (
        <>
          {!artLoaded ? (
            <span className="card-art-fallback" aria-hidden="true">
              <b>{rank}</b>
              <i>{suit}</i>
            </span>
          ) : null}
          {/* Cat art is decorative; the accessible card name comes from the outer element. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="card-cat-art"
            src={catArtSource}
            alt=""
            aria-hidden="true"
            decoding="async"
            fetchPriority={compact ? "auto" : "high"}
            loading={compact ? "lazy" : "eager"}
            draggable={false}
            onLoad={() => setArtLoaded(true)}
          />
        </>
      ) : (
        <>
          <span className="card-corner card-corner-top" aria-hidden="true">
            <b className="card-rank">{rank}</b>
            <i className="card-suit">{suit}</i>
          </span>
          <span className="card-center-pip" aria-hidden="true">
            {suit}
          </span>
          <span className="card-corner card-corner-bottom" aria-hidden="true">
            <b className="card-rank">{rank}</b>
            <i className="card-suit">{suit}</i>
          </span>
        </>
      )}
    </span>
  );
}

function CardPreviewModal({
  card,
  onClose,
}: {
  card: Card;
  onClose: () => void;
}) {
  const dialogRef = useDialogFocus<HTMLElement>(true, onClose);
  const source = catCardArtSource(card);
  const label = catCardAccessibleLabel(card);

  if (!source) return null;

  return (
    <div
      className="modal-backdrop card-preview-backdrop"
      onClick={onClose}
    >
      <section
        ref={dialogRef}
        className="card-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${label}大图`}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="card-preview-close"
          aria-label="关闭牌面大图"
          onClick={onClose}
        >
          ×
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={source} alt={label} draggable={false} />
        <small className="card-preview-hint">点击深色区域返回牌桌</small>
      </section>
    </div>
  );
}

function ConfirmDialog({
  eyebrow,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  eyebrow: string;
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useDialogFocus<HTMLElement>(true, onCancel);
  const titleId = `confirm-${title.replace(/\W/g, "")}`;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <section
        ref={dialogRef}
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <small>{eyebrow}</small>
        <button
          type="button"
          className="modal-close-button"
          aria-label="关闭"
          onClick={onCancel}
        >
          ×
        </button>
        <h2 id={titleId}>{title}</h2>
        <p>{description}</p>
        <div className="result-actions">
          <button onClick={onCancel}>取消</button>
          <button className="primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function PlayerAvatar({
  player,
  size = "normal",
  variant = "avatar",
}: {
  player: Player;
  size?: "small" | "normal";
  variant?: "avatar" | "table";
}) {
  const [tableArtLoaded, setTableArtLoaded] = useState(false);

  if (variant === "table") {
    const character =
      CAT_CHARACTER_PROFILES[player.id] ?? CAT_CHARACTER_PROFILES[0];
    return (
      <span
        className={`player-avatar avatar-${size} avatar-table character-stage`}
        aria-hidden="true"
      >
        <span className="character-floor-shadow" />
        <span className="character-rim-light" />
        {!tableArtLoaded ? (
          <>
            {/* The embedded portrait is visible immediately while the larger
                table artwork loads, then is removed to prevent ghosting. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="seat-character-placeholder character-layer"
              src={AVATAR_SOURCES[player.id]}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                zIndex: 1,
                inset: "16%",
                width: "68%",
                height: "68%",
                borderRadius: "50%",
                objectFit: "cover",
                opacity: 0.78,
                pointerEvents: "none",
              }}
            />
          </>
        ) : null}
        {/* A single connected puppet. The source art is not a segmented rig, so
            duplicating and moving clipped limbs creates visible seams. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="seat-character-material character-layer character-body"
          src={character.seatAsset}
          alt=""
          draggable={false}
          fetchPriority="high"
          onLoad={() => setTableArtLoaded(true)}
        />
        <span className="character-fish-sparks" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </span>
    );
  }

  const source = AVATAR_SOURCES[player.id];
  if (!source) {
    return (
      <span className={`player-avatar avatar-${size}`} aria-hidden="true">
        👱
      </span>
    );
  }

  return (
    <span className={`player-avatar avatar-${size}`}>
      <span className="player-avatar-fallback" aria-hidden="true">
        🐱
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={source} alt="" />
    </span>
  );
}

function SeatPositionBadges({
  player,
  dealer,
}: {
  player: Player;
  dealer: boolean;
}) {
  const isSmallBlind = player.position.includes("SB");
  const isBigBlind = player.position === "BB";
  const regularPosition = player.position
    .replace("/SB", "")
    .replace("SB", "")
    .replace("BB", "")
    .trim();

  return (
    <div className="seat-badges">
      {regularPosition && regularPosition !== "OUT" ? (
        <span className="position-badge">{regularPosition}</span>
      ) : null}
      {dealer && regularPosition !== "BTN" ? (
        <b className="dealer-badge" aria-label="庄家按钮">
          D
        </b>
      ) : null}
      {isSmallBlind ? (
        <strong className="blind-badge small-blind" aria-label={`小盲 ${SMALL_BLIND}`}>
          小盲
        </strong>
      ) : null}
      {isBigBlind ? (
        <strong className="blind-badge big-blind" aria-label={`大盲 ${BIG_BLIND}`}>
          大盲
        </strong>
      ) : null}
    </div>
  );
}

function DriedFishWager({
  amount,
  compact = false,
  label,
}: {
  amount: number;
  compact?: boolean;
  label?: string;
}) {
  const fishCount = amount >= 80 ? 5 : 4;
  return (
    <span
      className={`dried-fish-wager ${compact ? "is-compact" : ""}`}
      aria-label={label ?? `${amount} 小鱼干`}
    >
      <span className="dried-fish-pile" aria-hidden="true">
        {Array.from({ length: fishCount }, (_, index) => (
          <DriedFishIcon key={index} />
        ))}
      </span>
      <b>×{amount.toLocaleString()}</b>
    </span>
  );
}

function Seat({
  player,
  active,
  dealer,
  thinkingLabel,
  thinkingMode,
  reveal,
  dealOrder,
  dealSeatCount,
  performance,
  reactionLabel,
  interactionMenuOpen = false,
  interaction = null,
  onToggleInteractionMenu,
}: {
  player: Player;
  active: boolean;
  dealer: boolean;
  thinkingLabel: string | null;
  thinkingMode: AIThinkingMode | null;
  reveal: boolean;
  dealOrder: number;
  dealSeatCount: number;
  performance: CharacterPerformance | null;
  reactionLabel: string | null;
  interactionMenuOpen?: boolean;
  interaction?: TableInteraction | null;
  onToggleInteractionMenu?: (seatId: number) => void;
}) {
  const hiddenCards = !player.isHuman && !reveal;
  const character =
    CAT_CHARACTER_PROFILES[player.id] ?? CAT_CHARACTER_PROFILES[0];
  const systemActionLabel = performance?.actionLabel ?? player.lastAction;
  const blindAction = systemActionLabel?.match(/^(?:小盲|大盲)\s*(\d[\d,]*)$/);
  const mobileActionLabel = systemActionLabel
    ? blindAction
      ? `投入 ${blindAction[1]}`
      : systemActionLabel === "弃牌"
      ? "已弃牌"
      : systemActionLabel === "过牌"
        ? "已过牌"
        : systemActionLabel
    : player.bet > 0
      ? `已投入 ${player.bet.toLocaleString()}`
      : active
        ? "行动中"
        : "";
  const canInteract = !player.isHuman && player.status !== "out";
  const interactionPresentation = interaction
    ? TABLE_INTERACTIONS.find((item) => item.kind === interaction.kind)
    : null;
  return (
    <article
      className={`game-seat seat-${player.id} ${player.isHuman ? "seat-human" : ""} ${
        active ? "is-active" : ""
      } ${player.status === "folded" ? "is-folded" : ""} ${
        player.status === "out" ? "is-out" : ""
      } ${thinkingMode ? `is-thinking thinking-${thinkingMode}` : ""} ${
        performance ? `has-performance gesture-${performance.gesture}` : ""
      } ${interactionMenuOpen ? "has-interaction-menu" : ""} ${
        interaction ? `is-interaction-hit interaction-${interaction.kind}` : ""
      }`}
      data-persona={player.style?.key ?? "human"}
      data-interaction-seat={player.id}
      aria-label={`${player.name}，${player.position}，${player.chips} 小鱼干`}
    >
      <button
        className="seat-character-button"
        aria-label={
          canInteract ? `与${player.name}互动` : `查看${player.name}的猫咪角色`
        }
        aria-expanded={canInteract ? interactionMenuOpen : undefined}
        aria-haspopup={canInteract ? "dialog" : undefined}
        title={
          canInteract
            ? `与${player.name}互动 · ${character.breed}`
            : `${character.breed} · ${character.persona}`
        }
        onClick={() => {
          if (canInteract) onToggleInteractionMenu?.(player.id);
        }}
      >
        <PlayerAvatar player={player} variant="table" />
      </button>
      {interaction && interactionPresentation ? (
        <span
          key={interaction.eventId}
          className="seat-interaction-effect"
          aria-hidden="true"
        >
          <span className="interaction-projectile">
            {interactionPresentation.projectile}
          </span>
          <span className="interaction-impact">
            <b>{interactionPresentation.impact}</b>
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        </span>
      ) : null}
      {interaction && interactionPresentation ? (
        <span className="sr-only" aria-live="polite">
          你向{player.name}送出了{interactionPresentation.label}
        </span>
      ) : null}
      <div className="seat-identity">
        <SeatPositionBadges player={player} dealer={dealer} />
        <strong className="seat-player-name">{player.name}</strong>
        <span className="seat-stack" aria-label={`${player.chips} 小鱼干`}>
          <DriedFishIcon />
          <b key={player.chips} className="food-stack-value">
            {player.chips.toLocaleString()}
          </b>
        </span>
      </div>
      <div className="seat-cards" aria-label={`${player.name}的手牌`}>
        {player.status === "out" ? (
          <span className="out-label">离桌</span>
        ) : (
          player.holeCards.map((card, index) => (
            <PlayingCard
              key={`${card.suit}-${card.rank}-${index}-${hiddenCards ? "back" : "face"}`}
              card={card}
              hidden={hiddenCards}
              compact={!player.isHuman && !reveal}
              motion={hiddenCards || player.isHuman ? "deal" : "reveal"}
              motionIndex={dealOrder + index * dealSeatCount}
            />
          ))
        )}
      </div>
      <span
        key={`${player.bet}-${player.totalContribution}`}
        className="seat-contribution"
      >
        {player.totalContribution > 0 ? (
          <DriedFishWager
            amount={player.totalContribution}
            compact
            label={`本局已投入 ${player.totalContribution} 小鱼干`}
          />
        ) : null}
      </span>
      {mobileActionLabel ? (
        <span
          className={`seat-mobile-status ${player.status === "folded" ? "is-muted" : ""}`}
          aria-hidden="true"
        >
          <span>{mobileActionLabel}</span>
        </span>
      ) : null}
      {thinkingLabel || reactionLabel ? (
        <span
          className={`thought-bubble ${reactionLabel ? "thought-reaction" : `thought-${thinkingMode ?? "measured"}`}`}
          data-kind={reactionLabel ? "reaction" : "thinking"}
          aria-live="polite"
        >
          {!reactionLabel ? (
            <span className="thinking-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          ) : null}
          {reactionLabel ?? thinkingLabel}
        </span>
      ) : null}
      {mobileActionLabel ? (
        <span
          key={`${performance?.eventId ?? "state"}:${mobileActionLabel}`}
          className="last-action"
        >
          {mobileActionLabel}
        </span>
      ) : null}
      {performance ? (
        <span className="sr-only" aria-live="polite">
          {player.name}
          {characterGestureLabel(performance.gesture)}
        </span>
      ) : null}
    </article>
  );
}

function TableInteractionMenu({
  player,
  onClose,
  onSend,
}: {
  player: Player;
  onClose: () => void;
  onSend: (kind: TableInteractionKind) => void;
}) {
  const character =
    CAT_CHARACTER_PROFILES[player.id] ?? CAT_CHARACTER_PROFILES[0];
  const dialogRef = useDialogFocus<HTMLDivElement>(true, onClose);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="table-interaction-overlay"
      data-overlay="table-interaction"
      data-target-seat={player.id}
    >
      <button
        type="button"
        className="seat-interaction-backdrop"
        data-overlay-dismiss="true"
        aria-label="关闭互动面板"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className="seat-interaction-menu"
        data-component="table-interaction-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`与${player.name}互动`}
        tabIndex={-1}
      >
        <header>
          <PlayerAvatar player={player} size="small" />
          <span>
            <strong>与{player.name}互动</strong>
            <small>
              {character.breed} · {character.persona}
            </small>
          </span>
          <button
            type="button"
            className="seat-interaction-close"
            data-autofocus="true"
            aria-label="关闭互动面板"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div>
          {TABLE_INTERACTIONS.map((item) => (
            <button
              key={item.kind}
              type="button"
              data-interaction-kind={item.kind}
              aria-label={`向${player.name}送出${item.label}`}
              onClick={() => onSend(item.kind)}
            >
              <span aria-hidden="true">{item.projectile}</span>
              <small>{item.label}</small>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function TrainingEntryButton({
  canContinue,
  onContinue,
  onNewGame,
}: {
  canContinue: boolean;
  onContinue: () => void;
  onNewGame: () => void;
}) {
  return (
    <button
      type="button"
      className="training-entry-button"
      onClick={canContinue ? onContinue : onNewGame}
    >
      {canContinue ? "继续训练" : "开始第一局训练"}
    </button>
  );
}

function HomeScreen({
  profile,
  canContinue,
  onContinue,
  onNewGame,
  onWelfare,
  onStatistics,
}: {
  profile: LocalProfile;
  canContinue: boolean;
  onContinue: () => void;
  onNewGame: () => void;
  onWelfare: () => void;
  onStatistics: () => void;
}) {
  const dailyClaimed = hasDailyBenefit(profile);

  return (
    <main className="app-page home-page">
      <header className="app-masthead">
        <h1>德扑 AI 训练器</h1>
      </header>

      <section className="balance-card" aria-label="训练小鱼干余额">
        <span className="coin-mark">
          <DriedFishIcon />
        </span>
        <strong
          key={profile.chips}
          className="food-balance-value"
          aria-live="polite"
        >
          {profile.chips.toLocaleString()}
        </strong>
        <p>我的小鱼干</p>
      </section>

      <section className="daily-card">
        <div className="daily-copy">
          <span className="daily-icon">
            <AppIcon name="calendar" />
          </span>
          <span>
            <strong>每日补给 {DAILY_FREE_CHIPS.toLocaleString()} 小鱼干</strong>
            <small>每天 10:00 自动补充</small>
          </span>
        </div>
        <span className={dailyClaimed ? "daily-success" : "daily-pending"}>
          {dailyClaimed ? (
            <>
              <AppIcon name="check" />
              今日已到账
            </>
          ) : (
            "10:00 后到账"
          )}
        </span>
        <i className={dailyClaimed ? "is-complete" : ""} />
      </section>

      <nav className="home-actions" aria-label="主菜单">
        {canContinue ? (
          <button
            className="home-action action-continue"
            onClick={onContinue}
          >
            <span><AppIcon name="play" /></span>
            <b>继续游戏</b>
          </button>
        ) : null}
        <button className="home-action action-new" onClick={onNewGame}>
          <span><AppIcon name="refresh" /></span>
          <b>新开始</b>
        </button>
        <button className="home-action action-welfare" onClick={onWelfare}>
          <span><AppIcon name="gift" /></span>
          <b>福利中心</b>
        </button>
        <button className="home-action action-statistics" onClick={onStatistics}>
          <span><AppIcon name="history" /></span>
          <b>历史统计</b>
        </button>
      </nav>
    </main>
  );
}

function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="subpage-header">
      <button aria-label="返回" onClick={onBack}>
        <BackIcon />
      </button>
      <h1>{title}</h1>
      <span />
    </header>
  );
}

function WelfareScreen({
  profile,
  onProfileChange,
  onBack,
}: {
  profile: LocalProfile;
  onProfileChange: (profile: LocalProfile) => void;
  onBack: () => void;
}) {
  const signedIn = hasSignedIn(profile);
  const dailyClaimed = hasDailyBenefit(profile);

  function signIn() {
    const updated = claimDailySignIn(profile);
    saveProfile(updated);
    onProfileChange(updated);
  }

  return (
    <main className="app-page light-page">
      <PageHeader title="福利中心" onBack={onBack} />
      <section className="welfare-balance">
        <span><DriedFishIcon /></span>
        <small>我的小鱼干</small>
        <strong
          key={profile.chips}
          className="food-balance-value"
          aria-live="polite"
        >
          {profile.chips.toLocaleString()}
        </strong>
      </section>
      <section className="benefit-card">
        <div className="benefit-icon benefit-red"><AppIcon name="check" /></div>
        <div>
          <h2>每日签到</h2>
          <p>签到 +{DAILY_SIGN_IN_BONUS.toLocaleString()} 小鱼干</p>
          <small>每天可领取一次</small>
        </div>
        <button disabled={signedIn} onClick={signIn}>
          {signedIn
            ? "今日已签到"
            : `签到 +${DAILY_SIGN_IN_BONUS.toLocaleString()}`}
        </button>
      </section>
      <section className="benefit-card benefit-passive">
        <div className="benefit-icon benefit-green"><AppIcon name="calendar" /></div>
        <div>
          <h2>每日自动补给</h2>
          <p>{DAILY_FREE_CHIPS.toLocaleString()} 小鱼干</p>
          <small>每天 10:00 自动到账</small>
        </div>
        <b className="benefit-state">
          {dailyClaimed ? "今日已到账" : "等待到账"}
        </b>
      </section>
    </main>
  );
}

function percentage(value: number, total: number): string {
  if (!total) return "0.0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

function StatisticsScreen({
  profile,
  players,
  onBack,
  onResetMemories,
  canContinue,
  onContinueTraining,
  onStartTraining,
}: {
  profile: LocalProfile;
  players: Player[];
  onBack: () => void;
  onResetMemories: () => void;
  canContinue: boolean;
  onContinueTraining: () => void;
  onStartTraining: () => void;
}) {
  const [tab, setTab] = useState<StatisticsTab>("overview");
  const [selectedAI, setSelectedAI] = useState(1);
  const [glossaryToast, setGlossaryToast] = useState<GlossaryItem | null>(null);
  const [selectedHistory, setSelectedHistory] =
    useState<HandHistoryRecord | null>(null);
  const [showMemoryReset, setShowMemoryReset] = useState(false);
  const totalHands = profile.history.length;
  const wins = profile.history.filter((record) => record.humanDelta > 0).length;
  const net = profile.history.reduce(
    (sum, record) => sum + record.humanDelta,
    0,
  );
  const chronologicalHistory = [...profile.history].reverse();
  const recentFive = chronologicalHistory.slice(-5);
  const recentFiveNet = recentFive.reduce(
    (sum, record) => sum + record.humanDelta,
    0,
  );
  const winningHands = profile.history.filter(
    (record) => record.humanDelta > 0,
  );
  const losingHands = profile.history.filter((record) => record.humanDelta < 0);
  const averageWin = winningHands.length
    ? Math.round(
        winningHands.reduce((sum, record) => sum + record.humanDelta, 0) /
          winningHands.length,
      )
    : 0;
  const averageLoss = losingHands.length
    ? Math.round(
        losingHands.reduce((sum, record) => sum + record.humanDelta, 0) /
          losingHands.length,
      )
    : 0;
  let runningProfit = 0;
  let profitPeak = 0;
  let maximumDrawdown = 0;
  chronologicalHistory.forEach((record) => {
    runningProfit += record.humanDelta;
    profitPeak = Math.max(profitPeak, runningProfit);
    maximumDrawdown = Math.min(maximumDrawdown, runningProfit - profitPeak);
  });
  const largestLoss = losingHands.reduce<HandHistoryRecord | null>(
    (worst, record) =>
      !worst || record.humanDelta < worst.humanDelta ? record : worst,
    null,
  );
  const profiles = players
    .filter((player) => !player.isHuman)
    .map((player) => {
      const existing = profile.aiProfiles[player.id];
      return (
        existing ?? {
          playerId: player.id,
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
        }
      );
    });
  const activeProfile =
    profiles.find((item) => item.playerId === selectedAI) ?? profiles[0];

  useEffect(() => {
    if (!glossaryToast) return;
    const timer = window.setTimeout(() => setGlossaryToast(null), 4600);
    return () => window.clearTimeout(timer);
  }, [glossaryToast]);

  useEffect(() => {
    if (!glossaryToast) return;
    function closeGlossary(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setGlossaryToast(null);
      }
    }
    window.addEventListener("keydown", closeGlossary);
    return () => window.removeEventListener("keydown", closeGlossary);
  }, [glossaryToast]);

  return (
    <main className="app-page light-page statistics-page">
      <PageHeader title="历史统计" onBack={onBack} />
      <div className="statistics-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "overview"}
          className={tab === "overview" ? "is-selected" : ""}
          onClick={() => setTab("overview")}
        >
          <AppIcon name="history" />
          <span>数据统计</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === "profiles"}
          className={tab === "profiles" ? "is-selected" : ""}
          onClick={() => setTab("profiles")}
        >
          <AppIcon name="profile" />
          <span>AI 画像</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === "recent"}
          className={tab === "recent" ? "is-selected" : ""}
          onClick={() => setTab("recent")}
        >
          <AppIcon name="cards" />
          <span>最近 30 手</span>
        </button>
      </div>

      {tab === "overview" ? (
        <section key="overview" className="statistics-content">
          <div className="overview-hero">
            <span>
              <small>当前小鱼干</small>
              <strong>{profile.chips.toLocaleString()}</strong>
            </span>
            <span>
              <small>累计盈亏</small>
              <strong className={net >= 0 ? "positive" : "negative"}>
                {net >= 0 ? "+" : ""}
                {net}
              </strong>
            </span>
          </div>
          {totalHands === 0 ? (
            <div className="statistics-first-hand">
              <span className="empty-card-mark" aria-hidden="true">
                <i />
                <i />
              </span>
              <h2>完成第一手，开始记录训练数据</h2>
              <p>胜率、盈亏趋势和复盘建议会在牌局结束后自动生成。</p>
              <TrainingEntryButton
                canContinue={canContinue}
                onContinue={onContinueTraining}
                onNewGame={onStartTraining}
              />
            </div>
          ) : (
            <>
              <div className="metrics-grid">
            <Metric label="记录手数" value={`${totalHands}`} />
            <Metric label="胜率" value={percentage(wins, totalHands)} />
            <Metric
              label="摊牌次数"
              value={`${profile.history.filter((record) => record.showdown).length}`}
            />
            <Metric
              label="最大单手盈利"
              value={`+${Math.max(0, ...profile.history.map((record) => record.humanDelta))}`}
            />
              </div>
              <ProfitTrendChart records={chronologicalHistory} />
              <section className="reflection-dashboard">
            <header>
              <div>
                <h2>近期状态与复盘</h2>
                <p>把盈亏拆成趋势和波动，避免只看最终总数。</p>
              </div>
              <strong className={recentFiveNet >= 0 ? "positive" : "negative"}>
                近 {recentFive.length || 0} 手{" "}
                {formatSignedChips(recentFiveNet)}
              </strong>
            </header>
            <div className="reflection-metrics">
              <span>
                <small>盈利手平均</small>
                <b className="positive">{formatSignedChips(averageWin)}</b>
              </span>
              <span>
                <small>亏损手平均</small>
                <b className="negative">{formatSignedChips(averageLoss)}</b>
              </span>
              <span>
                <small>最大回撤</small>
                <b className={maximumDrawdown < 0 ? "negative" : ""}>
                  {formatSignedChips(maximumDrawdown)}
                </b>
              </span>
              <span>
                <small>盈利手占比</small>
                <b>{percentage(wins, totalHands)}</b>
              </span>
            </div>
            {largestLoss ? (
              <button
                type="button"
                className="review-hand-callout"
                onClick={() => setSelectedHistory(largestLoss)}
              >
                <span>
                  <small>优先复盘</small>
                  <strong>第 {largestLoss.handNumber} 手 · 最大单手亏损</strong>
                  <p>{largestLoss.detail}</p>
                </span>
                <b className="negative">
                  {formatSignedChips(largestLoss.humanDelta)}
                </b>
                <span className="history-detail-cue">
                  <AppIcon name="detail" /> 查看明细
                </span>
              </button>
            ) : (
              <p className="reflection-empty">
                完成更多牌局后，这里会给出优先复盘建议。
              </p>
            )}
              </section>
              <section className="learning-summary">
            <h2>训练进度</h2>
            <p>
              数据来自当前浏览器已完成的牌局。随着手数增加，AI 画像中的
              VPIP、PFR、3Bet 与 AF 会逐步稳定。
            </p>
            <div className="progress-track">
              <i style={{ width: `${Math.min(100, totalHands * 3.33)}%` }} />
            </div>
            <small>{totalHands} / 30 手基础样本</small>
              </section>
            </>
          )}
        </section>
      ) : null}

      {tab === "profiles" ? (
        <section key="profiles" className="statistics-content profile-content">
          <div className="profile-selector">
            {profiles.map((item) => {
              const player = players[item.playerId];
              return (
                <button
                  key={item.playerId}
                  className={selectedAI === item.playerId ? "is-selected" : ""}
                  aria-pressed={selectedAI === item.playerId}
                  onClick={() => setSelectedAI(item.playerId)}
                >
                  <PlayerAvatar player={player} size="small" />
                  <span className="profile-selector-label">{item.name}</span>
                </button>
              );
            })}
          </div>
          {activeProfile && activeProfile.handsPlayed < 8 ? (
            <div className="profile-baseline-state">
              <PlayerAvatar
                player={players[activeProfile.playerId]}
                size="normal"
              />
              <h2>还在认识{activeProfile.name}</h2>
              <p>
                完成至少 8 手后，再展示打法指标和对你的针对性调整，避免用零样本制造结论。
              </p>
              <span>{activeProfile.handsPlayed} / 8 手</span>
              <TrainingEntryButton
                canContinue={canContinue}
                onContinue={onContinueTraining}
                onNewGame={onStartTraining}
              />
            </div>
          ) : activeProfile ? (
            <>
              <AIProfileCard
                key={activeProfile.playerId}
                profile={activeProfile}
                player={players[activeProfile.playerId]}
                onExplain={setGlossaryToast}
              />
              <button
                type="button"
                className="memory-reset-button"
                onClick={() => setShowMemoryReset(true)}
              >
                清除五位对手的长期记忆
              </button>
            </>
          ) : null}
        </section>
      ) : null}

      {tab === "recent" ? (
        <section key="recent" className="statistics-content recent-list">
          {profile.history.length ? (
            profile.history.map((record) => {
              const humanParticipant = record.participants.find(
                (participant) => participant.isHuman,
              );
              const humanHand = evaluateRecordedHand(
                record.holeCards,
                record.communityCards,
              );
              return (
                <button
                  type="button"
                  key={record.id}
                  className="history-record"
                  onClick={() => setSelectedHistory(record)}
                  aria-label={`查看第 ${record.handNumber} 手明细`}
                >
                  <div>
                    <small>第 {record.handNumber} 手</small>
                    <strong>{record.title}</strong>
                    <p>{record.detail}</p>
                    <p className="history-readable-cards">
                      手牌：{readableCardsLabel(record.holeCards)}
                    </p>
                    <p className="history-readable-board">
                      公共牌：
                      {record.communityCards.length
                        ? readableCardsLabel(record.communityCards)
                        : "未发公共牌"}
                    </p>
                    <p className="history-readable-result">
                      {humanHand
                        ? `${describeEvaluatedHand(humanHand)} · 最佳五张：${readableCardsLabel(humanHand.cards)}`
                        : humanParticipant?.status === "folded"
                          ? "本手已弃牌，未形成五张牌型"
                          : "未进入完整牌面"}
                    </p>
                  </div>
                  <div className="history-cards">
                    {record.holeCards.map((card, index) => (
                      <PlayingCard
                        key={`${card.suit}-${card.rank}-${index}`}
                        card={card}
                        compact
                        previewable={false}
                      />
                    ))}
                  </div>
                  <b
                    className={record.humanDelta >= 0 ? "positive" : "negative"}
                  >
                    {record.humanDelta >= 0 ? "+" : ""}
                    {record.humanDelta}
                  </b>
                  <span className="history-detail-cue">
                    <AppIcon name="detail" />
                    明细
                  </span>
                </button>
              );
            })
          ) : (
            <div className="empty-state">
              <span className="empty-card-mark" aria-hidden="true">
                <i />
                <i />
              </span>
              <h2>还没有完成的牌局</h2>
              <p>完成第一手后，这里会保存最近 30 手记录。</p>
              <TrainingEntryButton
                canContinue={canContinue}
                onContinue={onContinueTraining}
                onNewGame={onStartTraining}
              />
            </div>
          )}
        </section>
      ) : null}

      {glossaryToast ? (
        <aside className="glossary-toast" role="status" aria-live="polite">
          <span aria-hidden="true">?</span>
          <div>
            <small>{glossaryToast.term}</small>
            <strong>{glossaryToast.name}</strong>
            <p>
              {glossaryToast.description}
              <br />
              {glossaryToast.detail}
            </p>
          </div>
          <button
            aria-label="关闭术语解释"
            onClick={() => setGlossaryToast(null)}
          >
            ×
          </button>
        </aside>
      ) : null}

      {selectedHistory ? (
        <HistoryDetailModal
          record={selectedHistory}
          players={players}
          onClose={() => setSelectedHistory(null)}
        />
      ) : null}
      {showMemoryReset ? (
        <ConfirmDialog
          eyebrow="对手记忆"
          title="让对手重新认识你？"
          description="只清除五位对手学到的打法画像；小鱼干、牌桌存档和最近记录都会保留。"
          confirmLabel="清除记忆"
          onCancel={() => setShowMemoryReset(false)}
          onConfirm={() => {
            onResetMemories();
            setShowMemoryReset(false);
          }}
        />
      ) : null}
    </main>
  );
}

function HistoryDetailModal({
  record,
  players,
  onClose,
}: {
  record: HandHistoryRecord;
  players: Player[];
  onClose: () => void;
}) {
  const dialogRef = useDialogFocus<HTMLElement>(true, onClose);

  const settlementParticipants = players
    .map(
      (player) =>
        record.participants.find(
          (participant) => participant.playerId === player.id,
        ) ?? {
          playerId: player.id,
          name: player.name,
          isHuman: player.isHuman,
          contribution: 0,
          payout: 0,
          net: 0,
          holeCards: [],
          handName: null,
          isWinner: false,
          status: "out",
        },
    )
    .sort(
      (left, right) =>
        Number(right.isWinner) - Number(left.isWinner) ||
        left.playerId - right.playerId,
    );

  function publicDecisionSummary(entry: HandHistoryRecord["actions"][number]) {
    const factors = entry.aiDecision?.publicFactors;
    if (!factors) return null;
    const cues: string[] = [];
    if (factors.pressure >= 0.2) cues.push("跟注价格带来压力");
    if (factors.positionBonus >= 0.05) cues.push("处在有利位置");
    if (factors.stackToPotRatio <= 1.5) cues.push("可用小鱼干已经不多");
    if (factors.boardWetness >= 0.62) cues.push("公共牌连接较强");
    if (factors.hasInitiative) cues.push("延续了前街主动权");
    if (!cues.length) cues.push("当前公开行动线较简单");
    return cues.slice(0, 2).join(" · ");
  }

  return (
    <div className="modal-backdrop history-detail-backdrop" onClick={onClose}>
      <section
        ref={dialogRef}
        className="history-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <small>第 {record.handNumber} 手</small>
            <h2 id="history-detail-title">{record.title}</h2>
            <p>{record.detail}</p>
          </div>
          <b className={record.humanDelta >= 0 ? "positive" : "negative"}>
            {record.humanDelta >= 0 ? "+" : ""}
            {record.humanDelta.toLocaleString()}
          </b>
          <button type="button" aria-label="关闭牌局明细" onClick={onClose}>
            ×
          </button>
        </header>

        <section className="history-detail-board">
          <span>
            <small>你的手牌</small>
            <b>
              {record.holeCards.map((card, index) => (
                <PlayingCard
                  key={`${card.suit}-${card.rank}-${index}`}
                  card={card}
                  compact
                />
              ))}
            </b>
            <em>{readableCardsLabel(record.holeCards)}</em>
          </span>
          <span>
            <small>公共牌</small>
            <b>
              {record.communityCards.length
                ? record.communityCards.map((card, index) => (
                    <PlayingCard
                      key={`${card.suit}-${card.rank}-${index}`}
                      card={card}
                      compact
                    />
                  ))
                : "未发公共牌"}
            </b>
            <em>
              {record.communityCards.length
                ? `翻牌：${readableCardsLabel(record.communityCards.slice(0, 3))}${
                    record.communityCards[3]
                      ? ` · 转牌：${readableCardLabel(record.communityCards[3])}`
                      : ""
                  }${
                    record.communityCards[4]
                      ? ` · 河牌：${readableCardLabel(record.communityCards[4])}`
                      : ""
                  }`
                : "本手未发公共牌"}
            </em>
          </span>
        </section>

        <div className="history-detail-scroll">
          <section className="history-detail-section">
            <h3>结算明细</h3>
            {settlementParticipants.length ? (
              <ol className="history-settlement">
                {settlementParticipants.map((participant) => {
                  const player = players[participant.playerId];
                  const participantHand = evaluateRecordedHand(
                    participant.holeCards,
                    record.communityCards,
                  );
                  return (
                    <li
                      key={participant.playerId}
                      className={participant.isWinner ? "is-winner" : ""}
                    >
                      {player ? (
                        <PlayerAvatar player={player} size="small" />
                      ) : (
                        <span />
                      )}
                      <div>
                        <strong>
                          {participant.name}
                          {participant.isHuman ? "（你）" : ""}
                        </strong>
                        <span>
                          {participant.holeCards.length ? (
                            <>
                              <span
                                className="history-hole-card-art"
                                aria-hidden="true"
                              >
                                {participant.holeCards.map((card, index) => (
                                  <PlayingCard
                                    key={`${card.suit}-${card.rank}-${index}`}
                                    card={card}
                                    compact
                                  />
                                ))}
                              </span>
                              <small className="history-hole-card-text">
                                手牌：
                                {readableCardsLabel(participant.holeCards)}
                              </small>
                            </>
                          ) : participant.contribution === 0 ? (
                            "未参与"
                          ) : participant.status === "folded" ? (
                            "已弃牌"
                          ) : (
                            "未亮牌"
                          )}
                        </span>
                      </div>
                      <p>
                        <strong>
                          {participantHand
                            ? describeEvaluatedHand(participantHand)
                            : (participant.handName ??
                              (participant.isWinner
                                ? "未摊牌获胜"
                                : participant.contribution === 0
                                  ? "未参与底池"
                                  : participant.status === "folded"
                                    ? "已弃牌"
                                    : "未亮牌"))}
                        </strong>
                        {participantHand ? (
                          <small className="history-best-five">
                            最佳五张：
                            {readableCardsLabel(participantHand.cards)}
                          </small>
                        ) : null}
                        <small>
                          投喂 {participant.contribution.toLocaleString()} ·
                          收回 {participant.payout.toLocaleString()}
                        </small>
                      </p>
                      <b
                        className={
                          participant.net >= 0 ? "positive" : "negative"
                        }
                      >
                        {participant.net >= 0 ? "+" : ""}
                        {participant.net.toLocaleString()}
                      </b>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="history-legacy-note">
                这手牌由旧版本保存，没有完整结算明细。
              </p>
            )}
          </section>

          <section className="history-detail-section">
            <h3>行动过程</h3>
            {record.actions.length ? (
              <ol className="history-timeline">
                {record.actions.map((entry) => {
                  const publicSummary = publicDecisionSummary(entry);
                  return (
                    <li key={entry.id}>
                      <small>{STREET_LABELS[entry.street]}</small>
                      <strong>{entry.playerName}</strong>
                      <span>{entry.label}</span>
                      {publicSummary ? (
                        <em>公开线索：{publicSummary}</em>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="history-legacy-note">
                这手牌由旧版本保存，没有逐步行动记录。
              </p>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  glossary,
  onExplain,
}: {
  label: string;
  value: string;
  glossary?: GlossaryItem;
  onExplain?: (item: GlossaryItem) => void;
}) {
  if (glossary && onExplain) {
    return (
      <button
        className="metric metric-explainable"
        type="button"
        aria-label={`${glossary.term} ${glossary.name}，点击查看解释`}
        data-tooltip={`${glossary.name}：${glossary.description}`}
        onClick={() => onExplain(glossary)}
      >
        <small>
          {label}
          <i aria-hidden="true">?</i>
        </small>
        <strong>{value}</strong>
      </button>
    );
  }

  return (
    <span className="metric">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function ProfitTrendChart({ records }: { records: HandHistoryRecord[] }) {
  const width = 960;
  const height = 250;
  const padding = { top: 22, right: 22, bottom: 34, left: 68 };
  const cumulative = [0];
  records.forEach((record) => {
    cumulative.push(cumulative[cumulative.length - 1] + record.humanDelta);
  });
  const rawMinimum = Math.min(0, ...cumulative);
  const rawMaximum = Math.max(0, ...cumulative);
  const range = Math.max(100, rawMaximum - rawMinimum);
  const minimum = rawMinimum - range * 0.12;
  const maximum = rawMaximum + range * 0.12;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const x = (index: number) =>
    padding.left + (index / Math.max(1, cumulative.length - 1)) * chartWidth;
  const y = (value: number) =>
    padding.top + ((maximum - value) / (maximum - minimum)) * chartHeight;
  const points = cumulative.map((value, index) => ({
    value,
    x: x(index),
    y: y(value),
  }));
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");
  const zeroY = y(0);
  const areaPath = `${linePath} L${points.at(-1)?.x ?? padding.left},${zeroY} L${padding.left},${zeroY} Z`;
  const ticks = [rawMaximum, (rawMaximum + rawMinimum) / 2, rawMinimum];

  return (
    <section className="profit-trend-card">
      <header>
        <div>
          <h2>累计盈亏曲线</h2>
          <p>按完成顺序展示最近 {records.length} 手，零线以上代表累计盈利。</p>
        </div>
        <strong
          className={(cumulative.at(-1) ?? 0) >= 0 ? "positive" : "negative"}
        >
          {formatSignedChips(cumulative.at(-1) ?? 0)}
        </strong>
      </header>
      {records.length ? (
        <>
          <div className="profit-chart-scroll">
            <svg
              className="profit-chart"
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label={`最近 ${records.length} 手累计盈亏曲线，当前 ${formatSignedChips(cumulative.at(-1) ?? 0)}`}
            >
              <defs>
                <linearGradient
                  id="profit-area-fill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0" stopColor="#2f6aea" stopOpacity="0.24" />
                  <stop offset="1" stopColor="#2f6aea" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {ticks.map((tick, index) => (
                <g key={`${tick}-${index}`}>
                  <line
                    x1={padding.left}
                    x2={width - padding.right}
                    y1={y(tick)}
                    y2={y(tick)}
                    className="profit-grid-line"
                  />
                  <text x={padding.left - 12} y={y(tick) + 4} textAnchor="end">
                    {Math.round(tick).toLocaleString()}
                  </text>
                </g>
              ))}
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={zeroY}
                y2={zeroY}
                className="profit-zero-line"
              />
              <path d={areaPath} fill="url(#profit-area-fill)" />
              <path d={linePath} className="profit-line" />
              {points.slice(1).map((point, index) => (
                <circle
                  key={records[index].id}
                  cx={point.x}
                  cy={point.y}
                  r={index === records.length - 1 ? 5 : 3}
                  className="profit-point"
                >
                  <title>
                    第 {records[index].handNumber} 手：本手{" "}
                    {formatSignedChips(records[index].humanDelta)}，累计{" "}
                    {formatSignedChips(point.value)}
                  </title>
                </circle>
              ))}
              <text x={padding.left} y={height - 9}>
                开始
              </text>
              <text x={width - padding.right} y={height - 9} textAnchor="end">
                第 {records.at(-1)?.handNumber} 手
              </text>
            </svg>
          </div>
          <details className="trend-data-table">
            <summary>查看曲线逐手数据</summary>
            <ol>
              {records.map((record, index) => (
                <li key={record.id}>
                  <span>第 {record.handNumber} 手</span>
                  <span>本手 {formatSignedChips(record.humanDelta)}</span>
                  <b>累计 {formatSignedChips(cumulative[index + 1])}</b>
                </li>
              ))}
            </ol>
          </details>
        </>
      ) : (
        <p className="chart-empty">完成第一手后，这里会开始绘制盈亏曲线。</p>
      )}
    </section>
  );
}

function AIProfileCard({
  profile,
  player,
  onExplain,
}: {
  profile: AIProfileStats;
  player: Player;
  onExplain: (item: GlossaryItem) => void;
}) {
  const style = player.style;
  const af =
    profile.callActions === 0
      ? profile.aggressiveActions.toFixed(2)
      : (profile.aggressiveActions / profile.callActions).toFixed(2);
  const sampleLabel =
    profile.handsPlayed < 10
      ? "样本较少"
      : profile.handsPlayed < 30
        ? "学习中"
        : "画像稳定";
  const read = profile.learning.humanRead;
  const readRate = (value: number, total: number) =>
    total > 0 ? percentage(value, total) : "待观察";
  const humanAggression = readRate(read.aggressiveActions, read.totalActions);
  const foldToPressure = readRate(
    read.foldsToAggression,
    read.pressureOpportunities,
  );
  const snapshots = profile.learning.snapshots;
  const latestSnapshot = snapshots.at(-1);
  const previousSnapshot = snapshots.at(-2);
  const latestProfit = latestSnapshot
    ? latestSnapshot.totalProfit - (previousSnapshot?.totalProfit ?? 0)
    : 0;
  const foldRate =
    read.pressureOpportunities > 0
      ? read.foldsToAggression / read.pressureOpportunities
      : 0;
  const continueRate =
    read.pressureOpportunities > 0
      ? read.continuesVsAggression / read.pressureOpportunities
      : 0;
  const vpipRate = read.vpipHands / Math.max(1, read.handsObserved);
  const aggressionRate =
    read.aggressiveActions / Math.max(1, read.totalActions);
  const counterMoves: string[] = [];
  if (foldRate > 0.48)
    counterMoves.push("你面对压力弃牌偏多，它会增加主动施压");
  if (continueRate > 0.52)
    counterMoves.push("你面对下注继续偏多，它会减少纯诈唬、偏向价值下注");
  if (vpipRate > 0.58)
    counterMoves.push("你入池范围较宽，它会用更强的范围向你取价值");
  if (vpipRate < 0.28 && read.handsObserved >= 3)
    counterMoves.push("你选牌偏紧，它会更积极争夺无人进入的底池");
  if (aggressionRate > 0.4)
    counterMoves.push("你行动较主动，它会收紧边缘牌的继续范围");
  if (!counterMoves.length)
    counterMoves.push("当前没有足够强的单一特征，它会维持原风格并继续观察");

  return (
    <article className="ai-profile-card">
      <header className="profile-identity">
        <PlayerAvatar player={player} />
        <div>
          <h2>{profile.name}</h2>
          <span className="profile-style-tag">{profile.styleName}</span>
          <p>
            {sampleLabel} · {style ? AI_ENGINE_NAMES[style.key] : "自适应引擎"}{" "}
            · 样本 {profile.handsPlayed} 手
          </p>
        </div>
      </header>
      <h3>对局数据</h3>
      <div className="metrics-grid">
        <Metric
          label="VPIP"
          value={percentage(profile.vpipHands, profile.handsPlayed)}
          glossary={POKER_GLOSSARY.VPIP}
          onExplain={onExplain}
        />
        <Metric
          label="PFR"
          value={percentage(profile.pfrHands, profile.handsPlayed)}
          glossary={POKER_GLOSSARY.PFR}
          onExplain={onExplain}
        />
        <Metric
          label="3Bet"
          value={percentage(profile.threeBetHands, profile.handsPlayed)}
          glossary={POKER_GLOSSARY["3Bet"]}
          onExplain={onExplain}
        />
        <Metric
          label="AF"
          value={af}
          glossary={POKER_GLOSSARY.AF}
          onExplain={onExplain}
        />
        <Metric
          label="累计盈亏"
          value={`${profile.totalProfit >= 0 ? "+" : ""}${profile.totalProfit}`}
        />
      </div>
      <section className="profile-insight">
        <div className="learning-title">
          <div>
            <h3>最近学到的调整</h3>
            <p>相对“{profile.styleName}”原始性格，看看它最近有没有改变打法</p>
          </div>
          <span className="learning-confidence">
            <small>样本进度</small>
            <strong>
              {style
                ? `${Math.min(profile.handsPlayed, style.memoryWindow)}/${style.memoryWindow} 手`
                : `${profile.handsPlayed} 手`}
            </strong>
          </span>
        </div>
        <LearningSparkline profile={profile} />
        <div className="learning-facts">
          <span>
            <small>尝试新打法</small>
            <b>
              {Math.round(
                (style
                  ? currentAIExplorationRate(style, profile.learning)
                  : 0) * 100,
              )}
              % 概率
            </b>
          </span>
          <span>
            <small>学习曲线记录</small>
            <b>{profile.learning.snapshots.length} 手</b>
          </span>
          <span>
            <small>观察你的行动</small>
            <b>{profile.learning.humanRead.handsObserved} 手</b>
          </span>
          <span>
            <small>最近一手结果</small>
            <b className={latestProfit >= 0 ? "positive" : "negative"}>
              {formatSignedChips(latestProfit)}
            </b>
          </span>
        </div>
        <section className="opponent-model">
          <header>
            <div>
              <h3>它目前怎样看你</h3>
              <p>{describeHumanRead(read).replace("对你的判断：", "")}</p>
            </div>
            <span>{read.handsObserved < 8 ? "初步判断" : "持续更新"}</span>
          </header>
          <div className="opponent-model-metrics">
            <span>
              <small>你的入池率</small>
              <b>{readRate(read.vpipHands, read.handsObserved)}</b>
            </span>
            <span>
              <small>你的翻前加注率</small>
              <b>{readRate(read.pfrHands, read.handsObserved)}</b>
            </span>
            <span>
              <small>你的行动主动率</small>
              <b>{humanAggression}</b>
            </span>
            <span>
              <small>面对压力弃牌</small>
              <b>{foldToPressure}</b>
            </span>
          </div>
          <div className="opponent-response">
            <small>因此它倾向于</small>
            <ul>
              {counterMoves.slice(0, 2).map((move) => (
                <li key={move}>{move}</li>
              ))}
            </ul>
            <p>
              判断依据：观察 {read.handsObserved} 手、{read.totalActions} 次行动
              {read.pressureOpportunities
                ? `、${read.pressureOpportunities} 次面对下注压力`
                : ""}
              。样本增加后会继续修正。
            </p>
          </div>
        </section>
      </section>
    </article>
  );
}

function formatLearningDelta(value: number): string {
  const percent = value * 100;
  if (Math.abs(percent) < 0.05 && Math.abs(percent) > 0.0001) {
    return `${percent >= 0 ? "+" : "−"}<0.1%`;
  }
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%`;
}

function LearningChangeChart({
  snapshots,
}: {
  snapshots: AIProfileStats["learning"]["snapshots"];
}) {
  const source = snapshots.slice(-30);
  const width = 900;
  const height = 210;
  const padding = { top: 28, right: 28, bottom: 34, left: 55 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maximumMagnitude = Math.max(
    0.002,
    ...source.flatMap((snapshot) => [
      Math.abs(snapshot.aggressionBias),
      Math.abs(snapshot.tightnessBias),
      Math.abs(snapshot.bluffBias),
    ]),
  );
  const x = (index: number) =>
    padding.left + (index / Math.max(1, source.length - 1)) * chartWidth;
  const y = (value: number) =>
    padding.top +
    ((maximumMagnitude - value) / (maximumMagnitude * 2)) * chartHeight;
  const series = [
    {
      key: "aggressionBias" as const,
      label: "主动进攻",
      className: "aggression",
    },
    {
      key: "tightnessBias" as const,
      label: "起手牌范围",
      className: "tightness",
    },
    { key: "bluffBias" as const, label: "诈唬倾向", className: "bluff" },
  ];

  return (
    <section className="learning-change-chart">
      <header>
        <div>
          <h4>多局学习变化</h4>
          <p>
            曲线展示最近 {source.length}{" "}
            手相对原始性格的变化，零线表示原始打法。
          </p>
        </div>
        <div className="learning-chart-legend" aria-label="曲线图例">
          {series.map((item) => (
            <span className={`is-${item.className}`} key={item.key}>
              <i aria-hidden="true" /> {item.label}
            </span>
          ))}
        </div>
      </header>
      <div className="learning-chart-scroll">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`AI 最近 ${source.length} 手的学习调整趋势`}
        >
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={y(0)}
            y2={y(0)}
            className="learning-zero-line"
          />
          <text
            x={padding.left - 10}
            y={y(maximumMagnitude) + 4}
            textAnchor="end"
          >
            +{(maximumMagnitude * 100).toFixed(1)}%
          </text>
          <text x={padding.left - 10} y={y(0) + 4} textAnchor="end">
            0
          </text>
          <text
            x={padding.left - 10}
            y={y(-maximumMagnitude) + 4}
            textAnchor="end"
          >
            −{(maximumMagnitude * 100).toFixed(1)}%
          </text>
          {series.map((item) => {
            const path = source
              .map(
                (snapshot, index) =>
                  `${index === 0 ? "M" : "L"}${x(index)},${y(snapshot[item.key])}`,
              )
              .join(" ");
            const latest = source.at(-1);
            return (
              <g
                className={`learning-series is-${item.className}`}
                key={item.key}
              >
                <path d={path} />
                {latest ? (
                  <circle
                    cx={x(source.length - 1)}
                    cy={y(latest[item.key])}
                    r="5"
                  >
                    <title>
                      {item.label}：{formatLearningDelta(latest[item.key])}
                    </title>
                  </circle>
                ) : null}
              </g>
            );
          })}
          <text x={padding.left} y={height - 8}>
            第 {source[0]?.handIndex} 手
          </text>
          <text x={width - padding.right} y={height - 8} textAnchor="end">
            第 {source.at(-1)?.handIndex} 手
          </text>
        </svg>
      </div>
    </section>
  );
}

function LearningSparkline({ profile }: { profile: AIProfileStats }) {
  const source = profile.learning.snapshots.slice(-30);
  const baselineTarget = 8;

  if (source.length < baselineTarget) {
    return (
      <div className="learning-baseline" role="status">
        <div>
          <strong>正在建立行为基线</strong>
          <span>再观察 {baselineTarget - source.length} 手后生成可靠趋势</span>
        </div>
        <div
          className="learning-baseline-progress"
          aria-label={`基线样本 ${source.length}/${baselineTarget} 手`}
        >
          {Array.from({ length: baselineTarget }, (_, index) => (
            <i
              className={index < source.length ? "is-filled" : ""}
              key={index}
            />
          ))}
        </div>
        <small>
          {source.length} / {baselineTarget} 手
        </small>
      </div>
    );
  }

  const tracks = [
    {
      key: "aggressionBias" as const,
      label: "主动进攻",
      negativeEnd: "更克制",
      positiveEnd: "更主动",
      negativeText: "比原来的进攻节奏更克制",
      positiveText: "比原来更愿意下注和加注",
      neutralText: "保持原来的进攻节奏",
      className: "aggression",
    },
    {
      key: "tightnessBias" as const,
      label: "起手牌范围",
      negativeEnd: "打得更宽",
      positiveEnd: "选牌更紧",
      negativeText: "比原来愿意多打一些起手牌",
      positiveText: "比原来少打一些边缘起手牌",
      neutralText: "起手牌选择基本没变",
      className: "tightness",
    },
    {
      key: "bluffBias" as const,
      label: "诈唬频率",
      negativeEnd: "更少",
      positiveEnd: "更多",
      negativeText: "比原来减少了诈唬尝试",
      positiveText: "比原来增加了诈唬尝试",
      neutralText: "诈唬频率基本没变",
      className: "bluff",
    },
  ];

  return (
    <>
      <LearningChangeChart snapshots={source} />
      <div className="learning-tracks" aria-label="相对原始性格的当前策略调整">
        {tracks.map((track) => {
          const current = source[source.length - 1][track.key];
          const isNeutral = Math.abs(current) < 0.0005;
          const status = isNeutral
            ? "当前持平"
            : current > 0
              ? track.positiveEnd
              : track.negativeEnd;
          const description = isNeutral
            ? `多局信号暂时相互抵消，${track.neutralText}`
            : current > 0
              ? track.positiveText
              : track.negativeText;
          const markerPosition =
            50 + Math.max(-0.3, Math.min(0.3, current)) * 150;
          return (
            <div
              className={`learning-track is-${track.className}`}
              key={track.key}
            >
              <div className="learning-track-copy">
                <strong>{track.label}</strong>
                <span className={isNeutral ? "is-neutral" : ""}>{status}</span>
                <small>{description}</small>
              </div>
              <div
                className="learning-comparison"
                role="img"
                aria-label={`${track.label}：${status}，相对原始性格 ${formatLearningDelta(current)}`}
              >
                <small>{track.negativeEnd}</small>
                <div className="learning-scale">
                  <i aria-hidden="true" />
                  <b
                    aria-hidden="true"
                    style={
                      {
                        "--marker-position": `${markerPosition}%`,
                      } as CSSProperties
                    }
                  />
                </div>
                <small>{track.positiveEnd}</small>
              </div>
              <span className="learning-delta">
                当前相对原始性格 {formatLearningDelta(current)}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function QuickBetPanel({
  game,
  human,
  callAmount,
  minRaiseTarget,
  maxRaiseTarget,
  onSelect,
  onCancel,
}: {
  game: GameState;
  human: Player;
  callAmount: number;
  minRaiseTarget: number;
  maxRaiseTarget: number;
  onSelect: (amount: number) => void;
  onCancel: () => void;
}) {
  const panelRef = useDialogFocus<HTMLDivElement>(true, onCancel);
  const options = [
    ["1/3", 0.33],
    ["1/2", 0.5],
    ["1x", 1],
    ["2x", 2],
    ["3x", 3],
  ] as const;
  const potAfterCall = game.pot + Math.min(callAmount, human.chips);

  return (
    <div
      ref={panelRef}
      className="quick-bet-panel"
      role="dialog"
      aria-modal="true"
      aria-label="快捷加注尺度"
      tabIndex={-1}
    >
      <header>
        <div>
          <small>QUICK RAISE</small>
          <strong>选择加注尺度</strong>
        </div>
        <button onClick={onCancel} aria-label="关闭快捷加注">
          ×
        </button>
      </header>
      <div>
        {options.map(([label, multiplier]) => {
          const raw =
            human.bet + callAmount + Math.round(potAfterCall * multiplier);
          const amount = Math.min(
            maxRaiseTarget,
            Math.max(minRaiseTarget, raw),
          );
          return (
            <button
              key={label}
              disabled={amount <= human.bet}
              onClick={() => onSelect(amount)}
            >
              <span>{label} 底池</span>
              <b>{amount.toLocaleString()}</b>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ActionDrawer({
  game,
  onClose,
}: {
  game: GameState;
  onClose: () => void;
}) {
  const drawerRef = useDialogFocus<HTMLElement>(true, onClose);
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        ref={drawerRef}
        className="action-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="本局行动记录"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <small>第 {game.handNumber} 局 · 最新行动在前</small>
            <h2>本局行动记录</h2>
          </div>
          <button onClick={onClose} aria-label="关闭行动记录">
            ×
          </button>
        </header>
        <div className="drawer-board">
          {Array.from({ length: 5 }, (_, index) =>
            game.communityCards[index] ? (
              <PlayingCard
                key={`${game.communityCards[index].suit}-${game.communityCards[index].rank}`}
                card={game.communityCards[index]}
                compact
              />
            ) : (
              <span className="drawer-card-slot" key={`drawer-slot-${index}`} />
            ),
          )}
        </div>
        <ol>
          {game.actionLog.length ? (
            game.actionLog.map((entry) => {
              const player = game.players[entry.playerId];
              return (
                <li key={entry.id}>
                  <PlayerAvatar player={player} size="small" />
                  <span>
                    <strong>{entry.playerName}</strong>
                    <small>{STREET_LABELS[entry.street]}</small>
                  </span>
                  <b>{entry.label}</b>
                </li>
              );
            })
          ) : (
            <li className="empty-drawer">本手还没有行动记录</li>
          )}
        </ol>
      </aside>
    </div>
  );
}

function HandResultModal({
  game,
  onExit,
  onNextHand,
  onRebuy,
}: {
  game: GameState;
  onExit: () => void;
  onNextHand: () => void;
  onRebuy: () => void;
}) {
  const resultRef = useDialogFocus<HTMLElement>(true, onExit);
  const result = game.result!;
  const human = game.players[HUMAN_ID];
  const potTotal = Object.values(result.payouts).reduce(
    (total, payout) => total + payout,
    0,
  );
  const winnerNames = result.winnerIds
    .map((playerId) =>
      playerId === HUMAN_ID ? "你" : game.players[playerId]?.name,
    )
    .filter(Boolean)
    .join("、");
  const headline = `${winnerNames} 赢得 ${potTotal.toLocaleString()}`;
  const firstWinner = game.players[result.winnerIds[0]];
  const winningHand =
    result.showdown &&
    firstWinner?.holeCards.length === 2 &&
    firstWinner.status !== "folded"
      ? evaluateBest([...firstWinner.holeCards, ...game.communityCards])
      : null;
  const outcomeDetail = result.showdown
    ? `${winningHand ? describeEvaluatedHand(winningHand) : "最佳牌型"} · 摊牌胜出`
    : "其他玩家均已弃牌";
  const boardStreets = [
    { label: "翻牌", cards: game.communityCards.slice(0, 3) },
    { label: "转牌", cards: game.communityCards.slice(3, 4) },
    { label: "河牌", cards: game.communityCards.slice(4, 5) },
  ].filter((street) => street.cards.length > 0);
  const settlementPlayers = [...game.players].sort(
    (left, right) =>
      Number(result.winnerIds.includes(right.id)) -
        Number(result.winnerIds.includes(left.id)) || left.id - right.id,
  );

  return (
    <div className="modal-backdrop result-backdrop">
      <section
        ref={resultRef}
        className="hand-result-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hand-result-title"
      >
        <header className="result-heading">
          <small>第 {game.handNumber} 手</small>
          <h2 id="hand-result-title">{headline}</h2>
          <p>{outcomeDetail}</p>
        </header>

        <div className="result-summary-grid" aria-label="本手结算摘要">
          <div
            className={`result-primary-stat ${
              result.humanDelta >= 0 ? "is-positive" : "is-negative"
            }`}
          >
            <small>本手盈亏</small>
            <strong>
              {result.humanDelta >= 0 ? "+" : ""}
              {result.humanDelta.toLocaleString()}
            </strong>
          </div>
          <div>
            <small>底池小鱼干</small>
            <strong>{potTotal.toLocaleString()}</strong>
          </div>
          <div>
            <small>你的投喂</small>
            <strong>{human.totalContribution.toLocaleString()}</strong>
          </div>
        </div>

        {result.showdown ? (
          <section className="result-board" aria-label="摊牌公共牌">
            <header>
              <div>
                <h3>公共牌</h3>
                <small>共 {game.communityCards.length} 张</small>
              </div>
              <div className="result-board-cards" aria-hidden="true">
                {game.communityCards.map((card, index) => (
                  <PlayingCard
                    key={`${card.suit}-${card.rank}-${index}`}
                    card={card}
                    compact
                  />
                ))}
              </div>
            </header>
            <div className="result-board-streets">
              {boardStreets.map((street) => (
                <div className="result-board-street" key={street.label}>
                  <small>{street.label}</small>
                  <strong>{readableCardsLabel(street.cards)}</strong>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="result-breakdown">
          <header>
            <h3>结算明细</h3>
            <span>
              {result.showdown
                ? result.winnerIds.length > 1
                  ? "平分或边池结算"
                  : "摊牌结算"
                : "其他玩家均已弃牌"}
            </span>
          </header>
          <ol>
            {settlementPlayers.map((player) => {
              const payout = result.payouts[player.id] ?? 0;
              const net = payout - player.totalContribution;
              const isWinner = result.winnerIds.includes(player.id);
              const revealCards =
                player.isHuman ||
                (result.showdown &&
                  player.status !== "folded" &&
                  player.status !== "out");
              const hand =
                result.showdown && player.status !== "folded"
                  ? evaluateBest([...player.holeCards, ...game.communityCards])
                  : null;

              return (
                <li
                  className={
                    isWinner ? "result-player is-winner" : "result-player"
                  }
                  key={player.id}
                >
                  <PlayerAvatar player={player} size="small" />
                  <div className="result-player-identity">
                    <strong>
                      {player.name}
                      {player.isHuman ? "（你）" : ""}
                    </strong>
                    {revealCards ? (
                      <>
                        <span className="result-hole-cards" aria-hidden="true">
                          {player.holeCards.map((card, index) => (
                            <PlayingCard
                              key={`${card.suit}-${card.rank}-${index}`}
                              card={card}
                              compact
                            />
                          ))}
                        </span>
                        <small className="result-hole-label">
                          手牌：{readableCardsLabel(player.holeCards)}
                        </small>
                      </>
                    ) : (
                      <span>
                        {player.totalContribution === 0
                          ? "未参与"
                          : player.status === "folded"
                            ? "已弃牌"
                            : "未摊牌"}
                      </span>
                    )}
                  </div>
                  <div className="result-player-hand">
                    <strong>
                      {hand
                        ? describeEvaluatedHand(hand)
                        : isWinner
                          ? "未摊牌获胜"
                          : player.totalContribution === 0
                            ? "未参与底池"
                            : player.status === "folded"
                              ? "已弃牌"
                              : "未亮牌"}
                    </strong>
                    {hand ? (
                      <small className="result-best-five">
                        最佳五张：{readableCardsLabel(hand.cards)}
                      </small>
                    ) : null}
                    <small>
                      投喂 {player.totalContribution.toLocaleString()} · 收回{" "}
                      {payout.toLocaleString()}
                    </small>
                  </div>
                  <b
                    className={
                      net > 0
                        ? "result-net is-positive"
                        : net < 0
                          ? "result-net is-negative"
                          : "result-net"
                    }
                  >
                    净 {net >= 0 ? "+" : ""}
                    {net.toLocaleString()}
                  </b>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="result-actions">
          <button onClick={onExit}>返回主页</button>
          {game.phase === "busted" ? (
            <button className="primary rebuy-action" onClick={onRebuy}>
              <span>补充 {STARTING_CHIPS.toLocaleString()} 小鱼干并继续</span>
              <small>仅用于牌局训练</small>
            </button>
          ) : (
            <button className="primary" onClick={onNextHand}>
              下一手
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function GameScreen({
  game,
  aiProfiles,
  hydrated,
  soundEnabled,
  onGameChange,
  onExit,
  onSoundToggle,
}: {
  game: GameState;
  aiProfiles: Record<number, AIProfileStats>;
  hydrated: boolean;
  soundEnabled: boolean;
  onGameChange: (game: GameState) => void;
  onExit: () => void;
  onSoundToggle: (enabled: boolean) => void;
}) {
  const [tableOverlay, setTableOverlay] = useState<TableOverlayState>(null);
  const [recentThinkingSteps, setRecentThinkingSteps] = useState<
    Record<number, string[]>
  >({});
  const [performanceBySeat, setPerformanceBySeat] = useState<
    Record<number, CharacterPerformance>
  >({});
  const [dialogueBySeat, setDialogueBySeat] = useState<Record<number, string>>(
    {},
  );
  const [tableInteraction, setTableInteraction] =
    useState<TableInteraction | null>(null);
  const [resultVisibleHand, setResultVisibleHand] = useState<string | null>(
    game.phase === "playing" ? null : game.handId,
  );
  const [dialogueMemory, setDialogueMemory] = useState<
    Record<number, { ids: string[]; families: string[] }>
  >({});
  const [personaStateBySeat, setPersonaStateBySeat] = useState<
    Record<number, PersonaState>
  >(() =>
    Object.fromEntries(
      game.players
        .filter((player) => !player.isHuman)
        .map((player) => [player.id, defaultPersonaState()]),
    ),
  );
  const performanceTimersRef = useRef<Record<number, number>>({});
  const dialogueTimersRef = useRef<Record<number, number>>({});
  const spokeBeforeActionRef = useRef<Record<number, boolean>>({});
  const resultTimerRef = useRef<number | null>(null);
  const presentationTimersRef = useRef<number[]>([]);
  const interactionSequenceRef = useRef(0);
  const interactionTimerRef = useRef<number | null>(null);
  const interactionSoundTimerRef = useRef<number | null>(null);
  const previousPresentationRef = useRef(buildPublicPresentationSnapshot(game));
  const [dismissedRebuyHand, setDismissedRebuyHand] = useState<number | null>(
    null,
  );
  const human = game.players[HUMAN_ID];
  const showActionLog = tableOverlay?.kind === "action-log";
  const showQuickBet = tableOverlay?.kind === "quick-bet";
  const interactionMenuSeatId =
    tableOverlay?.kind === "interaction" ? tableOverlay.seatId : null;
  const interactionMenuPlayer =
    interactionMenuSeatId === null
      ? null
      : (game.players[interactionMenuSeatId] ?? null);
  const legal = useMemo(() => legalActions(game, HUMAN_ID), [game]);
  const isHumanTurn =
    game.phase === "playing" && game.currentActor === HUMAN_ID;
  const thinkingId =
    game.phase === "playing" &&
    game.currentActor !== null &&
    game.currentActor !== HUMAN_ID
      ? game.currentActor
      : null;
  const recentStepsForThinkingPlayer =
    thinkingId === null
      ? EMPTY_THINKING_STEPS
      : (recentThinkingSteps[thinkingId] ?? EMPTY_THINKING_STEPS);
  const pendingAIAction = useMemo(() => {
    if (thinkingId === null) return null;
    const seed = aiTurnSeed(game, thinkingId, 0xa17dec);
    return chooseAIAction(
      game,
      thinkingId,
      seededRandom(seed),
      aiProfiles[thinkingId]?.learning,
      seed,
    );
  }, [aiProfiles, game, thinkingId]);
  const thinkingDialogueChoices: DialogueChoice[] = useMemo(() => {
    if (thinkingId === null) return [];
    const player = game.players[thinkingId];
    const memory = dialogueMemory[thinkingId] ?? {
      ids: [],
      families: [],
    };
    const choice = choosePersonaDialogue({
      archetype: player.style?.key ?? "balanced",
      trigger: "turn",
      seed: aiTurnSeed(game, thinkingId, 0x7e11),
      recentIds: memory.ids,
      recentFamilies: memory.families,
      context: {
        personaState: personaStateBySeat[thinkingId],
        pressure: pendingAIAction?.aiDecision?.publicFactors?.pressure,
      },
    });
    return choice ? [choice] : [];
  }, [
    dialogueMemory,
    game,
    pendingAIAction,
    personaStateBySeat,
    thinkingId,
  ]);
  const thinkingPlan: AIThinkingPlan | null = useMemo(() => {
    if (thinkingId === null || !pendingAIAction) return null;
    const random = seededRandom(aiTurnSeed(game, thinkingId, 0x51f15e));
    return createAIThinkingPlan(
      game,
      thinkingId,
      random,
      aiProfiles[thinkingId]?.learning,
      recentStepsForThinkingPlayer,
      {
        decisionDifficulty: pendingAIAction.aiDecision?.decisionDifficulty,
        personaState: personaStateBySeat[thinkingId],
      },
    );
  }, [
    aiProfiles,
    game,
    pendingAIAction,
    personaStateBySeat,
    recentStepsForThinkingPlayer,
    thinkingId,
  ]);
  const thinkingLabel = thinkingId === null ? null : "思考中";
  const rebuyNoticeText = game.rebuyPlayerIds.length
    ? `${game.rebuyPlayerIds
        .map((playerId) => game.players[playerId]?.name)
        .filter(Boolean)
        .join("、")} 补充了 ${STARTING_CHIPS.toLocaleString()} 小鱼干`
    : null;
  const rebuyNotice =
    rebuyNoticeText && dismissedRebuyHand !== game.handNumber
      ? rebuyNoticeText
      : null;
  const revealOpponents = game.result?.showdown === true;
  const opponents = {
    topLeft: game.players[2],
    topCenter: game.players[3],
    topRight: game.players[4],
    middleLeft: game.players[1],
    middleRight: game.players[5],
  };
  const dealSeatIds = game.players
    .map(
      (_, offset) =>
        game.players[(game.dealerId + offset + 1) % game.players.length],
    )
    .filter((player) => player.holeCards.length > 0)
    .map((player) => player.id);
  const dealOrderById = new Map(
    dealSeatIds.map((playerId, index) => [playerId, index]),
  );
  function act(type: ActionType, amount?: number) {
    setTableOverlay(null);
    unlockGameAudio(soundEnabled);
    onGameChange(applyAction(game, { playerId: HUMAN_ID, type, amount }));
  }

  function toggleInteractionMenu(seatId: number) {
    unlockGameAudio(soundEnabled);
    playGameSound("ui", soundEnabled, seatId % 5);
    setTableOverlay((current) =>
      current?.kind === "interaction" && current.seatId === seatId
        ? null
        : { kind: "interaction", seatId },
    );
  }

  function sendTableInteraction(
    targetId: number,
    kind: TableInteractionKind,
  ) {
    const target = game.players[targetId];
    if (!target || target.isHuman || target.status === "out") return;

    setTableOverlay(null);
    unlockGameAudio(soundEnabled);
    playGameSound("deal", soundEnabled, targetId % 5);
    interactionSequenceRef.current += 1;
    setTableInteraction({
      eventId: interactionSequenceRef.current,
      targetId,
      kind,
    });

    if (interactionTimerRef.current) {
      window.clearTimeout(interactionTimerRef.current);
    }
    if (interactionSoundTimerRef.current) {
      window.clearTimeout(interactionSoundTimerRef.current);
    }
    interactionSoundTimerRef.current = window.setTimeout(() => {
      playGameSound(kind === "flower" ? "ui" : "check", soundEnabled, 3);
      interactionSoundTimerRef.current = null;
    }, 520);
    interactionTimerRef.current = window.setTimeout(() => {
      setTableInteraction((current) =>
        current?.eventId === interactionSequenceRef.current ? null : current,
      );
      interactionTimerRef.current = null;
    }, 1_320);
  }

  function toggleSound() {
    const next = !soundEnabled;
    onSoundToggle(next);
    if (next) {
      unlockGameAudio(true);
      syncTableAmbience(true);
      playGameSound("ui", true);
    } else {
      syncTableAmbience(false);
    }
  }

  useEffect(() => {
    function syncForVisibility() {
      syncTableAmbience(soundEnabled && document.visibilityState === "visible");
    }
    syncForVisibility();
    document.addEventListener("visibilitychange", syncForVisibility);
    return () => {
      document.removeEventListener("visibilitychange", syncForVisibility);
      syncTableAmbience(false);
    };
  }, [soundEnabled]);

  useEffect(() => {
    if (
      !hydrated ||
      game.phase !== "playing" ||
      thinkingId === null ||
      !thinkingPlan ||
      !pendingAIAction
    ) {
      return;
    }
    const actorId = thinkingId;
    const timer = window.setTimeout(() => {
      const action = pendingAIAction;
      spokeBeforeActionRef.current[actorId] =
        thinkingDialogueChoices.length > 0;
      setDialogueMemory((current) => {
        const actorMemory = current[actorId] ?? { ids: [], families: [] };
        return {
          ...current,
          [actorId]: {
            ids: [
              ...actorMemory.ids,
              ...thinkingDialogueChoices.map((choice) => choice.id),
            ].slice(-24),
            families: [
              ...actorMemory.families,
              ...thinkingDialogueChoices.map((choice) => choice.family),
            ].slice(-8),
          },
        };
      });
      setRecentThinkingSteps((current) => ({
        ...current,
        [actorId]: [...(current[actorId] ?? []), ...thinkingPlan.steps].slice(
          -36,
        ),
      }));
      onGameChange(applyAction(game, action));
    }, thinkingPlan.totalMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [
    aiProfiles,
    game,
    hydrated,
    onGameChange,
    soundEnabled,
    thinkingId,
    thinkingPlan,
    thinkingDialogueChoices,
    pendingAIAction,
  ]);

  useEffect(() => {
    if (!rebuyNoticeText) return;
    const timer = window.setTimeout(
      () => setDismissedRebuyHand(game.handNumber),
      4200,
    );
    return () => window.clearTimeout(timer);
  }, [game.handNumber, rebuyNoticeText]);

  useEffect(() => {
    const performanceTimers = performanceTimersRef.current;
    const presentationTimers = presentationTimersRef.current;
    return () => {
      Object.values(performanceTimers).forEach((timer) =>
        window.clearTimeout(timer),
      );
      if (resultTimerRef.current) window.clearTimeout(resultTimerRef.current);
      if (interactionTimerRef.current)
        window.clearTimeout(interactionTimerRef.current);
      if (interactionSoundTimerRef.current)
        window.clearTimeout(interactionSoundTimerRef.current);
      presentationTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    const nextSnapshot = buildPublicPresentationSnapshot(game);
    const events = derivePresentationEvents(
      previousPresentationRef.current,
      nextSnapshot,
    );
    previousPresentationRef.current = nextSnapshot;
    if (!events.length) return;

    const schedulePresentation = (callback: () => void, delayMs: number) => {
      const timer = window.setTimeout(() => {
        const timerIndex = presentationTimersRef.current.indexOf(timer);
        if (timerIndex >= 0)
          presentationTimersRef.current.splice(timerIndex, 1);
        callback();
      }, delayMs);
      presentationTimersRef.current.push(timer);
      return timer;
    };

    const rememberChoice = (seatId: number, choice: DialogueChoice) => {
      setDialogueMemory((current) => {
        const memory = current[seatId] ?? { ids: [], families: [] };
        return {
          ...current,
          [seatId]: {
            ids: [...memory.ids, choice.id].slice(-24),
            families: [...memory.families, choice.family].slice(-8),
          },
        };
      });
    };
    const phraseFor = (
      seatId: number,
      trigger: DialogueTrigger,
      eventId: string,
      personaState: PersonaState | undefined,
    ) => {
      const player = game.players[seatId];
      if (!player) return null;
      if (player.isHuman) return null;
      if (!player.style) return null;
      if (["check", "call", "raise", "all-in", "fold"].includes(trigger)) {
        const alreadySpoke = spokeBeforeActionRef.current[seatId] === true;
        spokeBeforeActionRef.current[seatId] = false;
        if (alreadySpoke) return null;
      }
      const memory = dialogueMemory[seatId] ?? {
        ids: [],
        families: [],
      };
      const choice = choosePersonaDialogue({
        archetype: player.style.key,
        trigger,
        seed: stableTextSeed(`${eventId}:${seatId}`),
        recentIds: memory.ids,
        recentFamilies: memory.families,
        context: {
          personaState,
          pressure:
            eventId.includes(":result")
              ? 0
              : game.currentBet / Math.max(1, game.pot + game.currentBet),
        },
      });
      if (choice) rememberChoice(seatId, choice);
      return choice?.text ?? null;
    };
    const present = (
      event: PresentationEvent,
      delayMs = 0,
      personaStates: Record<number, PersonaState>,
    ) => {
      const performances = performancesForEvent(event);
      Object.entries(performances).forEach(([seatKey, performance]) => {
        const seatId = Number(seatKey);
        const player = game.players[seatId];
        if (
          performance.gesture === "loss" &&
          !player?.isHuman &&
          (player?.status === "folded" || player?.status === "out")
        ) {
          return;
        }
        schedulePresentation(() => {
          const existingTimer = performanceTimersRef.current[seatId];
          if (existingTimer) window.clearTimeout(existingTimer);
          setPerformanceBySeat((current) => ({
            ...current,
            [seatId]: performance,
          }));
          const trigger: DialogueTrigger =
            event.kind === "action"
              ? event.action
              : performance.gesture === "win"
                ? "win"
                : "lose";
          const phrase = phraseFor(
            seatId,
            trigger,
            performance.eventId,
            personaStates[seatId],
          );
          if (phrase) {
            setDialogueBySeat((current) => ({ ...current, [seatId]: phrase }));
            const existingDialogueTimer = dialogueTimersRef.current[seatId];
            if (existingDialogueTimer)
              window.clearTimeout(existingDialogueTimer);
            dialogueTimersRef.current[seatId] = window.setTimeout(
              () => {
                setDialogueBySeat((current) => {
                  if (current[seatId] !== phrase) return current;
                  const next = { ...current };
                  delete next[seatId];
                  return next;
                });
              },
              Math.max(1_650, performance.durationMs),
            );
          }
          const feedbackDuration = phrase
            ? Math.max(1_650, performance.durationMs)
            : player?.isHuman
              ? Math.max(1_100, performance.durationMs)
              : performance.durationMs;
          performanceTimersRef.current[seatId] = window.setTimeout(() => {
            setPerformanceBySeat((current) => {
              if (current[seatId]?.eventId !== performance.eventId)
                return current;
              const next = { ...current };
              delete next[seatId];
              return next;
            });
          }, feedbackDuration);
        }, delayMs);
      });
    };

    const hasImmediateAllIn = events.some(
      (event) => event.kind === "action" && event.action === "all-in",
    );

    let nextPersonaStates = personaStateBySeat;
    events.forEach((event) => {
      nextPersonaStates = Object.fromEntries(
        game.players
          .filter((player) => !player.isHuman)
          .map((player) => [
            player.id,
            advancePersonaState(
              nextPersonaStates[player.id] ?? defaultPersonaState(),
              event,
              player.id,
              BIG_BLIND,
            ),
          ]),
      );
      const personaStatesForEvent = nextPersonaStates;
      if (event.kind === "deal") {
        setResultVisibleHand(null);
        playDealSequence(event.cardCount, soundEnabled, 0.062, event.id);
        return;
      }
      if (event.kind === "action") {
        playGameEventSound(event.id, actionSound(event.action), soundEnabled);
        present(event, 0, personaStatesForEvent);
        return;
      }
      if (event.kind === "street") {
        const streetSound: GameSound =
          event.street === "flop"
            ? "flop"
            : event.street === "turn"
              ? "street-turn"
              : "river";
        playGameEventSound(event.id, streetSound, soundEnabled);
        return;
      }
      if (event.kind === "your-turn") {
        playGameEventSound(event.id, "your-turn", soundEnabled);
        return;
      }
      const resultDelay = hasImmediateAllIn ? 420 : 0;
      present(event, resultDelay, personaStatesForEvent);
      if (event.showdown) {
        playGameEventSound(`${event.id}:showdown`, "showdown", soundEnabled);
      }
      schedulePresentation(() => {
        playGameEventSound(`${event.id}:pot`, "pot-award", soundEnabled);
      }, resultDelay + 160);
      schedulePresentation(() => {
        playGameEventSound(
          `${event.id}:outcome`,
          outcomeSoundForHumanDelta(event.humanDelta),
          soundEnabled,
        );
      }, resultDelay + 340);
      if (resultTimerRef.current) window.clearTimeout(resultTimerRef.current);
      resultTimerRef.current = schedulePresentation(
        () => setResultVisibleHand(event.handId),
        resultDelay + 1_500,
      );
    });
    setPersonaStateBySeat(nextPersonaStates);
  }, [dialogueMemory, game, personaStateBySeat, soundEnabled]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (tableOverlay || document.querySelector('[aria-modal="true"]')) return;
      if (!isHumanTurn || event.repeat) return;
      const key = event.key.toLowerCase();
      if (key === "f" && legal.canFold) act("fold");
      if (key === "c" && (legal.canCheck || legal.canCall)) {
        act(legal.canCheck ? "check" : "call");
      }
      if (key === "r" && legal.canRaise) {
        setTableOverlay({ kind: "quick-bet" });
      }
      if (key === "a" && legal.canAllIn) act("all-in");
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  return (
    <main
      className="game-page"
      data-table-overlay={tableOverlay?.kind ?? "none"}
    >
      <header className="game-topbar">
        <button className="round-nav-button" onClick={onExit}>
          <BackIcon />
          返回
        </button>
        <div className="game-round-meta">
          <strong>第 {game.handNumber} 局</strong>
          <small>
            {game.phase === "playing"
              ? thinkingId !== null
                  ? `${game.players[thinkingId].name}思考中`
                  : isHumanTurn
                    ? "请选择行动"
                    : "等待行动"
              : "本局已结束"}
          </small>
        </div>
        <div className="game-toolbar">
          <button
            className="round-sound-button"
            aria-label={soundEnabled ? "关闭全部声音" : "开启全部声音"}
            aria-pressed={soundEnabled}
            title={soundEnabled ? "关闭全部声音" : "开启全部声音"}
            onClick={toggleSound}
          >
            <SoundIcon enabled={soundEnabled} />
            <span className="toolbar-button-label">音效</span>
          </button>
          <button
            className="round-menu-button"
            aria-label="打开本局行动记录"
            onClick={() => {
              playGameSound("ui", soundEnabled);
              setTableOverlay({ kind: "action-log" });
            }}
          >
            <MenuIcon />
            <span className="toolbar-button-label">记录</span>
          </button>
        </div>
      </header>

      <section className="game-stage" data-component="table-arena">
        {rebuyNotice ? (
          <div className="table-notice" role="status">
            <i aria-hidden="true" />
            {rebuyNotice}
          </div>
        ) : null}
        <div className="community-summary">
          <span>
            <small>当前底池</small>
            <strong key={game.pot} className="pot-value">
              {game.pot.toLocaleString()}
            </strong>
          </span>
          <b>{STREET_LABELS[game.street]}</b>
        </div>

        <div
          className={`community-board ${game.communityCards.length ? "has-cards" : "is-empty"}`}
          data-table-lane="community-cards"
          aria-label="公共牌"
        >
          {Array.from({ length: 5 }, (_, index) =>
            game.communityCards[index] ? (
              <PlayingCard
                key={`${game.communityCards[index].suit}-${game.communityCards[index].rank}`}
                card={game.communityCards[index]}
                motion="reveal"
                motionIndex={index}
              />
            ) : (
              <span className="community-slot" key={`slot-${index}`}>
                <i aria-hidden="true" />
              </span>
            ),
          )}
        </div>

        <div className="opponents-layout" data-table-layer="seats">
          <div className="opponents-top">
            {[opponents.topLeft, opponents.topCenter, opponents.topRight].map(
              (player) => (
                <Seat
                  key={player.id}
                  player={player}
                  active={game.currentActor === player.id}
                  dealer={game.dealerId === player.id}
                  thinkingLabel={
                    thinkingId === player.id ? thinkingLabel : null
                  }
                  thinkingMode={
                    thinkingId === player.id
                      ? (thinkingPlan?.mode ?? null)
                      : null
                  }
                  reveal={revealOpponents && player.status !== "folded"}
                  dealOrder={dealOrderById.get(player.id) ?? 0}
                  dealSeatCount={dealSeatIds.length}
                  performance={performanceBySeat[player.id] ?? null}
                  reactionLabel={dialogueBySeat[player.id] ?? null}
                  interactionMenuOpen={interactionMenuSeatId === player.id}
                  interaction={
                    tableInteraction?.targetId === player.id
                      ? tableInteraction
                      : null
                  }
                  onToggleInteractionMenu={toggleInteractionMenu}
                />
              ),
            )}
          </div>
          <div className="opponents-middle">
            {[opponents.middleLeft, opponents.middleRight].map((player) => (
              <Seat
                key={player.id}
                player={player}
                active={game.currentActor === player.id}
                dealer={game.dealerId === player.id}
                thinkingLabel={thinkingId === player.id ? thinkingLabel : null}
                thinkingMode={
                  thinkingId === player.id ? (thinkingPlan?.mode ?? null) : null
                }
                reveal={revealOpponents && player.status !== "folded"}
                dealOrder={dealOrderById.get(player.id) ?? 0}
                dealSeatCount={dealSeatIds.length}
                performance={performanceBySeat[player.id] ?? null}
                reactionLabel={dialogueBySeat[player.id] ?? null}
                interactionMenuOpen={interactionMenuSeatId === player.id}
                interaction={
                  tableInteraction?.targetId === player.id
                    ? tableInteraction
                    : null
                }
                onToggleInteractionMenu={toggleInteractionMenu}
              />
            ))}
          </div>
        </div>
      </section>

      <section
        className={`game-bottom-dock ${showQuickBet ? "has-quick-bet" : ""}`}
        data-component="player-action-dock"
      >
        <Seat
          player={human}
          active={game.currentActor === HUMAN_ID}
          dealer={game.dealerId === HUMAN_ID}
          thinkingLabel={null}
          thinkingMode={null}
          reveal
          dealOrder={dealOrderById.get(human.id) ?? 0}
          dealSeatCount={dealSeatIds.length}
          performance={performanceBySeat[human.id] ?? null}
          reactionLabel={dialogueBySeat[human.id] ?? null}
        />

        {game.phase === "playing" ? (
          <>
            <div className="human-decision-status" role="status" aria-live="polite">
              <strong>
                {isHumanTurn
                  ? `轮到你 ·${legal.canCheck ? " 可以过牌" : ` 跟注 ${legal.callAmount}`}`
                  : thinkingId !== null
                    ? `${game.players[thinkingId].name}正在思考`
                    : "等待下一步行动"}
              </strong>
            </div>
            <div
              className={`player-actions ${isHumanTurn ? "" : "is-waiting"}`}
              aria-hidden={showQuickBet}
            >
                <button
                  className="player-action fold"
                  disabled={!isHumanTurn || !legal.canFold}
                  onClick={() => act("fold")}
                >
                  弃牌
                  <kbd>F</kbd>
                </button>
                <button
                  className="player-action call"
                  disabled={!isHumanTurn || (!legal.canCheck && !legal.canCall)}
                  onClick={() => act(legal.canCheck ? "check" : "call")}
                >
                  {legal.canCheck ? "过牌" : `跟注 ${legal.callAmount}`}
                  <kbd>C</kbd>
                </button>
                <button
                  className="player-action raise"
                  disabled={!isHumanTurn || !legal.canRaise}
                  aria-expanded={showQuickBet}
                  onClick={() =>
                    setTableOverlay((current) =>
                      current?.kind === "quick-bet"
                        ? null
                        : { kind: "quick-bet" },
                    )
                  }
                >
                  加注
                  <kbd>R</kbd>
                </button>
                <button
                  className="player-action all-in"
                  disabled={!isHumanTurn || !legal.canAllIn}
                  onClick={() => act("all-in")}
                >
                  全下
                  <kbd>A</kbd>
                </button>
            </div>
          </>
        ) : null}

        {showQuickBet && legal.canRaise ? (
          <QuickBetPanel
            game={game}
            human={human}
            callAmount={legal.callAmount}
            minRaiseTarget={legal.minRaiseTarget}
            maxRaiseTarget={legal.maxRaiseTarget}
            onSelect={(amount) => act("raise", amount)}
            onCancel={() => setTableOverlay(null)}
          />
        ) : null}
      </section>

      {interactionMenuPlayer ? (
        <TableInteractionMenu
          player={interactionMenuPlayer}
          onClose={() => setTableOverlay(null)}
          onSend={(kind) =>
            sendTableInteraction(interactionMenuPlayer.id, kind)
          }
        />
      ) : null}

      {game.result && resultVisibleHand !== game.handId ? (
        <div className="table-result-beat" role="status" aria-live="assertive">
          <small>{game.result.showdown ? "摊牌时刻" : "底池归属"}</small>
          <strong>
            {game.result.winnerIds
              .map((playerId) => game.players[playerId]?.name)
              .filter(Boolean)
              .join("、")}
            赢下这一手
          </strong>
          <span>{game.result.detail}</span>
        </div>
      ) : null}

      {showActionLog ? (
        <ActionDrawer game={game} onClose={() => setTableOverlay(null)} />
      ) : null}

      {game.result && resultVisibleHand === game.handId ? (
        <HandResultModal
          game={game}
          onExit={onExit}
          onRebuy={() => {
            setTableOverlay(null);
            setTableInteraction(null);
            onGameChange(
              rebuyHumanAndStartNextHand(game, STARTING_CHIPS, Date.now()),
            );
          }}
          onNextHand={() => {
            setTableOverlay(null);
            setTableInteraction(null);
            onGameChange(startNewHand(game, Date.now()));
          }}
        />
      ) : null}
    </main>
  );
}

function PokerGameContent() {
  const [screen, setScreen] = useState<AppScreen>("home");
  const [game, setGame] = useState<GameState>(() => createGame(20260725));
  const [profile, setProfile] = useState<LocalProfile>({
    version: 1,
    chips: 2000,
    lastDailyGrant: null,
    lastSignIn: null,
    history: [],
    aiProfiles: {},
  });
  const [hydrated, setHydrated] = useState(false);
  const [hasArchive, setHasArchive] = useState(false);
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  function navigateScreen(nextScreen: AppScreen, replace = false) {
    setScreen(nextScreen);
    const method = replace ? "replaceState" : "pushState";
    window.history[method]({ screen: nextScreen }, "", screenPath(nextScreen));
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const restored = loadSession();
      const refreshedProfile = refreshDailyBenefit(loadProfile());
      const requestedScreen = screenFromPath(window.location.pathname);
      if (restored) {
        setGame(restored);
        if (requestedScreen !== "home") {
          setScreen(requestedScreen);
        } else if (window.sessionStorage.getItem(ACTIVE_SCREEN_KEY) === "game") {
          setScreen("game");
          window.history.replaceState({ screen: "game" }, "", "/game");
        }
      } else if (requestedScreen !== "game") {
        setScreen(requestedScreen);
      } else {
        window.history.replaceState({ screen: "home" }, "", "/");
      }
      setProfile(refreshedProfile);
      saveProfile(refreshedProfile);
      setHasArchive(!!restored && hasSavedSession());
      setSoundEnabled(loadSoundPreference());
      setHydrated(true);
    }, 0);

    if ("serviceWorker" in navigator) {
      const isLocalPreview =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      if (isLocalPreview) {
        // A stopped local server must not leave a cached, partially styled app
        // behind. Offline mode is enabled for installed/production origins only.
        void navigator.serviceWorker
          .getRegistrations()
          .then((registrations) =>
            Promise.all(
              registrations.map((registration) => registration.unregister()),
            ),
          )
          .catch(() => undefined);

        if ("caches" in window) {
          void window.caches
            .keys()
            .then((keys) =>
              Promise.all(
                keys
                  .filter((key) => key.startsWith("poker-ai-web-"))
                  .map((key) => window.caches.delete(key)),
              ),
            )
            .catch(() => undefined);
        }
      } else {
        void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      }
    }

    // Warm the table art first, then the illustrated deck in small batches.
    // This fills both the browser and service-worker caches without making all
    // 58 images compete for bandwidth at once.
    void warmImageCache(TABLE_CHARACTER_ASSET_SOURCES, {
      concurrency: 6,
    }).then(() =>
      warmImageCache(CAT_CARD_ART_SOURCES, {
        concurrency: 4,
      }),
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    function handlePopState() {
      const nextScreen = screenFromPath(window.location.pathname);
      if (nextScreen === "game" && !loadSession()) {
        setScreen("home");
        window.history.replaceState({ screen: "home" }, "", "/");
        return;
      }
      setScreen(nextScreen);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function continueGame() {
    unlockGameAudio(soundEnabled);
    playGameSound("ui", soundEnabled);
    const restored = loadSession();
    if (!restored) {
      setHasArchive(false);
      return;
    }
    void warmImageCache(currentHandCardArtSources(restored), {
      concurrency: 7,
    });
    setGame(restored);
    window.sessionStorage.setItem(ACTIVE_SCREEN_KEY, "game");
    navigateScreen("game");
  }

  function startFreshGame() {
    unlockGameAudio(soundEnabled);
    playDealSequence(12, soundEnabled);
    clearSession();
    const startingChips = Math.max(STARTING_CHIPS, profile.chips);
    const fundedProfile = syncProfileChips(profile, startingChips);
    const fresh = createGame(Date.now(), startingChips);
    void warmImageCache(currentHandCardArtSources(fresh), {
      concurrency: 7,
    });
    saveProfile(fundedProfile);
    saveSession(fresh);
    setProfile(fundedProfile);
    setGame(fresh);
    setHasArchive(true);
    setShowNewGameConfirm(false);
    window.sessionStorage.setItem(ACTIVE_SCREEN_KEY, "game");
    navigateScreen("game");
  }

  function exitGame() {
    saveSession(game);
    setHasArchive(true);
    window.sessionStorage.removeItem(ACTIVE_SCREEN_KEY);
    navigateScreen("home");
  }

  function handleGameChange(nextGame: GameState) {
    window.sessionStorage.setItem(ACTIVE_SCREEN_KEY, "game");
    setGame(nextGame);
    saveSession(nextGame);
    setHasArchive(true);
    setProfile((current) => {
      const withChips = syncProfileChips(
        current,
        nextGame.players[HUMAN_ID].chips,
      );
      const next = nextGame.result
        ? recordCompletedHand(withChips, nextGame)
        : withChips;
      saveProfile(next);
      return next;
    });
  }

  function updateProfile(next: LocalProfile) {
    const delta = next.chips - profile.chips;
    if (delta !== 0 && hasArchive) {
      const nextGame = {
        ...game,
        players: game.players.map((player) =>
          player.id === HUMAN_ID
            ? { ...player, chips: Math.max(0, player.chips + delta) }
            : player,
        ),
      };
      setGame(nextGame);
      saveSession(nextGame);
    }
    setProfile(next);
  }

  function resetOpponentMemories() {
    const reset = resetLearningData(profile);
    saveProfile(reset);
    setProfile(reset);
  }

  function updateSoundPreference(enabled: boolean) {
    setSoundEnabled(enabled);
    saveSoundPreference(enabled);
  }

  if (screen === "game") {
    return (
      <GameScreen
        game={game}
        aiProfiles={profile.aiProfiles}
        hydrated={hydrated}
        soundEnabled={soundEnabled}
        onGameChange={handleGameChange}
        onExit={exitGame}
        onSoundToggle={updateSoundPreference}
      />
    );
  }

  if (screen === "welfare") {
    return (
      <WelfareScreen
        profile={profile}
        onProfileChange={updateProfile}
        onBack={() => navigateScreen("home")}
      />
    );
  }

  if (screen === "statistics") {
    return (
      <StatisticsScreen
        profile={profile}
        players={game.players}
        onBack={() => navigateScreen("home")}
        onResetMemories={resetOpponentMemories}
        canContinue={hasArchive}
        onContinueTraining={continueGame}
        onStartTraining={startFreshGame}
      />
    );
  }

  return (
    <>
      <HomeScreen
        profile={profile}
        canContinue={hasArchive}
        onContinue={continueGame}
        onNewGame={() => setShowNewGameConfirm(true)}
        onWelfare={() => navigateScreen("welfare")}
        onStatistics={() => navigateScreen("statistics")}
      />
      {showNewGameConfirm ? (
        <ConfirmDialog
          eyebrow="新训练"
          title={hasArchive ? "重新开始训练？" : "开始第一局训练？"}
          description={
            hasArchive
              ? "会覆盖当前牌局存档；历史统计和对手记忆都会保留。"
              : "将发放训练小鱼干，并开始第一局。"
          }
          confirmLabel={hasArchive ? "重新开始" : "开始训练"}
          onCancel={() => setShowNewGameConfirm(false)}
          onConfirm={startFreshGame}
        />
      ) : null}
    </>
  );
}

export function PokerGame() {
  const [previewCard, setPreviewCard] = useState<Card | null>(null);

  return (
    <CardPreviewContext.Provider value={(card) => setPreviewCard(card)}>
      <PokerGameContent />
      {previewCard ? (
        <CardPreviewModal
          card={previewCard}
          onClose={() => setPreviewCard(null)}
        />
      ) : null}
    </CardPreviewContext.Provider>
  );
}
