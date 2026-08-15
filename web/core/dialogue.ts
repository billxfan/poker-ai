import type { PersonaState } from "./characterState.ts";
import {
  ACTION_VARIANTS,
  CONTEXT_LINES,
  INTERACTION_ADLIBS,
  INTERACTION_LINES,
  SITUATION_LINES,
  type DialogueLocale,
  type DialogueTrigger,
  type InteractionRole,
  type TableInteractionKind,
} from "./dialogueCatalogs.ts";
import type { AIArchetype, Street } from "./types.ts";

export type { DialogueTrigger, TableInteractionKind } from "./dialogueCatalogs.ts";

export type DialogueChoice = {
  id: string;
  family: string;
  kind: "speech";
  text: string;
};

export type DialogueContext = {
  personaState?: PersonaState;
  /** Public pressure from 0 to 1. It changes wording, never poker policy. */
  pressure?: number;
  street?: Street;
  activePlayerCount?: number;
  stackInBigBlinds?: number;
};

type PersonaDialogue = Record<DialogueTrigger, readonly string[]>;

// Shared language is deliberate. Real players reuse the same small procedural
// vocabulary; individuality comes from frequency, syntax, catchphrases and mood.
const CATALOG: Record<AIArchetype, PersonaDialogue> = {
  "tight-aggressive": {
    turn: ["等会儿。", "我数一下。", "到我了是吧？", "先别催。", "嗯……"],
    check: ["过。", "你们来。", "先过。", "没事，过。"],
    call: ["跟。", "行，跟了。", "这个价能跟。", "补上。"],
    raise: ["加。", "再加点。", "我加到这儿。", "这个数。", "来，贵一点。"],
    "all-in": ["全下。", "就这些了。", "不数了，全下。", "来吧。"],
    fold: ["不要了。", "行，你拿。", "这手算了。", "没必要。", "弃。"],
    win: ["行。", "收了。", "下一手。", "差不多。", "可以。"],
    lose: ["好。", "记住了。", "你有。", "行，下一手。", "打得可以。"],
  },
  "loose-aggressive": {
    turn: ["来来来。", "到我了？", "走一个。", "别急啊。", "这手有意思。"],
    check: ["过，给你机会。", "你先。", "免费牌，拿去。", "我也会过。"],
    call: ["跟你。", "这能不看？", "走着。", "我还在啊。", "跟了跟了。"],
    raise: ["加点，加点。", "再来一轮。", "别这么便宜。", "我抬一下。", "走大点。"],
    "all-in": ["全下，来！", "不磨了。", "都进去。", "接不接？", "一把说话。"],
    fold: ["行，这把给你。", "不送了。", "算你狠。", "跑了跑了。", "下把再弄。"],
    win: ["哎，这不就来了。", "谢谢老板。", "舒服。", "再发一手。", "就得这么打。"],
    lose: ["啧，真有你的。", "行行行。", "这也能接住。", "再来。", "你等着啊。"],
  },
  "tight-weak": {
    turn: ["等一下啊。", "我再看看。", "多少来着？", "别催别催。", "让我想会儿。"],
    check: ["过吧。", "我先过。", "先看看。", "不打。", "过。"],
    call: ["那……跟吧。", "我就看一张。", "应该能跟。", "行，我补。", "跟一下。"],
    raise: ["我加一点。", "那我加。", "就加这些。", "我试一下。", "别吓我啊。"],
    "all-in": ["都、都下了。", "就这样吧。", "我全下。", "不改了啊。"],
    fold: ["算了算了。", "我不要。", "太贵了。", "你们玩。", "还是弃吧。"],
    win: ["呼……", "还好还好。", "吓我一跳。", "总算。", "先收好。"],
    lose: ["唉。", "我就觉得不对。", "早知道了。", "又没了。", "缓一下。"],
  },
  "loose-weak": {
    turn: ["到我啦？", "多少呀？", "我看看嘛。", "还能看吗？", "等我数数。"],
    check: ["过过过。", "免费看。", "你们先。", "我不打。", "敲一下。"],
    call: ["跟一下嘛。", "不贵不贵。", "我也来。", "都跟了我也跟。", "再看一张。"],
    raise: ["我也加点。", "嘿，我加。", "小小加一下。", "这次轮到我。", "试试看。"],
    "all-in": ["啊？那全下！", "都给你看。", "我也不留了。", "就赌这次。"],
    fold: ["啊，太贵啦。", "那不看了。", "算啦算啦。", "你怎么又加。", "我跑。"],
    win: ["嘿，真给我中了。", "还好没跑。", "赚到啦。", "再看一手。", "我就说嘛。"],
    lose: ["怎么又是河牌。", "就差一点。", "哎呀。", "又白看了。", "下次会来吧。"],
  },
  balanced: {
    turn: ["等会。", "多少？", "我想一下。", "到我了。", "嗯……行。"],
    check: ["过。", "你先说。", "让一张。", "先这样。", "不打。"],
    call: ["跟了。", "我看。", "这个价可以。", "补齐。", "行，继续。"],
    raise: ["我加。", "抬一点。", "换个数。", "加到这。", "再问你一次。"],
    "all-in": ["全下。", "没后手了。", "就现在。", "都推了。", "你决定。"],
    fold: ["行，你的。", "这手不跟。", "算了。", "我弃。", "下次。"],
    win: ["拿下。", "行，下一手。", "运气不错。", "谢谢。", "够了。"],
    lose: ["好牌。", "行。", "被你逮到了。", "没事。", "这手你打得好。"],
  },
};

