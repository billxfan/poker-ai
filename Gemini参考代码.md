```
import React, { useState, useEffect, useRef } from 'react';

import { ChevronLeft, Menu, CircleSlash, Coins, RotateCcw } from 'lucide-react';

  

const PokerGameUI = () => {

// --- 真实游戏引擎数据 ---

// 统一下注与玩家状态 (按真实座位顺序: 0=玩家/UTG, 1=老K, 2=小马, 3=大叔/BTN, 4=狐狸/SB, 5=小鱼/BB)

const initialPlayers = [

{ id: 'hero', name: '我 (玩家)', avatar: '👤', chips: 2000, bet: 0, status: 'active', role: '枪口', isHero: true, hasActed: false, cards: ['A♠', 'K♥'] },

{ id: 'k', name: '老K', avatar: '👴', chips: 1960, bet: 0, status: 'active', role: '', isHero: false, hasActed: false },

{ id: 'ma', name: '小马', avatar: '🧑', chips: 1920, bet: 0, status: 'active', role: '', isHero: false, hasActed: false },

{ id: 'uncle', name: '大叔', avatar: '🧔', chips: 2000, bet: 0, status: 'active', role: '庄', isHero: false, hasActed: false },

{ id: 'fox', name: '狐狸', avatar: '🦊', chips: 1990, bet: 10, status: 'active', role: '小盲', isHero: false, hasActed: false },

{ id: 'fish', name: '小鱼', avatar: '👧', chips: 1980, bet: 20, status: 'active', role: '大盲', isHero: false, hasActed: false }

];

  

const deckSimulation = {

flop: ['Q♠', 'J♦', '7♣'],

turn: ['2♥'],

river: ['A♣']

};

  

const phaseLabels = {

preflop: '翻牌前',

flop: '翻牌圈',

turn: '转牌圈',

river: '河牌圈',

showdown: '摊牌结算'

};

  

// --- 状态管理 ---

const [players, setPlayers] = useState(initialPlayers);

const [phase, setPhase] = useState('preflop');

const [pot, setPot] = useState(0);

const [board, setBoard] = useState([]);

const [highestBet, setHighestBet] = useState(20); // 大盲注为20

const [turnIndex, setTurnIndex] = useState(0); // 0号位(Hero)先行动(UTG)

const [isProcessing, setIsProcessing] = useState(false);

const [actionLog, setActionLog] = useState('游戏开始，请你先行动');

  

// Hero的衍生数据，方便UI渲染

const hero = players[0];

const toCall = highestBet - hero.bet;

  

// --- 核心引擎逻辑 ---

  

// 1. 回合结束判定 & 推进阶段

const checkPhaseComplete = (currentPlayers) => {

const activePlayers = currentPlayers.filter(p => p.status === 'active');

// 如果只剩一个人，直接获胜

if (activePlayers.length === 1) {

setPhase('showdown');

setActionLog(`${activePlayers[0].name} 赢下了底池`);

return true;

}

  

// 所有人是否都行动过，且下注额等于最高下注

const isComplete = activePlayers.every(p => p.hasActed && p.bet === highestBet);

if (isComplete) {

setIsProcessing(true);

setActionLog('回合结束，收集筹码...');

// 收集筹码到底池

setTimeout(() => {

let roundBets = 0;

const newPlayers = currentPlayers.map(p => {

roundBets += p.bet;

return { ...p, bet: 0, hasActed: false }; // 重置下注和行动状态

});

setPot(prev => prev + roundBets);

setPlayers(newPlayers);

setHighestBet(0);

// 推进到下一阶段

if (phase === 'preflop') {

setPhase('flop');

setBoard([...deckSimulation.flop]);

setTurnIndex(4); // 翻牌后由小盲(狐狸, index 4)优先行动

setActionLog('翻牌圈开始');

} else if (phase === 'flop') {

setPhase('turn');

setBoard([...deckSimulation.flop, ...deckSimulation.turn]);

setTurnIndex(4);

setActionLog('转牌圈开始');

} else if (phase === 'turn') {

setPhase('river');

setBoard([...deckSimulation.flop, ...deckSimulation.turn, ...deckSimulation.river]);

setTurnIndex(4);

setActionLog('河牌圈开始');

} else if (phase === 'river') {

setPhase('showdown');

setActionLog('比牌！');

}

setIsProcessing(false);

}, 1000);

return true;

}

return false;

};

  

// 2. 寻找下一个需要行动的玩家

const findNextTurn = (currentIndex, currentPlayers) => {

let nextIndex = (currentIndex + 1) % 6;

while (currentPlayers[nextIndex].status !== 'active') {

nextIndex = (nextIndex + 1) % 6;

// 防止死循环

if (nextIndex === currentIndex) break;

}

setTurnIndex(nextIndex);

};

  

// 3. AI 模拟思考与行动

useEffect(() => {

if (phase === 'showdown' || isProcessing || hero.status !== 'active') return;

const currentPlayer = players[turnIndex];

if (currentPlayer.isHero) return; // 是玩家，等待操作

  

setIsProcessing(true);

// 模拟AI思考时间 (1~2秒)

const thinkTime = Math.random() * 1000 + 800;

const aiTimer = setTimeout(() => {

let actionType = 'call';

const callAmount = highestBet - currentPlayer.bet;

// 极其简单的AI逻辑：

// 如果不需要跟注（=过牌），就过牌

// 如果需要跟注，70%概率跟注，30%概率弃牌

if (callAmount === 0) {

actionType = 'check';

} else {

if (Math.random() > 0.7) {

actionType = 'fold';

}

}

  

const updatedPlayers = [...players];

const playerToUpdate = { ...updatedPlayers[turnIndex], hasActed: true };

  

if (actionType === 'fold') {

playerToUpdate.status = 'folded';

setActionLog(`${playerToUpdate.name} 弃牌`);

} else if (actionType === 'check') {

setActionLog(`${playerToUpdate.name} 过牌`);

} else {

// Call

playerToUpdate.chips -= callAmount;

playerToUpdate.bet += callAmount;

setActionLog(`${playerToUpdate.name} 跟注 ${callAmount}`);

}

  

updatedPlayers[turnIndex] = playerToUpdate;

setPlayers(updatedPlayers);

setIsProcessing(false);

  

if (!checkPhaseComplete(updatedPlayers)) {

findNextTurn(turnIndex, updatedPlayers);

}

}, thinkTime);

  

return () => clearTimeout(aiTimer);

}, [turnIndex, phase, isProcessing]);

  

// --- 玩家 (Hero) 操作响应 ---

const executeHeroAction = (actionType, amount = 0) => {

if (isProcessing || turnIndex !== 0) return; // 没轮到或者正在处理时禁用

  

const updatedPlayers = [...players];

const playerToUpdate = { ...updatedPlayers[0], hasActed: true };

let currentHighest = highestBet;

  

if (actionType === 'fold') {

playerToUpdate.status = 'folded';

setActionLog('你选择了弃牌');

} else if (actionType === 'call') {

playerToUpdate.chips -= amount;

playerToUpdate.bet += amount;

setActionLog(`你 ${amount === 0 ? '过牌' : `跟注 ${amount}`}`);

} else if (actionType === 'raise') {

// 简单模拟加注

const raiseTotal = currentHighest + 40; // 固定加注40

const cost = raiseTotal - playerToUpdate.bet;

playerToUpdate.chips -= cost;

playerToUpdate.bet += cost;

currentHighest = raiseTotal;

setHighestBet(raiseTotal);

// 加注后，其他人的行动状态重置，因为他们需要重新决定是否跟注

updatedPlayers.forEach((p, idx) => {

if (idx !== 0 && p.status === 'active') {

updatedPlayers[idx].hasActed = false;

}

});

setActionLog(`你 加注到 ${raiseTotal}`);

}

  

updatedPlayers[0] = playerToUpdate;

setPlayers(updatedPlayers);

  

if (!checkPhaseComplete(updatedPlayers)) {

findNextTurn(0, updatedPlayers);

}

};

  

// --- 重置游戏 ---

const handleRestart = () => {

setPlayers(initialPlayers);

setPhase('preflop');

setPot(0);

setBoard([]);

setHighestBet(20);

setTurnIndex(0);

setActionLog('新一局开始，请你先行动');

};

  

// --- UI 组件提取 ---

  

const PlayingCard = ({ cardString, isHidden = false }) => {

if (isHidden || !cardString) {

return (

<div className="w-full h-full rounded bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 shadow-lg flex items-center justify-center relative overflow-hidden shrink-0">

<div className="absolute inset-1 border border-white/5 rounded-sm"></div>

<div className="absolute inset-2 border border-white/5 rounded-sm"></div>

<span className="text-white/20 font-serif text-sm">?</span>

</div>

);

}

const value = cardString.slice(0, -1);

const suit = cardString.slice(-1);

const isRed = suit === '♥' || suit === '♦';

  

return (

<div className="w-full h-full bg-white rounded shadow-lg flex items-center justify-center border border-gray-200 shrink-0">

<span className={`font-bold flex flex-col items-center leading-none ${isRed ? 'text-red-600' : 'text-slate-800'}`}>

<span className="text-[16px]">{value}</span>

<span className="text-[12px] -mt-0.5">{suit}</span>

</span>

</div>

);

};

  

const PlayerNode = ({ player, isCurrentTurn }) => {

const isFolded = player.status === 'folded';

  

return (

<div className={`flex flex-col items-center transition-all duration-300 ${isFolded ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}`}>

<div className="relative mb-2">

{player.role && (

<div className="absolute -top-1 -right-2 bg-amber-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full z-20 shadow-sm border border-amber-300">

{player.role}

</div>

)}

{/* 行动状态指示器光环 */}

<div className={`absolute -inset-1 rounded-full z-0 transition-all duration-300 ${isCurrentTurn && !isFolded ? 'bg-amber-400 animate-pulse' : 'bg-transparent'}`}></div>

  

<div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg border-2 ${isFolded ? 'border-gray-500 bg-gray-800' : 'border-emerald-400 bg-slate-800'}`}>

