import type { AIArchetype, ActionType } from "./types.ts";

export type DialogueLocale = "zh-CN" | "en";
export type DialogueTrigger = "turn" | ActionType | "win" | "lose";
export type DialogueContextKey = "heads-up" | "river" | "short-stack";
export type TableInteractionKind = "egg" | "tomato" | "flower" | "slipper";
export type InteractionRole = "sender" | "receiver";

type TriggerCatalog = Record<DialogueTrigger, readonly string[]>;
type ContextCatalog = Record<DialogueContextKey, readonly string[]>;
type InteractionCatalog = Record<
  TableInteractionKind,
  Record<InteractionRole, readonly string[]>
>;

export const ACTION_VARIANTS: Record<
  DialogueLocale,
  Record<AIArchetype, TriggerCatalog>
> = {
  "zh-CN": {
    "tight-aggressive": {
      turn: ["多少？我听一下。", "你后面还多少？", "别急，我把数过一遍。"],
      check: ["过，你来。", "我先不动。"],
      call: ["行，亮牌再说。", "跟，看看你有没有。"],
      raise: ["贵一点。", "加到这，继续吗？"],
      "all-in": ["我推了。", "都在这儿了。"],
      fold: ["可以，亮不亮？", "好弃，下一手。"],
      win: ["收下，谢谢。", "刚好够用。", "今天不用验牌。", "这锅算交代清楚了。"],
      lose: ["你真有啊。", "好牌，认了。", "这张河牌挺忙。", "行，信息收到了。"],
    },
    "loose-aggressive": {
      turn: ["来，聊聊这手。", "你们都这么安静？", "别光看，给点动静。"],
      check: ["过给你，敢打吗？", "免费一次，别浪费。"],
      call: ["我不走。", "这一枪我接。"],
      raise: ["嫌便宜？那加点。", "来，别只看热闹。"],
      "all-in": ["全下，别演了。", "接不接？一句话。"],
      fold: ["行，亮一个？", "这把先放你走。"],
      win: ["谢谢老板。", "这锅打包。", "不是偷鸡，连锅端。", "筹码自己走过来了。"],
      lose: ["你这都敢接？", "行，算你会抓。", "这不是送，是赞助。", "今天这桌不讲武德。"],
    },
    "tight-weak": {
      turn: ["等等，刚才多少？", "你别盯着我啊。", "我再确认一眼，不算拖时间。"],
      check: ["过，别打太大。", "先这样，行吧？"],
      call: ["就看这一张啊。", "好吧，我跟。"],
      raise: ["我真加了啊。", "别都跟上来。"],
      "all-in": ["不管了，全下。", "我手都推过去了。"],
      fold: ["太吓人了，不跟。", "你赢了，亮一下？"],
      win: ["吓死我了。", "还好没跑。", "安全带没白系。", "心跳先放回去。"],
      lose: ["我就知道。", "又让你撞上了。", "牌桌今天有脾气。", "这张牌专挑我。"],
    },
    "loose-weak": {
      turn: ["多少呀？别太贵。", "还能看一张吗？", "我先问问钱包同不同意。"],
      check: ["免费就看一张。", "大家都不打呀？"],
      call: ["来都来了，跟吧。", "再看一张，就一张。"],
      raise: ["我也凶一次。", "都别笑，我加了。"],
      "all-in": ["都到这了，推吧。", "最后这点也放进去。"],
      fold: ["看不起了，亮亮？", "好吧，省点下手看。"],
      win: ["我就说能来吧！", "还好没跑。", "河牌懂节目效果。", "牌桌终于回我消息了。"],
      lose: ["又差那么一点。", "早知道不看了。", "小丑竟是我自己。", "这手的剧本谁写的。"],
    },
    balanced: {
      turn: ["多少？", "等下，我看一眼。", "给我十秒，别给我答案。"],
      check: ["过，你说话。", "先让你一回。"],
      call: ["跟，开吧。", "行，我想看。"],
      raise: ["加一点。", "再问你一次。"],
      "all-in": ["都推了。", "到这儿，不留了。"],
      fold: ["好，亮不亮？", "这手给你。"],
      win: ["拿下，下一手。", "运气站我这边。", "牌堆忘讲冷笑话了。", "这次轮到我笑一下。"],
      lose: ["好牌。", "这手你打得好。", "牌堆今天会讲笑话。", "合理，但我不喜欢。"],
    },
  },
  en: {
    "tight-aggressive": {
      turn: ["How much is it?", "What do you have behind?", "Give me a second to count it."],
      check: ["Check to you.", "Go ahead."],
      call: ["Call. Let's see it.", "Okay, show me."],
      raise: ["Make it more.", "A little pricier."],
      "all-in": ["I'm all-in.", "That's the lot."],
      fold: ["Nice bet. Show one?", "Good fold. Next hand."],
      win: ["I'll take it.", "That'll do.", "No card check today.", "That settles that pot."],
      lose: ["You had it.", "Nice hand.", "Busy river tonight.", "All right, noted."],
    },
    "loose-aggressive": {
      turn: ["Why is everyone so quiet?", "Come on, let's play.", "Don't just watch—make it interesting."],
      check: ["Check. You got a bet?", "Free one. Don't waste it."],
      call: ["I'm not going anywhere.", "I'll peel one."],
      raise: ["Too cheap. More.", "Come on, play a real pot."],
      "all-in": ["All-in. No speeches.", "Call or fold?"],
      fold: ["Fine. Show one?", "You can have this one."],
      win: ["Ship it.", "Thanks for the action.", "Not a bluff. A takeover.", "The chips found their way over."],
      lose: ["You called that?", "Okay, nice catch.", "Not a punt. A donation.", "This table has no manners."],
    },
    "tight-weak": {
      turn: ["Wait, how much?", "Don't stare at me.", "One more look doesn't count as tanking."],
      check: ["Check. Please keep it small.", "Okay, check."],
      call: ["Just one more card.", "Okay... call."],
      raise: ["I'm really raising.", "Please don't all call."],
      "all-in": ["Fine. All-in.", "I already pushed it in."],
      fold: ["Too scary. Show one?", "You win. Did you have it?"],
      win: ["That was terrifying.", "Good thing I stayed.", "Seat belt worked.", "Okay, heart rate can come down."],
      lose: ["I knew it.", "Of course you got there.", "The deck woke up angry.", "That card had my name on it."],
    },
    "loose-weak": {
      turn: ["How much? Be nice.", "Can I see one more?", "Let me ask my wallet first."],
      check: ["Free card? Yes, please.", "Nobody wants to bet?"],
      call: ["I'm already here. Call.", "One more card. Just one."],
      raise: ["My turn to be scary.", "Don't laugh. I raise."],
      "all-in": ["Made it this far. All-in.", "Last chips are going in."],
      fold: ["Too much. Show me one?", "Fine, saving it for later."],
      win: ["See? I knew it!", "Good thing I stayed.", "Certified river moment.", "The deck finally texted back."],
      lose: ["Missed by that much.", "Should've folded earlier.", "Plot twist: I'm the clown.", "Who wrote this hand?"],
    },
    balanced: {
      turn: ["How much?", "Give me a second.", "Ten seconds, not an answer."],
      check: ["Check to you.", "Go ahead."],
      call: ["Call. Turn them over.", "Okay, I want to see it."],
      raise: ["Raise.", "One more question."],
      "all-in": ["All-in.", "That's everything."],
      fold: ["Nice bet. Show?", "This one's yours."],
      win: ["Good hand.", "Nice runout for me.", "The deck skipped the joke.", "My turn to smile, then."],
      lose: ["Nice hand.", "Good call.", "The deck has jokes today.", "Fair enough. Still hate it."],
    },
  },
};

