// 🌌 Săn Thú Ngân Hà – luật (thuần logic). 2–6 người, 8 ngày. Cơ chế kiểu Siêu Thú Ngân Hà nhưng nhân vật, quái thú, bảo bối, sự kiện, hình đều tự làm.
// Mỗi ngày: nhận 1 🍗 + 1 bảo bối (trừ ngày 1) → lật 1 sự kiện → lần lượt mỗi người 1 lượt: vào 1 hang (trả 🍗 = số trên cửa = điểm chiến công),
// đổ xúc xắc so với quái (hoà là thắng), và/hoặc nộp 3 quái cùng hệ để đấu 1 Siêu thú cổ đại. Trong mọi trận, ai cũng đánh được bảo bối xanh.
// Hết ngày 8: nhiều điểm nhất thắng – nhưng nếu không ai hạ được Siêu thú nào thì cả bàn cùng thua.
import { EL, EL_KEYS, MONS, BEASTS, BEAST_NEED, BEAST_PTS, CHARS, CHAR_KEYS, TREAS, EVENTS, CAVES, monKeys, treasKeys, eventKeys } from './cards.js?v=1';

export const DAYS = 8, CHK0 = 3, HAND0 = 3, HAND_MAX = 7, MAX_P = 6, WIN_MS = 9000, PER_FIGHT = 3;
export const DEFAULT_OPTS = { turn: 60 };
export const CHOICES = { turn: [0, 45, 60, 90] };
export const optOk = (k, v) => k in CHOICES && CHOICES[k].includes(v);

let uid = 0; const mk = k => ({ id: 'c' + (++uid).toString(36) + Math.random().toString(36).slice(2, 6), k });
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const d6 = () => 1 + Math.floor(Math.random() * 6);
const say = (s, m) => { s.log.push(m); if (s.log.length > 40) s.log.shift(); };
const P = (s, id) => s.players.find(p => p.id === id);
const now = () => Date.now();
const fxOf = p => CHARS[p.ch].fx;

