// 🏅 Thống kê + thành tích của người chơi (lưu trên máy này – localStorage 'gumballz-stats'; ai đăng nhập thì shared/ui/sync.js đồng bộ thêm lên tài khoản).
// Mỗi net.js bọc handlers: this.h = watch(GAME, handlers, () => this.id) → tự đếm ván đã chơi / thắng khi ván kết thúc.
// Thêm game mới: thêm 1 dòng vào bảng OVER bên dưới (trả null khi ván CHƯA xong; { won: true/false/null } khi xong).
import { questWin } from '../js/daily.js?v=1'; /* 📅 Thử thách hôm nay: ghi ván thắng vào 2 việc thắng-ván của ngày */
const KEY = 'gumballz-stats';
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
export const GAME_NAMES = { bang: 'CÀ ĐÙNG!', uno: 'UNÔ', typhu: 'Cờ Tỷ Phú', scribble: 'Scribble it!', meono: 'Mèo Nổ', tamquoc: 'Tam Quốc Sát', masoi: 'Ma Sói', camel: 'Đua Lạc Đà', cangua: 'Cờ cá ngựa', tienlen: 'Tiến Lên', catte: 'Cát tê', bacao: 'Ba Cào', xidach: 'Xì dách', poker: 'Poker', solitaire: 'Xếp bài', cotuong: 'Cờ tướng', thathaythach: 'Thật hay Thách', baitan: 'Bài Tấn', loto: 'Lô tô', covua: 'Cờ vua', tala: 'Tá lả', cholon: 'Chợ Lớn', tusac: 'Tứ sắc', bantau: 'Bắn Tàu', oanquan: 'Ô Ăn Quan', caro: 'Cờ Caro', tictactoe: 'TicTacToe', memory: 'Memory', covay: 'Cờ Vây', cothu: 'Cờ Thú', ranvathang: 'Rắn và Thang', sam: 'Sâm lốc', baucua: 'Bầu cua', noitu: 'Nối từ', xuyenviet: 'Tàu Xuyên Việt', khaihoang: 'Đảo Khai Hoang', daochinh: 'Đảo Chính', cuuho: 'Đội Cứu Hộ', xiecthu: 'Gánh Xiếc Thú' };
const byId = (v, id) => (v.players || []).find(p => p.id === id);
const isMe = (v, me) => id => id === me;
const SIDE = { bang: { law: ['sheriff', 'deputy'], outlaw: ['outlaw'], renegade: ['renegade'] }, tamquoc: { lord: ['lord', 'loyal'], rebel: ['rebel'], spy: ['spy'] } };
const team = g => (v, me) => v.phase === 'ended' ? { won: (SIDE[g][v.winner] || []).includes((byId(v, me) || {}).role) } : null;
const single = (...ph) => (v, me) => ph.includes(v.phase) ? { won: v.winner === me } : null;
const chip = (v, me) => { if (v.phase !== 'end') return null; const r = (byId(v, me) || {}).res; return { won: r ? (r.delta > 0 ? true : r.delta < 0 ? false : null) : null }; };
const OVER = {
  bang: team('bang'), tamquoc: team('tamquoc'),
  uno: single('ended'), meono: single('ended'), tienlen: single('ended'), typhu: (v, me) => v.phase === 'over' ? { won: v.winTeam != null ? ((v.players || []).find(p => p.id === me) || {}).team === v.winTeam : v.winner === me } : null, /* chơi theo đội: cả đội cùng thắng */ cangua: single('over'),
  masoi: (v, me) => v.phase === 'ended' ? { won: !!(v.winner && (v.winner.ids || []).includes(me)) } : null,
  poker: (v, me) => v.phase === 'handover' || v.phase === 'over' ? { won: !!(v.result && v.result.won && v.result.won[me] > 0) } : null,
  xidach: chip, bacao: chip,
  catte: (v, me) => v.phase === 'handEnd' ? { won: !!(v.result && v.result.winner === me) } : null,
  camel: (v, me) => v.phase === 'ended' ? { won: !!(v.result && (v.result.winners || []).includes(me)) } : null,
  covua: (v, me) => v.phase === 'ended' && !v.puzzle ? { won: v.winner ? v.winner === me : null } : null,
  cotuong: (v, me) => v.phase === 'ended' && !v.puzzle ? { won: v.winner ? v.winner === me : null } : null, // hoà: không tính thắng thua
  cholon: (v, me) => v.phase === 'ended' ? { won: v.winner === me } : null,
  tusac: (v, me) => v.phase === 'ended' ? { won: v.winner === me } : null,
  tala: (v, me) => v.phase === 'ended' ? { won: v.winner === me } : null,
  loto: (v, me) => v.phase === 'ended' ? { won: (v.winners || []).includes(me) } : null,
  baitan: (v, me) => v.phase === 'ended' ? { won: v.opts && v.opts.team ? (v.winTeam == null ? null : ((v.players || []).find(p => p.id === me) || {}).team === v.winTeam) : (v.loser ? v.winner === me : null) } : null, /* cá nhân: về nhất mới tính thắng */
  thathaythach: v => v.phase === 'ended' ? { won: null } : null, // game vui, không có thắng thua
  bantau: (v, me) => v.phase === 'ended' ? { won: v.winner === me } : null,
  oanquan: (v, me) => v.phase === 'ended' ? { won: v.winner === me } : null, /* online: watch() tự record khi ván kết thúc; local: main.js tự record() */
  caro: (v, me) => v.phase === 'ended' ? { won: v.winner ? v.winner === me : null } : null, /* hoà (bàn đầy, không ai đủ 5 quân): không tính thắng thua; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  tictactoe: (v, me) => v.phase === 'ended' ? { won: v.winner ? v.winner === me : null } : null, /* hoà (bàn đầy 9 ô): không tính thắng thua; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  memory: (v, me) => v.phase === 'ended' ? { won: v.winner ? v.winner === me : null } : null, /* hoà (bằng cặp): không tính thắng thua; chế độ mạng do watch() tự record, chơi đơn do main.js tự record() (không qua mạng) */
  covay: (v, me) => v.phase === 'ended' ? { won: v.winner ? v.winner === me : null } : null, /* komi 7,5 nên không hòa; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  cothu: (v, me) => v.phase === 'ended' ? { won: v.winner ? v.winner === me : null } : null, /* không hòa; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  ranvathang: (v, me) => v.phase === 'ended' ? { won: v.winner ? v.winner === me : null } : null, /* luôn có người về đúng ô 100 (hoặc xin thua); mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  sam: (v, me) => v.phase === 'ended' ? { won: v.winner === me } : null,
  baucua: (v, me) => v.phase === 'ended' ? { won: v.winner === me } : null,
  noitu: (v, me) => v.phase === 'ended' ? { won: v.winner === me } : null,
  xuyenviet: (v, me) => v.phase === 'ended' ? { won: (v.winners || []).includes(me) } : null,
  khaihoang: (v, me) => v.phase === 'ended' ? { won: (v.winners || []).includes(me) } : null,
  daochinh: (v, me) => v.phase === 'ended' ? { won: v.winner === me } : null,
  xiecthu: (v, me) => v.phase === 'ended' ? { won: (v.winners || []).includes(me) } : null,
  cuuho: v => v.phase === 'ended' ? { won: !!(v.result && v.result.win) } : null, /* chơi chung: cả đội cùng thắng / thua */
  scribble: (v, me) => v.phase === 'end' ? { won: ((v.players || []).slice().sort((a, b) => (b.score || 0) - (a.score || 0))[0] || {}).id === me } : null,
};

export function load() { let s = null; try { s = JSON.parse(ls.get(KEY)); } catch (e) {} s = s && typeof s === 'object' ? s : {}; s.g = s.g || {}; s.ach = s.ach || {}; s.days = s.days || []; s.streak = s.streak || 0; s.best = s.best || 0; s.ev = s.ev || {}; s.dd = s.dd || { d: '', n: 0, k: [], w: [] }; s.ls = s.ls || 0; s.marks = s.marks || {}; s.cnt = s.cnt || {}; return s; }
const save = s => ls.set(KEY, JSON.stringify(s));
export function totals(s = load()) { let p = 0, w = 0, kinds = 0, top = 0; for (const g in s.g) { p += s.g[g].p || 0; w += s.g[g].w || 0; if (s.g[g].p) kinds++; top = Math.max(top, s.g[g].w || 0); } return { p, w, kinds, top, days: s.days.length, streak: s.streak, best: s.best, night: !!s.night, g: s.g || {}, ev: s.ev || {}, dd: s.dd || { n: 0, k: [], w: [] }, ls: s.ls || 0, marks: s.marks || {} }; }
/* ---- ☁️ Hồ sơ máy chủ: tổng gộp (mốc cũ + đã xác minh + ván local đã đồng bộ), sync.js tải về từ /auth/profile ----
   P.g = mốc cũ (legacy, đóng băng) + ván đã xác minh + ván local do client gửi (từ bản nới lỏng 18/11/2026:
   đấu máy/chơi đơn được tính lại vào máy chủ, có giới hạn tốc độ) — dùng cho hồ sơ/bảng xếp hạng; P.v = riêng phần đã xác minh.
   Hồ sơ trên máy này (totals()) vẫn giữ mọi ván; khi hiện cần phân biệt: serverTotals() = số máy chủ công nhận,
   verifiedTotals() = chỉ phần máy chủ thấy tận mắt (ván online do máy chủ giữ),
   còn totals() - serverTotals() ≈ phần chỉ có trên máy này (chưa đồng bộ). */
const SRV_KEY = 'gumballz-stats-server';
export function saveServerSnapshot(P) { try { if (P && typeof P === 'object') ls.set(SRV_KEY, JSON.stringify({ ...P, _at: Date.now() })); } catch (e) {} }
export function loadServer() { let s = null; try { s = JSON.parse(ls.get(SRV_KEY)); } catch (e) {} return s && typeof s === 'object' ? s : null; }
export function serverTotals(P = loadServer()) {
  if (!P) return null;
  let p = 0, w = 0, kinds = 0, top = 0; const g = P.g || {};
  for (const k in g) { const gp = Math.max(0, Math.floor(+g[k].p || 0)), gw = Math.min(gp, Math.max(0, Math.floor(+g[k].w || 0))); p += gp; w += gw; if (gp) kinds++; top = Math.max(top, gw); }
  const days = new Set([...(Array.isArray(P.days) ? P.days : []), ...((P.v && Array.isArray(P.v.days)) ? P.v.days : [])]).size;
  return { p, w, kinds, top, days, best: Math.min(w, Math.max(0, Math.floor(+P.best || 0))), night: !!P.night, g, legacy: P.legacy || null, at: P._at || 0 };
}
export function verifiedTotals(P = loadServer()) {
  if (!P || !P.v) return null;
  const V = P.v; let p = 0, w = 0, kinds = 0, top = 0; const g = V.g || {};
  for (const k in g) { const gp = Math.max(0, Math.floor(+g[k].p || 0)), gw = Math.min(gp, Math.max(0, Math.floor(+g[k].w || 0))); p += gp; w += gw; if (gp) kinds++; top = Math.max(top, gw); }
  return { p, w, kinds, top, days: (V.days || []).length, best: Math.min(w, V.best || 0), night: !!V.night, g, plays: V.plays || 0 };
}
/* thành tích: máy chủ công nhận (mốc cũ + đã xác minh + ván local đã đồng bộ) và riêng phần đã xác minh;
   thành tích trong hồ sơ máy mà không nằm trong 2 danh sách này thì chỉ là local-only (chưa đồng bộ). */