export const CONTEXT_LINES: Record<
  DialogueLocale,
  Record<AIArchetype, ContextCatalog>
> = {
  "zh-CN": {
    "tight-aggressive": {
      "heads-up": ["就剩你了。", "单挑，发快点。"],
      river: ["河牌了。", "最后一张，慢点。"],
      "short-stack": ["我后面没多少了。", "筹码不多，数清楚。"],
    },
    "loose-aggressive": {
      "heads-up": ["就你了？那正好。", "其他人都跑啦？"],
      river: ["河牌，来个结局。", "最后一张，别怂。"],
      "short-stack": ["我这点够不够吓你？", "没多少了，来吧。"],
    },
    "tight-weak": {
      "heads-up": ["怎么只剩我们了。", "单挑也别催我。"],
      river: ["都到河牌了啊。", "最后一张更吓人。"],
      "short-stack": ["我真的没多少了。", "这点得省着用。"],
    },
    "loose-weak": {
      "heads-up": ["就咱俩啦？", "那我更想看了。"],
      river: ["又看到河牌啦。", "最后一张，给点面子。"],
      "short-stack": ["快见底了。", "这点还能看几张？"],
    },
    balanced: {
      "heads-up": ["就剩我们俩。", "单挑了，继续。"],
      river: ["河牌了，最后一次。", "最后一张，开吧。"],
      "short-stack": ["我后面不多。", "先数下剩多少。"],
    },
  },
  en: {
    "tight-aggressive": {
      "heads-up": ["Just you and me.", "Heads-up. Deal faster."],
      river: ["River already.", "Last card. Give me a second."],
      "short-stack": ["Not much behind.", "Let me count what's left."],
    },
    "loose-aggressive": {
      "heads-up": ["Just you? Perfect.", "Where did everyone go?"],
      river: ["River. Let's get an ending.", "Last card. Don't get shy."],
      "short-stack": ["Is this enough to scare you?", "Not much left. Come on."],
    },
    "tight-weak": {
      "heads-up": ["How is it just us?", "Heads-up. Don't rush me."],
      river: ["We're at the river already?", "Last card is the scary one."],
      "short-stack": ["I really don't have much.", "Need to make this last."],
    },
    "loose-weak": {
      "heads-up": ["Just us?", "Now I really want to see it."],
      river: ["River again!", "Last card, be nice to me."],
      "short-stack": ["Almost out again.", "How many cards can this buy?"],
    },
    balanced: {
      "heads-up": ["Just the two of us.", "Heads-up. Keep going."],
      river: ["River. One last time.", "Last card. Turn it over."],
      "short-stack": ["Not much behind.", "Let me count what's left."],
    },
  },
};

