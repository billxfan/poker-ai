import type { AIArchetype, ActionType } from "./types.ts";

export type DialogueTrigger = "turn" | ActionType | "win" | "lose";

export type DialogueChoice = {
  id: string;
  family: string;
  text: string;
};

type PersonaDialogue = Record<DialogueTrigger, readonly string[]>;

const CATALOG: Record<AIArchetype, PersonaDialogue> = {
  "tight-aggressive": {
    turn: ["把筹码排成一条线", "扶正眼镜，看向桌面", "指尖停在筹码边", "安静等桌面说完", "重新坐直了些"],
    check: ["先到这里。", "这拍让过去。", "不急。"],
    call: ["这一口，我接。", "价格可以。", "继续。", "先把这一层跟上。"],
    raise: ["该把底池做大了。", "再往上一档。", "这口价，重一点。", "现在轮到我定价。", "别让桌面太便宜。"],
    "all-in": ["就到这里定。", "全部。", "这次不留余地。", "把问题一次问完。"],
    fold: ["这口价，不必勉强。", "这一手到此为止。", "可以，下一手。", "没必要证明什么。"],
    win: ["收下，继续。", "节奏没乱。", "够了，不多拿。", "这一手按计划结束。", "桌面会记住的。"],
    lose: ["记下了。", "代价可以接受。", "下一手再算。", "结果不改规矩。"],
  },
  "loose-aggressive": {
    turn: ["尾巴轻快地扫过椅背", "已经把一摞筹码拿在手里", "身体向桌前探了探", "笑着看了一圈", "指节敲出很快的拍子"],
    check: ["先让你们说。", "安静一拍。", "今天也会过牌。"],
    call: ["跟上，别停。", "这点当然要看。", "我还在。", "热闹才刚开始。"],
    raise: ["桌上太安静了。", "再抬一点！", "换我踩油门。", "来，跟上节奏。", "这池子该醒了。"],
    "all-in": ["不绕了，全部！", "一脚到底。", "来个痛快的。", "都推过去！"],
    fold: ["行，这次让你。", "踩过头了，刹车。", "下一手我还来。", "先撤，别得意。"],
    win: ["这才像一手牌！", "节奏在我这边。", "谢谢各位添柴。", "下一锅继续热。", "桌子终于醒了。"],
    lose: ["好球，下一手！", "有点意思。", "这次算你追上了。", "别走，马上再来。"],
  },
  "tight-weak": {
    turn: ["又确认了一遍下注额", "轻轻摸了摸下巴", "把眼镜往上推了推", "肩膀稍微缩紧", "慢慢数着面前筹码"],
    check: ["慢一点，没坏处。", "我先不动。", "先看看。"],
    call: ["那就再看一下。", "这个数，还能接受。", "我跟，但别催。", "先陪到这里。"],
    raise: ["我想……加一点。", "这次我来定个价。", "也不能总让着。", "那就认真一次。", "我加，但不多。"],
    "all-in": ["想清楚了，就这样。", "都放进去吧。", "这一回不退。", "好，赌这一手。"],
    fold: ["这次我不陪。", "还是稳一点。", "不合适，算了。", "留着筹码更安心。"],
    win: ["呼……还好。", "稳一点也能赢。", "这手总算没出岔子。", "收好，别急。", "看来慢有慢的用处。"],
    lose: ["我就知道不该急。", "下次再谨慎些。", "唉，记住了。", "先缓一缓。"],
  },
  "loose-weak": {
    turn: ["好奇地凑近公共牌", "眼睛跟着筹码转", "耳朵一下竖了起来", "把牌角又掀开一点", "开心地晃了晃肩膀"],
    check: ["你们先来。", "免费就看看。", "我不加。"],
    call: ["不贵，再看一张。", "大家都在，那我也在。", "跟一下嘛。", "我想看后面！", "这手挺热闹。"],
    raise: ["我也加一点试试。", "偶尔也轮到我。", "嘿，再放一些。", "这样会更有趣吧？", "那我抬一点点。"],
    "all-in": ["咦？那就全都来！", "都放进去看看！", "今天胆子大一次。", "不留猫粮啦！"],
    fold: ["啊，那算了。", "这次有点贵。", "我先去旁边看看。", "好吧，下一张不看了。"],
    win: ["真的赢啦！", "还好我没走！", "这手太有意思了。", "猫粮都回来啦。", "再玩一手！"],
    lose: ["差一点点。", "原来后面是这样。", "没关系，看到了。", "下次也许会中。"],
  },
  balanced: {
    turn: ["目光从人群移回桌面", "指间转着一枚筹码", "嘴角像是笑了一下", "安静得让人猜不透", "换了个更舒服的坐姿"],
    check: ["这一拍留白。", "你先。", "故事还没写完。"],
    call: ["这一句，我听。", "继续讲。", "我跟着看看。", "还不到散场。"],
    raise: ["换个节奏。", "这次不一样。", "让桌面再紧一点。", "我添一句。", "别太早下结论。"],
    "all-in": ["最后一句。", "现在，别眨眼。", "故事到高潮了。", "把悬念留在桌上。"],
    fold: ["这一幕与你。", "我先退到暗处。", "答案留到下次。", "这段不必演完。"],
    win: ["结局还算顺眼。", "悬念值这个价。", "今晚的风向不错。", "谢谢你把故事讲完。", "这一幕，收下了。"],
    lose: ["好结局，不属于我。", "这次你猜对了。", "有趣，记住这一幕。", "下一场换个写法。"],
  },
};

export const FORBIDDEN_LIVE_DIALOGUE_TERMS = [
  "胜率",
  "EV",
  "赔率",
  "范围",
  "牌力",
  "blocker",
  "诈唬频率",
] as const;

export function dialogueCatalogSize(archetype: AIArchetype): number {
  return Object.values(CATALOG[archetype]).reduce(
    (sum, phrases) => sum + phrases.length,
    0,
  );
}

export function choosePersonaDialogue({
  archetype,
  trigger,
  seed,
  recentIds = [],
  recentFamilies = [],
}: {
  archetype: AIArchetype;
  trigger: DialogueTrigger;
  seed: number;
  recentIds?: readonly string[];
  recentFamilies?: readonly string[];
}): DialogueChoice | null {
  const phrases = CATALOG[archetype][trigger];
  const choices = phrases.map((text, index) => ({
    id: `${archetype}:${trigger}:${index}`,
    family: `${archetype}:${trigger}:${index % Math.min(3, phrases.length)}`,
    text,
  }));
  const recentIdSet = new Set(recentIds.slice(-12));
  const recentFamilySet = new Set(recentFamilies.slice(-3));
  const fresh = choices.filter(
    (choice) =>
      !recentIdSet.has(choice.id) && !recentFamilySet.has(choice.family),
  );
  const pool = fresh.length ? fresh : choices.filter((choice) => !recentIdSet.has(choice.id));
  if (!pool.length) return null;
  const mixed = Math.imul(seed ^ 0x9e3779b9, 2_654_435_761) >>> 0;
  return pool[mixed % pool.length];
}

