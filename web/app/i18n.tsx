"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type AppLocale = "zh-CN" | "en";

const LANGUAGE_KEY = "poker-ai-web/language";
const sourceText = new WeakMap<Node, string>();
const renderedText = new WeakMap<Node, string>();
const sourceAttributes = new WeakMap<Element, Map<string, string>>();
const renderedAttributes = new WeakMap<Element, Map<string, string>>();

const EXACT: Record<string, string> = {
  "德扑 AI 训练器": "Poker AI Trainer",
  "我的小鱼干": "My Chips",
  "主菜单": "Main menu",
  "继续游戏": "Continue Game",
  "新开始": "New Game",
  "福利中心": "Rewards",
  "历史统计": "Stats & History",
  "返回": "Back",
  "每日签到": "Daily Check-in",
  "每天可领取一次": "Claim once per day",
  "今日已签到": "Checked in today",
  "每日自动补给": "Daily Auto Refill",
  "每天 10:00 自动到账": "Added automatically at 10:00 every day",
  "每天 10:00 自动补充": "Refilled automatically at 10:00 every day",
  "今日已到账": "Received today",
  "等待到账": "Waiting",
  "10:00 后到账": "Available after 10:00",
  "数据统计": "Overview",
  "AI 画像": "Opponents",
  "最近 30 手": "Hand History",
  "当前小鱼干": "Current Chips",
  "累计盈亏": "Total Profit",
  "记录手数": "Hands Recorded",
  "胜率": "Win Rate",
  "摊牌次数": "Showdowns",
  "最大单手盈利": "Best Hand Profit",
  "近期状态与复盘": "Recent Form & Review",
  "把盈亏拆成趋势和波动，避免只看最终总数。": "Separate trend from variance instead of judging only the final result.",
  "盈利手平均": "Avg. Winning Hand",
  "亏损手平均": "Avg. Losing Hand",
  "最大回撤": "Max Drawdown",
  "盈利手占比": "Winning Hands",
  "优先复盘": "Review First",
  "查看明细": "View Details",
  "训练进度": "Training Progress",
  "完成第一手，开始记录训练数据": "Finish your first hand to start tracking training data",
  "胜率、盈亏趋势和复盘建议会在牌局结束后自动生成。": "Win rate, profit trends, and review suggestions are generated after each hand.",
  "完成更多牌局后，这里会给出优先复盘建议。": "After more hands, this area will suggest what to review first.",
  "数据来自当前浏览器已完成的牌局。随着手数增加，AI 画像中的 VPIP、PFR、3Bet 与 AF 会逐步稳定。": "Data comes from hands completed in this browser. VPIP, PFR, 3Bet, and AF stabilize as the sample grows.",
  "手基础样本": "-hand baseline sample",
  "还在认识": "Still learning ",
  "完成至少 8 手后，再展示打法指标和对你的针对性调整，避免用零样本制造结论。": "Play at least 8 hands before strategy metrics and counter-adjustments are shown, avoiding conclusions from no data.",
  "清除五位对手的长期记忆": "Clear all five opponents' long-term memory",
  "还没有完成的牌局": "No Completed Hands Yet",
  "完成第一手后，这里会保存最近 30 手记录。": "Your latest 30 hands will appear here after you finish the first one.",
  "对手记忆": "Opponent Memory",
  "让对手重新认识你？": "Let the opponents learn you again?",
  "只清除五位对手学到的打法画像；小鱼干、牌桌存档和最近记录都会保留。": "This only clears what the five opponents learned about your play. Your chips, saved table, and recent hands stay intact.",
  "清除记忆": "Clear Memory",
  "取消": "Cancel",
  "关闭": "Close",
  "关闭互动面板": "Close interaction panel",
  "关闭快捷加注": "Close quick raise",
  "关闭牌局明细": "Close hand details",
  "关闭牌面大图": "Close card preview",
  "关闭全部声音": "Mute all sound",
  "开启全部声音": "Enable all sound",
  "关闭术语解释": "Close glossary",
  "关闭行动记录": "Close action log",
  "打开本局行动记录": "Open hand action log",
  "你的手牌": "Your Hand",
  "公共牌": "Board",
  "未发公共牌": "No board cards dealt",
  "本手未发公共牌": "No board cards were dealt this hand",
  "结算明细": "Payout Details",
  "本手结算摘要": "Hand settlement summary",
  "本手已弃牌，未形成五张牌型": "You folded before making a five-card hand",
  "未进入完整牌面": "The full board was not reached",
  "未摊牌": "No showdown",
  "未参与": "Did not participate",
  "已弃牌": "Folded",
  "未亮牌": "Cards not shown",
  "未摊牌获胜": "Won without showdown",
  "未参与底池": "Not in the pot",
  "最佳五张": "Best five",
  "行动过程": "Action History",
  "这手牌由旧版本保存，没有完整结算明细。": "This hand was saved by an older version and has no full settlement details.",
  "这手牌由旧版本保存，没有逐步行动记录。": "This hand was saved by an older version and has no step-by-step action log.",
  "公开线索": "Public cue",
  "本手还没有行动记录": "No actions recorded yet",
  "累计盈亏曲线": "Cumulative Profit",
  "按完成顺序展示最近": "Showing the latest",
  "手，零线以上代表累计盈利。": "hands in completion order; above zero means cumulative profit.",
  "本手": "This hand",
  "累计": "Cumulative",
  "明细": "Details",
  "完成第一手后，这里会开始绘制盈亏曲线。": "The profit chart will begin after your first completed hand.",
  "开始": "Start",
  "查看曲线逐手数据": "View hand-by-hand chart data",
  "样本较少": "Early Sample",
  "学习中": "Learning",
  "画像稳定": "Reliable Sample",
  "待观察": "Observing",
  "继续训练": "Continue Training",
  "开始第一局训练": "Start First Training Hand",
  "对局数据": "Playing Style Stats",
  "最近学到的调整": "Recent Adjustments",
  "样本进度": "Sample Progress",
  "尝试新打法": "Exploration",
  "学习曲线记录": "Learning Records",
  "观察你的行动": "Actions Observed",
  "最近一手结果": "Last Hand Result",
  "它目前怎样看你": "How It Reads You",
  "初步判断": "Early Read",
  "持续更新": "Updating",
  "你的入池率": "Your VPIP",
  "你的翻前加注率": "Your PFR",
  "你的行动主动率": "Your Aggression",
  "面对压力弃牌": "Fold to Pressure",
  "因此它倾向于": "So it tends to",
  "判断依据：观察": "Evidence: observed",
  "次行动": "actions",
  "次面对下注压力": "times facing betting pressure",
  "。样本增加后会继续修正。": "The read will keep updating as the sample grows.",
  "主动进攻": "Aggression",
  "起手牌范围": "Starting Range",
  "诈唬倾向": "Bluffing",
  "多局学习变化": "Learning Over Time",
  "曲线展示最近": "The chart shows the latest",
  "手相对原始性格的变化，零线表示原始打法。": "hands of change from the original persona; zero is the original strategy.",
  "曲线图例": "Chart legend",
  "正在建立行为基线": "Building a Behavior Baseline",
  "再观察": "Observe",
  "手后生成可靠趋势": "more hands to create a reliable trend",
  "当前相对原始性格": "Current change from original persona",
  "更克制": "More restrained",
  "更主动": "More aggressive",
  "打得更宽": "Wider",
  "选牌更紧": "Tighter",
  "更少": "Less",
  "更多": "More",
  "当前持平": "Currently neutral",
  "保持原来的进攻节奏": "Keeping its original aggression",
  "比原来的进攻节奏更克制": "More restrained than its original aggression",
  "比原来更愿意下注和加注": "More willing to bet and raise",
  "比原来愿意多打一些起手牌": "Playing a wider starting range",
  "比原来少打一些边缘起手牌": "Playing fewer marginal starting hands",
  "起手牌选择基本没变": "Starting-hand selection is mostly unchanged",
  "比原来减少了诈唬尝试": "Bluffing less than before",
  "比原来增加了诈唬尝试": "Bluffing more than before",
  "诈唬频率基本没变": "Bluff frequency is mostly unchanged",
  "选择加注尺度": "Choose Raise Size",
  "快捷加注尺度": "Quick raise sizes",
  "本局行动记录": "Hand Action Log",
  "最新行动在前": "Newest actions first",
  "本手盈亏": "Hand Profit",
  "底池小鱼干": "Pot Chips",
  "你的投喂": "Your Contribution",
  "投喂": "Contributed",
  "收回": "Won back",
  "净": "Net",
  "共": "Total",
  "张": "cards",
  "摊牌公共牌": "Showdown board",
  "平分或边池结算": "Split or side-pot settlement",
  "摊牌结算": "Showdown settlement",
  "其他玩家均已弃牌": "All other players folded",
  "返回主页": "Back to Home",
  "仅用于牌局训练": "For training only",
  "下一手": "Next Hand",
  "思考中": "Thinking",
  "请选择行动": "Choose an action",
  "等待行动": "Waiting for action",
  "本局已结束": "Hand complete",
  "音效": "Sound",
  "记录": "Log",
  "概率": "chance",
  "最大单手亏损": "Largest single-hand loss",
  "当前底池": "Current Pot",
  "翻牌前": "Preflop",
  "翻牌": "Flop",
  "转牌": "Turn",
  "河牌": "River",
  "等待下一步行动": "Waiting for the next action",
  "弃牌": "Fold",
  "过牌": "Check",
  "加注": "Raise",
  "全下": "All-in",
  "摊牌时刻": "Showdown",
  "底池归属": "Pot Awarded",
  "赢下这一手": "wins the hand",
  "鸡蛋": "Egg",
  "番茄": "Tomato",
  "鲜花": "Flower",
  "拖鞋": "Slipper",
  "离桌": "Out",
  "行动中": "Acting",
  "已过牌": "Checked",
  "训练小鱼干余额": "Training chip balance",
  "牌型": "hand",
  "高牌": "High Card",
  "一对": "One Pair",
  "两对": "Two Pair",
  "三条": "Three of a Kind",
  "顺子": "Straight",
  "同花": "Flush",
  "葫芦": "Full House",
  "四条": "Four of a Kind",
  "同花顺": "Straight Flush",
  "紧凶": "TAG",
  "松凶": "LAG",
  "紧弱": "Tight-Passive",
  "跟注站": "Calling Station",
  "均衡": "Balanced",
  "难预测": "Unpredictable",
  "自适应": "Adaptive",
  "自适应引擎": "Adaptive engine",
  "主动入池率": "Voluntarily Put Money in Pot",
  "翻前加注率": "Preflop Raise Rate",
  "翻前再加注率": "Preflop 3-bet Rate",
  "进攻系数": "Aggression Factor",
  "诈唬频率": "Bluff Frequency",
  "翻牌前自愿投入小鱼干的手数占比。": "The share of hands where chips were voluntarily invested preflop.",
  "跟注、加注或全下会计入；强制投入的小盲和大盲本身不计入。": "Calls, raises, and all-ins count; forced small and big blinds do not.",
  "翻牌前至少加注一次的手数占比。": "The share of hands with at least one preflop raise.",
  "包含首次加注、再加注和翻前全下，通常会低于或等于 VPIP。": "Includes opens, re-raises, and preflop all-ins; usually no higher than VPIP.",
  "面对一次翻前加注后再次加注的频率。": "How often a player re-raises after facing a preflop raise.",
  "当前训练器按全部记录手数显示占比，样本少时波动会比较明显。": "This trainer uses all recorded hands as the denominator, so small samples can swing sharply.",
  "加注与全下次数，相对于跟注次数的比值。": "The ratio of raises and all-ins to calls.",
  "数值越高通常代表行动越主动；它不是胜率，也不直接代表水平。": "A higher value usually means more aggression; it is neither win rate nor a direct skill measure.",
  "你": "You",
  "老 K": "King",
  "小马": "Dash",
  "大叔": "Maine",
  "小鱼": "Goldie",
  "狐狸": "Foxy",
  "黑桃": "Spades ",
  "红桃": "Hearts ",
  "方块": "Diamonds ",
  "梅花": "Clubs ",
  "金色英短": "Golden British Shorthair",
  "蓝灰英短": "Blue British Shorthair",
  "暹罗猫": "Siamese",
  "缅因猫": "Maine Coon",
  "橘猫": "Orange Tabby",
  "阿比西尼亚猫": "Abyssinian",
  "沉着的新牌手": "Calm newcomer",
  "谨慎的价值派": "Patient value player",
  "敏捷的进攻派": "Quick aggressor",
  "稳健的分析派": "Steady analyst",
  "稳健": "TAG",
  "价值施压引擎": "TAG strategy",
  "宽范围进攻引擎": "LAG strategy",
  "风险控制引擎": "Tight-passive strategy",
  "赔率跟注引擎": "Calling-station strategy",
  "情境混合引擎": "Balanced strategy",
  "正在观察你的行动习惯": "Still gathering reads on your tendencies",
  "入池偏宽": "Wide preflop range",
  "选牌偏紧": "Tight preflop range",
  "范围均衡": "Balanced preflop range",
  "进攻积极": "High aggression",
  "行动偏被动": "Low aggression",
  "攻守适中": "Balanced aggression",
  "好奇的松弛派": "Curious free spirit",
  "难测的诈唬派": "Unpredictable bluffer",
  "庄家按钮": "Dealer button",
  "小盲": "SB",
  "大盲": "BB",
  "新训练": "New Training",
  "重新开始训练？": "Restart Training?",
  "开始第一局训练？": "Start Your First Training Hand?",
  "会覆盖当前牌局，并清空历史统计和对手学习；现有小鱼干和福利记录会保留。": "This starts a fresh table and clears hand history, stats, and opponent learning. Your chips and benefit records will be kept.",
  "将发放训练小鱼干，并开始第一局。": "Training chips will be issued and your first hand will begin.",
  "重新开始": "Restart",
  "开始训练": "Start Training",
  "背面朝上的牌": "Face-down card",
  "点击查看大牌面": "Open large card view",
  "点击深色区域返回牌桌": "Click the dark area to return to the table",
  "跟注价格带来压力": "The call price creates pressure",
  "处在有利位置": "In a favorable position",
  "可用小鱼干已经不多": "The effective stack is getting short",
  "公共牌连接较强": "The board is highly connected",
  "延续了前街主动权": "Maintaining initiative from the previous street",
  "当前公开行动线较简单": "The public action line is straightforward",
  "轻敲桌面，选择过牌": "taps the table and checks",
  "把跟注的小鱼干放到身边": "slides in calling chips",
  "再拿出一叠小鱼干完成加注": "adds another stack for the raise",
  "把全部小鱼干都押上": "moves the whole stack all-in",
  "收回身体并弃牌": "mucks the hand",
  "把赢来的小鱼干收回身边": "drags in the pot",
  "放低姿态，接受结果": "takes the loss",
  "你面对压力弃牌偏多，它会增加主动施压": "You often fold under pressure, so it will apply pressure more often",
  "你面对下注继续偏多，它会减少纯诈唬、偏向价值下注": "You continue often versus bets, so it will bluff less and value-bet more",
  "你入池范围较宽，它会用更强的范围向你取价值": "You enter pots widely, so it will value-bet you with a stronger range",
  "你选牌偏紧，它会更积极争夺无人进入的底池": "You play tightly, so it will steal unopened pots more often",
  "你行动较主动，它会收紧边缘牌的继续范围": "You play aggressively, so it will tighten its marginal continuing range",
  "当前没有足够强的单一特征，它会维持原风格并继续观察": "No single read is strong enough yet, so it will keep its style and continue observing",
  "相对原始性格的当前策略调整": "Current strategy adjustments versus the original persona",
  "最佳牌型": "Best hand",
};