export const INTERACTION_LINES: Record<
  DialogueLocale,
  Record<AIArchetype, InteractionCatalog>
> = {
  "zh-CN": {
    "tight-aggressive": {
      egg: { sender: ["接好，醒醒。", "这颗给刚才那手。"], receiver: ["幼稚。继续发牌。", "擦掉就行。"] },
      tomato: { sender: ["这颗配你刚才那手。", "拿好，别浪费。"], receiver: ["闹完了吗？继续。", "行，我记下了。"] },
      flower: { sender: ["这手打得干净。", "值得一朵。"], receiver: ["谢谢，下一手。", "心意收到了。"] },
      slipper: { sender: ["醒醒，轮到你了。", "这比催你快。"], receiver: ["看见了，不必催。", "准头不错，牌技呢？"] },
    },
    "loose-aggressive": {
      egg: { sender: ["给你加个彩蛋！", "接住，别缩。"], receiver: ["好啊，开打了是吧。", "你最好下一手有牌。"] },
      tomato: { sender: ["红的，配你刚才那锅。", "这一颗是加注礼。"], receiver: ["行，我记住你了。", "有意思，下一枪冲你。"] },
      flower: { sender: ["打得漂亮，赏你的。", "先送花，后收锅。"], receiver: ["花收了，筹码也要。", "懂欣赏，有前途。"] },
      slipper: { sender: ["别睡，牌还没完。", "飞一个提提神。"], receiver: ["可以，仇恨值满了。", "下手你先系好鞋带。"] },
    },
    "tight-weak": {
      egg: { sender: ["对不起，轻轻一下。", "这个……给你。"], receiver: ["哎，吓我一跳。", "别再扔了啊。"] },
      tomato: { sender: ["刚才那手太吓人了。", "我就扔这一次。"], receiver: ["怎么还带扔东西的。", "我本来就够紧张了。"] },
      flower: { sender: ["你打得很好。", "送你一朵，真的。"], receiver: ["谢谢，这个可以。", "花比加注友好。"] },
      slipper: { sender: ["你刚才太凶了。", "这个提醒一下。"], receiver: ["别、别扔鞋啊。", "我醒着，我醒着。"] },
    },
    "loose-weak": {
      egg: { sender: ["嘿，送你个蛋。", "接住啦！"], receiver: ["蛋碎了，牌可别碎。", "哎呀，弄我一脸。"] },
      tomato: { sender: ["番茄来咯。", "红红的，送你。"], receiver: ["我刚想吃东西呢。", "擦一擦还能继续看牌。"] },
      flower: { sender: ["这个最好看，给你。", "赢得漂亮，送花。"], receiver: ["哇，谢谢你。", "这个我喜欢，再来一手。"] },
      slipper: { sender: ["拖鞋飞过去啦！", "小心头顶。"], receiver: ["谁的鞋呀！", "等下，我也要扔回来。"] },
    },
    balanced: {
      egg: { sender: ["接个彩蛋。", "这颗补给你。"], receiver: ["有空扔蛋，不如发牌。", "行，下一手见。"] },
      tomato: { sender: ["来点颜色。", "这颗给刚才那手。"], receiver: ["收到了。", "行，下手还你。"] },
      flower: { sender: ["好牌，送你一朵。", "这手打得漂亮。"], receiver: ["谢谢，花收了。", "收下，继续。"] },
      slipper: { sender: ["醒醒，发牌了。", "这比喊你快。"], receiver: ["看见了。", "下次轻点。"] },
    },
  },
  en: {
    "tight-aggressive": {
      egg: { sender: ["Catch. Wake up.", "One for that last hand."], receiver: ["Childish. Deal the next hand.", "Wipes right off."] },
      tomato: { sender: ["That matches your last hand.", "Catch. Don't waste it."], receiver: ["Finished? Deal.", "Fine. I remember."] },
      flower: { sender: ["Cleanly played.", "That hand earned one."], receiver: ["Thank you. Next hand.", "Appreciated."] },
      slipper: { sender: ["Wake up. Action's moving.", "Faster than calling the clock."], receiver: ["I saw it. No need to rush me.", "Good aim. How's your game?"] },
    },
    "loose-aggressive": {
      egg: { sender: ["A little action for you!", "Catch this. Don't tighten up."], receiver: ["Oh, we're playing that game now.", "Better have a hand next orbit."] },
      tomato: { sender: ["Red suits that last pot.", "A gift from the raise department."], receiver: ["All right, you're on my list.", "Cute. Next barrel is yours."] },
      flower: { sender: ["Nice hand. You earned it.", "Flowers now, pot later."], receiver: ["I'll take the flower and the chips.", "Good taste. Dangerous habit."] },
      slipper: { sender: ["Stay awake. We're still playing.", "Incoming wake-up call."], receiver: ["Fine. Now it's personal.", "Tie your shoes next hand."] },
    },
    "tight-weak": {
      egg: { sender: ["Sorry. Just a small one.", "Um... this is for you."], receiver: ["That startled me.", "Please don't throw another one."] },
      tomato: { sender: ["That last hand was terrifying.", "Only throwing this once."], receiver: ["We throw things here too?", "I was nervous already."] },
      flower: { sender: ["You played that well.", "This one is sincere."], receiver: ["Thank you. This is nicer.", "Flowers beat raises."] },
      slipper: { sender: ["You were too aggressive there.", "Just a reminder."], receiver: ["Please don't throw shoes.", "I'm awake. I'm awake."] },
    },
    "loose-weak": {
      egg: { sender: ["Hey, an egg for you.", "Catch!"], receiver: ["The egg cracked. Hope my hand doesn't.", "Right in the face!"] },
      tomato: { sender: ["Tomato delivery!", "A bright red one for you."], receiver: ["I was getting hungry anyway.", "Wipe it off and deal again."] },
      flower: { sender: ["This one's the prettiest.", "Nice win. Have a flower."], receiver: ["Aw, thank you.", "I like this one. Deal again."] },
      slipper: { sender: ["Flying slipper!", "Watch your head!"], receiver: ["Whose shoe is that?", "Wait, I'm throwing one back."] },
    },
    balanced: {
      egg: { sender: ["Catch this.", "One for the last hand."], receiver: ["Less throwing, more dealing.", "Fine. Next hand."] },
      tomato: { sender: ["A little color.", "This one's for that hand."], receiver: ["Got it.", "Fine. Your turn next."] },
      flower: { sender: ["Nice hand. Have a flower.", "That was well played."], receiver: ["Thanks. I'll take it.", "Accepted. Deal again."] },
      slipper: { sender: ["Wake up. Cards are out.", "Faster than yelling."], receiver: ["I saw it.", "Easy with the shoe."] },
    },
  },
};

