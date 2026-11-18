// 🤖 Bot Bầu cua: đặt ngẫu nhiên 1–3 con, mỗi lần một phần nhỏ số xu đang có. Không biết gì về xúc xắc (chưa lắc).
import { SYMS, CHIPS, betSum } from './engine.js?v=1';
export function botAction(s, pid) {
  if (s.stage !== 'bet') return { type: 'ready' };
  const cash = s.cash[pid], mine = s.bets[pid], n = Object.keys(mine).length, want = 1 + (pid.charCodeAt(pid.length - 1) + s.round) % 3;
  if (n < want) { const left = cash - betSum(mine), chip = [...CHIPS].reverse().find(c => c <= left && c <= Math.max(5, cash / 5)); const free = SYMS.filter(k => !(k in mine)); if (chip && free.length) return { type: 'bet', sym: free[Math.floor(Math.random() * free.length)], amt: chip }; }
  return { type: 'ready', on: true };
}