const EN_CATALOG: Record<AIArchetype, PersonaDialogue> = {
  "tight-aggressive": {
    turn: ["One moment.", "Let me count.", "My turn?", "No rush.", "Hmm…"],
    check: ["Check.", "Your move.", "I'll check.", "Nothing yet."],
    call: ["Call.", "I'm in.", "Okay, I call.", "Let's see it."],
    raise: ["Raise.", "A little more.", "I'll make it this much.", "Make it this."],
    "all-in": ["All-in.", "That's all of it.", "No more counting.", "Let's go."],
    fold: ["I'm out.", "You can have it.", "Not this hand.", "Fold."],
    win: ["Good.", "I'll take it.", "Next hand.", "That works."],
    lose: ["Noted.", "You had it.", "Next hand.", "Well played."],
  },
  "loose-aggressive": {
    turn: ["Let's go.", "My turn?", "Here we go.", "This is interesting."],
    check: ["Check—your chance.", "You first.", "Free card.", "I can check too."],
    call: ["I'll call.", "Have to see it.", "Still here.", "Called."],
    raise: ["More, more.", "Another round.", "Too cheap.", "Let's make it bigger."],
    "all-in": ["All-in—come on!", "No more waiting.", "Everything goes in.", "Call me?"],
    fold: ["Fine, take this one.", "Not paying you off.", "You got me.", "Next time."],
    win: ["There it is.", "Thank you.", "Lovely.", "Deal another."],
    lose: ["You got me.", "Okay, okay.", "Again.", "Just you wait."],
  },
  "tight-weak": {
    turn: ["Wait a second.", "Let me look again.", "How much was it?", "Let me think."],
    check: ["Check.", "I'll check.", "Let's see.", "No bet."],
    call: ["I guess I call.", "One more card.", "Should be okay.", "I'll match."],
    raise: ["A small raise.", "I'll raise.", "Only this much.", "Let's try it."],
    "all-in": ["A-all-in.", "That's everything.", "I'm all-in.", "No changing it."],
    fold: ["Never mind.", "Too expensive.", "You play.", "I fold."],
    win: ["Whew…", "That was close.", "Finally.", "Don't jinx it."],
    lose: ["I knew it.", "Should've known.", "Gone again.", "Give me a moment."],
  },
  "loose-weak": {
    turn: ["My turn?", "How much?", "Let me see.", "Can I still call?"],
    check: ["Check, check.", "Free card.", "You first.", "No bet."],
    call: ["I'll call.", "Not too pricey.", "I'm coming too.", "One more card."],
    raise: ["I'll add some.", "Hey, I raise.", "Just a tiny raise.", "Let's try."],
    "all-in": ["What? All-in!", "I'll show you everything.", "Nothing left behind."],
    fold: ["That's too much.", "Then I won't look.", "Why raise again?", "I'm out."],
    win: ["It actually hit!", "Good thing I stayed.", "I'll take that.", "One more hand."],
    lose: ["The river again.", "So close.", "Oh no.", "Maybe next time."],
  },
  balanced: {
    turn: ["One moment.", "How much?", "Let me think.", "My turn.", "Okay…"],
    check: ["Check.", "Your move.", "Take a card.", "No bet."],
    call: ["Call.", "I'll see it.", "Okay, I call.", "Let's see it."],
    raise: ["I raise.", "A little higher.", "Make it this.", "Back to you."],
    "all-in": ["All-in.", "No room left.", "Now or never.", "Your decision."],
    fold: ["It's yours.", "Not this hand.", "I fold.", "Next time."],
    win: ["Got it.", "Next hand.", "Good run.", "Thanks."],
    lose: ["Nice hand.", "You caught me.", "All good.", "Well played."],
  },
};