{player.avatar}

</div>

{isFolded && (

<div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full z-10">

<CircleSlash size={20} className="text-red-500" strokeWidth={3} />

</div>

)}

</div>

<div className="bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 text-center min-w-[64px] border border-white/5 relative z-10">

<div className="text-white text-[11px] font-medium truncate max-w-[60px] leading-tight">{player.name}</div>

<div className="text-gray-400 text-[10px] leading-tight mt-0.5">{player.chips}</div>

</div>

<div className="h-6 mt-1.5 flex justify-center w-full relative z-10">

{player.bet > 0 && !isFolded && (

<div className="flex items-center gap-1 bg-amber-400 text-amber-900 border-2 border-amber-200 rounded-full px-2.5 py-0.5 shadow-[0_2px_5px_rgba(0,0,0,0.5)] transition-all">

<Coins size={12} strokeWidth={2.5} />

<span className="text-[11px] font-black">{player.bet}</span>

</div>

)}

</div>

</div>

);

};

  

return (

<div className="flex justify-center bg-black h-[100dvh] w-full overflow-hidden">

<div className="w-full max-w-[400px] h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1B3C2A] via-[#0E2418] to-[#050D08] flex flex-col relative shadow-2xl font-sans">

{/* 1. 顶部导航与行动日志 */}

<div className="flex justify-between items-center px-5 py-3 pt-6 shrink-0 z-20">

<button className="text-white/70 hover:text-white transition-colors">

<ChevronLeft size={24} />

</button>

<div className="flex flex-col items-center">

<div className="text-emerald-400 text-xs font-bold tracking-widest mb-0.5">第 1 局</div>

<div className="text-white/50 text-[10px]">盲注 10/20</div>

</div>

<button className="text-white/70 hover:text-white transition-colors">

<Menu size={20} />

</button>

</div>

  

{/* 动态行动日志条 */}

<div className="w-full px-4 shrink-0 z-20">

<div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-lg py-1.5 px-3 text-center text-[11px] font-medium text-emerald-300 shadow-inner">

{actionLog}

</div>

</div>

  

{/* 2. 牌桌核心区域 */}

<div className="flex-1 min-h-0 flex flex-col justify-around px-4 z-10 w-full max-w-sm mx-auto py-2">

<div className="flex justify-between items-start px-2">

<PlayerNode player={players[1]} isCurrentTurn={turnIndex === 1} />

<div className="mt-2"><PlayerNode player={players[2]} isCurrentTurn={turnIndex === 2} /></div>

<PlayerNode player={players[3]} isCurrentTurn={turnIndex === 3} />

</div>

  

<div className="flex flex-col items-center relative">

<div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-6 py-1.5 mb-3 flex items-center gap-2 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all">

<span className="text-white/50 text-[11px] tracking-wider">底池</span>

<span className="text-amber-400 font-bold text-lg">{pot}</span>

</div>

<div className="relative mt-2">

<div className="absolute -top-3.5 -left-2 bg-[#1a2c22] text-[10px] font-bold px-2 py-0.5 rounded border border-white/10 shadow-lg z-20 flex items-center gap-1.5">

<div className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${phase !== 'showdown' ? 'animate-pulse' : ''}`}></div>

<span className="text-emerald-400">

{phaseLabels[phase]}

</span>

</div>

  

<div className="flex gap-1.5 p-2 pt-3 bg-white/5 rounded-2xl backdrop-blur-sm shrink-0 min-w-[240px] justify-center min-h-[76px] border border-white/5 relative z-10">

{[0, 1, 2, 3, 4].map((index) => (

<div key={index} className="w-[40px] h-[58px] transition-all duration-500 transform">

<PlayingCard

cardString={board[index]}

isHidden={!board[index]}

/>

</div>

))}

</div>

</div>

</div>

  

<div className="flex justify-between items-end px-2">

<PlayerNode player={players[5]} isCurrentTurn={turnIndex === 5} />

<PlayerNode player={players[4]} isCurrentTurn={turnIndex === 4} />

</div>

  

</div>

  

{/* 3. Hero与操作区 */}

<div className={`w-full shrink-0 relative z-20 transition-all duration-500 ${hero.status === 'folded' ? 'opacity-60 grayscale-[0.3]' : 'opacity-100'}`}>

<div className="absolute -top-8 left-0 w-full h-8 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>

  

<div className="bg-black/80 backdrop-blur-lg rounded-t-3xl p-4 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/5 relative">

{/* 动态显示Hero在本轮桌面的下注 */}

{hero.bet > 0 && phase !== 'showdown' && (

<div className="absolute -top-24 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-amber-400 text-amber-900 border-2 border-amber-200 rounded-full px-3 py-1 shadow-[0_4px_10px_rgba(0,0,0,0.5)] z-0">

<Coins size={14} strokeWidth={2.5} />

<span className="text-[13px] font-black">{hero.bet}</span>

</div>

)}

  

<div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-2 z-10">

<div className="w-[50px] h-[72px] transform -rotate-6 transition-transform hover:-translate-y-2">

<PlayingCard cardString={hero.cards[0]} isHidden={hero.status === 'folded'} />

</div>

<div className="w-[50px] h-[72px] transform rotate-6 transition-transform hover:-translate-y-2">

<PlayingCard cardString={hero.cards[1]} isHidden={hero.status === 'folded'} />

</div>

</div>

  

<div className="flex justify-between items-end mt-8 mb-4 px-2 relative">

{/* Hero行动指示器 */}

{turnIndex === 0 && hero.status !== 'folded' && phase !== 'showdown' && (

<div className="absolute -inset-2 bg-amber-500/10 rounded-2xl animate-pulse pointer-events-none"></div>

)}

<div className="flex items-center gap-3">

<div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 shadow-md ${turnIndex === 0 ? 'bg-amber-900 border-amber-400' : 'bg-slate-700 border-emerald-500/50'}`}>