const SEGMENTS: ReadonlyArray<[string, string]> = [
  ["小鱼干", "chips"],
  ["老 K", "King"],
  ["小马", "Dash"],
  ["大叔", "Maine"],
  ["小鱼", "Goldie"],
  ["狐狸", "Foxy"],
  ["入池偏宽", "Wide preflop range"],
  ["选牌偏紧", "Tight preflop range"],
  ["范围均衡", "Balanced preflop range"],
  ["进攻积极", "High aggression"],
  ["行动偏被动", "Low aggression"],
  ["攻守适中", "Balanced aggression"],
  ["黑桃", "Spades "],
  ["红桃", "Hearts "],
  ["方块", "Diamonds "],
  ["梅花", "Clubs "],
  ["、", ", "],
  ["第 ", "Hand "],
  [" 手", " hands"],
  [" 局", ""],
  ["思考中", " is thinking"],
  ["轮到你", "Your turn"],
  ["可以过牌", "Check is available"],
  ["跟注", "Call"],
  ["加注至", "Raise to"],
  ["全下", "All-in"],
  ["已投入", "Committed"],
  ["投入", "Committed"],
  ["补充了", "reloaded"],
  ["公共牌", "Board"],
  ["手牌", "Hole cards"],
  ["最佳五张", "Best five"],
  ["摊牌", "showdown"],
  ["最新行动在前", "Newest actions first"],
  ["底池", "pot"],
  ["筹码", "chips"],
  ["获胜", "wins"],
  ["赢得底池", "wins the pot"],
  ["收下底池", "takes the pot"],
  ["（你）", " (You)"],
];