export function serverAch(P = loadServer()) { if (!P) return []; return [...new Set([...Object.keys(P.ach || {}), ...Object.keys((P.v && P.v.ach) || {})])]; }
export function verifiedAch(P = loadServer()) { return P && P.v ? Object.keys(P.v.ach || {}) : []; }
export const ACHS = [
  { id: 'first', icon: '🎲', name: 'Ván đầu tiên', desc: 'Chơi xong 1 ván', ok: t => t.p >= 1 },
  { id: 'p10', icon: '🎮', name: 'Dân chơi', desc: 'Chơi 10 ván', ok: t => t.p >= 10, of: t => [t.p, 10] },
  { id: 'p50', icon: '🔥', name: 'Cày cuốc', desc: 'Chơi 50 ván', ok: t => t.p >= 50, of: t => [t.p, 50] },
  { id: 'p200', icon: '👑', name: 'Huyền thoại bàn tròn', desc: 'Chơi 200 ván', ok: t => t.p >= 200, of: t => [t.p, 200] },
  { id: 'w1', icon: '🏆', name: 'Thắng lợi đầu tay', desc: 'Thắng 1 ván', ok: t => t.w >= 1 },
  { id: 'w10', icon: '🥇', name: 'Cao thủ', desc: 'Thắng 10 ván', ok: t => t.w >= 10, of: t => [t.w, 10] },
  { id: 'w50', icon: '💎', name: 'Trùm cuối', desc: 'Thắng 50 ván', ok: t => t.w >= 50, of: t => [t.w, 50] },
  { id: 's3', icon: '⚡', name: 'Vào guồng', desc: 'Thắng 3 ván liên tiếp', ok: t => t.best >= 3, of: t => [t.best, 3] },
  { id: 's5', icon: '🚀', name: 'Không thể cản', desc: 'Thắng 5 ván liên tiếp', ok: t => t.best >= 5, of: t => [t.best, 5] },
  { id: 'k5', icon: '🧭', name: 'Thử cho biết', desc: 'Chơi 5 game khác nhau', ok: t => t.kinds >= 5, of: t => [t.kinds, 5] },
  { id: 'k10', icon: '🍱', name: 'Nếm đủ mùi', desc: 'Chơi 10 game khác nhau', ok: t => t.kinds >= 10, of: t => [t.kinds, 10] },
  { id: 'k15', icon: '🗂️', name: 'Sưu tầm gia', desc: 'Chơi 15 game khác nhau', ok: t => t.kinds >= 15, of: t => [t.kinds, 15] },
  { id: 'm10', icon: '🎓', name: 'Chuyên gia', desc: 'Thắng 10 ván cùng một game', ok: t => t.top >= 10, of: t => [t.top, 10] },
  { id: 'd3', icon: '☕', name: 'Khách quen', desc: 'Chơi vào 3 ngày khác nhau', ok: t => t.days >= 3, of: t => [t.days, 3] },
  { id: 'd7', icon: '🏠', name: 'Người nhà', desc: 'Chơi vào 7 ngày khác nhau', ok: t => t.days >= 7, of: t => [t.days, 7] },
  { id: 'night', icon: '🦉', name: 'Cú đêm', desc: 'Chơi xong một ván lúc nửa đêm (0h–5h)', ok: t => t.night },
  /* --- thêm 20261116-14: mở rộng thành tựu --- */
  { id: 'p25', icon: '🕹️', name: 'Quen tay', desc: 'Chơi 25 ván', ok: t => t.p >= 25, of: t => [t.p, 25] },
  { id: 'p100', icon: '💯', name: 'Trăm ván', desc: 'Chơi 100 ván', ok: t => t.p >= 100, of: t => [t.p, 100] },
  { id: 'w25', icon: '🎖️', name: 'Thắng 25 ván', desc: 'Thắng 25 ván', ok: t => t.w >= 25, of: t => [t.w, 25] },
  { id: 'w100', icon: '💠', name: 'Thắng 100 ván', desc: 'Thắng 100 ván', ok: t => t.w >= 100, of: t => [t.w, 100] },
  { id: 's7', icon: '🌪️', name: 'Chuỗi 7', desc: 'Thắng 7 ván liên tiếp', ok: t => t.best >= 7, of: t => [t.best, 7] },
  { id: 's10', icon: '💥', name: 'Chuỗi 10', desc: 'Thắng 10 ván liên tiếp', ok: t => t.best >= 10, of: t => [t.best, 10] },
  { id: 'k20', icon: '🧳', name: 'Đi khắp nơi', desc: 'Chơi 20 game khác nhau', ok: t => t.kinds >= 20, of: t => [t.kinds, 20] },
  { id: 'k24', icon: '🌍', name: 'Chơi hết mọi game', desc: 'Chơi cả 24 game', ok: t => t.kinds >= 24, of: t => [t.kinds, 24] },
  { id: 'k25', icon: '🪀', name: 'Đủ 25 game', desc: 'Chơi cả 25 game', ok: t => t.kinds >= 25, of: t => [t.kinds, 25] },
  { id: 'd14', icon: '📅', name: 'Nửa tháng', desc: 'Chơi vào 14 ngày khác nhau', ok: t => t.days >= 14, of: t => [t.days, 14] },
  { id: 'd30', icon: '🗓️', name: 'Cả tháng', desc: 'Chơi vào 30 ngày khác nhau', ok: t => t.days >= 30, of: t => [t.days, 30] },
  { id: 'lv5', icon: '⭐', name: 'Cấp 5', desc: 'Đạt cấp 5', ok: t => level(t).lv >= 5, of: t => [level(t).lv, 5] },
  { id: 'lv10', icon: '🌟', name: 'Cấp 10', desc: 'Đạt cấp 10', ok: t => level(t).lv >= 10, of: t => [level(t).lv, 10] },
  /* Bắn Tàu: mở khóa từ sự kiện trong ván (recordEvent), xem totals().ev.bt */
  { id: 'bt_sink1', icon: '🚢', name: 'Thợ săn tàu', desc: 'Đánh chìm tàu đầu tiên ở Bắn Tàu', ok: t => (t.ev.bt?.sinks || 0) >= 1, of: t => [t.ev.bt?.sinks || 0, 1] },
  { id: 'bt_sink2', icon: '💥', name: 'Song sát', desc: 'Đánh chìm 2 tàu trong 1 ván Bắn Tàu', ok: t => (t.ev.bt?.sinkMax || 0) >= 2, of: t => [t.ev.bt?.sinkMax || 0, 2] },
  { id: 'bt_sink5', icon: '🌊', name: 'Làm chủ mặt biển', desc: 'Đánh chìm cả 5 tàu trong 1 ván Bắn Tàu', ok: t => (t.ev.bt?.sinkMax || 0) >= 5, of: t => [t.ev.bt?.sinkMax || 0, 5] },
  { id: 'bt_streak3', icon: '🎯', name: 'Bắn đâu trúng đó', desc: 'Chuỗi 3 phát trúng liên tiếp ở Bắn Tàu', ok: t => (t.ev.bt?.hitStreak || 0) >= 3, of: t => [t.ev.bt?.hitStreak || 0, 3] },
  { id: 'bt_streak5', icon: '🧨', name: 'Xạ thủ cừ khôi', desc: 'Chuỗi 5 phát trúng liên tiếp ở Bắn Tàu', ok: t => (t.ev.bt?.hitStreak || 0) >= 5, of: t => [t.ev.bt?.hitStreak || 0, 5] },
  { id: 'bt_items', icon: '🎒', name: 'Đủ đồ chơi', desc: 'Dùng đủ 3 loại vật phẩm ở Bắn Tàu (Bẫy, Radar, Bom)', ok: t => ['trap', 'radar', 'nuke'].every(k => t.ev.bt?.items?.[k]), of: t => [['trap', 'radar', 'nuke'].filter(k => t.ev.bt?.items?.[k]).length, 3] },
  { id: 'bt_flawless', icon: '🛡️', name: 'Hạm đội bất bại', desc: 'Thắng 1 ván Bắn Tàu mà không mất tàu nào', ok: t => (t.ev.bt?.flawless || 0) >= 1 },
  { id: 'bt_trap', icon: '🪤', name: 'Bẫy sập', desc: 'Bẫy của bạn vô hiệu hoá 1 phát bắn của địch', ok: t => (t.ev.bt?.trap || 0) >= 1 },
  { id: 'bt_radar', icon: '📡', name: 'Radar bắt sóng', desc: 'Radar quét trúng vùng có tàu', ok: t => (t.ev.bt?.radarHit || 0) >= 1 },
  { id: 'bt_nukesink', icon: '☢️', name: 'Bom chìm tàu', desc: 'Bom hạt nhân đánh chìm 1 tàu', ok: t => (t.ev.bt?.nukeSink || 0) >= 1 },
  /* Ô Ăn Quan: mở khóa từ sự kiện trong ván (recordEvent), xem totals().ev.oq */
  { id: 'oq_quan1', icon: '👑', name: 'Ăn Quan đầu tiên', desc: 'Ăn 1 quân Quan ở Ô Ăn Quan', ok: t => (t.ev.oq?.quan || 0) >= 1, of: t => [t.ev.oq?.quan || 0, 1] },
  { id: 'oq_chain3', icon: '🔗', name: 'Ăn dây 3 ô', desc: 'Ăn dây 3 ô trở lên trong 1 nước ở Ô Ăn Quan', ok: t => (t.ev.oq?.chainMax || 0) >= 3, of: t => [t.ev.oq?.chainMax || 0, 3] },
  { id: 'oq_rescue', icon: '🛟', name: 'Cứu dân thành công', desc: 'Cứu dân 1 lần ở Ô Ăn Quan', ok: t => (t.ev.oq?.rescues || 0) >= 1, of: t => [t.ev.oq?.rescues || 0, 1] },
  { id: 'oq_flawless', icon: '🛡️', name: 'Toàn vẹn đôi Quan', desc: 'Thắng 1 ván Ô Ăn Quan mà đối phương không ăn được Quan nào', ok: t => (t.ev.oq?.flawless || 0) >= 1 },
  { id: 'oq_bothquan', icon: '👑', name: 'Ăn cả 2 Quan', desc: 'Ăn cả 2 quân Quan trong 1 ván Ô Ăn Quan', ok: t => (t.ev.oq?.bothQuan || 0) >= 1 },
  { id: 'oq_comeback', icon: '🌊', name: 'Lội ngược dòng', desc: 'Thắng 1 ván Ô Ăn Quan sau khi đã phải cứu dân', ok: t => (t.ev.oq?.comeback || 0) >= 1 },
  /* Cờ Caro: chuỗi thắng theo từng game (record() giữ g.st) + thắng nhanh (recordEvent 'end', data.moves) */
  { id: 'caro_streak3', icon: '✖️', name: 'Chuỗi Caro', desc: 'Thắng 3 ván Cờ Caro liên tiếp', ok: t => (t.g.caro?.st || 0) >= 3, of: t => [t.g.caro?.st || 0, 3] },
  { id: 'caro_win_fast', icon: '⚡', name: 'Thắng nhanh', desc: 'Thắng 1 ván Cờ Caro dưới 30 nước', ok: t => (t.ev.cr?.fast || 0) >= 1 },
  /* TicTacToe: chuỗi thắng theo từng game (record() giữ g.st) + hòa máy Khó (recordEvent 'end') */
  { id: 'tictactoe_streak3', icon: '❌', name: 'Chuỗi TicTacToe', desc: 'Thắng 3 ván TicTacToe liên tiếp', ok: t => (t.g.tictactoe?.st || 0) >= 3, of: t => [t.g.tictactoe?.st || 0, 3] },
  { id: 'tictactoe_draw_hard', icon: '🤝', name: 'Cầm hòa Máy Khó', desc: 'Hòa 1 ván TicTacToe với Máy Khó (minimax không thể thắng được)', ok: t => (t.ev.tt?.drawHard || 0) >= 1 },
  /* Memory: chuỗi thắng theo từng game (record() giữ g.st) + hoàn hảo / xong nhanh ở chơi đơn mức Vừa (recordEvent 'end', data.solo) */
  { id: 'memory_streak3', icon: '🃏', name: 'Chuỗi Memory', desc: 'Thắng 3 ván Memory liên tiếp', ok: t => (t.g.memory?.st || 0) >= 3, of: t => [t.g.memory?.st || 0, 3] },
  { id: 'memory_perfect', icon: '🧠', name: 'Trí nhớ hoàn hảo', desc: 'Thắng chơi đơn Memory mức Vừa mà không lật trượt lần nào', ok: t => (t.ev.mm?.perfect || 0) >= 1 },
  { id: 'memory_fast', icon: '⏱️', name: 'Nhớ siêu tốc', desc: 'Xong bàn Memory 16 lá (mức Vừa) dưới 60 giây ở chơi đơn', ok: t => (t.ev.mm?.fast || 0) >= 1 },
  /* Cờ Vây: chuỗi thắng theo từng game (record() giữ g.st) + thắng bàn 19×19 / thắng cách biệt 20 điểm (recordEvent 'end', data.size/margin) */
  { id: 'covay_streak3', icon: '⚫', name: 'Chuỗi Cờ Vây', desc: 'Thắng 3 ván Cờ Vây liên tiếp', ok: t => (t.g.covay?.st || 0) >= 3, of: t => [t.g.covay?.st || 0, 3] },
  { id: 'covay_win19', icon: '🏯', name: 'Đại bàn 19×19', desc: 'Thắng 1 ván Cờ Vây bàn 19×19', ok: t => (t.ev.cv?.win19 || 0) >= 1 },
  { id: 'covay_bigwin', icon: '🌊', name: 'Thắng áp đảo', desc: 'Thắng 1 ván Cờ Vây cách biệt từ 20 điểm trở lên', ok: t => (t.ev.cv?.bigwin || 0) >= 1 },
  /* Cờ Thú: chuỗi thắng theo từng game (record() giữ g.st) + Chuột ăn Voi / thắng bằng vào hang (recordEvent) */
  { id: 'cothu_streak3', icon: '🦁', name: 'Chuỗi Cờ Thú', desc: 'Thắng 3 ván Cờ Thú liên tiếp', ok: t => (t.g.cothu?.st || 0) >= 3, of: t => [t.g.cothu?.st || 0, 3] },
  { id: 'cothu_rat_elephant', icon: '🐀', name: 'Chuột ăn Voi', desc: 'Dùng Chuột ăn được Voi ở Cờ Thú', ok: t => (t.ev.ct?.ratElephant || 0) >= 1 },
  { id: 'cothu_den_win', icon: '🚩', name: 'Vào hang thắng', desc: 'Thắng 1 ván Cờ Thú bằng cách vào hang địch', ok: t => (t.ev.ct?.denWin || 0) >= 1 },
  /* Rắn và Thang: chuỗi thắng theo từng game (record() giữ g.st) + leo thang lớn / trượt rắn lớn (recordEvent) */
  { id: 'rt_streak3', icon: '🎲', name: 'Chuỗi Rắn và Thang', desc: 'Thắng 3 ván Rắn và Thang liên tiếp', ok: t => (t.g.ranvathang?.st || 0) >= 3, of: t => [t.g.ranvathang?.st || 0, 3] },
  { id: 'rt_ladder28', icon: '🪜', name: 'Thang lớn 28→84', desc: 'Leo thang từ ô 28 lên ô 84 ở Rắn và Thang', ok: t => (t.ev.rt?.ladder28 || 0) >= 1 },
  { id: 'rt_snake87', icon: '🐍', name: 'Rắn lớn 87→24', desc: 'Trượt rắn từ ô 87 xuống ô 24 ở Rắn và Thang', ok: t => (t.ev.rt?.snake87 || 0) >= 1 },
  /* --- thêm 20261118: thành tựu chung vui (tên/mô tả giữ nguyên, thương hiệu cũ → GumballZ Boardgame) ---
     Bỏ qua 5 cái: c-friend / c-friends5 (repo này không có danh sách bạn lưu local để đối chiếu), c-dress10 (không có bộ đếm đổi avatar),
     c-days30 (trùng điều kiện với d30 'Cả tháng' đã có), c-streak10 (trùng điều kiện với s10 'Chuỗi 10' đã có). */
  { id: 'c-lose5', icon: '🥲', name: 'Ván sau sẽ là ván của chúng ta...', desc: 'Thua 5 ván liên tiếp', ok: t => (t.ls || 0) >= 5, of: t => [Math.min(t.ls || 0, 5), 5] },
  { id: 'c-comeback', icon: '🏆', name: 'YEAHHH VÔ ĐỊCH RỒI YEAHHH', desc: 'Thắng ngay sau chuỗi thua 5 ván', ok: t => !!(t.marks || {})['c-comeback'] },
  { id: 'c-day20', icon: '🧟', name: 'No life', desc: 'Chơi 20 ván trong một ngày', ok: t => (t.dd.n || 0) >= 20, of: t => [Math.min(t.dd.n || 0, 20), 20] },
  { id: 'c-day3g', icon: '🍠', name: 'Khoai Lang Thang', desc: 'Chơi 3 game khác nhau trong một ngày', ok: t => (t.dd.k || []).length >= 3, of: t => [Math.min((t.dd.k || []).length, 3), 3] },
  { id: 'c-dawn', icon: '🦉', name: 'Hiến tế gan thận', desc: 'Thắng một ván lúc 0h–5h', ok: t => !!(t.marks || {})['c-dawn'] },
  { id: 'c-lose100', icon: '🎰', name: 'Gấp đôi đến chết', desc: 'Thua tổng cộng 100 ván', ok: t => Object.values(t.g).reduce((n, x) => n + (x.l || 0), 0) >= 100, of: t => [Math.min(Object.values(t.g).reduce((n, x) => n + (x.l || 0), 0), 100), 100] },
  { id: 'c-allgames', icon: '🧭', name: 'Nhà Thám Hiểm Runeterra', desc: 'Chơi đủ mọi game của GumballZ Boardgame', ok: t => t.kinds >= Object.keys(GAME_NAMES).length, of: t => [t.kinds, Object.keys(GAME_NAMES).length] },
  { id: 'c-win3g', icon: '🎯', name: 'Đa năng', desc: 'Thắng 3 game khác nhau trong một ngày', ok: t => (t.dd.w || []).length >= 3, of: t => [Math.min((t.dd.w || []).length, 3), 3] },
  { id: 'c-play500', icon: '🎖️', name: 'GET A JOB BRO!', desc: 'Chơi tổng cộng 500 ván', ok: t => t.p >= 500, of: t => [t.p, 500] },
  { id: 'c-back', icon: '👋', name: 'Giờ mới chịu vác mặt về à! Hmmph!', desc: 'Quay lại chơi sau 30 ngày vắng mặt', ok: t => !!(t.marks || {})['c-back'] },
  { id: 'c-weekend', icon: '🛋️', name: 'Cuối tuần mất ngủ!', desc: 'Chơi cả thứ Bảy lẫn Chủ nhật trong cùng một tuần', ok: t => !!(t.marks || {})['c-weekend'] },
  { id: 'c-quick', icon: '⚡', name: "My name is Barry Allen and I'm the fastest man alive", desc: 'Thắng một ván chưa tới 2 phút', ok: t => !!(t.marks || {})['c-quick'] },
  { id: 'c-long', icon: '🕰️', name: 'RIP tiền server', desc: 'Một ván kéo dài hơn 1 tiếng', ok: t => !!(t.marks || {})['c-long'] },
  { id: 'c-crowd', icon: '🎪', name: 'Đông quá chơi Vịt đi ae', desc: 'Chơi trong phòng từ 8 người trở lên', ok: t => !!(t.marks || {})['c-crowd'] },
  { id: 'c-firstloss', icon: '🫠', name: 'Ra mắt hơi xui', desc: 'Thua ván đầu tiên trên GumballZ Boardgame', ok: t => !!(t.marks || {})['c-firstloss'] },
  { id: 'c-w50', icon: '🥇', name: 'Trùm cuối', desc: 'Thắng 50 ván một game bất kỳ', ok: t => t.top >= 50, of: t => [t.top, 50] },
  { id: 'c-win10g', icon: '🌈', name: 'Vạn năng', desc: 'Thắng ít nhất 1 ván ở 10 game khác nhau', ok: t => Object.values(t.g).filter(x => (x.w || 0) >= 1).length >= 10, of: t => [Object.values(t.g).filter(x => (x.w || 0) >= 1).length, 10] },
  { id: 'c-newyear', icon: '🎆', name: 'CHÚC MỪNG NĂM MỚI!', desc: 'Chơi lúc đúng giao thừa (0h ngày 1/1)', ok: t => !!(t.marks || {})['c-newyear'] },
  /* --- thêm 20261118-17: bậc khó hơn (Nguyễn: thêm thành tựu + nâng độ khó; CHỈ THÊM id mới, không đổi ngưỡng
     cũ nên không thu hồi unlock nào — ai đã đủ điều kiện thì lần chơi/đồng bộ sau tự mở) --- */
  { id: 'p1000', icon: '🏯', name: 'Chơi 1000 ván', desc: 'Chơi 1000 ván', ok: t => t.p >= 1000, of: t => [t.p, 1000] },
  { id: 'w200', icon: '🏆', name: 'Thắng 200 ván', desc: 'Thắng 200 ván', ok: t => t.w >= 200, of: t => [t.w, 200] },
  { id: 'w500', icon: '👑', name: 'Thắng 500 ván', desc: 'Thắng 500 ván', ok: t => t.w >= 500, of: t => [t.w, 500] },
  { id: 's15', icon: '🔥', name: 'Chuỗi 15', desc: 'Thắng 15 ván liên tiếp', ok: t => t.best >= 15, of: t => [t.best, 15] },
  { id: 's20', icon: '🌋', name: 'Chuỗi 20', desc: 'Thắng 20 ván liên tiếp', ok: t => t.best >= 20, of: t => [t.best, 20] },
  { id: 'k30', icon: '🗺️', name: 'Chơi 30 game', desc: 'Chơi 30 game khác nhau', ok: t => t.kinds >= 30, of: t => [t.kinds, 30] },
  { id: 'k35', icon: '🧭', name: 'Chơi 35 game', desc: 'Chơi 35 game khác nhau', ok: t => t.kinds >= 35, of: t => [t.kinds, 35] },
  { id: 'd60', icon: '🗓️', name: 'Chơi 60 ngày', desc: 'Chơi vào 60 ngày khác nhau', ok: t => t.days >= 60, of: t => [t.days, 60] },
  { id: 'd100', icon: '📆', name: 'Chơi 100 ngày', desc: 'Chơi vào 100 ngày khác nhau', ok: t => t.days >= 100, of: t => [t.days, 100] },
  { id: 'm25', icon: '🎖️', name: 'Thắng 25 ván một game', desc: 'Thắng 25 ván cùng một game', ok: t => t.top >= 25, of: t => [t.top, 25] },
  { id: 'c-play1000', icon: '🏰', name: 'Sống ở đây luôn à?', desc: 'Chơi tổng cộng 1000 ván', ok: t => t.p >= 1000, of: t => [t.p, 1000] },
  { id: 'c-day50', icon: '🤖', name: 'Máy chơi game chạy bằng cơm', desc: 'Chơi 50 ván trong một ngày', ok: t => (t.dd.n || 0) >= 50, of: t => [Math.min(t.dd.n || 0, 50), 50] },
  { id: 'c-win25g', icon: '🌟', name: 'Đa năng toàn diện', desc: 'Thắng ít nhất 1 ván ở 25 game khác nhau', ok: t => Object.values(t.g).filter(x => (x.w || 0) >= 1).length >= 25, of: t => [Object.values(t.g).filter(x => (x.w || 0) >= 1).length, 25] },
  { id: 'c-lose500', icon: '🎲', name: 'Thua là mẹ thành công', desc: 'Thua tổng cộng 500 ván', ok: t => Object.values(t.g).reduce((n, x) => n + (x.l || 0), 0) >= 500, of: t => [Math.min(Object.values(t.g).reduce((n, x) => n + (x.l || 0), 0), 500), 500] },
];
/* thành tích theo từng game: thắng đầu tiên + 10 ván thắng; game không tính thắng thua thì chơi đầu tiên + 10 ván */
const GAME_ICON = { bang: '🤠', uno: '🃏', typhu: '🏙️', scribble: '🎨', meono: '💣', tamquoc: '⚔️', masoi: '🐺', camel: '🐪', cangua: '🐴', tienlen: '🐷', catte: '🂡', bacao: '👑', xidach: '🃏', poker: '♠️', solitaire: '🃏', cotuong: '♟️', thathaythach: '🎯', baitan: '🃏', loto: '🎪', covua: '♟️', tala: '🀄', cholon: '🏮', tusac: '🀄', bantau: '🚢', oanquan: '🪨', caro: '✖️', tictactoe: '❌', memory: '🃏', covay: '⚫', cothu: '🦁', ranvathang: '🐍', sam: '🃏', baucua: '🎲', noitu: '🔤', xuyenviet: '🚂', khaihoang: '🏝️', daochinh: '🎭', cuuho: '🦸', xiecthu: '🎪' };
for (const [g, name] of Object.entries(GAME_NAMES)) {
  const ic = GAME_ICON[g] || '🎲';
  if (g === 'thathaythach') {
    ACHS.push({ id: 'p1_' + g, icon: ic, name, desc: `Chơi 1 ván ${name}`, ok: t => (t.g[g]?.p || 0) >= 1 });
    ACHS.push({ id: 'p10_' + g, icon: ic, name, desc: `Chơi 10 ván ${name}`, ok: t => (t.g[g]?.p || 0) >= 10, of: t => [t.g[g]?.p || 0, 10] });
  } else {
    ACHS.push({ id: 'w1_' + g, icon: ic, name, desc: `Thắng 1 ván ${name}`, ok: t => (t.g[g]?.w || 0) >= 1 });
    ACHS.push({ id: 'w10_' + g, icon: ic, name, desc: `Thắng 10 ván ${name}`, ok: t => (t.g[g]?.w || 0) >= 10, of: t => [t.g[g]?.w || 0, 10] });
  }
}
/* --- thêm 20261118: mẫu thành tựu theo từng game (5 mẫu × mỗi game; tên hiện = tên mẫu + tên game) ---
   Thêm 20261118-17: 3 mẫu bậc khó (g-w50, g-w100, g-p50) — Nguyễn: thêm thành tựu + nâng độ khó.
   Thật hay Thách không có thắng thua nên chỉ lấy mẫu không cần thắng (nw: 1); các mẫu còn lại không bao giờ mở được ở game đó nên không thêm (tránh thẻ khóa vĩnh viễn). */
