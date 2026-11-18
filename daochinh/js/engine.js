// 👑 Đảo Chính – luật, thuần logic (2–6 người). Luật y bản gốc của trò bluff "Coup": mỗi người 2 lá vai úp + 2 xu, ai còn lá cuối cùng thì thắng.
// Vai (3 lá mỗi vai, 15 lá): duke Công tước · assassin Sát thủ · captain Thuyền trưởng · ambassador Đại sứ · contessa Nữ bá tước.
// Hành động: income (+1) · aid (+2, Công tước chặn được) · coup (7 xu, bắt mất 1 lá; từ 10 xu bắt buộc) · tax (Công tước, +3)
//   · assassinate (Sát thủ, trả 3 xu, Nữ bá tước chặn được) · steal (Thuyền trưởng, lấy 2 xu; Thuyền trưởng / Đại sứ chặn được) · exchange (Đại sứ, bốc 2 rồi trả 2).
// Ai cũng được "nghi" (challenge) một lời xưng vai: người xưng có lá thật → lật cho xem, trộn lại vào chồng, bốc lá mới, người nghi mất 1 lá; không có → người xưng mất 1 lá.
// Dòng chảy một lượt (s.flow.step): chal (nghi hành động) → block (chặn) → bchal (nghi lời chặn) → do (thực hiện). Ai phải mất lá thì vào hàng s.lose trước.
export const ROLES = ['duke', 'assassin', 'captain', 'ambassador', 'contessa'];
export const ROLE_NAME = { duke: 'Công tước', assassin: 'Sát thủ', captain: 'Thuyền trưởng', ambassador: 'Đại sứ', contessa: 'Nữ bá tước' };
export const ACTS = {
  income: { name: 'Thu thuế dân', role: null, cost: 0, target: false, block: [] },
  aid: { name: 'Xin viện trợ', role: null, cost: 0, target: false, block: ['duke'] },
  coup: { name: 'Đảo chính', role: null, cost: 7, target: true, block: [] },
  tax: { name: 'Thu thuế', role: 'duke', cost: 0, target: false, block: [] },
  assassinate: { name: 'Ám sát', role: 'assassin', cost: 3, target: true, block: ['contessa'] },
  steal: { name: 'Cướp', role: 'captain', cost: 0, target: true, block: ['captain', 'ambassador'] },
  exchange: { name: 'Đổi vai', role: 'ambassador', cost: 0, target: false, block: [] },
};
export const DEFAULT_OPTS = { time: 20, level: 2, bonus: 0 };
export const CHOICES = { time: [12, 20, 30, 0], level: [1, 2, 3], bonus: [0, 1] }; /* bonus: luật nhà – nghi đúng được +1 xu (người chơi góp ý 17/11/2026) */
export const optOk = (k, v) => !!CHOICES[k] && CHOICES[k].includes(v);
const shuffle = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const P = (s, id) => s.players.find(p => p.id === id);
export const alive = p => p.cards.some(c => !c.dead);
export const aliveIds = s => s.players.filter(alive).map(p => p.id);
const note = (s, t) => { s.log.push(t); if (s.log.length > 40) s.log.shift(); };
const nm = (s, id) => (P(s, id) || {}).name || '?';
export const curId = s => s.players[s.turn].id;
const ACT_WINDOW = 1.0, RESP_WINDOW = 0.6; /* thời gian chờ: lượt chính = time, cửa sổ nghi/chặn = time × 0,6 */

