"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  loadSoundPreference,
  playDealSequence,
  playGameSound,
  saveSoundPreference,
  unlockGameAudio,
  type GameSound,
} from "./gameAudio";
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
import { catCardAccessibleLabel, catCardArtSource } from "./cardArt";
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
const SAFE_TABLE_TELLS = [
  "扫了一眼下注线",
  "轻轻整理面前的筹码",
  "目光回到公共牌",
  "在牌边停了一下",
  "重新坐稳",
  "看了看还在牌局里的人",
] as const;

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
    Math.imul(game.handNumber + 1, 1_000_003) ^
    Math.imul(game.actionSequence + 1, 97_409) ^
    Math.imul(playerId + 1, 65_537) ^
    stream
  ) >>> 0;
}
const AVATAR_SOURCES: Record<number, string> = {
  0: "/characters/portraits/golden-player.webp",
  1: "/characters/portraits/british-shorthair.webp",
  2: "/characters/portraits/siamese.webp",
  3: "/characters/portraits/maine-coon.webp",
  4: "/characters/portraits/orange-tabby.webp",
  5: "/characters/portraits/abyssinian.webp",
};

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

type AppScreen = "home" | "game" | "welfare" | "statistics";
const ACTIVE_SCREEN_KEY = "poker-ai-web/active-screen";

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
    description: "翻牌前自愿投入筹码的手数占比。",
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