const TPL = [
  { id: 'g-first', icon: '🎮', name: 'Ê game này vui nè', desc: 'Chơi xong ván đầu tiên', ok: g => g.p >= 1, nw: 1 },
  { id: 'g-w5', icon: '😆', name: 'Vui thiệt bây ơi', desc: 'Thắng 5 ván', ok: g => g.w >= 5, of: g => [g.w, 5] },
  { id: 'g-w25', icon: '📈', name: 'Leo rank', desc: 'Thắng 25 ván', ok: g => g.w >= 25, of: g => [g.w, 25] },
  { id: 'g-w50', icon: '🏆', name: 'Cao thủ thật sự', desc: 'Thắng 50 ván', ok: g => g.w >= 50, of: g => [g.w, 50] },
  { id: 'g-w100', icon: '👑', name: 'Vô địch', desc: 'Thắng 100 ván', ok: g => g.w >= 100, of: g => [g.w, 100] },
  { id: 'g-l10', icon: '💀', name: '💀', desc: 'Thua 10 ván (vẫn chơi tiếp)', ok: g => (g.l || 0) >= 10, of: g => [g.l || 0, 10] },
  { id: 'g-s3', icon: '🔥', name: 'Chuỗi thắng', desc: 'Thắng 3 ván liên tiếp', ok: g => (g.bs || 0) >= 3, of: g => [g.bs || 0, 3] },
  { id: 'g-p50', icon: '🕹️', name: 'Chơi hoài không chán', desc: 'Chơi 50 ván', ok: g => g.p >= 50, of: g => [g.p, 50], nw: 1 },
];
for (const [g, name] of Object.entries(GAME_NAMES)) {
  const ts = g === 'thathaythach' ? TPL.filter(t => t.nw) : TPL;
  for (const tp of ts) ACHS.push({ id: `${tp.id}-${g}`, icon: tp.icon, name: `${tp.name} ${name}`, desc: tp.desc, ok: t => tp.ok(t.g[g] || {}), ...(tp.of ? { of: t => tp.of(t.g[g] || {}) } : {}) });
}
/* --- thêm 20261118: thành tựu riêng từng game (chỉ những cái phát hiện được từ dữ liệu/view) ---
   ok: () => false = không suy ra được từ tổng, chỉ mở khóa trực tiếp lúc hết ván qua SP.end/tick bên dưới (SPECIAL không nằm trong ACHS mà mở bằng id).
   KHÔNG thêm: 59 cái còn để soon:true (chưa có cách phát hiện), tamquoc-kill2 (event chết của repo này không ghi kẻ giết),
   caro-hard / caro-block (view Caro của repo này không có opts.level/block). */