const TOPIC_LINES: Record<
  AIArchetype,
  Record<"running-hot" | "rough-run", readonly string[]>
> = {
  "tight-aggressive": {
    "running-hot": ["今天牌顺。", "别飘，继续。", "刚才那锅够了。"],
    "rough-run": ["今天不好打。", "一手一手来。", "先把节奏稳住。"],
  },
  "loose-aggressive": {
    "running-hot": ["今天我可没少赢。", "手热着呢。", "来，接着发。"],
    "rough-run": ["我就不信了。", "又来是吧。", "别急，我还在。"],
  },
  "tight-weak": {
    "running-hot": ["今天还挺顺。", "先别乱来。", "赢点就行。"],
    "rough-run": ["怎么老是这样。", "今天真不顺。", "我得慢一点。"],
  },
  "loose-weak": {
    "running-hot": ["今天想看啥来啥。", "嘿，我手气好。", "再发再发。"],
    "rough-run": ["我都输好几手啦。", "怎么还不来呀。", "再看最后一手。"],
  },
  balanced: {
    "running-hot": ["今天手感可以。", "刚才几手挺顺。", "先照常打。"],
    "rough-run": ["这阵有点背。", "前几手都不对。", "重新来。"],
  },
};

const EN_TOPIC_LINES: typeof TOPIC_LINES = {
  "tight-aggressive": {
    "running-hot": ["Good run so far.", "Don't jinx it.", "Nice pot, that one."],
    "rough-run": ["Cards are cold.", "One hand at a time.", "Need one to turn it around."],
  },
  "loose-aggressive": {
    "running-hot": ["I'm on a heater.", "Still running hot.", "Deal again."],
    "rough-run": ["You have to be kidding.", "Again?", "I'm still here."],
  },
  "tight-weak": {
    "running-hot": ["Going well today.", "Don't get wild.", "Please keep this going."],
    "rough-run": ["Why every time?", "Not my day.", "Maybe I should sit one out."],
  },
  "loose-weak": {
    "running-hot": ["Everything is hitting!", "Lucky me.", "Deal, deal."],
    "rough-run": ["How many have I lost?", "Where are my cards?", "Okay, one more hand."],
  },
  balanced: {
    "running-hot": ["Nice run today.", "The last few went well.", "Don't jinx it."],
    "rough-run": ["Rough stretch.", "Nothing's landing today.", "Deal the next one."],
  },
};

const PRESSURE_LINES: Record<AIArchetype, readonly string[]> = {
  "tight-aggressive": ["多少？", "你后面还有多少？", "我再数一次。"],
  "loose-aggressive": ["这么大？", "你真有啊？", "弃了你给看吗？"],
  "tight-weak": ["这么多啊……", "你这是全下吗？", "我后面还剩多少？"],
  "loose-weak": ["要补多少？", "这么贵还看不看呀。", "你又来。"],
  balanced: ["多少？", "你后面多少？", "让我数清楚。"],
};