export function createGame(players, opts = {}) {
  const o = { ...DEFAULT_OPTS, ...opts }; if (!CHOICES.turn.includes(o.turn)) o.turn = DEFAULT_OPTS.turn;
  const chars = shuffle([...CHAR_KEYS]);
  const s = { gid: Math.random().toString(36).slice(2, 8), seq: 0, phase: 'play', opts: o, day: 1, first0: 0, first: 0, ti: 0, cur: 0,
    players: players.slice(0, MAX_P).map((p, i) => ({ id: p.id, name: p.name, isBot: !!p.isBot, ch: chars[i], chk: CHK0, hand: [], mons: [], pts: 0, boost: 0, beasts: [], rr: 0 })),
    mdeck: shuffle(monKeys().map(mk)), mdisc: [], tdeck: shuffle(treasKeys().map(mk)), tdisc: [], edeck: shuffle(eventKeys()), ev: null,
    caves: CAVES.map(cost => ({ cost, m: null })), beasts: Object.fromEntries(EL_KEYS.map(e => [e, null])),
    pend: null, deadline: 0, tf: {}, log: [], last: null, winners: [], fail: false };
  for (const p of s.players) { if (fxOf(p) === 'rich') p.chk += 2; for (let i = 0; i < HAND0; i++) drawT(s, p); }
  for (const c of s.caves) c.m = drawM(s);
  s.first0 = s.first = Math.floor(Math.random() * s.players.length);
  startDay(s);
  return s;
}
/* ---------------- tiện ích ---------------- */
function drawT(s, p) {
  if (p.hand.length >= HAND_MAX) return null;
  if (!s.tdeck.length) { if (!s.tdisc.length) return null; s.tdeck = shuffle(s.tdisc); s.tdisc = []; }
  const c = s.tdeck.pop(); p.hand.push(c); return c;
}
function drawM(s) {
  if (!s.mdeck.length) { if (!s.mdisc.length) return null; s.mdeck = shuffle(s.mdisc); s.mdisc = []; }
  return s.mdeck.pop();
}
const arm = (s, ms) => { s.deadline = ms ? now() + ms : (s.opts.turn ? now() + s.opts.turn * 1000 : 0); };
const curP = s => s.players[s.cur];
export const evOn = (s, k) => s.ev === k;
export const caveCost = (s, i) => (evOn(s, 'sale') && s.caves[i].cost === 3 ? 2 : s.caves[i].cost);
export const refreshCost = (s, p) => (fxOf(p) === 'freeRef' ? 0 : 1);
/* quái nộp được cho Siêu thú hệ el: đủ BEAST_NEED lá, đúng hệ (Thiên Bình: 1 lá khác hệ cũng được) */
export function beastOk(p, el, ids) {
  if (!Array.isArray(ids) || ids.length !== BEAST_NEED || new Set(ids).size !== BEAST_NEED) return false;
  const ms = ids.map(id => p.mons.find(m => m.id === id)); if (ms.some(m => !m)) return false;
  const off = ms.filter(m => MONS[m.k].el !== el).length;
  return off === 0 || (off === 1 && fxOf(p) === 'summon');
}
/* gợi ý bộ quái tốt nhất (sức mạnh cao nhất) cho hệ el, hoặc null */
export function bestSet(p, el) {
  const own = p.mons.filter(m => MONS[m.k].el === el).sort((a, b) => MONS[b.k].pw - MONS[a.k].pw);
  let pick = own.slice(0, BEAST_NEED);
  if (pick.length === BEAST_NEED - 1 && fxOf(p) === 'summon') { const x = p.mons.filter(m => MONS[m.k].el !== el).sort((a, b) => MONS[b.k].pw - MONS[a.k].pw)[0]; if (x) pick = [...pick, x]; }
  return pick.length === BEAST_NEED ? pick.map(m => m.id) : null;
}
/* ---------------- ngày / lượt ---------------- */
function startDay(s) {
  const n = s.players.length;
  const broke = new Set(s.players.filter(p => !p.chk).map(p => p.id)); /* ai hết 🍗 trước khi phát quà đầu ngày – cho sự kiện Bụng Đói Meo */
  if (s.day > 1) for (const p of s.players) { if (fxOf(p) === 'rich' && !p.chk) p.chk += 2; p.chk++; drawT(s, p); }
  for (const p of s.players) p.rr = 0;
  if (!s.edeck.length) s.edeck = shuffle(eventKeys());
  s.ev = s.edeck.pop(); applyEvent(s, broke);
  s.first = (s.first0 + s.day - 1) % n; s.ti = 0; s.cur = s.first;
  say(s, `🌅 Ngày ${s.day}/${DAYS} · sự kiện: ${EVENTS[s.ev].name}.`);
  startTurn(s);
}
function applyEvent(s, broke = new Set()) {
  const ps = s.players;
  if (s.ev === 'tiec') ps.forEach(p => p.chk++);
  else if (s.ev === 'mua') ps.forEach(p => drawT(s, p));
  else if (s.ev === 'loc') refreshCaves(s);
  else if (s.ev === 'thue') { const mx = Math.max(...ps.map(p => p.chk)); if (mx >= 3) ps.filter(p => p.chk === mx).forEach(p => p.chk--); }
  else if (s.ev === 'doi') ps.filter(p => broke.has(p.id) || p.chk === 0).forEach(p => { p.chk += 2; });
  else if (s.ev === 'quay' && ps.length > 1) {
    const give = ps.map(p => (p.hand.length ? p.hand.splice(Math.floor(Math.random() * p.hand.length), 1)[0] : null));
    give.forEach((c, i) => { if (c) ps[(i + 1) % ps.length].hand.push(c); });
  }
}
function refreshCaves(s) { for (const c of s.caves) { if (c.m) s.mdisc.push(c.m); c.m = drawM(s); } }
function startTurn(s) { s.tf = {}; s.pend = null; arm(s); }
function endTurn(s) {
  const n = s.players.length; s.ti++;
  if (s.ti >= n) { s.day++; if (s.day > DAYS) return finish(s); startDay(s); return; }
  s.cur = (s.first + s.ti) % n; startTurn(s);
}
function finish(s) {
  s.phase = 'ended'; s.pend = null; s.deadline = 0; s.day = DAYS;
  s.fail = !EL_KEYS.some(e => s.beasts[e]);
  if (s.fail) { s.winners = []; say(s, '💥 Không ai thu phục được Siêu thú cổ đại nào – ngân hà sụp đổ, cả bàn cùng thua!'); return; }
  const key = p => p.pts * 1e4 + p.beasts.length * 100 + p.chk;
  const best = Math.max(...s.players.map(key)); s.winners = s.players.filter(p => key(p) === best).map(p => p.id);
  say(s, `🏆 ${s.winners.map(id => P(s, id).name).join(', ')} thắng với ${P(s, s.winners[0]).pts} điểm chiến công!`);
}
/* ---------------- trận đấu ---------------- */
function startFight(s, p, what, info) {
  const pd = { k: 'fight', by: p.id, what, a: d6(), b: d6(), pb: p.boost, mb: 0, mods: [], pass: [], n: {}, slip: false, ...info };
  p.boost = 0;
  if (what === 'cave') {
    const M = MONS[pd.m.k]; pd.mb = M.pw + (evOn(s, 'nhat') ? 1 : 0);
    if (fxOf(p) === 'cave3' && pd.cost === 3) pd.pb += 1;
    if (fxOf(p) === 'cave1' && pd.cost <= 2) pd.pb += 1;
    if (fxOf(p) === 'freeRef' && M.el === 'dat') pd.pb += 1;
  } else {
    pd.mb = BEASTS[pd.el].pw + (evOn(s, 'tron') ? 1 : 0);
    pd.pb += pd.sub.reduce((n, m) => n + MONS[m.k].pw, 0) + (fxOf(p) === 'beast2' ? 2 : 0);
  }
  s.pend = pd; arm(s, WIN_MS);
  if (!fightActors(s).length) resolve(s);
}
export function total(pd, side) { return (side === 'a' ? pd.a + pd.pb : pd.b + pd.mb) + pd.mods.filter(m => m.on === side && m.v && !m.x).reduce((n, m) => n + m.v, 0); }
/* lá p có thể đánh lúc này (trong trận / ngoài trận) */
export function canPlay(s, p, c) {
  const T = TREAS[c.k], pd = s.pend;
  if (s.phase !== 'play' || !T) return false;
  if (!pd) return T.win === 'turn' && curP(s) === p;
  if (pd.k !== 'fight' || (pd.n[p.id] || 0) >= PER_FIGHT) return false;
  const mine = pd.by === p.id;
  if (T.win === 'self') return mine;
  if (T.win === 'turn') return false;
  if (T.win === 'other') return !mine && !evOn(s, 'yen');
  if (c.k === 'bom') return mine || !evOn(s, 'yen');
  if (c.k === 'gay') return pd.mods.some(m => m.by !== p.id && m.v && !m.x);
  return true;
}
export const canReroll = (s, p) => !!(s.pend && s.pend.k === 'fight' && s.pend.by === p.id && fxOf(p) === 'reroll' && !p.rr);
export function fightActors(s) {
  const pd = s.pend; if (!pd) return [];
  return s.players.filter(p => !pd.pass.includes(p.id) && (p.hand.some(c => canPlay(s, p, c)) || canReroll(s, p))).map(p => p.id);
}
function resolve(s) {
  const pd = s.pend, p = P(s, pd.by), A = total(pd, 'a'), B = total(pd, 'b'), win = A >= B;
  s.pend = null;
  if (pd.what === 'cave') {
    const cv = s.caves[pd.cave], M = MONS[pd.m.k];
    if (win) {
      let pts = pd.cost + (M.pw >= 2 ? 1 : 0) + (evOn(s, 'sao') ? 1 : 0) + (fxOf(p) === 'climb' && pd.cost >= 2 ? 1 : 0);
      p.mons.push(pd.m); if (cv.m && cv.m.id === pd.m.id) cv.m = drawM(s);
      const g = EL[M.el].gift; if (g === 'chk') p.chk++; else if (g === 'card') drawT(s, p); else if (g === 'boost') p.boost++; else pts++;
      p.pts += pts; s.last = { t: 'win', by: p.id, k: M.k, A, B, pts };
      say(s, `✨ ${p.name} thu phục ${M.name} (${A}–${B}), +${pts} điểm.`);
    } else {
      if (fxOf(p) === 'refund') p.chk += caveCost(s, pd.cave); if (fxOf(p) === 'learn') drawT(s, p);
      s.last = { t: 'lose', by: p.id, k: M.k, A, B }; say(s, `💫 ${p.name} thua ${M.name} (${A}–${B}).`);
    }
  } else {
    const Bz = BEASTS[pd.el];
    if (win) {
      s.beasts[pd.el] = p.id; p.beasts.push(pd.el); p.pts += BEAST_PTS; p.chk += 2; drawT(s, p); drawT(s, p);
      s.last = { t: 'bwin', by: p.id, el: pd.el, A, B }; say(s, `🌟 ${p.name} thu phục Siêu thú ${Bz.name} (${A}–${B})! +${BEAST_PTS} điểm.`);
    } else { s.last = { t: 'blose', by: p.id, el: pd.el, A, B }; say(s, `🌪️ ${Bz.name} quá mạnh, ${p.name} thua (${A}–${B}).`); }
    s.mdisc.push(...pd.sub);
  }
  arm(s);
}
/* ---------------- hành động ---------------- */
const no = reason => ({ ok: false, reason });
export function applyAction(s, pid, a) {
  const r = act(s, pid, a); if (r.ok) s.seq++; return r;
}
function act(s, pid, a) {
  if (!a || s.phase !== 'play') return no('Ván chưa chơi.');
  const p = P(s, pid); if (!p) return no('Bạn đang xem.');
  if (a.type === 'timeout') {
    if (!s.deadline || now() < s.deadline - 300) return no('Chưa hết giờ.');
    if (s.pend) resolve(s); else { say(s, `⏱️ ${curP(s).name} hết giờ.`); endTurn(s); }
    return { ok: true };
  }
  const pd = s.pend;
  if (pd) {
    if (!fightActors(s).includes(pid)) return no('Chưa tới bạn.');
    if (a.type === 'pass') { pd.pass.push(pid); if (!fightActors(s).length) resolve(s); return { ok: true }; }
    if (a.type === 'reroll') {
      if (!canReroll(s, p)) return no('Không đổ lại được.');
      p.rr = 1; const old = pd.a; pd.a = d6(); pd.mods.push({ by: pid, k: 'rr', on: 'a', re: [old, pd.a] });
      afterPlay(s, pid); return { ok: true };
    }
    if (a.type === 'card') {
      const i = p.hand.findIndex(c => c.id === a.cid); if (i < 0) return no('Không có lá này.');
      const c = p.hand[i]; if (!canPlay(s, p, c)) return no('Lá này chưa đánh được lúc này.');
      p.hand.splice(i, 1); s.tdisc.push(c); const mine = pd.by === pid, tgt = P(s, pd.by);
      if (c.k === 'kiem') pd.mods.push({ by: pid, k: c.k, on: 'a', v: 2 });
      else if (c.k === 'khien') pd.mods.push({ by: pid, k: c.k, on: 'a', v: 1 });
      else if (c.k === 'gio') {
        let v = -(fxOf(p) === 'sting' ? 3 : 2);
        if (fxOf(tgt) === 'slip' && !pd.slip) { pd.slip = true; v = 0; say(s, `🐟 ${tgt.name} lướt qua Gió Ngược!`); }
        pd.mods.push({ by: pid, k: c.k, on: 'a', v });
      } else if (c.k === 'giay' || (c.k === 'bom' && !mine)) { const old = pd.a; pd.a = d6(); pd.mods.push({ by: pid, k: c.k, on: 'a', re: [old, pd.a] }); }
      else if (c.k === 'bom') { const old = pd.b; pd.b = d6(); pd.mods.push({ by: pid, k: c.k, on: 'b', re: [old, pd.b] }); }
      else if (c.k === 'gay') { const m = [...pd.mods].reverse().find(m => m.by !== pid && m.v && !m.x); m.x = 1; pd.mods.push({ by: pid, k: c.k, on: m.on, cut: m.k }); }
      say(s, `${p.name} đánh ${TREAS[c.k].name}.`); s.last = { t: 'card', by: pid, k: c.k, to: pd.by };
      afterPlay(s, pid); return { ok: true };
    }
    return no('Đang trong trận.');
  }
  if (curP(s).id !== pid) return no('Chưa tới lượt bạn.');
  if (a.type === 'end') { endTurn(s); return { ok: true }; }
  if (a.type === 'card') {
    const i = p.hand.findIndex(c => c.id === a.cid); if (i < 0) return no('Không có lá này.');
    const c = p.hand[i]; if (!canPlay(s, p, c)) return no('Lá này chỉ đánh được trong trận.');
    p.hand.splice(i, 1); s.tdisc.push(c);
    if (c.k === 'tui') p.chk += 2; else if (c.k === 'sach') { drawT(s, p); drawT(s, p); }
    say(s, `${p.name} dùng ${TREAS[c.k].name}.`); s.last = { t: 'card', by: pid, k: c.k };
    return { ok: true };
  }
  if (a.type === 'refresh') {
    if (s.tf.ref) return no('Mỗi lượt làm mới hang 1 lần.'); if (s.tf.cave) return no('Bạn đã vào hang rồi.');
    const cost = refreshCost(s, p); if (p.chk < cost) return no('Không đủ đùi gà.');
    p.chk -= cost; s.tf.ref = 1; refreshCaves(s); say(s, `🔄 ${p.name} làm mới cả 5 hang.`); s.last = { t: 'ref', by: pid };
    return { ok: true };
  }
  if (a.type === 'enter') {
    const i = a.cave; if (s.tf.cave) return no('Mỗi lượt chỉ vào 1 hang.');
    const cv = s.caves[i]; if (!cv || !cv.m) return no('Hang trống.');
    const cost = caveCost(s, i); if (p.chk < cost) return no(`Cần ${cost} 🍗.`);
    p.chk -= cost; s.tf.cave = 1; say(s, `🕳️ ${p.name} vào hang ${cv.cost} 🍗 gặp ${MONS[cv.m.k].name}.`);
    startFight(s, p, 'cave', { cave: i, cost: cv.cost, m: cv.m });
    return { ok: true };
  }
  if (a.type === 'beast') {
    if (s.tf.beast) return no('Mỗi lượt chỉ đấu 1 Siêu thú.');
    if (!EL_KEYS.includes(a.el) || s.beasts[a.el]) return no('Siêu thú này đã có người thu phục.');
    if (!beastOk(p, a.el, a.ids)) return no(`Cần nộp ${BEAST_NEED} quái thú hệ ${EL[a.el].name}.`);
    const sub = a.ids.map(id => p.mons.find(m => m.id === id)); p.mons = p.mons.filter(m => !a.ids.includes(m.id));
    s.tf.beast = 1; say(s, `⚡ ${p.name} nộp ${BEAST_NEED} quái thú, thách đấu ${BEASTS[a.el].name}!`);
    startFight(s, p, 'beast', { el: a.el, sub });
    return { ok: true };
  }
  return no('Thao tác lạ.');
}
function afterPlay(s, pid) {
  const pd = s.pend; pd.n[pid] = (pd.n[pid] || 0) + 1; pd.pass = []; arm(s, WIN_MS);
  if (!fightActors(s).length) resolve(s);
}
export function actors(s) {
  if (s.phase !== 'play') return [];
  if (s.pend) return fightActors(s);
  return [curP(s).id];
}
export function viewFor(s, pid) {
  const me = P(s, pid);
  return { gid: s.gid, seq: s.seq, phase: s.phase, opts: s.opts, day: s.day, ev: s.ev, first: s.players[s.first].id, cur: curP(s).id, tf: s.tf,
    players: s.players.map(p => ({ id: p.id, name: p.name, ch: p.ch, chk: p.chk, mons: p.mons, pts: p.pts, boost: p.boost, beasts: p.beasts, rr: p.rr, handN: p.hand.length, ...(p.id === pid ? { hand: p.hand } : {}) })),
    me: me ? me.id : null, caves: s.caves.map((c, i) => ({ cost: c.cost, pay: caveCost(s, i), m: c.m })), beasts: s.beasts,
    mdeckN: s.mdeck.length, tdeckN: s.tdeck.length, pend: s.pend, acts: actors(s), left: s.deadline ? Math.max(0, s.deadline - now()) : -1,
    log: s.log.slice(-8), last: s.last, winners: s.winners, fail: s.fail, spec: !me };
}