export function createGame(players, opts = {}, rnd = Math.random) {
  if (typeof rnd !== 'function') rnd = Math.random;
  const o = { ...DEFAULT_OPTS }; for (const k of Object.keys(CHOICES)) if (optOk(k, opts[k])) o[k] = opts[k];
  const deck = shuffle(ROLES.flatMap(r => [r, r, r]), rnd);
  const ps = shuffle(players.slice(0, 6).map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot })), rnd)
    .map(p => ({ ...p, coins: 2, cards: [{ r: deck.pop(), dead: false }, { r: deck.pop(), dead: false }] }));
  /* 2 người: người đi trước chỉ có 1 xu (luật gốc cho ván 2 người) */
  if (ps.length === 2) ps[0].coins = 1;
  const s = { gid: Math.floor(rnd() * 1e9), seq: 0, phase: 'action', opts: o, players: ps, turn: 0, deck, flow: null, lose: [], ex: null, deadline: 0, last: null, log: [], winner: null, winners: null };
  arm(s, ACT_WINDOW); note(s, '👑 Ván bắt đầu – ai cũng có thể đang nói dối!'); return s;
}
const arm = (s, k) => { s.deadline = s.opts.time ? Date.now() + Math.round(s.opts.time * k * 1000) : 0; };
/* những người được phản ứng ở bước hiện tại */
function responders(s) {
  const f = s.flow; if (!f) return [];
  const live = aliveIds(s);
  if (f.step === 'chal') return live.filter(id => id !== f.by);
  if (f.step === 'block') { const a = ACTS[f.act]; if (!a.block.length) return []; return f.target ? (live.includes(f.target) ? [f.target] : []) : live.filter(id => id !== f.by); }
  if (f.step === 'bchal') return live.filter(id => id !== f.blocker);
  return [];
}
export function actors(s) {
  if (s.phase === 'ended') return [];
  if (s.lose.length) return [s.lose[0].pid];
  if (s.phase === 'exchange') return [curId(s)];
  if (s.phase === 'action') return [curId(s)];
  if (s.phase === 'respond') return responders(s).filter(id => !s.flow.done.includes(id));
  return [];
}
const hasRole = (p, r) => p.cards.some(c => !c.dead && c.r === r);
/* người xưng vai bị nghi: có thật thì đổi lá, người nghi mất lá; không có thì người xưng mất lá. Trả true nếu lời xưng là thật. */
function challenge(s, claimer, role, challenger, rnd) {
  const c = P(s, claimer);
  note(s, `🤨 ${nm(s, challenger)} nghi ${nm(s, claimer)} không có ${ROLE_NAME[role]}!`);
  if (hasRole(c, role)) {
    const i = c.cards.findIndex(x => !x.dead && x.r === role);
    s.deck.push(role); shuffle(s.deck, rnd); c.cards[i] = { r: s.deck.pop(), dead: false };
    note(s, `✅ ${nm(s, claimer)} có thật ${ROLE_NAME[role]} – ${nm(s, challenger)} mất 1 lá.`);
    s.lose.push({ pid: challenger, why: 'chal' }); s.last = { t: 'reveal', who: claimer, role, ok: true, by: challenger };
    return true;
  }
  note(s, `❌ ${nm(s, claimer)} nói dối – mất 1 lá.`);
  if (s.opts.bonus) { const ch = P(s, challenger); if (ch) { ch.coins += 1; note(s, `🪙 ${nm(s, challenger)} nghi đúng – được thưởng 1 xu.`); } }
  s.lose.push({ pid: claimer, why: 'bluff' }); s.last = { t: 'reveal', who: claimer, role, ok: false, by: challenger };
  return false;
}
function nextTurn(s) {
  s.flow = null;
  const live = aliveIds(s);
  if (live.length <= 1) { s.phase = 'ended'; s.winner = live[0] || null; s.winners = live; s.deadline = 0; note(s, `🏆 ${nm(s, s.winner)} lên ngôi!`); return; }
  do { s.turn = (s.turn + 1) % s.players.length; } while (!alive(s.players[s.turn]));
  s.phase = 'action'; arm(s, ACT_WINDOW);
}
/* chờ người phản ứng: mỗi khi sang bước mới thì đặt lại đồng hồ */
function wait(s) { s.phase = 'respond'; if (s.flow.armed !== s.flow.step) { s.flow.armed = s.flow.step; arm(s, RESP_WINDOW); } }
/* chạy tiếp dòng chảy cho tới khi cần ai đó quyết */
function advance(s, rnd) {
  for (let guard = 0; guard < 20; guard++) {
    /* dọn lời mất lá của người đã chết hẳn */
    while (s.lose.length && !alive(P(s, s.lose[0].pid))) s.lose.shift();
    if (s.lose.length) { s.phase = 'lose'; arm(s, RESP_WINDOW); return; }
    if (aliveIds(s).length <= 1) { s.phase = 'ended'; const live = aliveIds(s); s.winner = live[0] || null; s.winners = live; s.flow = null; s.deadline = 0; note(s, `🏆 ${nm(s, s.winner)} lên ngôi!`); return; }
    const f = s.flow; if (!f) { nextTurn(s); return; }
    if (!alive(P(s, f.by)) && f.step !== 'end') { f.step = 'end'; }
    if (f.step === 'chal') {
      if (f.chalBy) { const ok = challenge(s, f.by, ACTS[f.act].role, f.chalBy, rnd); f.chalBy = null; f.step = ok ? 'block' : 'end'; f.done = []; if (!ok && ACTS[f.act].cost) P(s, f.by).coins += ACTS[f.act].cost; /* luật gốc: thua khi bị nghi thì hành động hỏng và được trả lại xu */ continue; }
      if (!ACTS[f.act].role || !responders(s).length || responders(s).every(id => f.done.includes(id))) { f.step = 'block'; f.done = []; continue; }
      wait(s); return;
    }
    if (f.step === 'block') {
      if (f.target && !alive(P(s, f.target))) { f.step = 'end'; continue; }
      if (f.blocker) { f.step = 'bchal'; f.done = []; note(s, `🛡️ ${nm(s, f.blocker)} chặn bằng ${ROLE_NAME[f.brole]}.`); continue; }
      const rs = responders(s); if (!rs.length || rs.every(id => f.done.includes(id))) { f.step = 'do'; continue; }
      wait(s); return;
    }
    if (f.step === 'bchal') {
      if (f.chalBy) { const ok = challenge(s, f.blocker, f.brole, f.chalBy, rnd); f.chalBy = null; f.step = ok ? 'end' : 'do'; if (ok) note(s, `🛡️ Lời chặn đứng vững – ${ACTS[f.act].name} thất bại.`); continue; }
      const rs = responders(s); if (!rs.length || rs.every(id => f.done.includes(id))) { note(s, `🛡️ Không ai nghi – ${ACTS[f.act].name} bị chặn.`); f.step = 'end'; continue; }
      wait(s); return;
    }
    if (f.step === 'do') {
      const me = P(s, f.by), t = f.target && P(s, f.target); f.step = 'end';
      if (f.act === 'aid') { me.coins += 2; note(s, `💰 ${me.name} nhận 2 xu viện trợ.`); }
      else if (f.act === 'tax') { me.coins += 3; note(s, `💰 ${me.name} thu thuế 3 xu.`); }
      else if (f.act === 'steal') { const n = Math.min(2, t.coins); t.coins -= n; me.coins += n; note(s, `🏴‍☠️ ${me.name} cướp ${n} xu của ${t.name}.`); }
      else if (f.act === 'assassinate') { if (t && alive(t)) { s.lose.push({ pid: t.id, why: 'kill' }); note(s, `🗡️ ${me.name} ám sát ${t.name}.`); } }
      else if (f.act === 'exchange') { const draw = [s.deck.pop(), s.deck.pop()].filter(Boolean); s.ex = { pid: me.id, pool: [...me.cards.filter(c => !c.dead).map(c => c.r), ...draw], keep: me.cards.filter(c => !c.dead).length }; s.phase = 'exchange'; arm(s, ACT_WINDOW); return; }
      continue;
    }
    if (f.step === 'end') { nextTurn(s); return; }
  }
}
export const mustCoup = p => p.coins >= 10;
export function canDo(s, pid, act, target) {
  const me = P(s, pid), A = ACTS[act]; if (!A) return 'Thao tác lạ.';
  if (mustCoup(me) && act !== 'coup') return 'Có từ 10 xu là phải Đảo chính.';
  if (me.coins < A.cost) return `Cần ${A.cost} xu.`;
  if (A.target) { const t = P(s, target); if (!t || t.id === pid || !alive(t)) return 'Chọn một người còn sống.'; }
  return null;
}
export function applyAction(s, pid, a, rnd = Math.random) {
  if (typeof rnd !== 'function') rnd = Math.random;
  if (!a || typeof a !== 'object') return { ok: false, reason: 'Thao tác lạ.' };
  const me = P(s, pid); if (!me) return { ok: false, reason: 'Bạn đang xem.' };
  if (s.phase === 'ended') return { ok: false, reason: 'Ván đã xong.' };
  const yes = () => { s.seq++; return { ok: true }; }, no = reason => ({ ok: false, reason });
  if (a.type === 'timeout') { /* hết giờ: ai chưa trả lời coi như bỏ qua, lượt chính tự Thu thuế dân (hoặc Đảo chính nếu bắt buộc) */
    if (!s.deadline || Date.now() < s.deadline - 300) return no('Chưa hết giờ.');
    if (s.lose.length) { const x = P(s, s.lose[0].pid); const i = x.cards.findIndex(c => !c.dead); return loseCard(s, x, i, rnd) && yes(); }
    if (s.phase === 'exchange') { finishExchange(s, s.ex.pool.slice(0, s.ex.keep)); advance(s, rnd); return yes(); }
    if (s.phase === 'action') { const c = s.players[s.turn]; if (mustCoup(c)) { const t = s.players.find(q => q.id !== c.id && alive(q)); startAct(s, c, 'coup', t.id, rnd); } else startAct(s, c, 'income', null, rnd); return yes(); }
    if (s.phase === 'respond') { s.flow.done = [...new Set([...s.flow.done, ...responders(s)])]; advance(s, rnd); return yes(); }
    return no('Thao tác lạ.');
  }
  if (s.lose.length) {
    if (s.lose[0].pid !== pid || a.type !== 'lose') return no(s.lose[0].pid === pid ? 'Chọn lá để lật bỏ.' : `Chờ ${nm(s, s.lose[0].pid)} chọn lá bỏ.`);
    const i = a.i | 0; if (!me.cards[i] || me.cards[i].dead) return no('Chọn một lá còn úp.');
    loseCard(s, me, i, rnd); return yes();
  }
  if (s.phase === 'exchange') {
    if (pid !== s.ex.pid || a.type !== 'keep') return no('Chờ người đang đổi vai.');
    const keep = Array.isArray(a.idx) ? [...new Set(a.idx.map(x => x | 0))] : [];
    if (keep.length !== s.ex.keep || keep.some(i => i < 0 || i >= s.ex.pool.length)) return no(`Giữ đúng ${s.ex.keep} lá.`);
    finishExchange(s, keep.map(i => s.ex.pool[i]), rnd); advance(s, rnd); return yes();
  }
  if (s.phase === 'action') {
    if (pid !== curId(s)) return no('Chưa tới lượt bạn.');
    if (a.type !== 'act') return no('Chọn một hành động.');
    const err = canDo(s, pid, a.act, a.target); if (err) return no(err);
    startAct(s, me, a.act, a.target || null, rnd); return yes();
  }
  if (s.phase === 'respond') {
    const f = s.flow, rs = responders(s);
    if (!rs.includes(pid) || f.done.includes(pid)) return no('Bạn không cần trả lời lúc này.');
    if (a.type === 'pass') { f.done.push(pid); advance(s, rnd); return yes(); }
    if (a.type === 'challenge') { if (f.step === 'block') return no('Lúc này chỉ chặn hoặc bỏ qua.'); f.chalBy = pid; advance(s, rnd); return yes(); }
    if (a.type === 'block') {
      if (f.step !== 'block') return no('Lúc này không chặn được.');
      if (!ACTS[f.act].block.includes(a.role)) return no('Vai đó không chặn được hành động này.');
      f.blocker = pid; f.brole = a.role; f.done = []; s.last = { t: 'block', by: pid, role: a.role }; advance(s, rnd); return yes();
    }
    return no('Thao tác lạ.');
  }
  return no('Thao tác lạ.');
}
function startAct(s, me, act, target, rnd) {
  const A = ACTS[act]; me.coins -= A.cost;
  s.flow = { act, by: me.id, target, step: A.role ? 'chal' : 'block', done: [], chalBy: null, blocker: null, brole: null };
  s.last = { t: 'act', by: me.id, act, target };
  note(s, `${act === 'coup' ? '💥' : '▶️'} ${me.name}: ${A.name}${target ? ' → ' + nm(s, target) : ''}${A.role ? ` (xưng ${ROLE_NAME[A.role]})` : ''}.`);
  if (act === 'income') { me.coins += 1; s.flow.step = 'end'; }
  else if (act === 'coup') { s.lose.push({ pid: target, why: 'coup' }); s.flow.step = 'end'; }
  arm(s, RESP_WINDOW); advance(s, rnd);
}
function loseCard(s, p, i, rnd) {
  p.cards[i].dead = true; s.lose.shift(); s.last = { t: 'lost', who: p.id, role: p.cards[i].r };
  note(s, `💀 ${p.name} lật bỏ ${ROLE_NAME[p.cards[i].r]}${alive(p) ? '' : ' – bị loại!'}`);
  if (s.phase === 'lose') s.phase = s.flow ? 'respond' : 'action';
  advance(s, rnd); return true;
}
function finishExchange(s, keepRoles, rnd) {
  const me = P(s, s.ex.pid), pool = [...s.ex.pool];
  for (const r of keepRoles) pool.splice(pool.indexOf(r), 1);
  let k = 0; for (const c of me.cards) if (!c.dead) c.r = keepRoles[k++];
  s.deck.push(...pool); shuffle(s.deck, rnd || Math.random); s.ex = null; s.phase = 'respond';
  note(s, `🔄 ${me.name} đổi vai xong.`);
}
/* mỗi người chỉ thấy lá của mình + lá đã lật của mọi người */
export function viewFor(s, pid) {
  const me = P(s, pid), live = aliveIds(s);
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, opts: s.opts, cur: s.phase === 'ended' ? null : curId(s), deckN: s.deck.length, last: s.last, log: s.log.slice(-8),
    left: s.deadline ? Math.max(0, s.deadline - Date.now()) : -1,
    players: s.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, coins: p.coins, alive: alive(p), cards: p.cards.map(c => (c.dead || p.id === pid || s.phase === 'ended' ? { r: c.r, dead: c.dead } : { r: null, dead: false })) })),
    flow: s.flow ? { act: s.flow.act, by: s.flow.by, target: s.flow.target, step: s.flow.step, blocker: s.flow.blocker, brole: s.flow.brole, done: s.flow.done } : null,
    need: s.phase === 'ended' ? [] : actors(s), lose: s.lose.length ? s.lose[0] : null,
    ex: s.ex && s.ex.pid === pid ? { pool: s.ex.pool, keep: s.ex.keep } : s.ex ? { pid: s.ex.pid } : null,
    winner: s.winner, winners: s.winners, spec: !me, live,
  };
}
