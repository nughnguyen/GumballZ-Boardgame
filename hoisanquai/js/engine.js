// 🐾 Hội Săn Quái – luật (thuần logic). 2–6 người; cơ chế kiểu Here to Slay nhưng tên, anh hùng, quái vật và hình đều tự làm.
// Mỗi lượt 3 hành động: rút 1 lá (1) · chơi 1 lá (1) · dùng kỹ năng 1 anh hùng trong đội (1, mỗi anh hùng 1 lần/lượt) · đánh quái (2) · bỏ hết tay rút 5 (3).
// Chơi Anh hùng / Vật phẩm / Phép thì người khác có thể đánh lá Thách (2 bên cùng tung, bên thách cao hơn thì lá bị bỏ).
// Mọi lần tung 2 xúc xắc đều mở "cửa sổ Cộng/Trừ": ai có lá Cộng/Trừ đều được đánh vào. Thắng: diệt 3 quái hoặc đội đủ 6 hệ (tính cả trưởng nhóm).
import { CLS_KEYS, HEROES, LEADERS, ITEMS, MAGIC, MODS, MONSTERS, ALL, PICK, deckKeys } from './cards.js?v=1';

export const AP = 3, HAND0 = 5, WIN_MON = 3, WIN_CLS = 6;
export const WIN_CHAL = 9000, WIN_ROLL = 9000, WIN_MOD = 6000, WIN_PICK = 25000;
export const DEFAULT_OPTS = { turn: 90 };
export const CHOICES = { turn: [0, 60, 90, 150] };
export const optOk = (k, v) => k in CHOICES && CHOICES[k].includes(v);

let uid = 0; const mk = k => ({ id: 'c' + (++uid).toString(36) + Math.random().toString(36).slice(2, 6), k });
let gidSeq = 0; /* mã ván duy nhất tăng dần (không dùng Math.random trần – tránh trùng khi test có seed) */
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const d6 = () => 1 + Math.floor(Math.random() * 6);
const say = (s, m) => { s.log.push(m); if (s.log.length > 40) s.log.shift(); };
const P = (s, id) => s.players.find(p => p.id === id);
const nm = (s, id) => (P(s, id) || {}).name || '?';
const C = c => ALL[c.k];
const now = () => Date.now();