const EN_PRESSURE_LINES: typeof PRESSURE_LINES = {
  "tight-aggressive": ["How much?", "What do you have behind?", "Let me count again."],
  "loose-aggressive": ["That big?", "You really have it?", "Will you show if I fold?"],
  "tight-weak": ["That much…?", "Is that all-in?", "How much do I have left?"],
  "loose-weak": ["How much to call?", "Is it worth seeing?", "You again."],
  balanced: ["How much?", "What do you have behind?", "Let me count."],
};

const SILENCE_RATE: Record<AIArchetype, number> = {
  "tight-aggressive": 0.58,
  "loose-aggressive": 0.3,
  "tight-weak": 0.44,
  "loose-weak": 0.27,
  balanced: 0.52,
};

export const FORBIDDEN_LIVE_DIALOGUE_TERMS = [
  "胜率",
  "EV",
  "赔率",
  "范围",
  "牌力",
  "blocker",
  "诈唬频率",
  "range",
  "combos",
  "effective stack",
  "pot control",
  "betting line",
] as const;

export function dialogueCatalogSize(archetype: AIArchetype): number {
  const base = Object.values(CATALOG[archetype]).reduce(
    (sum, phrases) => sum + phrases.length,
    0,
  );
  const variants = Object.values(ACTION_VARIANTS["zh-CN"][archetype]).reduce(
    (sum, phrases) => sum + phrases.length,
    0,
  );
  const contextual = Object.values(CONTEXT_LINES["zh-CN"][archetype]).reduce(
    (sum, phrases) => sum + phrases.length,
    0,
  );
  return base + variants + contextual;
}

function mixSeed(seed: number, salt: number): number {
  return Math.imul((seed ^ salt) >>> 0, 2_654_435_761) >>> 0;
}