/**
 * Extra short reactions shared by the table. Persona-specific openers above
 * keep the voice recognizable; these prevent the prop itself from always
 * producing the same two replies.
 */
export const INTERACTION_ADLIBS: Record<
  DialogueLocale,
  Record<TableInteractionKind, Record<InteractionRole, readonly string[]>>
> = {
  "zh-CN": {
    egg: {
      sender: ["彩蛋到账。", "这颗不算下注。", "接着，别躲。"],
      receiver: ["蛋黄都上桌了。", "这算什么新盲注？", "我先记个账。"],
    },
    tomato: {
      sender: ["红牌警告一次。", "这颗有点熟。", "刚好配这手。"],
      receiver: ["这桌还管售后？", "好，给你留个位置。", "番茄酱免了。"],
    },
    flower: {
      sender: ["这朵不掺水。", "礼貌局，收着。", "牌桌难得温柔一次。"],
      receiver: ["花收了，别捧杀。", "谢谢，先放筹码旁边。", "这次算你会说话。"],
    },
    slipper: {
      sender: ["拖鞋也想入池。", "这鞋有点急。", "借它喊一声。"],
      receiver: ["鞋飞得比牌快。", "谁的鞋，自己领走。", "好，精神了。"],
    },
  },
  en: {
    egg: {
      sender: ["Bonus egg.", "This one isn't a bet.", "Catch it, no ducking."],
      receiver: ["Yolk on the felt now.", "Is this a new blind?", "I'll put it on the tab."],
    },
    tomato: {
      sender: ["One red-card warning.", "That one's ripe.", "Fits that hand perfectly."],
      receiver: ["This table has customer service?", "Fine, I'll save you a seat.", "Hold the tomato sauce."],
    },
    flower: {
      sender: ["No strings on this one.", "A polite round. Take it.", "The table is gentle for once."],
      receiver: ["I'll take it—don't jinx me.", "Thanks, next to the chips.", "Okay, that was smooth."],
    },
    slipper: {
      sender: ["The slipper wants action too.", "That shoe is in a hurry.", "Let it make the point."],
      receiver: ["The shoe moves faster than the cards.", "Owner, collect your shoe.", "All right, I'm awake."],
    },
  },
};