const SPECIAL = [
  { id: 'bang-sheriff', icon: '⭐', name: 'Lưới trời lồng lộng', desc: 'Thắng khi là Cảnh sát trưởng', ok: () => false },
  { id: 'bang-renegade', icon: '🐺', name: 'Lone Ranger', desc: 'Thắng khi là Kẻ phản bội', ok: () => false },
  { id: 'bang-firstdie', icon: '⚰️', name: 'Yểu mệnh', desc: 'Chết đầu tiên trong ván', ok: () => false },
  { id: 'bang-deputy', icon: '🤠', name: 'Nhân vật phụ', desc: 'Thắng khi là Phó cảnh sát', ok: () => false },
  { id: 'uno-plus4', icon: '😈', name: 'Tàn nhẫn', desc: 'Đánh +4 khi người kế chỉ còn 1 lá', ok: () => false },
  { id: 'uno-draw10', icon: '🃏', name: 'Kích hoạt nội tại ẩn', desc: 'Bốc từ 10 lá trở lên trong một lượt', ok: () => false },
  { id: 'uno-perfect', icon: '🍀', name: 'UNO!', desc: 'Thắng khi chưa phải bốc lá nào ngoài lượt', ok: () => false },
  { id: 'uno-stack', icon: '📚', name: 'Cộng minh', desc: 'Đánh 3 lá +2 / +4 liên tiếp dồn cho người khác', ok: () => false },
  { id: 'uno-forgot', icon: '🙊', name: 'Não cá vàng', desc: 'Quên hô UNÔ và bị phạt', ok: () => false },
  { id: 'typhu-jail3', icon: '⛓️', name: '3 năm 6 tháng có là chi', desc: 'Vào tù 3 lần trong một ván', ok: () => false },
  { id: 'typhu-hotel', icon: '🏨', name: 'Hotel 5 sao', desc: 'Xây khách sạn đầu tiên', ok: () => false },
  { id: 'typhu-bankrupt', icon: '💼', name: 'Phân lô bán nền muôn đời thịnh', desc: 'Làm người khác phá sản', ok: () => false },
  { id: 'typhu-rent', icon: '💰', name: 'Thằng nào có tiền nạp tiền vào donate cho tao, ít thì 2 quả trứng nhiều thì 1 tên lửa', desc: 'Thu tiền thuê từ 2.000 trở lên một lần', ok: () => false },
  { id: 'typhu-broke1', icon: '📉', name: 'Đa cấp lỏ', desc: 'Phá sản đầu tiên', ok: () => false },
  { id: 'meo-defuse3', icon: '🧯', name: 'Ziggs', desc: 'Gỡ bom 3 lần trong một ván', ok: () => false },
  { id: 'meo-firstboom', icon: '💥', name: 'CÀ ĐÙNG!', desc: 'Nổ đầu tiên trong ván', ok: () => false },
  { id: 'meo-last2', icon: '😸', name: 'Ấn E để gỡ bom', desc: 'Thắng khi chỉ còn 2 người và chồng bài còn bom', ok: () => false },
  { id: 'meono-nope3', icon: '🙅', name: 'Biến mày', desc: 'Đánh HUỶ KÈO! 3 lần trong một ván', ok: () => false },
  { id: 'tqs-lord', icon: '👑', name: 'Muôn tâu bệ hạ', desc: 'Thắng khi là Chúa công', ok: () => false },
  { id: 'tqs-spy', icon: '🗡️', name: 'Giặc ở sau lưng ngài kìa', desc: 'Thắng khi là Nội gián', ok: () => false },
  { id: 'tqs-firstdie', icon: '🪦', name: 'Kiếp sau làm lại', desc: 'Chết đầu tiên trong ván', ok: () => false },
  { id: 'tamquoc-loyal', icon: '🛡️', name: 'Bệ hạ vạn tuế', desc: 'Thắng khi là Trung thần', ok: () => false },
  { id: 'tamquoc-rebel', icon: '🔥', name: 'TAO KHÔNG VÀO ĐỊA NGỤC THÌ AI', desc: 'Thắng khi là Phản tặc', ok: () => false },
  { id: 'ms-villager', icon: '🧑‍🌾', name: 'Ủa ai biết gì đâu', desc: 'Sống sót tới cuối khi là Dân làng', ok: () => false },
  { id: 'ms-wolfwin', icon: '🐺', name: 'CSCĐ = con sói cô độc', desc: 'Thắng khi là Sói', ok: () => false },
  { id: 'ms-night1', icon: '🌙', name: 'Twilight', desc: 'Bị cắn ngay đêm đầu', ok: () => false },
  { id: 'tl-trang', icon: '🙏', name: 'Ơn trên phù hộ', desc: 'Thắng trắng (tới trắng)', ok: () => false },
  { id: 'tl-chop', icon: '🐷', name: 'HEO HẢ MẢY???', desc: 'Chặt heo', ok: () => false },
  { id: 'tl-cong', icon: '🥶', name: 'Cold Palmer', desc: 'Thua cóng', ok: () => false },
  { id: 'tienlen-3doi', icon: '💥', name: 'Khoan', desc: 'Chặt 3 đôi thông', ok: () => false },
  { id: 'tienlen-quad', icon: '🃏', name: 'DỪNG KHOẢNG CHỪNG LÀ 2s', desc: 'Chặt tứ quý', ok: () => false },
  { id: 'tienlen-chopped', icon: '🐽', name: 'Bạn tôi ơi, bạn chưa làm chủ được sức mạnh của mình đâu', desc: 'Bị chặt heo', ok: () => false },
  { id: 'catte-win3', icon: '🔥', name: 'Tê tê tê', desc: 'Tới 3 ván liên tiếp', ok: t => (t.g.catte?.st || 0) >= 3, of: t => [t.g.catte?.st || 0, 3] },
  { id: 'bacao-3tay', icon: '🤴', name: 'Anh 3 cứu Tú', desc: 'Được Ba Tây (3 lá mặt người)', ok: () => false },
  { id: 'bacao-bu', icon: '🙈', name: 'Mắt 0 thấy tim 0 đau', desc: 'Bị bù (0 nút)', ok: () => false },
  { id: 'bacao-sap', icon: '🎴', name: 'Ba con y chang', desc: 'Được Sáp (3 lá giống nhau)', ok: () => false },
  { id: 'bacao-nine3', icon: '9️⃣', name: 'Chín nút chín nút chín nút', desc: 'Được 9 nút 3 ván liên tiếp', ok: () => false },
  { id: 'bacao-lose5', icon: '😵', name: 'Hôm nay không phải ngày của tui', desc: 'Thua 5 ván liên tiếp', ok: t => (t.g.bacao?.lst || 0) >= 5, of: t => [t.g.bacao?.lst || 0, 5] },
  { id: 'xd-xiban', icon: '🂡', name: 'Ra 2, con A, nên anh đâu cần bốc thêm', desc: 'Xì bàn (2 lá Át)', ok: () => false },
  { id: 'xd-ngulinh', icon: '⛰️', name: 'Ngũ hành sơn', desc: 'Ngũ linh (5 lá chưa quá 21)', ok: () => false },
  { id: 'xd-quac', icon: '💣', name: 'Bốc tiếp đi', desc: 'Quắc (quá 21)', ok: () => false },
  { id: 'xidach-bj', icon: '🂫', name: 'He said the thing!', desc: 'Xì dách (Át + lá 10/mặt người)', ok: () => false },
  { id: 'xidach-21', icon: '🎯', name: 'Tính toán chuẩn chỉ', desc: 'Đúng 21 bằng 3 lá trở lên', ok: () => false },
  { id: 'xidach-16', icon: '😏', name: '16 Typh on the mic', desc: 'Dằn (dừng ở 16) mà vẫn thắng', ok: () => false },
  { id: 'solitaire-win5', icon: '🃏', name: 'Kiên nhẫn là vàng', desc: 'Thắng 5 ván liên tiếp', ok: t => (t.g.solitaire?.st || 0) >= 5, of: t => [t.g.solitaire?.st || 0, 5] },
  { id: 'ct-fast', icon: '♟️', name: 'Mấy chú đánh đầu ngõ', desc: 'Chiếu bí dưới 20 nước', ok: () => false },
  { id: 'cotuong-horse', icon: '🐴', name: 'Mã đáo thành công', desc: 'Chiếu bí bằng Mã', ok: () => false },
  { id: 'cotuong-rook', icon: '🚗', name: 'Xe mẹ mua không đua mẹ buồn', desc: 'Thắng mà không mất Xe nào', ok: () => false },
  { id: 'tht-dare10', icon: '🔥', name: 'CHAN BỐ MÀY ĐÊ', desc: 'Chọn Thách 10 lần', ok: () => false },
  { id: 'tht-truth10', icon: '🎩', name: 'Honest Abe', desc: 'Chọn Thật 10 lần', ok: () => false },
  { id: 'thathaythach-skip3', icon: '🏃', name: 'Nhùng', desc: 'Bỏ qua (từ chối) 3 câu trong một ván', ok: () => false },
  { id: 'thathaythach-party8', icon: '🎉', name: 'Nghi thức triệu hồi', desc: 'Chơi một ván từ 8 người trở lên', ok: () => false },
  { id: 'thathaythach-ai', icon: '✨', name: 'AI là người hỏi?', desc: 'Chơi với bộ câu tự thêm theo chủ đề', ok: () => false },
  { id: 'bt-team', icon: '🤜', name: 'Đồng đội tuyệt vời', desc: 'Thắng khi chơi chéo cánh', ok: () => false },
  { id: 'bt-last', icon: '🐢', name: 'Đội sổ', desc: 'Về bét', ok: () => false },
  { id: 'baitan-win3', icon: '🏆', name: 'Tấn công liên hoàn', desc: 'Về nhất 3 ván liên tiếp', ok: t => (t.g.baitan?.st || 0) >= 3, of: t => [t.g.baitan?.st || 0, 3] },
  { id: 'baitan-solo4', icon: '🥇', name: 'Một mình cân ba', desc: 'Về nhất khi chơi cá nhân 4 người', ok: () => false },
  { id: 'loto-fast', icon: '🎉', name: 'Kinh rồi bà con ơi!', desc: 'Kinh khi mới ra dưới 20 số', ok: () => false },
  { id: 'loto-wait', icon: '⏳', name: 'Chờ hoài một số', desc: 'Chờ 1 số cuối mà người khác kinh trước', ok: () => false },
  { id: 'cv-fast', icon: '♞', name: 'Lê Quang Liêm', desc: 'Chiếu hết dưới 20 nước', ok: () => false },
  { id: 'covua-knight', icon: '🐴', name: 'Knightmare', desc: 'Chiếu hết bằng Mã', ok: () => false },
  { id: 'covua-promote', icon: '👸', name: 'Nàng ơi...', desc: 'Phong cấp Hậu', ok: () => false },
  { id: 'covua-stalemate', icon: '🤝', name: 'Biết chơi game không?', desc: 'Hoà vì hết nước đi (pat)', ok: () => false },
  { id: 'tala-u', icon: '🀄', name: 'Ù bất ngờ', desc: 'Ù', ok: () => false },
  { id: 'tala-mom', icon: '🫥', name: 'Móm toàn tập', desc: 'Móm (không có phỏm nào)', ok: () => false },
  { id: 'ts-quan', icon: '🎋', name: 'Quằn ra tiền', desc: 'Tới có quằn', ok: () => false },
  { id: 'tusac-win3', icon: '🔥', name: 'Tới tới tới', desc: 'Tới 3 ván liên tiếp', ok: t => (t.g.tusac?.st || 0) >= 3, of: t => [t.g.tusac?.st || 0, 3] },
  { id: 'bantau-fast', icon: '🎯', name: 'Thuỷ thủ thần sầu', desc: 'Bắn chìm cả hạm đội dưới 40 phát', ok: () => false },
  { id: 'bantau-carrier', icon: '🚢', name: 'Hạ tàu sân bay', desc: 'Đánh chìm tàu 5 ô đầu tiên', ok: () => false },
  { id: 'bantau-miss10', icon: '🌊', name: 'Bắn chim hay bắn tàu?', desc: 'Bắn trượt 10 phát liên tiếp', ok: () => false },
  { id: 'oaq-borrow', icon: '🤲', name: 'Vay dân rải tiếp', desc: 'Phải vay dân để rải', ok: () => false },
  { id: 'oanquan-big', icon: '🏆', name: 'Thắng đậm', desc: 'Thắng hơn 20 điểm', ok: () => false },
  { id: 'oanquan-noquan', icon: '🙁', name: 'Quan đâu hết rồi', desc: 'Thua mà không ăn được quan nào', ok: () => false },
  { id: 'caro-fast', icon: '⭕', name: 'Năm con một mạch', desc: 'Thắng dưới 10 nước', ok: t => (t.ev.cr?.fast19 || 0) >= 1 },
  { id: 'caro-fastloss', icon: '🫣', name: 'Thua nhanh như chớp', desc: 'Thua dưới 10 nước', ok: t => (t.ev.cr?.fastloss || 0) >= 1 },
  { id: 'cothu-flawless', icon: '🦁', name: 'Không sứt mẻ', desc: 'Thắng mà không mất con nào', ok: () => false },
  { id: 'cothu-jump', icon: '🐯', name: 'Vượt sông', desc: 'Sư tử / Hổ nhảy sông ăn quân', ok: () => false },
  { id: 'cothu-elephant', icon: '🐘', name: 'Voi to xác', desc: 'Voi bị Chuột ăn', ok: () => false },
  /* --- thêm 20261118: 8 game mới (Sâm lốc, Bầu cua, Nối từ, Tàu Xuyên Việt, Đảo Khai Hoang, Đảo Chính, Đội Cứu Hộ, Gánh Xiếc Thú) – (42 id).
     soon: true = chưa có cách phát hiện (hiện "sắp có"); chỉ ghi lại cho đủ bộ, chưa mở khóa được. */
  { id: 'sam-bao', icon: '📢', name: 'Sâm là phải chất', desc: 'Báo Sâm thành công', ok: () => false },
  { id: 'sam-trang', icon: '✨', name: 'Trời cho ăn trắng', desc: 'Ăn trắng', ok: () => false },
  { id: 'sam-chan', icon: '🚫', name: 'Báo cho vui', desc: 'Báo Sâm bị chặn', ok: () => false },
  { id: 'sam-quad', icon: '💥', name: 'Bốn con chặt heo', desc: 'Chặt 2 bằng tứ quý', ok: () => false, soon: true },
  { id: 'sam-win3', icon: '🏆', name: 'Sâm không nghỉ', desc: 'Về nhất 3 ván liên tiếp', ok: t => (t.g.sam?.st || 0) >= 3, of: t => [t.g.sam?.st || 0, 3] },
  { id: 'sam-thoi2', icon: '🤢', name: 'Ôm hai về nhà', desc: 'Bị thối 2', ok: () => false, soon: true },
  { id: 'bc-triple', icon: '🎲', name: 'Ba con một ô', desc: 'Đặt trúng ô ra cả 3 con', ok: () => false },
  { id: 'bc-broke', icon: '🔥', name: 'Cháy túi về quê', desc: 'Cháy túi', ok: () => false },
  { id: 'baucua-double', icon: '💰', name: 'Nhân đôi tài sản', desc: 'Thắng với hơn gấp đôi số xu ban đầu', ok: () => false, soon: true },
  { id: 'baucua-allin', icon: '🎰', name: 'Được ăn cả', desc: 'Đặt hết vào một ô và trúng', ok: () => false, soon: true },
  { id: 'baucua-broke2', icon: '🔥', name: 'Cháy túi lần hai', desc: 'Cháy túi 2 lần trong một ván', ok: () => false },
  { id: 'nt-stump', icon: '💥', name: 'Full crit', desc: 'Đưa từ bí làm người kế mất mạng', ok: () => false },
  { id: 'nt-vote', icon: '📚', name: 'Bùi Hiền', desc: 'Từ mới được cả bàn bỏ phiếu nhận', ok: () => false },
  { id: 'nt-timeout', icon: '🤯', name: 'Có chắc đang nói tiếng Việt không z?', desc: 'Hết giờ 3 lần trong một ván', ok: () => false },
  { id: 'noitu-last5', icon: '🏅', name: 'Vua Tiếng Việt!', desc: 'Sống sót tới cuối khi bàn có từ 5 người', ok: () => false },
  { id: 'noitu-chain20', icon: '🔗', name: 'Từ điển sống', desc: 'Nối 20 từ trong một ván', ok: () => false },
  { id: 'noitu-out1', icon: '🥀', name: 'Cần đọc thêm sách', desc: 'Bị loại đầu tiên', ok: () => false },
  { id: 'xv-long', icon: '🚂', name: 'Xuyên Việt một mạch', desc: 'Có tuyến liên tục dài nhất', ok: () => false },
  { id: 'xv-fail', icon: '🎫', name: 'Lỡ chuyến tàu', desc: 'Không hoàn thành vé đích nào', ok: () => false },
  { id: 'xuyenviet-ticket5', icon: '🎟️', name: 'Đi khắp mọi miền', desc: 'Hoàn thành 5 vé đích', ok: () => false },
  { id: 'xuyenviet-six', icon: '🚃', name: 'Tàu dài sáu toa', desc: 'Chiếm tuyến 6 toa', ok: () => false, soon: true },
  { id: 'xuyenviet-out', icon: '🏁', name: 'Về ga sớm nhất', desc: 'Hết toa trước tiên', ok: () => false, soon: true },
  { id: 'kh-both', icon: '🏝️', name: 'Chúa đảo toàn năng', desc: 'Có cả Đường dài nhất và Đội quân lớn nhất', ok: () => false },
  { id: 'kh-robbed', icon: '🏴‍☠️', name: 'Cướp đâu ra lắm thế', desc: 'Bị cướp 3 lần trong một ván', ok: () => false },
  { id: 'khaihoang-city4', icon: '🏙️', name: 'Đô thị hoá', desc: 'Thắng với 4 thành phố', ok: () => false, soon: true },
  { id: 'khaihoang-mono5', icon: '🃏', name: 'Độc quyền thị trường', desc: 'Dùng thẻ Độc quyền vét được 5 lá trở lên', ok: () => false, soon: true },
  { id: 'khaihoang-storm', icon: '🏴‍☠️', name: 'Ổ cướp trước nhà', desc: 'Bị cướp đặt lên ô của mình cả ván', ok: () => false, soon: true },
  { id: 'dc-bluff3', icon: '🎭', name: 'Diễn viên gạo cội', desc: 'Bịp thành công 3 lần trong một ván', ok: () => false },
  { id: 'dc-caught', icon: '🫣', name: 'Bị bóc phốt', desc: 'Bị nghi đúng khi đang bịp', ok: () => false },
  { id: 'daochinh-clean', icon: '👑', name: 'Không mất một sợi lông', desc: 'Thắng mà chưa mất lá nào', ok: () => false },
  { id: 'daochinh-catch3', icon: '🕵️', name: 'Thám tử lừng danh', desc: 'Nghi đúng 3 lần trong một ván', ok: () => false },
  { id: 'daochinh-assassin', icon: '🗡️', name: 'Bị ám sát hai lần', desc: 'Bị Sát thủ hạ 2 lần trong một ván', ok: () => false },
  { id: 'ch-hard', icon: '🦸', name: 'Anh hùng thầm lặng', desc: 'Thắng mức Khó', ok: () => false },
  { id: 'ch-close', icon: '🌊', name: 'Chỉ mành treo chuông', desc: 'Thắng khi đã vỡ đê 7 lần', ok: () => false },
  { id: 'cuuho-cure4', icon: '🌍', name: 'Cứu cả đất nước', desc: 'Khắc phục cả 4 thiên tai', ok: () => false },
  { id: 'cuuho-nobreak', icon: '🧱', name: 'Đê vững như bàn thạch', desc: 'Thắng mà chưa vỡ đê lần nào', ok: () => false },
  { id: 'cuuho-nocard', icon: '📭', name: 'Hết phép cứu hộ', desc: 'Thua vì hết thẻ cứu hộ', ok: () => false },
  { id: 'xt-critic', icon: '📰', name: 'Được báo khen', desc: 'Được Nhà phê bình +3', ok: () => false },
  { id: 'xt-skunk', icon: '🦨', name: 'Gánh xiếc bốc mùi', desc: 'Bị Chồn hôi trừ điểm 3 đêm liền', ok: () => false, soon: true },
  { id: 'xiecthu-big15', icon: '🎪', name: 'Đêm diễn để đời', desc: 'Ghi 15 điểm trở lên trong một đêm', ok: () => false, soon: true },
  { id: 'xiecthu-star', icon: '🌟', name: 'Ngôi sao sân khấu', desc: 'Thuê thú giá 9 đầu tiên', ok: () => false, soon: true },
  { id: 'xiecthu-worm', icon: '🐛', name: 'Đuổi sâu khỏi gánh', desc: 'Mời ra cả 2 Sâu khỏi gánh', ok: () => false, soon: true },
];
for (const a of SPECIAL) ACHS.push(a);
const ACH_BY_ID = new Map(ACHS.map(a => [a.id, a]));
// cấp độ: mỗi ván +10 điểm, thắng +20 nữa
export const LEVELS = ['Tân binh', 'Tập sự', 'Dân chơi', 'Tay chơi', 'Cao thủ', 'Đại cao thủ', 'Bậc thầy', 'Tông sư', 'Huyền thoại', 'Truyền kỳ'];
export function level(t = totals()) { const xp = t.p * 10 + t.w * 20, lv = Math.min(LEVELS.length, Math.floor(Math.sqrt(xp / 50)) + 1), need = n => 50 * (n - 1) * (n - 1); return { xp, lv, name: LEVELS[lv - 1], from: need(lv), to: lv >= LEVELS.length ? null : need(lv + 1) }; }

