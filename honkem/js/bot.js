// 🤖 Máy chơi Hơn Hay Kém: như người có "vốn hiểu biết" – cặp càng chênh nhiều càng dễ đoán đúng (giống máy của Đố Vui tra kho câu công khai).
import { ITEMS, CATS } from './data.js?v=1';
const ACC = { 1: 0.55, 2: 0.68, 3: 0.8 };
export function botAction(s, pid) {
  const p = s.players.find(x => x.id === pid); if (!p || s.phase !== 'q' || pid in s.ans || p.lives <= 0) return null;
  const A = ITEMS[s.cat][s.a], B = ITEMS[s.cat][s.b], truth = B[1] > A[1] ? 'up' : 'dn';
  const gap = CATS[s.cat].f === 'year' ? Math.abs(B[1] - A[1]) / 15 : Math.abs(Math.log(B[1] / A[1])) / 1.2;
  const pOk = Math.min(0.97, (ACC[p.level || 2] || 0.68) + Math.min(0.3, gap * 0.25));
  return { type: 'pick', c: Math.random() < pOk ? truth : truth === 'up' ? 'dn' : 'up' };
}