function translateChinese(input: string): string {
  const leading = input.match(/^\s*/)?.[0] ?? "";
  const trailing = input.match(/\s*$/)?.[0] ?? "";
  const value = input.trim();
  if (!value) return input;
  if (EXACT[value]) return `${leading}${EXACT[value]}${trailing}`;

  let output = value
    .replace(/^签到 \+(\d[\d,]*)$/, "Check in +$1")
    .replace(/^每日补给 ([\d,]+) 小鱼干$/, "Daily refill: $1 chips")
    .replace(/^补充 ([\d,]+) 小鱼干并继续$/, "Reload $1 chips and continue")
    .replace(/^跟注 ([\d,]+)$/, "Call $1")
    .replace(/^加注至? ([\d,]+)$/, "Raise to $1")
    .replace(/^全下 ([\d,]+)$/, "All-in $1")
    .replace(/^小盲 ([\d,]+)$/, "SB $1")
    .replace(/^大盲 ([\d,]+)$/, "BB $1")
    .replace(/^第 (\d+) 手$/, "Hand $1")
    .replace(/^第 (\d+) 局$/, "Hand $1")
    .replace(/^(.+)思考中$/, "$1 is thinking")
    .replace(/^(.+) 赢得 ([\d,]+) 筹码$/, "$1 wins $2 chips")
    .replace(/^(.+) 赢得底池$/, "$1 wins the pot")
    .replace(/^(.+) 获胜$/, "$1 wins")
    .replace(/^(.+) 收下底池$/, "$1 takes the pot")
    .replace(/^(.+) 赢得 ([\d,]+)$/, "$1 wins $2")
    .replace(/^(.+)的手牌$/, "$1's hole cards")
    .replace(/^(.+)，(.+)，([\d,]+) 小鱼干$/, "$1, $2, $3 chips")
    .replace(/^与(.+)互动$/, "Interact with $1")
    .replace(/^与(.+)互动 · (.+)$/, "Interact with $1 · $2")
    .replace(/^向(.+)送出(.+)$/, "Send $2 to $1")
    .replace(/^查看(.+)的猫咪角色$/, "View $1's cat character")
    .replace(/^查看第 (\d+) 手明细$/, "View hand $1 details")
    .replace(/^本局已投入 ([\d,]+) 小鱼干$/, "Committed $1 chips this hand")
    .replace(/^已投入 ([\d,]+)$/, "Committed $1")
    .replace(/^投入 ([\d,]+)$/, "Committed $1")
    .replace(/^(.+)，点击查看大图$/, "$1, open large preview")
    .replace(/^(.+)大图$/, "$1 large preview")
    .replace(/^(.+)，点击查看解释$/, "$1, open explanation")
    .replace(/^基线样本 (\d+)\/(\d+) 手$/, "Baseline sample $1/$2 hands")
    .replace(/^AI 最近 (\d+) 手的学习调整趋势$/, "AI learning trend over the last $1 hands")
    .replace(/^最近 (\d+) 手累计盈亏曲线，当前 (.+)$/, "Cumulative profit over the last $1 hands, now $2")
    .replace(/^(.+) 高同花顺$/, "$1-high straight flush")
    .replace(/^四条 (.+)$/, "Four of a kind, $1s")
    .replace(/^(.+) 带 (.+) 的葫芦$/, "Full house, $1s full of $2s")
    .replace(/^(.+) 高同花$/, "$1-high flush")
    .replace(/^(.+) 高顺子$/, "$1-high straight")
    .replace(/^三条 (.+)$/, "Three of a kind, $1s")
    .replace(/^两对 (.+) 和 (.+)$/, "Two pair, $1s and $2s")
    .replace(/^一对 (.+)$/, "One pair, $1s")
    .replace(/^(.+) 高牌$/, "$1 high")
    .replace(/^轮到你 ·\s*可以过牌$/, "Your turn · Check available")
    .replace(/^轮到你 ·\s*跟注 ([\d,]+)$/, "Your turn · Call $1");

  if (/\p{Script=Han}/u.test(output)) {
    for (const [source, translation] of SEGMENTS) {
      output = output.split(source).join(translation);
    }
  }
  return `${leading}${output}${trailing}`;
}

type LanguageContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
};

const LanguageContext = createContext<LanguageContextValue>({
  locale: "zh-CN",
  setLocale: () => undefined,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export function localize(input: string, locale: AppLocale): string {
  return locale === "en" ? translateChinese(input) : input;
}

export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage();
  const next = locale === "zh-CN" ? "en" : "zh-CN";
  return (
    <button
      key={locale}
      type="button"
      className={`language-switch ${compact ? "is-compact" : ""}`}
      aria-label={locale === "zh-CN" ? "Switch to English" : "切换至中文"}
      title={locale === "zh-CN" ? "Switch to English" : "切换至中文"}
      onClick={() => setLocale(next)}
    >
      <span aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.8 12h16.4M12 3.5c2.3 2.5 3.5 5.3 3.5 8.5S14.3 18 12 20.5M12 3.5C9.7 6 8.5 8.8 8.5 12s1.2 6 3.5 8.5" />
        </svg>
      </span>
      {locale === "zh-CN" ? "EN" : "中文"}
    </button>
  );
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("zh-CN");
  const localeRef = useRef(locale);

  function setLocale(next: AppLocale) {
    localeRef.current = next;
    setLocaleState(next);
    window.localStorage.setItem(LANGUAGE_KEY, next);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next === "en" ? "en" : "zh");
    window.history.replaceState(window.history.state, "", url);
  }

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("lang");
    const saved = window.localStorage.getItem(LANGUAGE_KEY);
    const detected: AppLocale =
      query === "en"
        ? "en"
        : query === "zh"
          ? "zh-CN"
          : saved === "en" || saved === "zh-CN"
            ? saved
            : navigator.language.toLowerCase().startsWith("zh")
              ? "zh-CN"
              : "en";
    localeRef.current = detected;
    setLocaleState(detected);
  }, []);

  useEffect(() => {
    localeRef.current = locale;
    document.documentElement.lang = locale;
    document.title = locale === "en" ? "Poker AI Trainer" : "德扑 AI 训练器";
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) {
      description.content =
        locale === "en"
          ? "An offline-first, single-player Texas Hold'em AI training game."
          : "离线优先的开源单机德州扑克 AI 训练游戏。";
    }

    const attributes = ["aria-label", "title", "placeholder", "alt"];

    const localizeTextNode = (node: Node) => {
      const current = node.nodeValue ?? "";
      if (locale === "en") {
        if (current === renderedText.get(node)) return;
        if (/\p{Script=Han}/u.test(current)) sourceText.set(node, current);
        const source = sourceText.get(node) ?? current;
        const translated = translateChinese(source);
        renderedText.set(node, translated);
        if (current !== translated) node.nodeValue = translated;
      } else {
        const source = sourceText.get(node);
        if (source && current !== source) node.nodeValue = source;
        renderedText.delete(node);
      }
    };

    const localizeElement = (element: Element) => {
      for (const attribute of attributes) {
        const current = element.getAttribute(attribute);
        if (!current) continue;
        let sources = sourceAttributes.get(element);
        let rendered = renderedAttributes.get(element);
        if (!sources) {
          sources = new Map();
          sourceAttributes.set(element, sources);
        }
        if (!rendered) {
          rendered = new Map();
          renderedAttributes.set(element, rendered);
        }
        if (locale === "en") {
          if (current !== rendered.get(attribute) && /\p{Script=Han}/u.test(current)) {
            sources.set(attribute, current);
          }
          const translated = translateChinese(sources.get(attribute) ?? current);
          rendered.set(attribute, translated);
          if (current !== translated) element.setAttribute(attribute, translated);
        } else {
          const source = sources.get(attribute);
          if (source && current !== source) element.setAttribute(attribute, source);
          rendered.delete(attribute);
        }
      }
    };

    const scan = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) localizeTextNode(root);
      if (root instanceof Element) localizeElement(root);
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      );
      let current = walker.nextNode();
      while (current) {
        if (current.nodeType === Node.TEXT_NODE) localizeTextNode(current);
        else if (current instanceof Element) localizeElement(current);
        current = walker.nextNode();
      }
    };

    scan(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") localizeTextNode(mutation.target);
        else if (mutation.type === "attributes" && mutation.target instanceof Element) {
          localizeElement(mutation.target);
        } else {
          mutation.addedNodes.forEach(scan);
        }
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: attributes,
    });
    return () => observer.disconnect();
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}