function CatFoodIcon() {
  return (
    <svg className="cat-food-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 11.5h15l-1.4 6.1a2 2 0 0 1-2 1.6H7.9a2 2 0 0 1-2-1.6l-1.4-6.1Z" />
      <path d="M6.2 11.5c.8-2.2 2.7-3.3 5.8-3.3s5 1.1 5.8 3.3" />
      <circle cx="8.5" cy="7.1" r="1.25" />
      <circle cx="12.1" cy="5.8" r="1.25" />
      <circle cx="15.7" cy="7.1" r="1.25" />
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
            <ellipse cx="7.6" cy="14.1" rx="3.2" ry="4" transform="rotate(-24 7.6 14.1)" />
            <ellipse cx="13.2" cy="8.7" rx="3.1" ry="4.1" transform="rotate(-7 13.2 8.7)" />
            <ellipse cx="19.2" cy="8.7" rx="3.1" ry="4.1" transform="rotate(7 19.2 8.7)" />
            <ellipse cx="24.6" cy="14.1" rx="3.2" ry="4" transform="rotate(24 24.6 14.1)" />
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
      aria-label={canPreview ? `${accessibleLabel}，点击查看大图` : accessibleLabel}
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
        // Cat art is decorative; the accessible card name comes from the outer element.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="card-cat-art"
          src={catArtSource}
          alt=""
          aria-hidden="true"
          decoding="async"
          loading={compact ? "lazy" : "eager"}
          draggable={false}
        />
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
  const dialogRef = useRef<HTMLElement>(null);
  const source = catCardArtSource(card);
  const label = catCardAccessibleLabel(card);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      previousFocus?.focus();
    };
  }, [onClose]);

  if (!source) return null;

  return (
    <div className="modal-backdrop card-preview-backdrop" onClick={onClose}>
      <section
        ref={dialogRef}
        className="card-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${label}大图`}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={source} alt={label} draggable={false} />
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
  if (variant === "table") {
    const character =
      CAT_CHARACTER_PROFILES[player.id] ?? CAT_CHARACTER_PROFILES[0];
    return (
      <span className={`player-avatar avatar-${size} avatar-table`} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="seat-character-material"
          src={character.seatAsset}
          alt=""
          draggable={false}
        />
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
      {dealer ? (
        <b className="dealer-badge" aria-label="庄家按钮">
          D
        </b>
      ) : null}
      {isSmallBlind ? (
        <strong className="blind-badge small-blind">
          小盲 <em>{SMALL_BLIND}</em>
        </strong>
      ) : null}
      {isBigBlind ? (
        <strong className="blind-badge big-blind">
          大盲 <em>{BIG_BLIND}</em>
        </strong>
      ) : null}
    </div>
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
}: {
  player: Player;
  active: boolean;
  dealer: boolean;
  thinkingLabel: string | null;
  thinkingMode: AIThinkingMode | null;
  reveal: boolean;
  dealOrder: number;
  dealSeatCount: number;
}) {
  const hiddenCards = !player.isHuman && !reveal;
  const character =
    CAT_CHARACTER_PROFILES[player.id] ?? CAT_CHARACTER_PROFILES[0];
  const [showCharacter, setShowCharacter] = useState(false);
  return (
    <article
      className={`game-seat seat-${player.id} ${player.isHuman ? "seat-human" : ""} ${
        active ? "is-active" : ""
      } ${player.status === "folded" ? "is-folded" : ""} ${
        player.status === "out" ? "is-out" : ""
      } ${thinkingMode ? `is-thinking thinking-${thinkingMode}` : ""}`}
      aria-label={`${player.name}，${player.position}，${player.chips} 猫粮`}
    >
      <SeatPositionBadges player={player} dealer={dealer} />
      <button
        className="seat-character-button"
        aria-label={`查看${player.name}的猫咪角色`}
        aria-expanded={showCharacter}
        title={`${character.breed} · ${character.persona}`}
        onClick={() => setShowCharacter((visible) => !visible)}
        onBlur={() => setShowCharacter(false)}
      >
        <PlayerAvatar player={player} variant="table" />
      </button>
      {showCharacter ? (
        <span className="seat-character-popover" role="status">
          <strong>{character.breed}</strong>
          <small>{character.persona}</small>
        </span>
      ) : null}
      <div className="seat-identity">
        <strong className="seat-player-name">{player.name}</strong>
        <span className="seat-stack" aria-label={`${player.chips} 猫粮`}>
          <CatFoodIcon />
          <b>{player.chips.toLocaleString()}</b>
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
        {player.bet > 0 ? (
          <span className="cat-food-bet" aria-label={`本轮投入 ${player.bet} 猫粮`}>
            <CatFoodIcon />
            <b>{player.bet}</b>
          </span>
        ) : null}
        {player.totalContribution > player.bet ? (
          <small>累计 {player.totalContribution}</small>
        ) : null}
      </span>
      {thinkingLabel ? (
        <span
          className={`thought-bubble thought-${thinkingMode ?? "measured"}`}
          aria-live="polite"
        >
          <span className="thinking-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          {thinkingLabel}
        </span>
      ) : player.lastAction ? (
        <span key={player.lastAction} className="last-action">
          {player.lastAction}
        </span>
      ) : null}
    </article>
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

      <section className="balance-card" aria-label="虚拟训练积分">
        <span className="coin-mark">
          <AppIcon name="chip" />
        </span>
        <strong>{profile.chips.toLocaleString()}</strong>
        <p>虚拟训练积分</p>
      </section>

      <section className="daily-card">
        <div className="daily-copy">
          <span className="daily-icon">
            <AppIcon name="calendar" />
          </span>
          <span>
            <strong>每日训练积分 {DAILY_FREE_CHIPS.toLocaleString()}</strong>
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
        <button
          className="home-action action-continue"
          disabled={!canContinue}
          onClick={onContinue}
        >
          <span><AppIcon name="play" /></span>
          <b>{canContinue ? "继续游戏" : "暂无存档"}</b>
        </button>
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

function PageHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
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
        <span>🎁</span>
        <small>虚拟训练积分</small>
        <strong>{profile.chips.toLocaleString()}</strong>
      </section>
      <section className="benefit-card">
        <div className="benefit-icon benefit-green">▦</div>
        <div>
          <h2>每日免费领</h2>
          <p>每日 {DAILY_FREE_CHIPS.toLocaleString()} 积分</p>
          <small>每天 10:00 自动到账</small>
        </div>
        <b className="benefit-state">{dailyClaimed ? "✓ 今日已到账" : "等待到账"}</b>
      </section>
      <section className="benefit-card">
        <div className="benefit-icon benefit-red">✓</div>
        <div>
          <h2>每日签到</h2>
          <p>签到 +{DAILY_SIGN_IN_BONUS.toLocaleString()} 积分</p>
          <small>每天可领取一次</small>
        </div>
        <button disabled={signedIn} onClick={signIn}>
          {signedIn ? "今日已签到" : `签到 +${DAILY_SIGN_IN_BONUS.toLocaleString()}`}
        </button>
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
}: {
  profile: LocalProfile;
  players: Player[];
  onBack: () => void;
  onResetMemories: () => void;
}) {
  const [tab, setTab] = useState<StatisticsTab>("overview");
  const [selectedAI, setSelectedAI] = useState(1);
  const [glossaryToast, setGlossaryToast] = useState<GlossaryItem | null>(null);
  const [selectedHistory, setSelectedHistory] =
    useState<HandHistoryRecord | null>(null);
  const [showMemoryReset, setShowMemoryReset] = useState(false);
  const totalHands = profile.history.length;
  const wins = profile.history.filter((record) => record.humanDelta > 0).length;
  const net = profile.history.reduce((sum, record) => sum + record.humanDelta, 0);
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
  const activeProfile = profiles.find((item) => item.playerId === selectedAI) ?? profiles[0];

  useEffect(() => {
    if (!glossaryToast) return;
    const timer = window.setTimeout(() => setGlossaryToast(null), 4600);
    return () => window.clearTimeout(timer);
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
              <small>当前积分</small>
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
          {activeProfile ? (
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
            profile.history.map((record) => (
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
                <b className={record.humanDelta >= 0 ? "positive" : "negative"}>
                  {record.humanDelta >= 0 ? "+" : ""}
                  {record.humanDelta}
                </b>
                <span className="history-detail-cue">
                  <AppIcon name="detail" />
                  明细
                </span>
              </button>
            ))
          ) : (
            <div className="empty-state">
              <span className="empty-card-mark" aria-hidden="true">
                <i />
                <i />
              </span>
              <h2>还没有完成的牌局</h2>
              <p>完成第一手后，这里会保存最近 30 手记录。</p>
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
        <div className="modal-backdrop">
          <section className="confirm-modal" role="dialog" aria-modal="true">
            <small>RESET RIVAL MEMORY</small>
            <h2>让对手重新认识你？</h2>
            <p>
              只会清除五位对手学到的打法画像；当前筹码、牌桌存档和最近牌局记录都会保留。
            </p>
            <div className="result-actions">
              <button onClick={() => setShowMemoryReset(false)}>取消</button>
              <button
                className="primary"
                onClick={() => {
                  onResetMemories();
                  setShowMemoryReset(false);
                }}
              >
                确认清除记忆
              </button>
            </div>
          </section>
        </div>
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
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const settlementParticipants = players
    .map((player) =>
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
    if (factors.stackToPotRatio <= 1.5) cues.push("有效筹码已经较浅");
    if (factors.boardWetness >= 0.62) cues.push("公共牌连接较强");
    if (factors.hasInitiative) cues.push("延续了前街主动权");
    if (!cues.length) cues.push("当前公开行动线较简单");
    return cues.slice(0, 2).join(" · ");
  }

  return (
    <div className="modal-backdrop history-detail-backdrop" onClick={onClose}>
      <section
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
          </span>
        </section>

        <div className="history-detail-scroll">
          <section className="history-detail-section">
            <h3>结算明细</h3>
            {settlementParticipants.length ? (
              <ol className="history-settlement">
                {settlementParticipants.map((participant) => {
                  const player = players[participant.playerId];
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
                          {participant.holeCards.length
                            ? participant.holeCards.map((card, index) => (
                                <PlayingCard
                                  key={`${card.suit}-${card.rank}-${index}`}
                                  card={card}
                                  compact
                                />
                              ))
                            : participant.contribution === 0
                              ? "未参与"
                              : participant.status === "folded"
                                ? "已弃牌"
                                : "未亮牌"}
                        </span>
                      </div>
                      <p>
                        <strong>
                          {participant.handName ??
                            (participant.isWinner
                              ? "未摊牌获胜"
                              : participant.contribution === 0
                                ? "未参与底池"
                                : participant.status === "folded"
                                  ? "已弃牌"
                                  : "未亮牌")}
                        </strong>
                        <small>
                          投入 {participant.contribution.toLocaleString()} ·
                          获得 {participant.payout.toLocaleString()}
                        </small>
                      </p>
                      <b className={participant.net >= 0 ? "positive" : "negative"}>
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

  return (
    <article className="ai-profile-card">
      <header className="profile-identity">
        <PlayerAvatar player={player} />
        <div>
          <h2>{profile.name}</h2>
          <span className="profile-style-tag">{profile.styleName}</span>
          <p>
            {sampleLabel} · {style ? AI_ENGINE_NAMES[style.key] : "自适应引擎"} ·
            样本 {profile.handsPlayed} 手
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
            <p>
              相对“{profile.styleName}”原始性格，看看它最近有没有改变打法
            </p>
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
            <small>记住的牌局情境</small>
            <b>{Object.keys(profile.learning.contextPolicies).length} 类</b>
          </span>
          <span>
            <small>观察你的行动</small>
            <b>{profile.learning.humanRead.handsObserved} 手</b>
          </span>
        </div>
        <p className="opponent-read">
          <b>它对你的判断：</b>{" "}
          {describeHumanRead(profile.learning.humanRead).replace("对你的判断：", "")}
        </p>
      </section>
    </article>
  );
}

function LearningSparkline({ profile }: { profile: AIProfileStats }) {
  const source = profile.learning.snapshots.slice(-24);
  const baselineTarget = 8;

  if (source.length < baselineTarget) {
    return (
      <div className="learning-baseline" role="status">
        <div>
          <strong>正在建立行为基线</strong>
          <span>
            再观察 {baselineTarget - source.length} 手后生成可靠趋势
          </span>
        </div>
        <div
          className="learning-baseline-progress"
          aria-label={`基线样本 ${source.length}/${baselineTarget} 手`}
        >
          {Array.from({ length: baselineTarget }, (_, index) => (
            <i className={index < source.length ? "is-filled" : ""} key={index} />
          ))}
        </div>
        <small>{source.length} / {baselineTarget} 手</small>
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
    <div className="learning-tracks" aria-label="相对原始性格的策略调整">
      {tracks.map((track) => {
        const current = source[source.length - 1][track.key];
        const rounded = Math.round(current * 100);
        const isNeutral = Math.abs(current) < 0.025;
        const status = isNeutral
          ? "基本不变"
          : current > 0
            ? track.positiveEnd
            : track.negativeEnd;
        const description = isNeutral
          ? track.neutralText
          : current > 0
            ? track.positiveText
            : track.negativeText;
        const markerPosition = 50 + Math.max(-0.3, Math.min(0.3, current)) * 150;
        return (
          <div className={`learning-track is-${track.className}`} key={track.key}>
            <div className="learning-track-copy">
              <strong>{track.label}</strong>
              <span className={isNeutral ? "is-neutral" : ""}>{status}</span>
              <small>{description}</small>
            </div>
            <div
              className="learning-comparison"
              role="img"
              aria-label={`${track.label}：${status}，相对原始性格 ${rounded >= 0 ? "+" : ""}${rounded}%`}
            >
              <small>{track.negativeEnd}</small>
              <div className="learning-scale">
                <i aria-hidden="true" />
                <b
                  aria-hidden="true"
                  style={{ "--marker-position": `${markerPosition}%` } as CSSProperties}
                />
              </div>
              <small>{track.positiveEnd}</small>
            </div>
            <span className="learning-delta">
              相对原始性格 {rounded >= 0 ? "+" : ""}{rounded}%
            </span>
          </div>
        );
      })}
    </div>
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
      className="quick-bet-panel"
      role="dialog"
      aria-label="快捷加注尺度"
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
          const raw = human.bet + callAmount + Math.round(potAfterCall * multiplier);
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
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className="action-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="本局行动记录"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <small>HAND #{game.handNumber}</small>
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
  const settlementPlayers = [...game.players]
    .sort(
      (left, right) =>
        Number(result.winnerIds.includes(right.id)) -
          Number(result.winnerIds.includes(left.id)) ||
        left.id - right.id,
    );

  return (
    <div className="modal-backdrop result-backdrop">
      <section
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
            <small>底池</small>
            <strong>{potTotal.toLocaleString()}</strong>
          </div>
          <div>
            <small>你的投入</small>
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
              const hand = result.showdown && player.status !== "folded"
                ? evaluateBest([...player.holeCards, ...game.communityCards])
                : null;

              return (
                <li
                  className={isWinner ? "result-player is-winner" : "result-player"}
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
                      {hand ? describeEvaluatedHand(hand) :
                        (isWinner
                          ? "未摊牌获胜"
                          : player.totalContribution === 0
                            ? "未参与底池"
                            : player.status === "folded"
                              ? "已弃牌"
                              : "未亮牌")}
                    </strong>
                    {hand ? (
                      <small className="result-best-five">
                        最佳五张：{readableCardsLabel(hand.cards)}
                      </small>
                    ) : null}
                    <small>
                      投入 {player.totalContribution.toLocaleString()} · 获得{" "}
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
              <span>买入 {STARTING_CHIPS.toLocaleString()} 并继续</span>
              <small>虚拟训练筹码</small>
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
  const [showActionLog, setShowActionLog] = useState(false);
  const [showQuickBet, setShowQuickBet] = useState(false);
  const [thinkingProgress, setThinkingProgress] = useState({
    key: "",
    step: 0,
  });
  const [recentThinkingSteps, setRecentThinkingSteps] = useState<
    Record<number, string[]>
  >({});
  const [dismissedRebuyHand, setDismissedRebuyHand] = useState<number | null>(
    null,
  );
  const human = game.players[HUMAN_ID];
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
      : recentThinkingSteps[thinkingId] ?? EMPTY_THINKING_STEPS;
  const pendingAIAction = useMemo(
    () => {
      if (thinkingId === null) return null;
      const seed = aiTurnSeed(game, thinkingId, 0xa17dec);
      return chooseAIAction(
        game,
        thinkingId,
        seededRandom(seed),
        aiProfiles[thinkingId]?.learning,
        seed,
      );
    },
    [aiProfiles, game, thinkingId],
  );
  const thinkingPlan: AIThinkingPlan | null = useMemo(() => {
    if (thinkingId === null || !pendingAIAction) return null;
    const random = seededRandom(aiTurnSeed(game, thinkingId, 0x51f15e));
    const plan = createAIThinkingPlan(
      game,
      thinkingId,
      random,
      aiProfiles[thinkingId]?.learning,
      recentStepsForThinkingPlayer,
    );
    const start = Math.floor(random() * SAFE_TABLE_TELLS.length);
    return {
      ...plan,
      // Live bubbles are observable physical beats only. Strategy explanations
      // are reserved for post-hand traces, so the table never fabricates an
      // internal calculation that the policy did not perform.
      steps: plan.steps.map(
        (_, index) => SAFE_TABLE_TELLS[(start + index) % SAFE_TABLE_TELLS.length],
      ),
    };
  }, [
    aiProfiles,
    game,
    pendingAIAction,
    recentStepsForThinkingPlayer,
    thinkingId,
  ]);
  const thinkingKey =
    thinkingId === null
      ? ""
      : `${game.handNumber}-${game.actionSequence}-${thinkingId}`;
  const thinkingStep =
    thinkingProgress.key === thinkingKey ? thinkingProgress.step : 0;
  const thinkingLabel =
    thinkingPlan?.steps[
      Math.min(thinkingStep, thinkingPlan.steps.length - 1)
    ] ?? null;
  const rebuyNoticeText = game.rebuyPlayerIds.length
    ? `${game.rebuyPlayerIds
        .map((playerId) => game.players[playerId]?.name)
        .filter(Boolean)
        .join("、")} 重新带入 ${STARTING_CHIPS.toLocaleString()} 筹码`
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
    .map((_, offset) => game.players[(game.dealerId + offset + 1) % game.players.length])
    .filter((player) => player.holeCards.length > 0)
    .map((player) => player.id);
  const dealOrderById = new Map(
    dealSeatIds.map((playerId, index) => [playerId, index]),
  );
  const dealCardCount = dealSeatIds.length * 2;
  const previousAudioState = useRef({
    handNumber: game.handNumber,
    communityCards: game.communityCards.length,
    currentActor: game.currentActor,
    phase: game.phase,
  });

  function actionSound(type: ActionType): GameSound {
    if (type === "fold") return "fold";
    if (type === "check") return "check";
    if (type === "all-in") return "all-in";
    return "chips";
  }

  function act(type: ActionType, amount?: number) {
    setShowQuickBet(false);
    unlockGameAudio(soundEnabled);
    playGameSound(actionSound(type), soundEnabled);
    onGameChange(applyAction(game, { playerId: HUMAN_ID, type, amount }));
  }

  function toggleSound() {
    const next = !soundEnabled;
    onSoundToggle(next);
    if (next) {
      unlockGameAudio(true);
      playGameSound("ui", true);
    }
  }

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
    let elapsed = 0;
    const progressTimers = thinkingPlan.stepDurations
      .slice(0, -1)
      .map((stepDuration, index) => {
        elapsed += stepDuration;
        return window.setTimeout(() => {
          setThinkingProgress({ key: thinkingKey, step: index + 1 });
        }, elapsed);
      });
    const timer = window.setTimeout(() => {
      const action = pendingAIAction;
      setRecentThinkingSteps((current) => ({
        ...current,
        [actorId]: [
          ...(current[actorId] ?? []),
          ...thinkingPlan.steps,
        ].slice(-36),
      }));
      playGameSound(actionSound(action.type), soundEnabled);
      onGameChange(applyAction(game, action));
    }, thinkingPlan.totalMs);
    return () => {
      window.clearTimeout(timer);
      progressTimers.forEach((progressTimer) =>
        window.clearTimeout(progressTimer),
      );
    };
  }, [
    aiProfiles,
    game,
    hydrated,
    onGameChange,
    soundEnabled,
    thinkingId,
    thinkingKey,
    thinkingPlan,
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
    const previous = previousAudioState.current;
    if (game.handNumber !== previous.handNumber) {
      playDealSequence(dealCardCount, soundEnabled);
    } else if (game.communityCards.length > previous.communityCards) {
      playDealSequence(
        game.communityCards.length - previous.communityCards,
        soundEnabled,
        0.085,
      );
    }

    if (previous.phase === "playing" && game.phase !== "playing" && game.result) {
      playGameSound(
        game.result.winnerIds.includes(HUMAN_ID) ? "win" : "lose",
        soundEnabled,
      );
    } else if (
      previous.currentActor !== HUMAN_ID &&
      game.currentActor === HUMAN_ID &&
      game.phase === "playing"
    ) {
      playGameSound("turn", soundEnabled);
    }

    previousAudioState.current = {
      handNumber: game.handNumber,
      communityCards: game.communityCards.length,
      currentActor: game.currentActor,
      phase: game.phase,
    };
  }, [dealCardCount, game, soundEnabled]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (showActionLog) {
        if (event.key === "Escape") setShowActionLog(false);
        return;
      }
      if (showQuickBet && event.key === "Escape") {
        setShowQuickBet(false);
        return;
      }
      if (!isHumanTurn || event.repeat) return;
      const key = event.key.toLowerCase();
      if (key === "f" && legal.canFold) act("fold");
      if (key === "c" && (legal.canCheck || legal.canCall)) {
        act(legal.canCheck ? "check" : "call");
      }
      if (key === "r" && legal.canRaise) setShowQuickBet(true);
      if (key === "a" && legal.canAllIn) act("all-in");
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  return (
    <main className="game-page">
      <header className="game-topbar">
        <button className="round-nav-button" onClick={onExit}>
          <BackIcon />
          返回
        </button>
        <div className="game-round-meta">
          <strong>第 {game.handNumber} 局</strong>
          <small>底池: {game.pot.toLocaleString()}</small>
        </div>
        <div className="game-toolbar">
          <button
            className="round-sound-button"
            aria-label={soundEnabled ? "关闭游戏音效" : "开启游戏音效"}
            aria-pressed={soundEnabled}
            title={soundEnabled ? "关闭游戏音效" : "开启游戏音效"}
            onClick={toggleSound}
          >
            <SoundIcon enabled={soundEnabled} />
          </button>
          <button
            className="round-menu-button"
            aria-label="打开本局行动记录"
            onClick={() => {
              playGameSound("ui", soundEnabled);
              setShowActionLog(true);
            }}
          >
            <MenuIcon />
          </button>
        </div>
      </header>

      <section className="game-stage">
        {rebuyNotice ? (
          <div className="table-notice" role="status">
            <i aria-hidden="true" />
            {rebuyNotice}
          </div>
        ) : null}
        <div className="community-summary">
          <span>
            <small>底池</small>
            <strong key={game.pot} className="pot-value">
              {game.pot.toLocaleString()}
            </strong>
          </span>
          <span>
            <small>跟注</small>
            <strong key={legal.callAmount} className="call-value">
              {legal.callAmount.toLocaleString()}
            </strong>
          </span>
          <b>{STREET_LABELS[game.street]}</b>
        </div>

        <div className="community-board" aria-label="公共牌">
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

        <div className="opponents-layout">
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
                    thinkingId === player.id ? thinkingPlan?.mode ?? null : null
                  }
                  reveal={revealOpponents && player.status !== "folded"}
                  dealOrder={dealOrderById.get(player.id) ?? 0}
                  dealSeatCount={dealSeatIds.length}
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
                thinkingLabel={
                  thinkingId === player.id ? thinkingLabel : null
                }
                thinkingMode={
                  thinkingId === player.id ? thinkingPlan?.mode ?? null : null
                }
                reveal={revealOpponents && player.status !== "folded"}
                dealOrder={dealOrderById.get(player.id) ?? 0}
                dealSeatCount={dealSeatIds.length}
              />
            ))}
          </div>
        </div>
      </section>

      <section
        className={`game-bottom-dock ${showQuickBet ? "has-quick-bet" : ""}`}
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
        />

        {game.phase === "playing" ? (
          isHumanTurn ? (
            <div className="player-actions">
              <button
                className="player-action fold"
                disabled={!legal.canFold}
                onClick={() => act("fold")}
              >
                弃牌
                <kbd>F</kbd>
              </button>
              <button
                className="player-action call"
                disabled={!legal.canCheck && !legal.canCall}
                onClick={() => act(legal.canCheck ? "check" : "call")}
              >
                {legal.canCheck ? "过牌" : `跟注 ${legal.callAmount}`}
                <kbd>C</kbd>
              </button>
              <button
                className="player-action raise"
                disabled={!legal.canRaise}
                aria-expanded={showQuickBet}
                onClick={() => setShowQuickBet((current) => !current)}
              >
                加注
                <kbd>R</kbd>
              </button>
              <button
                className="player-action all-in"
                disabled={!legal.canAllIn}
                onClick={() => act("all-in")}
              >
                全下
                <kbd>A</kbd>
              </button>
            </div>
          ) : null
        ) : null}

        {showQuickBet && legal.canRaise ? (
          <QuickBetPanel
            game={game}
            human={human}
            callAmount={legal.callAmount}
            minRaiseTarget={legal.minRaiseTarget}
            maxRaiseTarget={legal.maxRaiseTarget}
            onSelect={(amount) => act("raise", amount)}
            onCancel={() => setShowQuickBet(false)}
          />
        ) : null}
      </section>

      {showActionLog ? (
        <ActionDrawer game={game} onClose={() => setShowActionLog(false)} />
      ) : null}

      {game.result ? (
        <HandResultModal
          game={game}
          onExit={onExit}
          onRebuy={() =>
            onGameChange(
              rebuyHumanAndStartNextHand(
                game,
                STARTING_CHIPS,
                Date.now(),
              ),
            )
          }
          onNextHand={() => onGameChange(startNewHand(game, Date.now()))}
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const restored = loadSession();
      const refreshedProfile = refreshDailyBenefit(loadProfile());
      if (restored) {
        setGame(restored);
        if (window.sessionStorage.getItem(ACTIVE_SCREEN_KEY) === "game") {
          setScreen("game");
        }
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
            Promise.all(registrations.map((registration) => registration.unregister())),
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

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  function continueGame() {
    unlockGameAudio(soundEnabled);
    playGameSound("ui", soundEnabled);
    const restored = loadSession();
    if (!restored) {
      setHasArchive(false);
      return;
    }
    setGame(restored);
    window.sessionStorage.setItem(ACTIVE_SCREEN_KEY, "game");
    setScreen("game");
  }

  function startFreshGame() {
    unlockGameAudio(soundEnabled);
    playDealSequence(12, soundEnabled);
    clearSession();
    const startingChips = Math.max(STARTING_CHIPS, profile.chips);
    const fundedProfile = syncProfileChips(profile, startingChips);
    const fresh = createGame(Date.now(), startingChips);
    saveProfile(fundedProfile);
    saveSession(fresh);
    setProfile(fundedProfile);
    setGame(fresh);
    setHasArchive(true);
    setShowNewGameConfirm(false);
    window.sessionStorage.setItem(ACTIVE_SCREEN_KEY, "game");
    setScreen("game");
  }

  function exitGame() {
    saveSession(game);
    setHasArchive(true);
    window.sessionStorage.removeItem(ACTIVE_SCREEN_KEY);
    setScreen("home");
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
        onBack={() => setScreen("home")}
      />
    );
  }

  if (screen === "statistics") {
    return (
      <StatisticsScreen
        profile={profile}
        players={game.players}
        onBack={() => setScreen("home")}
        onResetMemories={resetOpponentMemories}
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
        onWelfare={() => setScreen("welfare")}
        onStatistics={() => setScreen("statistics")}
      />
      {showNewGameConfirm ? (
        <div className="modal-backdrop">
          <section className="confirm-modal" role="dialog" aria-modal="true">
            <small>NEW TRAINING SESSION</small>
            <h2>开始新的训练？</h2>
            <p>
              当前牌局存档会清空；历史统计与五位对手对你的长期记忆会保留。积分
              不足 2,000 时自动补足训练积分。
            </p>
            <div className="result-actions">
              <button onClick={() => setShowNewGameConfirm(false)}>取消</button>
              <button className="primary" onClick={startFreshGame}>
                确认新开始
              </button>
            </div>
          </section>
        </div>
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