{hero.avatar}

{/* Hero 角色标识 */}

{hero.role && (

<div className="absolute -top-1 -right-2 bg-amber-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full z-20 shadow-sm border border-amber-300">

{hero.role}

</div>

)}

</div>

<div>

<div className={`font-medium text-sm ${turnIndex === 0 ? 'text-amber-400' : 'text-white'}`}>{hero.name}</div>

<div className="text-emerald-400 font-bold text-sm">{hero.chips.toLocaleString()}</div>

</div>

</div>

  

<div className="text-right">

<div className="text-white/50 text-[10px] tracking-wider mb-0.5">需跟注</div>

<div className="text-amber-400 font-bold text-xl leading-none">{toCall}</div>

</div>

</div>

  

{/* 操作按钮组 */}

{phase === 'showdown' ? (

<button

onClick={handleRestart}

className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg font-bold transition-all active:scale-95"

>

<RotateCcw size={18} />

再来一局

</button>

) : (

<div className="grid grid-cols-4 gap-2">

<button

onClick={() => executeHeroAction('fold')}

disabled={turnIndex !== 0 || isProcessing || hero.status === 'folded'}

className="col-span-1 bg-slate-800/80 hover:bg-red-500/20 text-white/80 border border-transparent rounded-xl py-2.5 flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"

>

<span className="text-sm font-medium">弃牌</span>

</button>

  

<button

onClick={() => executeHeroAction('call', toCall)}

disabled={turnIndex !== 0 || isProcessing || hero.status === 'folded'}

className={`col-span-1 text-white rounded-xl py-2.5 flex flex-col items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${toCall > 0 ? 'bg-blue-500 hover:bg-blue-400 shadow-blue-500/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'}`}

>

<span className="text-sm font-bold">{toCall > 0 ? '跟注' : '过牌'}</span>

{toCall > 0 && <span className="text-[10px] font-medium opacity-90">{toCall}</span>}

</button>

  

<button

onClick={() => executeHeroAction('raise')}

disabled={turnIndex !== 0 || isProcessing || hero.status === 'folded'}

className="col-span-1 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl py-2.5 flex flex-col items-center justify-center shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"

>

<span className="text-sm font-bold">加注</span>

<span className="text-[10px] font-medium opacity-80">+40</span>

</button>

  

<button

onClick={() => executeHeroAction('call', hero.chips)}

disabled={turnIndex !== 0 || isProcessing || hero.status === 'folded'}

className="col-span-1 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl py-2.5 flex flex-col items-center justify-center shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"

>

<span className="text-sm font-bold">全下</span>

</button>

</div>

)}

  

</div>

</div>

  

</div>

</div>

);

};

  

export default PokerGameUI;
```