export function choosePersonaDialogue({
  archetype,
  trigger,
  seed,
  recentIds = [],
  recentFamilies = [],
  context,
  allowSilence = true,
  locale = "zh-CN",
}: {
  archetype: AIArchetype;
  trigger: DialogueTrigger;
  seed: number;
  recentIds?: readonly string[];
  recentFamilies?: readonly string[];
  context?: DialogueContext;
  allowSilence?: boolean;
  locale?: DialogueLocale;
}): DialogueChoice | null {
  const catalog = locale === "en" ? EN_CATALOG : CATALOG;
  const topicLines = locale === "en" ? EN_TOPIC_LINES : TOPIC_LINES;
  const pressureLines = locale === "en" ? EN_PRESSURE_LINES : PRESSURE_LINES;
  const state = context?.personaState;
  const emotionTalkBoost =
    state?.emotion === "irritated" || state?.emotion === "excited" ? 0.14 : 0;
  const triggerTalkBoost = trigger === "all-in" || trigger === "win" ? 0.08 : 0;
  const silenceRate = Math.max(
    0.12,
    SILENCE_RATE[archetype] - emotionTalkBoost - triggerTalkBoost,
  );
  if (allowSilence && mixSeed(seed, 0x51a7) / 0x1_0000_0000 < silenceRate) {
    return null;
  }

  const preferOngoingMutter =
    trigger === "turn" &&
    state?.monologueTopic &&
    state.topicHandsLeft > 0 &&
    mixSeed(seed, 0x7719) / 0x1_0000_0000 < 0.64;
  const sources: Array<{ key: string; phrases: readonly string[] }> =
    preferOngoingMutter && state.monologueTopic
      ? [
          {
            key: state.monologueTopic,
            phrases: topicLines[archetype][state.monologueTopic],
          },
        ]
      : [
          {
            key: trigger,
            phrases: [
              ...catalog[archetype][trigger],
              ...ACTION_VARIANTS[locale][archetype][trigger],
            ],
          },
        ];
  if (trigger === "turn" && (context?.pressure ?? 0) >= 0.32) {
    sources.push({ key: "pressure", phrases: pressureLines[archetype] });
  }
  if (
    !preferOngoingMutter &&
    state?.monologueTopic &&
    state.topicHandsLeft > 0
  ) {
    sources.push({
      key: state.monologueTopic,
      phrases: topicLines[archetype][state.monologueTopic],
    });
  }
  const isAction = trigger !== "turn" && trigger !== "win" && trigger !== "lose";
  if (isAction && trigger === "call" && (context?.pressure ?? 0) >= 0.32) {
    sources.push({ key: "pressure-call", phrases: SITUATION_LINES[locale]["pressure-call"] });
  }
  if (isAction && trigger === "fold" && (context?.pressure ?? 0) >= 0.32) {
    sources.push({ key: "pressure-fold", phrases: SITUATION_LINES[locale]["pressure-fold"] });
  }
  if (isAction && context?.street === "river") {
    sources.push({ key: "river-action", phrases: SITUATION_LINES[locale]["river-action"] });
  }
  if (isAction && context?.activePlayerCount === 2) {
    sources.push({ key: "heads-up-action", phrases: SITUATION_LINES[locale]["heads-up-action"] });
  }
  if (isAction && (context?.stackInBigBlinds ?? Infinity) <= 20) {
    sources.push({ key: "short-stack-action", phrases: SITUATION_LINES[locale]["short-stack-action"] });
  }
  if (trigger === "turn" && context?.activePlayerCount === 2) {
    sources.push({
      key: "heads-up",
      phrases: CONTEXT_LINES[locale][archetype]["heads-up"],
    });
  }
  if (trigger === "turn" && context?.street === "river") {
    sources.push({
      key: "river",
      phrases: CONTEXT_LINES[locale][archetype].river,
    });
  }
  if (
    trigger === "turn" &&
    context?.stackInBigBlinds !== undefined &&
    context.stackInBigBlinds <= 20
  ) {
    sources.push({
      key: "short-stack",
      phrases: CONTEXT_LINES[locale][archetype]["short-stack"],
    });
  }

  const choices = sources.flatMap(({ key, phrases }) =>
    phrases.map((phrase, index) => ({
      id: `${archetype}:${key}:${index}`,
      family: `${archetype}:${key}:${index % Math.min(3, phrases.length)}`,
      kind: "speech" as const,
      text: phrase,
    })),
  );
  const recentIdSet = new Set(recentIds.slice(-12));
  const recentFamilySet = new Set(recentFamilies.slice(-3));
  const fresh = choices.filter(
    (choice) =>
      !recentIdSet.has(choice.id) && !recentFamilySet.has(choice.family),
  );
  const pool = fresh.length
    ? fresh
    : choices.filter((choice) => !recentIdSet.has(choice.id));
  if (!pool.length) return null;
  return pool[mixSeed(seed, 0x9e37) % pool.length];
}

export function chooseInteractionDialogue({
  archetype,
  kind,
  role,
  seed,
  recentIds = [],
  locale = "zh-CN",
}: {
  archetype: AIArchetype;
  kind: TableInteractionKind;
  role: InteractionRole;
  seed: number;
  recentIds?: readonly string[];
  locale?: DialogueLocale;
}): DialogueChoice {
  const phrases = [
    ...INTERACTION_LINES[locale][archetype][kind][role],
    ...INTERACTION_ADLIBS[locale][kind][role],
  ];
  const choices = phrases.map((text, index) => ({
    id: `${archetype}:interaction:${kind}:${role}:${index}`,
    family: `${archetype}:interaction:${kind}:${role}`,
    kind: "speech" as const,
    text,
  }));
  const recent = new Set(recentIds.slice(-12));
  const fresh = choices.filter((choice) => !recent.has(choice.id));
  const pool = fresh.length ? fresh : choices;
  return pool[mixSeed(seed, role === "sender" ? 0x1a2b : 0x3c4d) % pool.length];
}