/* kiểm tra thành tích mới từ tổng hiện tại, ghi dấu mở khóa, trả về danh sách mới mở */
const checkFresh = s => { const t = totals(s), fresh = ACHS.filter(a => !s.ach[a.id] && a.ok(t)); fresh.forEach(a => { s.ach[a.id] = Date.now(); }); return fresh; };
/* bộ đếm cộng dồn giữa các ván (vd. số lần chọn Thách, số ván 9 nút liên tiếp) */
function counter(s) { s.cnt = s.cnt || {}; return (k, add) => { if (add != null) s.cnt[k] = (s.cnt[k] || 0) + add; return s.cnt[k] || 0; }; }
const dayAfter = x => { const dt = new Date(x + 'T12:00:00'); dt.setDate(dt.getDate() + 1); return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0'); };
/* phát hiện thành tựu riêng từng game từ view lúc chơi (chỉnh theo view thật – xem ghi chú từng game).
   tick(v, me, m): chạy mỗi lần nhận view mới khi ván đang diễn ra (kể cả view cuối). end(v, me, m, won, cnt): chạy lúc ván kết thúc, trả về id thành tựu mở. */
const spBy = (v, me) => (v.players || []).find(p => p.id === me) || {};
/* đếm một sự kiện "last" mới (theo seq) cho mình */
const spOnce = (m, v, key) => { const k = key + ':' + (v.seq ?? JSON.stringify(v.last)); if (m[k]) return false; m[k] = 1; return true; };
const spFx = (v, m) => { const out = (v.fx || []).filter(e => e && e.id > (m.fxSeen || 0)); if (out.length) m.fxSeen = Math.max(...out.map(e => e.id)); return out; };
const SP = {
  bang: {
    tick(v, me, m) { if (!m.first) { const d = (v.players || []).filter(p => p.alive === false); if (d.length) m.first = d.length === 1 ? d[0].id : '?'; } },
    end(v, me, m, w) { const r = spBy(v, me).role, out = []; if (w && r === 'sheriff') out.push('bang-sheriff'); if (w && r === 'renegade') out.push('bang-renegade'); if (w && r === 'deputy') out.push('bang-deputy'); if (m.first === me) out.push('bang-firstdie'); return out; } },
  uno: {
    tick(v, me, m) {
      const hc = Object.fromEntries((v.players || []).map(p => [p.id, p.handCount])), mine = hc[me];
      if (m.hc && m.hc[me] != null && mine - m.hc[me] >= 10) m.d10 = 1;
      for (const e of spFx(v, m)) {
        if ((e.k === 'plus' || e.k === 'aim') && e.from === me) { if (e.n === 4 && m.hc && m.hc[e.to] === 1) m.p4 = 1; m.run = (m.run || 0) + 1; if (m.run >= 3) m.stack = 1; }
        if (e.to === me && ['plus', 'aim', 'catch', 'dq', 'tornado', 'nou'].includes(e.k)) { m.hit = 1; m.run = 0; }
        if (e.k === 'catch' && e.to === me) m.forgot = 1;
      }
      m.hc = hc;
    },
    end(v, me, m, w) { const o = []; if (m.p4) o.push('uno-plus4'); if (m.d10) o.push('uno-draw10'); if (w && !m.hit) o.push('uno-perfect'); if (m.stack) o.push('uno-stack'); if (m.forgot) o.push('uno-forgot'); return o; } },
  typhu: {
    tick(v, me, m) {
      for (const e of v.ev || []) { if (!e || e.n <= (m.evN || 0)) continue; m.evN = e.n;
        if (e.t === 'jail' && e.pid === me) m.jail = (m.jail || 0) + 1;
        if (e.t === 'build' && e.pid === me && e.h === 5) m.hotel = 1;
        if (e.t === 'bankrupt') { if (e.to === me) m.bk = 1; if (!m.firstBk) m.firstBk = e.pid; }
        if (e.t === 'pay' && e.to === me && e.why === 'rent' && e.amt >= 2000) m.rent = 1; }
    },
    end(v, me, m) { const o = []; if ((m.jail || 0) >= 3) o.push('typhu-jail3'); if (m.hotel) o.push('typhu-hotel'); if (m.bk) o.push('typhu-bankrupt'); if (m.firstBk === me) o.push('typhu-broke1'); if (m.rent) o.push('typhu-rent'); return o; } },
  meono: {
    tick(v, me, m) { const alive = (v.players || []).filter(p => !p.out).length; if (alive === 2 && (v.bombsLeft || 0) > 0) m.duo = 1; },
    end(v, me, m, w) { const out = [], st = (v.stats || {})[me] || {}, n = (v.players || []).length, p = spBy(v, me); if ((st.defused || 0) >= 3) out.push('meo-defuse3'); if (p.out && p.place === n) out.push('meo-firstboom'); if (w && m.duo) out.push('meo-last2'); if ((st.nopes || 0) >= 3) out.push('meono-nope3'); return out; } },
  tamquoc: {
    tick(v, me, m) { if (!m.first) { const d = (v.players || []).filter(p => p.alive === false); if (d.length) m.first = d.length === 1 ? d[0].id : '?'; } },
    end(v, me, m, w) { const r = spBy(v, me).role, out = []; if (w && r === 'lord') out.push('tqs-lord'); if (w && r === 'spy') out.push('tqs-spy'); if (w && r === 'loyal') out.push('tamquoc-loyal'); if (w && r === 'rebel') out.push('tamquoc-rebel'); if (m.first === me) out.push('tqs-firstdie'); return out; } },
  masoi: {
    tick(v, me, m) { if (v.me && v.me.role) m.role = v.me.role; const p = spBy(v, me); if (p.alive === false && p.diedDay != null && m.dd == null) m.dd = p.diedDay; },
    end(v, me, m, w) { const out = [], role = (v.me && v.me.role) || m.role, alive = v.me ? v.me.alive : spBy(v, me).alive; if (role === 'villager' && alive && w) out.push('ms-villager'); if (w && ['wolf', 'alpha', 'cub'].includes(role)) out.push('ms-wolfwin'); if (m.dd != null && m.dd <= 1 && !alive) out.push('ms-night1'); return out; } },
  tienlen: {
    tick(v, me, m) { for (const e of spFx(v, m)) {
      if (e.k === 'toitrang' && e.from === me) m.trang = 1;
      if (e.k === 'cong' && e.from === me) m.cong = 1;
      if (e.k === 'chop' && e.from === me) { if (e.heo) m.chop = 1; if (/đôi thông/.test(e.by || '') && +String(e.by).trim()[0] >= 3) m.d3 = 1; if (/^Tứ quý/.test(e.by || '')) m.quad = 1; }
      if (e.k === 'chop' && e.to === me && e.heo) m.chopped = 1; } },
    end(v, me, m) { const o = []; for (const [k, id] of [['trang', 'tl-trang'], ['chop', 'tl-chop'], ['cong', 'tl-cong'], ['d3', 'tienlen-3doi'], ['quad', 'tienlen-quad'], ['chopped', 'tienlen-chopped']]) if (m[k]) o.push(id); return o; } },
  xidach: {
    end(v, me) { const p = spBy(v, me), r = p.res || null, c = p.cards || [], o = []; if (!r) return o;
      if (r.kind === 'xiban') o.push('xd-xiban'); if (r.kind === 'xidach') o.push('xidach-bj'); if (r.kind === 'ngulinh') o.push('xd-ngulinh'); if (r.kind === 'quac') o.push('xd-quac');
      if (r.kind !== 'quac' && r.pts === 21 && c.length >= 3) o.push('xidach-21'); if (r.r === 'win' && r.pts === 16) o.push('xidach-16'); return o; } },
  bacao: {
    end(v, me, m, w, cnt) { const r = (spBy(v, me) || {}).res || null, o = []; if (!r) return o;
      if (r.kind === 'batay') o.push('bacao-3tay'); if (r.kind === 'sap') o.push('bacao-sap'); if (r.kind === 'diem' && r.pts === 0) o.push('bacao-bu');
      if (r.kind === 'diem' && r.pts === 9) cnt('bc9', 1); else cnt('bc9', -cnt('bc9')); if (cnt('bc9') >= 3) o.push('bacao-nine3'); return o; } },
  cotuong: {
    end(v, me, m, w) { const r = v.result || {}, sd = (spBy(v, me) || {}).side, mv = v.moves || [], last = mv[mv.length - 1] || {}, o = [], opp = sd === 'r' ? 'b' : 'r';
      if (w && r.kind === 'mate' && (v.nMoves || 99) <= 39) o.push('ct-fast'); if (w && r.kind === 'mate' && String(last.piece).toUpperCase() === 'H') o.push('cotuong-horse');
      if (w && v.caps && !(v.caps[opp] || []).some(c => String(c).toUpperCase() === 'R')) o.push('cotuong-rook'); return o; } },
  thathaythach: {
    end(v, me, m, w, cnt) { const p = spBy(v, me); cnt('tht-d', +p.d || 0); cnt('tht-t', +p.t || 0); const out = []; if (cnt('tht-d') >= 10) out.push('tht-dare10'); if (cnt('tht-t') >= 10) out.push('tht-truth10');
      if ((+p.skip || 0) >= 3) out.push('thathaythach-skip3'); if ((v.players || []).length >= 8) out.push('thathaythach-party8'); if (v.opts && (v.opts.custom || []).length) out.push('thathaythach-ai'); return out; } },
  baitan: {
    end(v, me, m, w) { const out = []; if (w && v.opts && v.opts.team) out.push('bt-team'); if (v.loser === me) out.push('bt-last'); if (w && (v.players || []).length === 4 && !(v.opts && v.opts.team)) out.push('baitan-solo4'); return out; } },
  loto: {
    end(v, me, m, w) { const out = []; if (w && (v.called || []).length < 20) out.push('loto-fast'); if (!w && spBy(v, me).best === 4) out.push('loto-wait'); return out; } },
  covua: {
    end(v, me, m, w) { const r = v.result || {}, sd = (spBy(v, me) || {}).side, mv = v.moves || [], last = mv[mv.length - 1] || {}, o = [];
      if (w && r.kind === 'mate' && (v.nMoves || 99) <= 39) o.push('cv-fast'); if (w && r.kind === 'mate' && String(last.piece).toUpperCase() === 'N') o.push('covua-knight');
      if (mv.some(x => x.side === sd && x.promo === 'q')) o.push('covua-promote'); if (r.kind === 'stale') o.push('covua-stalemate'); return o; } },
  tala: {
    end(v, me) { const out = []; if (v.u === me) out.push('tala-u'); if (v.done && v.done[me] && v.done[me].mom) out.push('tala-mom'); return out; } },
  tusac: {
    end(v, me, m, w) { const ms = (v.result && v.result.hand && v.result.hand.melds) || []; return w && JSON.stringify(ms).includes('quan') ? ['ts-quan'] : []; } },
  bantau: {
    tick(v, me, m) { const l = v.lastShot; if (!l || l.by !== me) return; const k = l.cell + '|' + l.n + '|' + l.res; if (m.lk === k) return; m.lk = k;
      if (l.res === 'miss') m.miss = (m.miss || 0) + 1; else if (l.res === 'hit' || l.res === 'sink') m.miss = 0;
      if ((m.miss || 0) >= 10) m.m10 = 1; },
    end(v, me, m, w) { const o = [], shots = (v.you && v.you.shots) || {}; if (w && Object.keys(shots).length < 40) o.push('bantau-fast'); if (((v.you && v.you.sunk) || [])[0] === 'carrier') o.push('bantau-carrier'); if (m.m10) o.push('bantau-miss10'); return o; } },
  oanquan: {
    end(v, me, m, w) { const idx = (v.players || []).findIndex(p => p.id === me); if (idx < 0) return []; const sc = v.scores || [], my = sc[idx], fo = sc[1 - idx]; if (!my || !fo) return []; const o = [];
      if ((my.debt || 0) > 0) o.push('oaq-borrow'); if (w && my.total - fo.total > 20) o.push('oanquan-big'); if (!w && !v.draw && (my.bag || {}).q === 0) o.push('oanquan-noquan'); return o; } },
  cothu: {
    tick(v, me, m) { const l = v.lastMove; if (!l || m.lmn === l.n) return; m.lmn = l.n;
      const atk = Math.abs(((v.cells || [])[l.to.y * 7 + l.to.x]) || 0);
      if (l.by === me && l.jump && [6, 7].includes(atk)) m.jump = 1;
      if (l.by !== me && l.captured === 1 && atk === 8) m.eleph = 1; },
    end(v, me, m, w) { const o = [], foe = (v.players || []).find(p => p.id !== me);
      if (w && foe && !((v.captured || {})[foe.id] || []).length) o.push('cothu-flawless');
      if (m.jump) o.push('cothu-jump'); if (m.eleph) o.push('cothu-elephant'); return o; } },
  /* --- thêm 20261118: 8 game mới (tick/end gộp 2 đợt) --- */
  sam: {
    end(v, me, m, w) { const r = v.result || {}, out = []; if (r.sam === me && w) out.push('sam-bao'); if (r.white && w) out.push('sam-trang'); if (r.sam === me && r.block) out.push('sam-chan'); return out; } },
  baucua: {
    tick(v, me, m) { const d = v.dice; if (Array.isArray(d) && d.length === 3 && d[0] === d[1] && d[1] === d[2] && spOnce(m, v, 'tri') && ((v.bets || {})[me] || {})[d[0]]) m.tri = 1; if ((v.relief || []).includes(me)) m.broke = 1; if ((v.relief || []).includes(me) && m.rr !== v.round) { m.rr = v.round; m.nb = (m.nb || 0) + 1; } },
    end(v, me, m) { const out = []; if (m.tri) out.push('bc-triple'); if (m.broke) out.push('bc-broke'); if ((m.nb || 0) >= 2) out.push('baucua-broke2'); return out; } },
  noitu: {
    tick(v, me, m) { const l = v.last; if (!l) return;
      if (spOnce(m, v, 'nt')) { if (l.t === 'ok') { m.prevMine = l.by === me; if (l.by === me && l.voted) m.vote = 1; } else if (l.t === 'miss') { if (m.prevMine && l.by !== me && !l.hint) m.stump = 1; if (l.by === me && l.why === 'time') m.to = (m.to || 0) + 1; m.prevMine = false; } }
      if (spOnce(m, v, 'n2')) { if (l.t === 'ok' && l.by === me) m.ok = (m.ok || 0) + 1; if (l.t === 'miss' && l.out && m.out1 == null) m.out1 = l.by; } },
    end(v, me, m, w) { const out = []; if (m.stump) out.push('nt-stump'); if (m.vote) out.push('nt-vote'); if ((m.to || 0) >= 3) out.push('nt-timeout'); if (w && (v.players || []).length >= 5) out.push('noitu-last5'); if ((m.ok || 0) >= 20) out.push('noitu-chain20'); if (m.out1 === me) out.push('noitu-out1'); return out; } },
  xuyenviet: {
    end(v, me) { const r = (v.result || []).find(x => x.id === me), out = []; if (!r) return out; if (r.bonus > 0) out.push('xv-long'); const t = Array.isArray(r.tickets) ? r.tickets : []; if (t.length && !t.some(x => x.ok)) out.push('xv-fail'); if (t.filter(x => x.ok).length >= 5) out.push('xuyenviet-ticket5'); return out; } },
  khaihoang: {
    tick(v, me, m) { const nm = spBy(v, me).name; if (!nm) return; m.seen = m.seen || {}; for (const line of v.log || []) if (line.startsWith('🫳') && line.endsWith(`của ${nm}.`) && !m.seen[line + v.seq]) { m.seen[line + v.seq] = 1; m.rob = (m.rob || 0) + 1; } },
    end(v, me, m) { const out = []; if (v.longest === me && v.army === me) out.push('kh-both'); if ((m.rob || 0) >= 3) out.push('kh-robbed'); return out; } },
  daochinh: {
    tick(v, me, m) { const l = v.last; if (!l) return;
      const ROLE = { tax: 'duke', assassinate: 'assassin', steal: 'captain', exchange: 'ambassador' };
      if (spOnce(m, v, 'dc')) { const mine = (spBy(v, me).cards || []).filter(c => !c.dead).map(c => c.r);
        if (l.t === 'act' && l.by === me && ROLE[l.act] && !mine.includes(ROLE[l.act])) m.bluff = (m.bluff || 0) + 1;
        if (l.t === 'block' && l.by === me && !mine.includes(l.role)) m.bluff = (m.bluff || 0) + 1;
        if (l.t === 'reveal' && l.who === me && l.ok === false) m.caught = (m.caught || 0) + 1; }
      if (spOnce(m, v, 'd2')) { if (l.t === 'reveal' && l.by === me && l.ok === false) m.catch = (m.catch || 0) + 1; if (l.t === 'act') m.lastAct = l; if (l.t === 'lost' && l.who === me && m.lastAct && m.lastAct.act === 'assassinate' && m.lastAct.target === me) m.ass = (m.ass || 0) + 1; } },
    end(v, me, m, w) { const out = []; if ((m.bluff || 0) - (m.caught || 0) >= 3) out.push('dc-bluff3'); if (m.caught) out.push('dc-caught'); if (w && !(spBy(v, me).cards || []).some(c => c.dead)) out.push('daochinh-clean'); if ((m.catch || 0) >= 3) out.push('daochinh-catch3'); if ((m.ass || 0) >= 2) out.push('daochinh-assassin'); return out; } },
  cuuho: {
    end(v, me, m, w) { const r = v.result || {}, out = []; if (r.win) out.push('cuuho-cure4'); if (r.win && !(v.outbreaks || 0)) out.push('cuuho-nobreak'); if (!r.win && /thẻ cứu hộ/.test(r.why || '')) out.push('cuuho-nocard'); if (r.win && v.opts && v.opts.epi === 6) out.push('ch-hard'); if (r.win && (v.outbreaks || 0) >= 7) out.push('ch-close'); return out; } },
  xiecthu: {
    tick(v, me, m) { if (v.critic === me) m.critic = 1; },
    end(v, me, m) { return m.critic || v.critic === me ? ['xt-critic'] : []; } },
};
export function record(game, won, extra = [], info = {}) {
  const s = load(), g = s.g[game] = s.g[game] || { p: 0, w: 0 }, d = new Date(), day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') /* ngày theo giờ máy, không phải UTC */, before = level(totals(s)).lv;
  const wasFirst = Object.values(s.g).reduce((n, x) => n + (x.p || 0), 0) === 0; /* ván đầu tiên trên máy này (cho c-firstloss) */
  const ls0 = s.ls || 0; /* chuỗi thua trước ván này (cho c-comeback) */
  const prevT = Math.max(0, ...Object.values(s.g).map(x => x.last || 0)); /* lần chơi gần nhất trước ván này (cho c-back) */
  g.p++; g.last = Date.now(); s.first = s.first || Date.now();
  if (won === true) { try { questWin(game); } catch (e) {} /* 📅 Thử thách hôm nay */ g.w++; s.streak++; s.best = Math.max(s.best, s.streak); g.st = (g.st || 0) + 1; g.bs = Math.max(g.bs || 0, g.st); g.lst = 0; s.ls = 0; } else if (won === false) { s.streak = 0; g.st = 0; g.lst = (g.lst || 0) + 1; g.l = (g.l || 0) + 1; s.ls = ls0 + 1; }
  if (!s.days.includes(day)) { s.days.push(day); if (s.days.length > 400) s.days.shift(); }
  if (d.getHours() < 5) s.night = 1;
  if (!s.dd || s.dd.d !== day) s.dd = { d: day, n: 0, k: [], w: [] }; s.dd.n++; if (!s.dd.k.includes(game)) s.dd.k.push(game); if (won === true && !s.dd.w.includes(game)) s.dd.w.push(game);
  /* dấu mốc vui: chỉ ghi khi điều kiện xảy ra, ok() trong ACHS đọc lại từ totals().marks */
  const mk = id => { s.marks[id] = 1; };
  if (won === true && d.getHours() < 5) mk('c-dawn');
  if (d.getMonth() === 0 && d.getDate() === 1 && d.getHours() === 0) mk('c-newyear');
  if (won === false && wasFirst) mk('c-firstloss');
  if (won === true && ls0 >= 5) mk('c-comeback');
  if (prevT && Date.now() - prevT >= 30 * 864e5) mk('c-back');
  if (won === true && info.dur && info.dur < 120000) mk('c-quick');
  if (info.dur && info.dur > 3600000) mk('c-long');
  if ((info.n || 0) >= 8) mk('c-crowd');
  if (s.days.some(x => { const dt = new Date(x + 'T12:00:00'); return dt.getDay() === 6 && s.days.includes(dayAfter(x)); })) mk('c-weekend');
  const t = totals(s), fresh = checkFresh(s);
  for (const id of extra || []) { const a = ACH_BY_ID.get(id); if (a && a.soon) continue; /* thành tựu soon:true (chưa có cách phát hiện) không được record */ if (!s.ach[id]) { s.ach[id] = Date.now(); if (a) fresh.push({ ...a, id }); } } /* thành tựu riêng từng game do SP.end/tick phát hiện */
  save(s);
  try { dispatchEvent(new CustomEvent('gumballz-stats', { detail: { game, won, fresh } })); } catch (e) {}
  const up = level(t); const msgs = []; if (up.lv > before) msgs.push(`⭐ Lên cấp ${up.lv}: ${up.name}`);
  if (fresh.length) setTimeout(() => import('./achpop.js?v=1').then(m => m.achPopup(fresh)).catch(() => {}), 1600); /* popup mở khoá thành tựu */
  if (msgs.length) import('./dialog.js?v=8').then(m => msgs.forEach((x, i) => setTimeout(() => m.toast(x, 3600), 1800 + i * 3800))).catch(() => {});
  return fresh;
}
/* ghi sự kiện trong ván (Bắn Tàu, Ô Ăn Quan, Cờ Caro, TicTacToe và Memory dùng): chìm tàu, chuỗi trúng, dùng vật phẩm, ăn Quan, ăn dây, cứu dân, thắng nhanh… – không đổi số ván/thắng */
export function recordEvent(game, type, data = {}) {
  if (game !== 'bantau' && game !== 'oanquan' && game !== 'caro' && game !== 'tictactoe' && game !== 'memory' && game !== 'covay' && game !== 'cothu' && game !== 'ranvathang') return [];
  const s = load(), ev = s.ev = s.ev || {};
  if (game === 'tictactoe') {
    const tt = ev.tt = ev.tt || { drawHard: 0 };
    if (type === 'end') { if (data.draw && data.foeBot && data.foeLevel === 'hard') tt.drawHard++; }
    else return [];
  } else if (game === 'memory') {
    const mm = ev.mm = ev.mm || { perfect: 0, fast: 0 };
    if (type === 'end') {
      if (data.solo && data.level === 'medium' && data.won !== false && (data.misses || 0) === 0) mm.perfect++;
      if (data.solo && data.level === 'medium' && (data.seconds || 0) < 60) mm.fast++;
    } else return [];
  } else if (game === 'cothu') {
    const ct = ev.ct = ev.ct || { ratElephant: 0, denWin: 0 };
    if (type === 'capture') { if (data.attacker === 'rat' && data.victim === 'elephant') ct.ratElephant++; }
    else if (type === 'end') { if (data.won && data.byDen) ct.denWin++; }
    else return [];
  } else if (game === 'ranvathang') {
    const rt = ev.rt = ev.rt || { ladder28: 0, snake87: 0 };
    if (type === 'climb') { if (data.from === 28) rt.ladder28++; }
    else if (type === 'slide') { if (data.from === 87) rt.snake87++; }
    else return [];
  } else if (game === 'covay') {
    const cv = ev.cv = ev.cv || { win19: 0, bigwin: 0 };
    if (type === 'end') { if (data.won) { if (data.size === 19) cv.win19++; if ((data.margin || 0) >= 20) cv.bigwin++; } }
    else return [];
  } else if (game === 'caro') {
    const cr = ev.cr = ev.cr || {}; cr.fast = cr.fast || 0; cr.fast19 = cr.fast19 || 0; cr.fastloss = cr.fastloss || 0; /* fast19/fastloss thêm 20261118 cho caro-fast / caro-fastloss (thắng/thua dưới 10 nước) */
    if (type === 'end') { if (data.won && (data.moves || 0) < 30) cr.fast++; if (data.won && (data.moves || 0) <= 19) cr.fast19++; if (!data.won && (data.moves || 0) <= 19) cr.fastloss++; /* hòa là bàn đầy 900 nước nên không lọt vào đây */ }
    else return [];
  } else if (game === 'oanquan') {
    const oq = ev.oq = ev.oq || { quan: 0, chainMax: 0, rescues: 0, flawless: 0, bothQuan: 0, comeback: 0 };
    if (type === 'eat') { oq.quan += data.q || 0; oq.chainMax = Math.max(oq.chainMax, data.chain || 0); }
    else if (type === 'chain') oq.chainMax = Math.max(oq.chainMax, data.chain || 0);
    else if (type === 'rescue') oq.rescues++;
    else if (type === 'end') {
      if ((data.quanEaten || 0) >= 2) oq.bothQuan++;
      if (data.won && (data.oppQuan || 0) === 0) oq.flawless++; /* thắng mà đối phương không ăn được Quan nào */
      if (data.won && (data.rescues || 0) >= 1) oq.comeback++;
    } else return [];
  } else {
    const bt = ev.bt = ev.bt || { sinks: 0, sinkGame: { gid: '', n: 0 }, sinkMax: 0, hitStreak: 0, items: {}, itemsUsed: 0, flawless: 0, trap: 0, radarHit: 0, nukeSink: 0 };
    if (type === 'sink') {
      bt.sinks++;
      if (!bt.sinkGame || bt.sinkGame.gid !== data.gid) bt.sinkGame = { gid: data.gid || '', n: 1 };
      else bt.sinkGame.n++;
      bt.sinkMax = Math.max(bt.sinkMax, bt.sinkGame.n);
    } else if (type === 'hit') bt.hitStreak = Math.max(bt.hitStreak, +data.streak || 0);
    else if (type === 'item' && data.item) { if (!bt.items[data.item]) bt.items[data.item] = 1; bt.itemsUsed++; }
    else if (type === 'flawless') bt.flawless++;
    else if (type === 'traptrigger') bt.trap++;
    else if (type === 'radarhit') bt.radarHit++;
    else if (type === 'nukesink') bt.nukeSink++;
    else return [];
  }
  const fresh = checkFresh(s);
  save(s);
  try { dispatchEvent(new CustomEvent('gumballz-stats', { detail: { game, won: null, fresh } })); } catch (e) {}
  if (fresh.length) setTimeout(() => import('./achpop.js?v=1').then(m => m.achPopup(fresh)).catch(() => {}), 1600); /* popup mở khoá thành tựu */
  return fresh;
}
const live = {};
export function observe(game, view, me) {
  try {
    const st = live[game] = live[game] || { active: false };
    if (!view) { st.active = false; return; }
    if (view.spec || !OVER[game]) return;
    const id = view.me != null && typeof view.me !== 'object' ? view.me : (Array.isArray(view.controlled) && view.controlled[0]) || me;
    const r = OVER[game](view, id), sp = SP[game];
    if (!r) {
      if (!st.active) { st.m = {}; st.t0 = Date.now(); st.n = 0; }
      st.active = true;
      st.n = Math.max(st.n || 0, (view.players || []).length, (window.__gumballzPeers || []).length || 0);
      if (sp && sp.tick) try { sp.tick(view, id, st.m || (st.m = {})); } catch (e) {}
      return;
    }
    if (st.active) {
      st.active = false;
      if (sp && sp.tick) try { sp.tick(view, id, st.m || (st.m = {})); } catch (e) {} /* tick nốt view cuối: nước cuối vẫn có thể mở thành tựu */
      let extra = [];
      if (sp && sp.end) try { const s0 = load(), cnt = counter(s0); extra = sp.end(view, id, st.m || {}, r.won === true, cnt) || []; if (s0.cnt) save(s0); } catch (e) {}
      record(game, r.won, extra, { dur: st.t0 ? Date.now() - st.t0 : 0, n: st.n || 0 });
      st.n = 0;
    }
  } catch (e) {}
}
// bọc handlers của net.js: giữ nguyên mọi hàm khác, chỉ nghe lén onState
export function watch(game, handlers, getId) {
  if (!handlers || typeof handlers.onState !== 'function') return handlers;
  const w = Object.create(handlers);
  w.onState = function (view, ...rest) { observe(game, view, getId ? getId() : null); return handlers.onState.call(handlers, view, ...rest); };
  return w;
}
// ☁️ có đăng nhập thì nạp phần đồng bộ hồ sơ theo tài khoản (khách không nạp gì thêm)
const hasAuth = () => { try { return !!JSON.parse(ls.get('gumballz-auth') || 'null'); } catch (e) { return false; } };
let syncOn = false; const startSync = () => { if (syncOn || !hasAuth()) return; syncOn = true; import('./sync.js?v=44').catch(() => { syncOn = false; }); };
try { startSync(); addEventListener('gumballz-auth', startSync); } catch (e) {}
// 📸 nút "Khoe kết quả" sau ván thắng (shared/ui/brag.js)
try { if (typeof document !== 'undefined') import('./brag.js?v=35').catch(() => {}); } catch (e) {}
// 🎉 hiệu ứng khi thắng ván (shared/ui/winfx.js, chọn ở Hồ sơ → 🎉 Khi thắng)
try { if (typeof document !== 'undefined') import('./winfx.js?v=1').catch(() => {}); } catch (e) {}
