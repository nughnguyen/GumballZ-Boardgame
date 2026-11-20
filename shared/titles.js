// 🎖️ Danh hiệu của thành viên – tính từ hồ sơ (số ván, thắng, chuỗi thắng, ngày chơi, thứ hạng). Thuần logic, không đụng DOM:
// dùng chung cho web (shared/ui/member.js, hồ sơ của bạn) và máy chủ (server/src/users.js) để hai nơi luôn ra cùng một kết quả.
// Thêm danh hiệu: thêm 1 dòng vào GEN (thứ tự = độ "oách": danh hiệu đứng trước được chọn làm mặc định). Thêm game: thêm vào GAME_TITLES.
export const LEVEL_NAMES = ['Tân binh', 'Tập sự', 'Dân chơi', 'Tay chơi', 'Cao thủ', 'Đại cao thủ', 'Bậc thầy', 'Tông sư', 'Huyền thoại', 'Truyền kỳ'];
/* XP: mỗi ván +10, thắng +20 nữa. Game tính theo TỪNG VÁN BÀI ngắn (10–30 giây/ván) chỉ được một phần (Poker cày 1.600 ván đứng Top 1) */
export const XP_K = { poker: 0.25, xidach: 0.25, bacao: 0.25, catte: 0.5 };
export const gameXp = (k, p, w) => Math.round(((+p || 0) * 10 + (+w || 0) * 20) * (XP_K[k] || 1));
export function xpOfG(g) { let x = 0; if (g && typeof g === 'object') for (const k of Object.keys(g)) { const v = g[k]; if (v && typeof v === 'object') { const p = Math.max(0, Math.min(99999, +v.p || 0)); x += gameXp(k, p, Math.min(p, Math.max(0, +v.w || 0))); } } return x; }
export function levelOf(p, w, xp0) { const xp = xp0 != null ? xp0 : p * 10 + w * 20, lv = Math.min(LEVEL_NAMES.length, Math.floor(Math.sqrt(xp / 50)) + 1); return { xp, lv, name: LEVEL_NAMES[lv - 1] }; }
export const GAME_WINS = 15; /* thắng từng này ván ở một game thì có danh hiệu riêng của game đó */
export const GAME_TITLES = {
  uno: ['🃏', 'Thánh UNÔ'], tienlen: ['🐷', 'Vua Tiến Lên'], masoi: ['🐺', 'Sói đầu đàn'], bang: ['🤠', 'Tay súng miền Tây'], typhu: ['🏙️', 'Tỷ phú Sài Thành'], tamquoc: ['⚔️', 'Quân sư'],
  meono: ['💣', 'Chuyên gia gỡ bom'], scribble: ['🎨', 'Hoạ sĩ'], poker: ['♠️', 'Thần bài'], xidach: ['🂡', 'Vua xì dách'], catte: ['🎴', 'Cao thủ cát tê'], bacao: ['👑', 'Vua ba cào'],
  cangua: ['🐴', 'Kỵ sĩ'], camel: ['🐪', 'Vua sa mạc'], solitaire: ['🧘', 'Ẩn sĩ xếp bài'], cotuong: ['♟️', 'Kỳ thủ'], covua: ['♞', 'Kiện tướng'], baitan: ['🗡️', 'Cao thủ bài tấn'],
  loto: ['🎪', 'Vua lô tô'], tala: ['🀄', 'Cao thủ tá lả'], cholon: ['🏮', 'Thánh mặc cả'], tusac: ['🎋', 'Cao thủ tứ sắc'], sam: ['🔥', 'Vua sâm lốc'], baucua: ['🎲', 'Thần tài'],
  caro: ['⭕', 'Cao thủ caro'], bantau: ['🚢', 'Đô đốc'], oanquan: ['🪨', 'Quan lớn'],
  tictactoe: ['❌', 'Vua TicTacToe'], memory: ['🧠', 'Bậc thầy trí nhớ'], covay: ['⚫', 'Kỳ thánh Cờ Vây'], cothu: ['🐘', 'Chúa sơn lâm'], noitu: ['🔗', 'Vua nối từ'], xuyenviet: ['🚂', 'Trưởng tàu'], khaihoang: ['🏝️', 'Chúa đảo'], cuuho: ['🚁', 'Anh hùng cứu hộ'], xiecthu: ['🎪', 'Bầu gánh'], daochinh: ['👑', 'Kẻ tiếm ngôi'], ranvathang: ['🐍', 'Vua Rắn Thang'],
};
const GEN = [
  { id: 'top1', icon: '🥇', name: 'Số 1 máy chủ', desc: 'Đứng đầu bảng xếp hạng', ok: s => s.rank === 1 },
  { id: 'top3', icon: '🥈', name: 'Top 3 máy chủ', desc: 'Lọt top 3 bảng xếp hạng', ok: s => s.rank >= 1 && s.rank <= 3 },
  { id: 'top10', icon: '🏅', name: 'Top 10 máy chủ', desc: 'Lọt top 10 bảng xếp hạng', ok: s => s.rank >= 1 && s.rank <= 10 },
  { id: 'w500', icon: '💠', name: 'Vô địch thiên hạ', desc: 'Thắng 500 ván', ok: s => s.w >= 500 },
  { id: 's20', icon: '🌋', name: 'Cỗ máy chiến thắng', desc: 'Thắng 20 ván liên tiếp', ok: s => s.best >= 20 },
  { id: 'w200', icon: '🐉', name: 'Đại ma vương', desc: 'Thắng 200 ván', ok: s => s.w >= 200 },
  { id: 'p500', icon: '🏛️', name: 'Lão làng', desc: 'Chơi 500 ván', ok: s => s.p >= 500 },
  { id: 'p1000', icon: '🏰', name: 'Ông chủ bàn cờ', desc: 'Chơi 1000 ván', ok: s => s.p >= 1000 },
  { id: 's10', icon: '🌪️', name: 'Bất khả chiến bại', desc: 'Thắng 10 ván liên tiếp', ok: s => s.best >= 10 },
  { id: 'k20', icon: '🗺️', name: 'Nhà thám hiểm', desc: 'Chơi 20 game khác nhau', ok: s => s.kinds >= 20 },
  { id: 'k46', icon: '🧭', name: 'Bậc thầy khám phá', desc: 'Chơi đủ 50 game', ok: s => s.kinds >= 50 },
  { id: 'd30', icon: '🌳', name: 'Cây đa cây đề', desc: 'Chơi vào 30 ngày khác nhau', ok: s => s.days >= 30 },
  { id: 'd100', icon: '🗓️', name: 'Gắn bó trăm ngày', desc: 'Chơi vào 100 ngày khác nhau', ok: s => s.days >= 100 },
  { id: 'w50', icon: '💎', name: 'Trùm cuối', desc: 'Thắng 50 ván', ok: s => s.w >= 50 },
  { id: 'p200', icon: '👑', name: 'Huyền thoại bàn tròn', desc: 'Chơi 200 ván', ok: s => s.p >= 200 },
  { id: 's5', icon: '🚀', name: 'Không thể cản', desc: 'Thắng 5 ván liên tiếp', ok: s => s.best >= 5 },
  { id: '@games' }, /* chỗ chèn các danh hiệu theo game (game thắng nhiều đứng trước) */
  { id: 'k10', icon: '🍱', name: 'Nếm đủ mùi', desc: 'Chơi 10 game khác nhau', ok: s => s.kinds >= 10 },
  { id: 'd7', icon: '🏠', name: 'Người nhà', desc: 'Chơi vào 7 ngày khác nhau', ok: s => s.days >= 7 },
  { id: 'w10', icon: '🎯', name: 'Cao thủ', desc: 'Thắng 10 ván', ok: s => s.w >= 10 },
  { id: 'night', icon: '🦉', name: 'Cú đêm', desc: 'Chơi xong một ván lúc nửa đêm', ok: s => s.night },
  { id: 'og', icon: '🌱', name: 'Thành viên đời đầu', desc: 'Lập tài khoản từ năm 2026', ok: s => s.created > 0 && s.created < Date.UTC(2027, 0, 1) },
  { id: 'p10', icon: '🎮', name: 'Dân chơi', desc: 'Chơi 10 ván', ok: s => s.p >= 10 },
];
const n0 = (v, max = 1e7) => Math.min(max, Math.max(0, Math.floor(+v || 0)));
/* gom số liệu từ hồ sơ P = { g: { <game>: { p, w } }, best, days: [...], night } + extra = { created, rank } */
export function statOf(P, extra = {}) {
  P = P && typeof P === 'object' ? P : {}; const g = P.g && typeof P.g === 'object' ? P.g : {}; let p = 0, w = 0, kinds = 0; const wins = {}, plays = {};
  for (const k of Object.keys(g)) { const v = g[k] || {}, gp = n0(v.p), gw = Math.min(gp, n0(v.w)); p += gp; w += gw; if (gp) { kinds++; plays[k] = gp; } wins[k] = gw; }
  return { p, w, xp: xpOfG(g), kinds, wins, plays, best: Math.min(w, n0(P.best)), days: Array.isArray(P.days) ? P.days.length : n0(P.days), night: !!P.night, created: n0(extra.created, 4e12), rank: n0(extra.rank) };
}
const gameTitle = g => { const t = GAME_TITLES[g]; return t ? { id: 'g-' + g, icon: t[0], name: t[1], desc: `Thắng ${GAME_WINS} ván ${g}`, game: g } : null; };
/* mọi danh hiệu đã đạt, xếp theo độ oách */
export function titlesOf(st) {
  const out = [];
  for (const t of GEN) {
    if (t.id === '@games') { Object.keys(st.wins || {}).filter(g => st.wins[g] >= GAME_WINS && GAME_TITLES[g]).sort((a, b) => st.wins[b] - st.wins[a]).forEach(g => out.push(gameTitle(g))); continue; }
    let ok = false; try { ok = !!t.ok(st); } catch (e) {}
    if (ok) out.push({ id: t.id, icon: t.icon, name: t.name, desc: t.desc });
  }
  return out;
}
/* danh hiệu đang trưng: cái người chơi tự chọn (nếu vẫn còn đạt), không thì cái oách nhất */
export function pickTitle(list, chosen) { return (chosen && list.find(t => t.id === chosen)) || list[0] || null; }
/* toàn bộ danh hiệu có thể đạt (để hiện danh sách "chưa đạt") – không kể danh hiệu theo game */
export const ALL_TITLES = GEN.filter(t => t.id !== '@games').map(t => ({ id: t.id, icon: t.icon, name: t.name, desc: t.desc }));