export function createGame(players, opts = {}) {
  const o = { ...DEFAULT_OPTS, ...opts }; if (!CHOICES.turn.includes(o.turn)) o.turn = DEFAULT_OPTS.turn;
  const leaders = shuffle(Object.keys(LEADERS));
  const s = { gid: 'g' + (++gidSeq) + '-' + Math.random().toString(36).slice(2, 7), seq: 0, phase: 'play', opts: o, turnN: 0, createdAt: Date.now(),
    players: players.slice(0, 6).map((p, i) => ({ id: p.id, name: p.name, isBot: !!p.isBot, leader: leaders[i], party: [], hand: [], slain: [], shield: false })),
    deck: shuffle(deckKeys().map(mk)), disc: [], mdeck: shuffle(Object.keys(MONSTERS).map(mk)), mons: [], cur: 0, ap: AP, used: {}, tf: {}, pend: null, deadline: 0,
    log: [], last: null, rolls: [], winner: null, winners: [] };
  while (s.mons.length < 3 && s.mdeck.length) s.mons.push(s.mdeck.pop());
  for (const p of s.players) for (let i = 0; i < HAND0; i++) draw(s, p);
  s.cur = Math.floor(Math.random() * s.players.length);
  startTurn(s);
  return s;
}
/* ---------------- tiện ích ---------------- */
function draw(s, p) {
  if (!s.deck.length) { if (!s.disc.length) return null; s.deck = shuffle(s.disc); s.disc = []; say(s, '🔄 Xào lại chồng bỏ thành chồng rút.'); }
  const c = s.deck.pop(); p.hand.push(c); return c;
}
const toDisc = (s, c) => { if (c) s.disc.push({ id: c.id, k: c.k }); };
/* nội tại đang có: trưởng nhóm + quái đã diệt */
export function fxOf(p) { const L = LEADERS[p.leader], out = [L.fx]; for (const m of p.slain) out.push(MONSTERS[m.k].fx); return out; }
const has = (p, fx) => fxOf(p).includes(fx);
const cnt = (p, fx) => fxOf(p).filter(x => x === fx).length;
export const heroCls = h => (h.item && ITEMS[h.item.k] && ITEMS[h.item.k].mask) || HEROES[h.k].cls;
export function classesOf(p) { const set = new Set([LEADERS[p.leader].cls]); for (const h of p.party) set.add(heroCls(h)); return set; }
export function canAttack(p, m) { const M = MONSTERS[m.k]; return p.party.length >= M.req.n && (!M.req.cls || classesOf(p).has(M.req.cls)); }
/* điểm cộng cố định khi tung */
export function bonusOf(s, p, what, ctx = {}) {
  let b = 0;
  if (what === 'use') { b += cnt(p, 'use1') + 2 * cnt(p, 'use2'); const h = p.party.find(x => x.id === ctx.hid); if (h && h.item && ITEMS[h.item.k].use) b += ITEMS[h.item.k].use; }
  if (what === 'atk') { b += cnt(p, 'atk1') + 2 * cnt(p, 'atk2') + (s.players[s.cur] === p ? (s.tf.atk || 0) : 0); }
  if (what === 'chal') b += 2 * cnt(p, 'chal2');
  return b;
}
const modBoost = p => cnt(p, 'mod1');
const protects = (p, eff) => p.shield || (eff === 'destroy' || eff === 'destroyDraw' ? has(p, 'noDestroy') : eff === 'steal' ? has(p, 'noSteal') : eff === 'ret' ? has(p, 'noRet') : false);
/* anh hùng người khác nhắm được bằng kỹ năng / phép */
export function heroTargets(s, byId, eff) { const out = []; for (const q of s.players) if (q.id !== byId && !protects(q, eff)) for (const h of q.party) out.push({ pid: q.id, hid: h.id }); return out; }
export const handLen = q => (q.hand ? q.hand.length : q.handN || 0);
const others = (s, id) => s.players.filter(q => q.id !== id);
function checkWin(s) {
  if (s.phase === 'ended') return true;
  const w = s.players.filter(p => p.slain.length >= WIN_MON || classesOf(p).size >= WIN_CLS);
  if (!w.length) return false;
  s.phase = 'ended'; s.pend = null; s.deadline = 0; s.winners = w.map(p => p.id); s.winner = s.winners[0];
  s.final = { summary: {} };
  for (const p of s.players) s.final.summary[p.id] = { slain: p.slain.length, classes: classesOf(p).size, handN: p.hand.length, partyN: p.party.length, timeMs: Date.now() - (s.createdAt || Date.now()) };
  const p = w[0]; say(s, `🏆 ${p.name} thắng – ${p.slain.length >= WIN_MON ? 'diệt đủ ' + WIN_MON + ' quái vật' : 'đội đủ ' + WIN_CLS + ' hệ'}!`); s.seq++;
  return true;
}
/* ---------------- lượt ---------------- */
function startTurn(s) {
  const p = s.players[s.cur]; s.turnN++; s.ap = AP + cnt(p, 'ap1'); s.used = {}; s.tf = {}; p.shield = false; s.pend = null;
  for (let i = 0; i < cnt(p, 'draw1'); i++) draw(s, p);
  if (has(p, 'hand1') && p.hand.length < 3) draw(s, p);
  arm(s); s.seq++;
}
function arm(s, ms) { s.deadline = ms ? now() + ms : (s.opts.turn ? now() + s.opts.turn * 1000 : 0); }
function endTurn(s) {
  if (s.phase !== 'play') return;
  s.cur = (s.cur + 1) % s.players.length; startTurn(s);
}
/* sau mỗi bước: hết hành động mà không còn gì chờ thì tự qua lượt */
function after(s) {
  if (checkWin(s)) return;
  if (!s.pend) { if (s.ap <= 0) endTurn(s); else arm(s); }
  s.seq++;
}
/* ---------------- tung xúc xắc + cửa sổ Cộng/Trừ ---------------- */
const hasType = (p, t) => p.hand.some(c => C(c).t === t);
function openRoll(s, what, by, ctx, two) {
  const p = P(s, by), d = { a: [d6(), d6()] }, bonus = { a: bonusOf(s, p, what, ctx) };
  if (two) { const q = P(s, two); d.b = [d6(), d6()]; bonus.b = bonusOf(s, q, 'chal'); }
  s.pend = { k: 'roll', what, by, two: two || null, ctx, d, bonus, mods: [], ok: [] };
  s.last = { t: 'roll', what, by, n: s.seq }; s.seq++;
  if (!rollActors(s).length) return resolveRoll(s);
  arm(s, WIN_ROLL);
}
const rollActors = s => s.players.filter(q => !s.pend.ok.includes(q.id) && hasType(q, 'mod')).map(q => q.id);
export function rollTotal(pd, side = 'a') { return pd.d[side][0] + pd.d[side][1] + (pd.bonus[side] || 0) + pd.mods.filter(m => m.on === side).reduce((n, m) => n + m.v, 0); }
function resolveRoll(s) {
  const r = s.pend; s.pend = null; const p = P(s, r.by), A = rollTotal(r, 'a');
  s.rolls.push({ what: r.what, by: r.by, d: r.d, bonus: r.bonus, mods: r.mods, A, B: r.two ? rollTotal(r, 'b') : null, two: r.two, k: r.ctx.k || null }); if (s.rolls.length > 6) s.rolls.shift();
  if (r.what === 'use') {
    const h = p.party.find(x => x.id === r.ctx.hid), H = HEROES[r.ctx.k], ok = A >= H.roll;
    s.last = { t: 'use', by: r.by, ok, k: r.ctx.k, A, need: H.roll };
    say(s, `🎲 ${p.name} tung ${A} cho ${H.name} (cần ${H.roll}): ${ok ? 'thành công!' : 'trượt.'}`);
    if (ok && h) return doEff(s, p, H.eff, { src: H.name });
  } else if (r.what === 'atk') {
    const mi = s.mons.findIndex(m => m.id === r.ctx.mid), m = s.mons[mi], M = m && MONSTERS[m.k];
    if (!M) return after(s);
    if (A >= M.win) { s.mons.splice(mi, 1); p.slain.push(m); if (s.mdeck.length) s.mons.splice(mi, 0, s.mdeck.pop()); s.last = { t: 'slay', by: r.by, k: m.k, A }; say(s, `🗡️ ${p.name} tung ${A} – diệt được ${M.name}! (${p.slain.length}/${WIN_MON})`); }
    else if (A <= M.lose) { s.last = { t: 'flop', by: r.by, k: m.k, A }; say(s, `💥 ${p.name} tung ${A} – ${M.name} phản đòn!`); return penalty(s, p, M.pen); }
    else { s.last = { t: 'miss', by: r.by, k: m.k, A }; say(s, `😮‍💨 ${p.name} tung ${A} – chưa hạ được ${M.name}.`); }
  } else if (r.what === 'chal') {
    const B = rollTotal(r, 'b'), owner = P(s, r.two), win = A > B, cp = r.ctx.play;
    s.last = { t: 'chal', by: r.by, two: r.two, A, B, win, k: cp.card.k };
    say(s, `⚔️ Thách: ${p.name} ${A} – ${owner.name} ${B}. ${win ? `${ALL[cp.card.k].name} bị bỏ!` : `${ALL[cp.card.k].name} vẫn được chơi.`}`);
    if (win) { toDisc(s, cp.card); return after(s); }
    return resolvePlay(s, cp);
  }
  after(s);
}
/* ---------------- chọn mục tiêu ---------------- */
function openPick(s, by, what, eff, extra = {}) { s.pend = { k: 'pick', by, what, eff, ...extra }; arm(s, WIN_PICK); s.seq++; }
export function pickOptions(s, pd) {
  const by = pd.by, me = P(s, by);
  if (pd.what === 'hero') return heroTargets(s, by, pd.eff);
  if (pd.what === 'own') return me.party.map(h => ({ pid: by, hid: h.id }));
  if (pd.what === 'player') return others(s, by).filter(q => handLen(q) || pd.eff === 'trade').map(q => ({ pid: q.id }));
  if (pd.what === 'item') { const out = []; for (const q of s.players) for (const h of q.party) if (h.item) out.push({ pid: q.id, hid: h.id }); return out; }
  const f = { dhero: c => C(c).t === 'hero', ditem: c => C(c).t === 'item', dmagic: c => C(c).t === 'magic', dchal: c => C(c).t === 'chal', dany: () => true }[pd.what];
  return f ? s.disc.filter(f).map(c => ({ cid: c.id })) : [];
}
function doEff(s, p, eff, info = {}) {
  const w = PICK[eff];
  if (w) {
    const pd = { by: p.id, what: w, eff }, opts = pickOptions(s, pd);
    if (!opts.length) { if (/^dig/.test(eff)) { draw(s, p); say(s, `${p.name}: chồng bỏ không có lá hợp → rút 1 lá.`); } else say(s, `${p.name}: không có mục tiêu nào.`); return after(s); }
    if (info.tgt && opts.some(o => same(o, info.tgt))) return applyPick(s, { ...pd }, info.tgt);
    return openPick(s, p.id, w, eff);
  }
  switch (eff) {
    case 'draw1': draw(s, p); break;
    case 'draw2': draw(s, p); draw(s, p); break;
    case 'drawAp': draw(s, p); s.ap++; break;
    case 'ap': s.ap++; break;
    case 'ap2': s.ap += 2; break;
    case 'drawItem': { const c = draw(s, p); if (c && C(c).t === 'item') draw(s, p); break; }
    case 'drawPlay': { const c = draw(s, p); if (c && C(c).t === 'hero') { p.hand = p.hand.filter(x => x.id !== c.id); p.party.push({ id: c.id, k: c.k, item: null }); say(s, `${p.name} đặt ngay ${C(c).name} vào đội.`); } break; }
    case 'discAll': for (const q of others(s, p.id)) if (q.hand.length) toDisc(s, q.hand.splice(Math.floor(Math.random() * q.hand.length), 1)[0]); break;
    case 'pullAll': for (const q of others(s, p.id)) if (q.hand.length) p.hand.push(q.hand.splice(Math.floor(Math.random() * q.hand.length), 1)[0]); break;
    case 'everyGive': for (const q of others(s, p.id)) if (q.hand.length) p.hand.push(q.hand.splice(Math.floor(Math.random() * q.hand.length), 1)[0]); break;
    case 'fetchMagic': { const i = s.deck.findIndex(c => C(c).t === 'magic'); if (i >= 0) { p.hand.push(s.deck.splice(i, 1)[0]); shuffle(s.deck); } else draw(s, p); break; }
    case 'shield': p.shield = true; break;
    case 'atkBuff': s.tf.atk = (s.tf.atk || 0) + 2; break;
    case 'wipeItems': for (const q of s.players) for (const h of q.party) if (h.item) { q.hand.push(h.item); h.item = null; } break;
  }
  say(s, `✨ ${p.name}: ${info.src ? info.src + ' – ' : ''}${{ draw1: 'rút 1 lá', draw2: 'rút 2 lá', drawAp: 'rút 1 lá, +1 hành động', ap: '+1 hành động', ap2: '+2 hành động', drawItem: 'rút lá', drawPlay: 'rút lá', discAll: 'mọi người bỏ 1 lá', pullAll: 'lấy 1 lá của mỗi người', everyGive: 'mỗi người đưa 1 lá', fetchMagic: 'tìm lá Phép', shield: 'đội được che chắn', atkBuff: '+2 đánh quái lượt này', wipeItems: 'mọi vật phẩm về tay' }[eff] || eff}.`);
  after(s);
}
const same = (a, b) => a && b && a.pid === b.pid && a.hid === b.hid && a.cid === b.cid;
function applyPick(s, pd, t) {
  const p = P(s, pd.by), eff = pd.eff;
  if (pd.what === 'own') { /* hy sinh */
    const i = p.party.findIndex(h => h.id === t.hid); if (i < 0) return after(s);
    const h = p.party.splice(i, 1)[0]; if (h.item) toDisc(s, h.item); toDisc(s, h); say(s, `🪦 ${p.name} hy sinh ${HEROES[h.k].name}.`);
    if (pd.n > 1 && p.party.length) return openPick(s, p.id, 'own', 'sac', { n: pd.n - 1 });
    return after(s);
  }
  if (pd.what === 'hero') {
    const q = P(s, t.pid), i = q ? q.party.findIndex(h => h.id === t.hid) : -1; if (i < 0) return after(s);
    const h = q.party.splice(i, 1)[0], N = HEROES[h.k].name;
    if (eff === 'steal') { p.party.push(h); say(s, `🫳 ${p.name} lấy ${N} từ đội ${q.name}.`); }
    else if (eff === 'ret') { if (h.item) toDisc(s, h.item); q.hand.push({ id: h.id, k: h.k }); say(s, `↩️ ${N} của ${q.name} về lại tay.`); }
    else { if (h.item) toDisc(s, h.item); toDisc(s, h); say(s, `💥 ${p.name} huỷ ${N} của ${q.name}.`); if (eff === 'destroyDraw') draw(s, p); }
    s.last = { t: 'hit', by: p.id, to: q.id, k: h.k, eff };
    return after(s);
  }
  if (pd.what === 'player') {
    const q = P(s, t.pid); if (!q) return after(s);
    if (eff === 'trade') { const a = p.hand; p.hand = q.hand; q.hand = a; say(s, `🔁 ${p.name} đổi cả tay bài với ${q.name}.`); }
    else { const n = eff === 'pull2' ? 2 : 1; let got = 0; for (let i = 0; i < n && q.hand.length; i++) { p.hand.push(q.hand.splice(Math.floor(Math.random() * q.hand.length), 1)[0]); got++; } say(s, `🫳 ${p.name} lấy ${got} lá trên tay ${q.name}.`); }
    return after(s);
  }
  if (pd.what === 'item') {
    const q = P(s, t.pid), h = q && q.party.find(x => x.id === t.hid); if (!h || !h.item) return after(s);
    p.hand.push(h.item); say(s, `🧲 ${p.name} lấy ${ALL[h.item.k].name} trên ${HEROES[h.k].name}.`); h.item = null; return after(s);
  }
  const i = s.disc.findIndex(c => c.id === t.cid); if (i < 0) return after(s);
  const c = s.disc.splice(i, 1)[0]; p.hand.push(c); say(s, `♻️ ${p.name} nhặt ${ALL[c.k].name} từ chồng bỏ.`);
  after(s);
}
function penalty(s, p, pen) {
  if (pen === 'sac' || pen === 'sac2') { if (!p.party.length) { say(s, `${p.name} không còn anh hùng để hy sinh.`); return after(s); } return openPick(s, p.id, 'own', 'sac', { n: pen === 'sac2' ? 2 : 1 }); }
  const n = pen === 'disc2' ? 2 : 1; for (let i = 0; i < n && p.hand.length; i++) toDisc(s, p.hand.splice(Math.floor(Math.random() * p.hand.length), 1)[0]);
  say(s, `${p.name} bỏ ${n} lá.`); after(s);
}
/* ---------------- chơi lá ---------------- */
function resolvePlay(s, pl) {
  const p = P(s, pl.by), c = pl.card, K = C(c);
  if (K.t === 'hero') { p.party.push({ id: c.id, k: c.k, item: null }); say(s, `🐾 ${p.name} đưa ${K.name} vào đội.`); s.last = { t: 'hero', by: p.id, k: c.k };
    if (checkWin(s)) return; return startUse(s, p, c.id, true); }
  if (K.t === 'item') {
    const q = P(s, pl.tgt.pid), h = q && q.party.find(x => x.id === pl.tgt.hid);
    if (!h || h.item) { toDisc(s, c); say(s, `${K.name} không còn chỗ gắn – bị bỏ.`); return after(s); }
    h.item = c; say(s, `🎒 ${p.name} gắn ${K.name} lên ${HEROES[h.k].name}${q !== p ? ' của ' + q.name : ''}.`); s.last = { t: 'item', by: p.id, k: c.k };
    return after(s);
  }
  if (K.t === 'magic') {
    toDisc(s, c); s.last = { t: 'magic', by: p.id, k: c.k }; say(s, `🪄 ${p.name} dùng phép ${K.name}.`);
    if (has(p, 'magicDraw')) for (let i = 0; i < cnt(p, 'magicDraw'); i++) draw(s, p);
    return doEff(s, p, K.eff, { src: K.name, tgt: pl.tgt });
  }
  after(s);
}
function startUse(s, p, hid, free) {
  const h = p.party.find(x => x.id === hid); if (!h) return after(s);
  if (h.item && ITEMS[h.item.k].sleep) { say(s, `${HEROES[h.k].name} đang trúng Bùa Ngủ.`); return after(s); }
  s.used[hid] = true; if (!free) s.ap--;
  openRoll(s, 'use', p.id, { hid, k: h.k });
}
/* ---------------- hành động ---------------- */
export function applyAction(s, pid, a) {
  const no = reason => ({ ok: false, reason });
  if (s.phase !== 'play' || !a) return no('Ván đã xong.');
  const p = P(s, pid); if (!p) return no('Bạn đang xem.');
  const pd = s.pend;
  if (a.type === 'timeout') {
    if (!s.deadline || now() < s.deadline - 300) return no('Chưa hết giờ.');
    if (!pd) { say(s, `⏰ ${s.players[s.cur].name} hết giờ.`); endTurn(s); return { ok: true }; }
    if (pd.k === 'chal') { s.pend = null; resolvePlay(s, pd.play); return { ok: true }; }
    if (pd.k === 'roll') { resolveRoll(s); return { ok: true }; }
    if (pd.k === 'pick') { const o = pickOptions(s, pd); s.pend = null; if (o.length) applyPick(s, pd, o[Math.floor(Math.random() * o.length)]); else after(s); return { ok: true }; }
  }
  if (pd && pd.k === 'chal') {
    if (pid === pd.by) return no('Đang chờ người khác quyết định có Thách hay không.');
    if (a.type === 'pass') { if (!pd.ok.includes(pid)) pd.ok.push(pid); s.seq++; if (!chalActors(s).length) { s.pend = null; resolvePlay(s, pd.play); } return { ok: true }; }
    if (a.type === 'chal') {
      const i = p.hand.findIndex(c => c.id === a.cid && C(c).t === 'chal'); if (i < 0) return no('Bạn không có lá Thách.');
      toDisc(s, p.hand.splice(i, 1)[0]); say(s, `⚔️ ${p.name} Thách lá ${ALL[pd.play.card.k].name} của ${nm(s, pd.by)}!`);
      openRoll(s, 'chal', pid, { play: pd.play, k: pd.play.card.k }, pd.by); return { ok: true };
    }
    return no('Đang chờ quyết định Thách.');
  }
  if (pd && pd.k === 'roll') {
    if (a.type === 'pass') { if (!pd.ok.includes(pid)) pd.ok.push(pid); s.seq++; if (!rollActors(s).length) resolveRoll(s); return { ok: true }; }
    if (a.type === 'mod') {
      const i = p.hand.findIndex(c => c.id === a.cid && C(c).t === 'mod'); if (i < 0) return no('Bạn không có lá này.');
      const M = MODS[p.hand[i].k]; if (!M.vals.includes(a.v)) return no('Giá trị không hợp lệ.');
      const on = pd.two && a.on === 'b' ? 'b' : 'a', v = a.v + Math.sign(a.v) * modBoost(p);
      toDisc(s, p.hand.splice(i, 1)[0]); pd.mods.push({ by: pid, v, on, k: M.k }); pd.ok = [];
      say(s, `🎴 ${p.name} đánh ${v > 0 ? '+' : ''}${v} vào lần tung của ${nm(s, on === 'b' ? pd.two : pd.by)}.`);
      s.seq++; if (!rollActors(s).length) resolveRoll(s); else arm(s, WIN_MOD); return { ok: true };
    }
    return no('Đang chờ lá Cộng / Trừ.');
  }
  if (pd && pd.k === 'pick') {
    if (pid !== pd.by) return no('Đang chờ người khác chọn.');
    if (a.type !== 'pick') return no('Chọn mục tiêu trước đã.');
    const t = { pid: a.pid, hid: a.hid, cid: a.cid }, o = pickOptions(s, pd).find(x => same(x, { pid: t.pid, hid: t.hid, cid: t.cid }));
    if (!o) return no('Không chọn được cái này.');
    s.pend = null; applyPick(s, pd, o); return { ok: true };
  }
  /* lượt chính */
  if (s.players[s.cur] !== p) return no('Chưa tới lượt bạn.');
  if (a.type === 'end') { say(s, `${p.name} hết lượt.`); endTurn(s); return { ok: true }; }
  if (a.type === 'draw') {
    const free = has(p, 'freeDraw') && !s.tf.drew; if (!free && s.ap < 1) return no('Hết hành động.');
    s.tf.drew = true; if (!free) s.ap--; draw(s, p); s.last = { t: 'draw', by: pid }; after(s); return { ok: true };
  }
  if (a.type === 'redraw') {
    if (s.ap < 3) return no('Cần 3 hành động.');
    s.ap -= 3; while (p.hand.length) toDisc(s, p.hand.pop()); for (let i = 0; i < HAND0; i++) draw(s, p);
    say(s, `${p.name} bỏ hết tay, rút ${HAND0} lá mới.`); after(s); return { ok: true };
  }
  if (a.type === 'use') {
    const h = p.party.find(x => x.id === a.hid); if (!h) return no('Không có anh hùng này.');
    if (s.used[h.id]) return no('Anh hùng này dùng kỹ năng rồi.'); if (s.ap < 1) return no('Hết hành động.');
    if (h.item && ITEMS[h.item.k].sleep) return no('Anh hùng này trúng Bùa Ngủ.');
    startUse(s, p, h.id, false); return { ok: true };
  }
  if (a.type === 'atk') {
    const m = s.mons.find(x => x.id === a.mid); if (!m) return no('Không có quái này.');
    if (s.ap < 2) return no('Đánh quái cần 2 hành động.'); if (!canAttack(p, m)) return no('Đội chưa đủ điều kiện đánh quái này.');
    s.ap -= 2; say(s, `🗡️ ${p.name} xông vào ${MONSTERS[m.k].name}!`); openRoll(s, 'atk', pid, { mid: m.id, k: m.k }); return { ok: true };
  }
  if (a.type === 'play') {
    const i = p.hand.findIndex(c => c.id === a.cid); if (i < 0) return no('Không có lá này.');
    const c = p.hand[i], K = C(c);
    if (K.t === 'mod' || K.t === 'chal') return no('Lá này chỉ đánh khi có người tung xúc xắc / chơi lá.');
    let free = false;
    if (K.t === 'hero' && has(p, 'heroFree') && !s.tf.hero) free = true;
    if (K.t === 'item' && has(p, 'itemFree')) free = true;
    if (!free && s.ap < 1) return no('Hết hành động.');
    let tgt = null;
    if (K.t === 'item') {
      const q = P(s, a.pid), h = q && q.party.find(x => x.id === a.hid); if (!h) return no('Chọn anh hùng để gắn.');
      if (h.item) return no('Anh hùng này đã mang vật phẩm.');
      if (K.curse && q === p) return no('Vật phẩm xui chỉ gắn lên anh hùng người khác.');
      if (K.own && q !== p) return no('Vật phẩm này chỉ gắn lên anh hùng của bạn.');
      tgt = { pid: q.id, hid: h.id };
    }
    if (K.t === 'magic' && K.need) {
      const pd2 = { by: pid, what: K.need, eff: K.eff }, o = pickOptions(s, pd2);
      tgt = o.find(x => same(x, { pid: a.pid, hid: a.hid, cid: undefined })) || null;
      if (!o.length) return no('Không có mục tiêu cho phép này.');
      if (!tgt) return no('Chọn mục tiêu cho phép.');
    }
    p.hand.splice(i, 1); if (K.t === 'hero') s.tf.hero = true; if (!free) s.ap--;
    const play = { by: pid, card: c, tgt };
    say(s, `${p.name} chơi ${K.name}${K.t === 'magic' ? ' (Phép)' : ''}.`); s.last = { t: 'play', by: pid, k: c.k };
    s.pend = { k: 'chal', by: pid, play, ok: [] };
    if (!chalActors(s).length) { s.pend = null; resolvePlay(s, play); } else { arm(s, WIN_CHAL); s.seq++; }
    return { ok: true };
  }
  return no('Thao tác lạ.');
}
const chalActors = s => s.players.filter(q => q.id !== s.pend.by && !s.pend.ok.includes(q.id) && hasType(q, 'chal')).map(q => q.id);
export function actors(s) {
  if (s.phase !== 'play') return [];
  const pd = s.pend;
  if (!pd) return [s.players[s.cur].id];
  if (pd.k === 'chal') return chalActors(s);
  if (pd.k === 'roll') return rollActors(s);
  if (pd.k === 'pick') return [pd.by];
  return [];
}
export function viewFor(s, pid) {
  const me = P(s, pid);
  return { gid: s.gid, seq: s.seq, phase: s.phase, opts: s.opts, turnN: s.turnN, cur: s.players[s.cur].id, ap: s.ap, used: s.used, tf: s.tf,
    players: s.players.map(p => ({ id: p.id, name: p.name, leader: p.leader, party: p.party, slain: p.slain, shield: p.shield, handN: p.hand.length, ...(p.id === pid ? { hand: p.hand } : {}) })),
    me: me ? me.id : null, deckN: s.deck.length, disc: s.disc, mons: s.mons, mdeckN: s.mdeck.length,
    pend: s.pend ? { ...s.pend, play: s.pend.play ? { by: s.pend.play.by, card: s.pend.play.card, tgt: s.pend.play.tgt } : undefined, ctx: s.pend.ctx ? { hid: s.pend.ctx.hid, mid: s.pend.ctx.mid, k: s.pend.ctx.k } : undefined } : null,
    acts: actors(s), left: s.deadline ? Math.max(0, s.deadline - now()) : -1,
    log: s.log.slice(-8), last: s.last, rolls: s.rolls, winner: s.winner, winners: s.winners, spec: !me,
    final: s.final || null };
}
