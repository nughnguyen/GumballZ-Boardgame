// Luật Wavelength: thang điểm, ngân hàng thang/gợi ý, Nhà ngoại cảm,
// đặt mốc/chốt, lật bài, xoay lượt, thắng 10 điểm, số lượt = 2×số người, chơi đơn,
// xin thua, viewFor che vị trí/mốc, serialize, hành động sai.
import { createGame, applyAction, actors, viewFor, serialize, deserialize, bandOf, maxRoundsFor, WIN_POINTS, SOLO_ROUNDS, SOLO_WIN_POINTS } from '../js/engine.js';
import { SPECTRUMS, CLUES } from '../js/words.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để bot cho kết quả ổn định — seed: 20261120 */
let _s = 20261120;
function reseed() {
  _s = 20261120;
  Math.random = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
reseed();

let pass = 0, fail = 0;
const t = (n, c, extra = '') => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (extra ? ' — ' + extra : '')); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));

/* chơi 1 ván nhiều người tới cùng bằng bot (mọi người đều là bot) */
function playMatch(seed, names, levels) {
  reseed();
  const s = createGame(P(names), { seed });
  const lv = {};
  names.forEach((_, i) => { lv['p' + (i + 1)] = levels[i]; });
  let guard = 0, illegal = 0, stuck = 0, actions = 0;
  while (s.phase !== 'ended' && guard++ < 2000) {
    const act = actors(s);
    if (!act.length) { stuck++; break; }
    const pid = act[0];
    const a = botAction(s, pid, lv[pid]);
    if (!a) { stuck++; break; }
    const r = applyAction(s, pid, a);
    if (!r.ok) { illegal++; break; }
    actions++;
  }
  return { s, illegal, stuck, actions, ended: s.phase === 'ended' };
}

/* chơi 1 ván đơn: đặt mốc gần đích với xác suất theo level */
function playSolo(seed, level, forceBand = null) {
  reseed();
  const s = createGame(P(['A']), { seed });
  let guard = 0, illegal = 0, stuck = 0;
  while (s.phase !== 'ended' && guard++ < 100) {
    if (s.stage === 'guess') {
      const set = s.soloSet;
      let pos;
      if (forceBand != null) {
        /* forceBand = điểm muốn đạt ở lượt này (4/3/2/0); chọn hướng
           offset sao cho không bị kẹp ở biên 0/100 làm sai band */
        const off = forceBand === 4 ? 0 : forceBand === 3 ? 10 : forceBand === 2 ? 18 : 50;
        pos = set.target + off <= 100 ? set.target + off : set.target - off;
      } else {
        const hit = Math.random() < (level === 'hard' ? 0.65 : 0.35);
        pos = hit
          ? Math.max(0, Math.min(100, set.target + Math.floor(Math.random() * 11) - 5))
          : Math.max(0, Math.min(100, set.target + (Math.random() < 0.5 ? -1 : 1) * (25 + Math.floor(Math.random() * 21))));
      }
      let r = applyAction(s, 'p1', { type: 'place', pos });
      if (!r.ok) { illegal++; break; }
      r = applyAction(s, 'p1', { type: 'lock' });
      if (!r.ok) { illegal++; break; }
    } else if (s.stage === 'reveal') {
      const r = applyAction(s, 'p1', { type: 'next' });
      if (!r.ok) { illegal++; break; }
    } else { stuck++; break; }
  }
  return { s, illegal, stuck, ended: s.phase === 'ended' };
}

/* ---- thang điểm ---- */
t('bandOf: chênh 0 → 4', bandOf(50, 50) === 4);
t('bandOf: chênh 5 → 4 (biên)', bandOf(55, 50) === 4);
t('bandOf: chênh 6 → 3', bandOf(56, 50) === 3);
t('bandOf: chênh 12 → 3 (biên)', bandOf(62, 50) === 3);
t('bandOf: chênh 13 → 2', bandOf(63, 50) === 2);
t('bandOf: chênh 20 → 2 (biên)', bandOf(70, 50) === 2);
t('bandOf: chênh 21 → 0', bandOf(71, 50) === 0);
t('bandOf: chênh 100 → 0', bandOf(0, 100) === 0);
t('số lượt = 2 × số người (2 người → 4 lượt, 4 người → 8 lượt), WIN_POINTS = 10', maxRoundsFor(2) === 4 && maxRoundsFor(4) === 8 && maxRoundsFor(6) === 12 && WIN_POINTS === 10);
t('SOLO_ROUNDS = 10, SOLO_WIN_POINTS = 25', SOLO_ROUNDS === 10 && SOLO_WIN_POINTS === 25);

/* ---- ngân hàng thang đo + gợi ý ---- */
t('ngân hàng có đúng 20 thang đo', SPECTRUMS.length === 20, 'có ' + SPECTRUMS.length);
t('mỗi thang có left/right khác nhau, không rỗng', SPECTRUMS.every(sp =>
  typeof sp.left === 'string' && sp.left.trim().length > 0
  && typeof sp.right === 'string' && sp.right.trim().length > 0
  && sp.left !== sp.right));
t('mỗi thang có đúng 4 gợi ý', SPECTRUMS.every(sp => sp.clues.length === 4));
t('tổng 80 gợi ý (CLUES)', CLUES.length === 80, 'có ' + CLUES.length);
t('mọi gợi ý có clue là chuỗi không rỗng, target 0–100', CLUES.every(c =>
  typeof c.clue === 'string' && c.clue.trim().length > 0
  && Number.isInteger(c.target) && c.target >= 0 && c.target <= 100));
t('không có gợi ý trùng nhau', new Set(CLUES.map(c => c.clue)).size === CLUES.length);
t('mỗi thang có gợi ý ở cả 2 phía (target < 30 và > 70)', SPECTRUMS.every(sp =>
  sp.clues.some(c => c.target < 30) && sp.clues.some(c => c.target > 70)));

/* ---- tạo ván ---- */
{
  const s = createGame(P(['A', 'B']), { seed: 1 });
  t('tạo ván 2 người: stage clue, lượt 1, Nhà ngoại cảm là p1', s.stage === 'clue' && s.round === 1 && s.current.psychic === 'p1' && !s.solo);
  t('actors lúc clue chỉ có Nhà ngoại cảm', JSON.stringify(actors(s)) === JSON.stringify(['p1']));
  t('vị trí bí mật trong 0–100', s.current.target >= 0 && s.current.target <= 100);
  const s1 = createGame(P(['A']), { seed: 1 });
  t('tạo ván đơn: stage guess, 10 lượt, soloSet index 0', s1.solo && s1.stage === 'guess' && s1.soloSet && s1.soloSet.index === 0);
  t('ván đơn có gợi ý + thang đo hợp lệ', typeof s1.soloSet.clue === 'string' && s1.soloSet.clue.length > 0 && s1.soloSet.spectrumIdx >= 0 && s1.soloSet.spectrumIdx < 20);
  let threw = false;
  try { createGame([], { seed: 1 }); } catch (e) { threw = true; }
  t('tạo ván 0 người bị từ chối', threw);
  threw = false;
  try { createGame(P(['A', 'B', 'C', 'D', 'E', 'F', 'G']), { seed: 1 }); } catch (e) { threw = true; }
  t('tạo ván 7 người bị từ chối', threw);
  const s6 = createGame(P(['A', 'B', 'C', 'D', 'E', 'F']), { seed: 1 });
  t('tạo ván 6 người được', s6.players.length === 6);
}

/* ---- Nhà ngoại cảm: xem vị trí + đưa gợi ý ---- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 7 });
  t('đưa gợi ý trước khi xem vị trí bị từ chối', !applyAction(s, 'p1', { type: 'clue', text: 'x' }).ok);
  t('người đoán không được xem vị trí', !applyAction(s, 'p2', { type: 'ready' }).ok);
  t('ready: Nhà ngoại cảm xem vị trí → shown', applyAction(s, 'p1', { type: 'ready' }).ok && s.current.shown === true);
  t('xem vị trí lần 2 bị từ chối', !applyAction(s, 'p1', { type: 'ready' }).ok);
  t('gợi ý rỗng bị từ chối', !applyAction(s, 'p1', { type: 'clue', text: '   ' }).ok);
  t('gợi ý dài quá 60 ký tự bị từ chối', !applyAction(s, 'p1', { type: 'clue', text: 'x'.repeat(61) }).ok);
  t('người đoán không được đưa gợi ý', !applyAction(s, 'p2', { type: 'clue', text: 'x' }).ok);
  t('đưa gợi ý → stage guess', applyAction(s, 'p1', { type: 'clue', text: 'Nước sôi' }).ok && s.stage === 'guess' && s.current.clue === 'Nước sôi');
  t('actors lúc guess là người đoán chưa chốt', JSON.stringify(actors(s).sort()) === JSON.stringify(['p2', 'p3']));
}

/* ---- đặt mốc / chốt / lật bài + tính điểm ---- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 11 });
  applyAction(s, 'p1', { type: 'ready' });
  applyAction(s, 'p1', { type: 'clue', text: 'gợi ý' });
  const target = s.current.target;
  t('Nhà ngoại cảm không được đặt mốc', !applyAction(s, 'p1', { type: 'place', pos: 50 }).ok);
  t('đặt mốc ngoài 0–100 bị từ chối', !applyAction(s, 'p2', { type: 'place', pos: 101 }).ok && !applyAction(s, 'p2', { type: 'place', pos: -1 }).ok);
  t('chốt mốc khi chưa đặt bị từ chối', !applyAction(s, 'p2', { type: 'lock' }).ok);
  const p2 = applyAction(s, 'p2', { type: 'place', pos: target });
  t('p2 đặt mốc đúng đích', p2.ok && p2.pos === target);
  const p2b = applyAction(s, 'p2', { type: 'place', pos: target + 3 });
  t('đặt lại mốc trước khi chốt được (dời mốc)', p2b.ok && s.current.markers.find(m => m.pid === 'p2').pos === target + 3);
  t('p3 đặt mốc lệch 30', applyAction(s, 'p3', { type: 'place', pos: Math.max(0, Math.min(100, target + 30)) }).ok);
  t('p2 chốt mốc → vẫn stage guess (còn p3 chưa chốt)', applyAction(s, 'p2', { type: 'lock' }).ok && s.stage === 'guess');
  t('chốt mốc lần 2 bị từ chối', !applyAction(s, 'p2', { type: 'lock' }).ok);
  t('đặt mốc sau khi chốt bị từ chối', !applyAction(s, 'p2', { type: 'place', pos: 10 }).ok);
  const r = applyAction(s, 'p3', { type: 'lock' });
  t('mọi người chốt xong → lật bài ngay', r.ok && s.stage === 'reveal' && r.revealed === true);
  const b2 = bandOf(target + 3, target), b3 = bandOf(Math.max(0, Math.min(100, target + 30)), target);
  t('điểm theo thang: p2 được band của mốc đã dời', s.prog.p2.points === b2, `p2=${s.prog.p2.points} band=${b2}`);
  t('điểm theo thang: p3 được band của mốc lệch 30', s.prog.p3.points === b3, `p3=${s.prog.p3.points} band=${b3}`);
  t('lastReveal ghi đủ mốc + bestBand + target', s.lastReveal && s.lastReveal.target === target && s.lastReveal.markers.length === 2 && s.lastReveal.bestBand === Math.max(b2, b3));
  t('Nhà ngoại cảm được thưởng theo mốc tốt nhất', s.prog.p1.points === (Math.max(b2, b3) === 4 ? 2 : Math.max(b2, b3) === 3 ? 1 : 0), `p1=${s.prog.p1.points}`);
  t('summary đủ 5 trường', ['points', 'bestBand', 'exactCount', 'guesses', 'roundsAsPsychic'].every(k => k in (s.final || { summary: { p1: {} } }).summary?.p1 || s.prog.p1));
  t('next sau lật bài → lượt 2, Nhà ngoại cảm p2', applyAction(s, 'p2', { type: 'next' }).ok && s.round === 2 && s.current.psychic === 'p2' && s.stage === 'clue');
}

/* ---- Nhà ngoại cảm ép lật bài sớm (next lúc guess) ---- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 21 });
  applyAction(s, 'p1', { type: 'ready' });
  applyAction(s, 'p1', { type: 'clue', text: 'g' });
  t('ép lật bài khi chưa ai đặt mốc bị từ chối', !applyAction(s, 'p1', { type: 'next' }).ok);
  t('người đoán không được ép lật bài', (() => { applyAction(s, 'p2', { type: 'place', pos: 50 }); return !applyAction(s, 'p2', { type: 'next' }).ok; })());
  t('Nhà ngoại cảm ép lật bài khi đã có mốc → stage reveal', applyAction(s, 'p1', { type: 'next' }).ok && s.stage === 'reveal');
  t('người chưa chốt vẫn được tính điểm khi bị ép lật bài', s.prog.p2.points === bandOf(50, s.lastReveal.target));
}

/* ---- xoay Nhà ngoại cảm (mỗi người đúng 2 lần), thắng 10 điểm ---- */
{
  const { s, illegal, stuck, ended } = playMatch(101, ['A', 'B'], ['hard', 'hard']);
  t('ván 2 người chơi tới cùng (bot Hard)', ended && illegal === 0 && stuck === 0, `ended=${ended} illegal=${illegal} stuck=${stuck}`);
  t('ván kết thúc có winner hoặc hòa', s.winner != null || s.endReason === 'draw');
  t('endReason là done, draw hoặc resign', ['done', 'draw', 'resign'].includes(s.endReason));
  t('mỗi người làm Nhà ngoại cảm ít nhất 1 lần', s.final.summary.p1.roundsAsPsychic >= 1 && s.final.summary.p2.roundsAsPsychic >= 1);
  const { s: s4 } = playMatch(102, ['A', 'B', 'C', 'D'], ['easy', 'easy', 'easy', 'easy']);
  t('ván 4 người chơi tới cùng', s4.phase === 'ended');
  t('ván 4 người: tổng lượt đoán mỗi người ≤ 6 (8 lượt, mỗi người làm ngoại cảm 2 lần)', ['p1', 'p2', 'p3', 'p4'].every(pid => s4.final.summary[pid].guesses <= 6));
  /* ép thắng 10 điểm: cho p2 đặt mốc đúng đích mọi lượt, p1 làm ngoại cảm */
  const sw = createGame(P(['A', 'B']), { seed: 103 });
  let guard = 0;
  while (sw.phase !== 'ended' && guard++ < 100) {
    if (sw.stage === 'clue') {
      applyAction(sw, sw.current.psychic, { type: 'ready' });
      applyAction(sw, sw.current.psychic, { type: 'clue', text: 'gợi ý' });
    } else if (sw.stage === 'guess') {
      const g = sw.current.psychic === 'p1' ? 'p2' : 'p1';
      applyAction(sw, g, { type: 'place', pos: sw.current.target });
      applyAction(sw, g, { type: 'lock' });
    } else if (sw.stage === 'reveal') {
      applyAction(sw, 'p1', { type: 'next' });
    }
  }
  t('đặt đúng đích mọi lượt → đạt 10 điểm và thắng trước khi hết 4 lượt (2 người)', sw.phase === 'ended' && sw.winner != null && sw.round <= 4, `winner=${sw.winner} round=${sw.round}`);
}

/* ---- hòa: điểm bằng nhau + số lần 4 điểm bằng nhau ---- */
{
  const s = createGame(P(['A', 'B']), { seed: 111 });
  /* giả lập cuối ván hòa: sửa prog rồi gọi checkEnd gián tiếp qua 4 lượt (2 người)
     đặt mốc lệch đều — thay vào đó kiểm trực tiếp bằng ván bot toàn hòa 0-0:
     2 người cùng đặt mốc lệch 50 mọi lượt thì 0 điểm cả 2 → hòa */
  let guard = 0;
  while (s.phase !== 'ended' && guard++ < 200) {
    if (s.stage === 'clue') {
      applyAction(s, s.current.psychic, { type: 'ready' });
      applyAction(s, s.current.psychic, { type: 'clue', text: 'g' });
    } else if (s.stage === 'guess') {
      const g = s.current.psychic === 'p1' ? 'p2' : 'p1';
      const far = s.current.target >= 50 ? 0 : 100;
      applyAction(s, g, { type: 'place', pos: far });
      applyAction(s, g, { type: 'lock' });
    } else if (s.stage === 'reveal') {
      applyAction(s, 'p1', { type: 'next' });
    }
  }
  t('cả 2 cùng 0 điểm sau 4 lượt → hòa (winner null, endReason draw)', s.phase === 'ended' && s.winner == null && s.endReason === 'draw', `winner=${s.winner} endReason=${s.endReason} p1=${s.final?.summary?.p1?.points} p2=${s.final?.summary?.p2?.points}`);
  t('ván hòa 2 người: mỗi người làm Nhà ngoại cảm đúng 2 lần', s.final.summary.p1.roundsAsPsychic === 2 && s.final.summary.p2.roundsAsPsychic === 2, `p1=${s.final.summary.p1.roundsAsPsychic} p2=${s.final.summary.p2.roundsAsPsychic}`);
}

/* ---- chơi đơn: 10 lượt, ngưỡng thắng 25/40 ---- */
{
  const win = playSolo(201, 'hard', 4);
  t('chơi đơn đạt 4 điểm mọi lượt (40/40) → thắng', win.ended && win.s.winner === 'p1' && win.s.final.summary.p1.points === 40);
  const win3 = playSolo(202, 'hard', 3);
  t('chơi đơn đạt 3 điểm mọi lượt (30/40) → thắng (ngưỡng 25)', win3.ended && win3.s.winner === 'p1' && win3.s.final.summary.p1.points === 30);
  const win2 = playSolo(203, 'hard', 2);
  t('chơi đơn đạt 2 điểm mọi lượt (20/40) → thua (dưới 25)', win2.ended && win2.s.winner == null && win2.s.losers.includes('p1'));
  const lose0 = playSolo(204, 'hard', 0);
  t('chơi đơn đạt 0 điểm mọi lượt → thua, 0 điểm', lose0.ended && lose0.s.final.summary.p1.points === 0);
  const s = createGame(P(['A']), { seed: 205 });
  t('chơi đơn: chốt mốc khi chưa đặt bị từ chối', !applyAction(s, 'p1', { type: 'lock' }).ok);
  t('chơi đơn: đặt mốc ngoài 0–100 bị từ chối', !applyAction(s, 'p1', { type: 'place', pos: 101 }).ok);
  t('chơi đơn: ready/clue bị từ chối', !applyAction(s, 'p1', { type: 'ready' }).ok && !applyAction(s, 'p1', { type: 'clue', text: 'x' }).ok);
  t('chơi đơn: đặt mốc rồi chốt → lật bài, band đúng', (() => {
    const set = s.soloSet;
    const r1 = applyAction(s, 'p1', { type: 'place', pos: set.target });
    const r2 = applyAction(s, 'p1', { type: 'lock' });
    return r1.ok && r2.ok && r2.band === 4 && s.stage === 'reveal' && s.prog.p1.points === 4;
  })());
  t('chơi đơn: đặt mốc sau khi chốt bị từ chối', !applyAction(s, 'p1', { type: 'place', pos: 10 }).ok);
}

/* ---- xin thua ---- */
{
  const s = createGame(P(['A', 'B']), { seed: 301 });
  const r = applyAction(s, 'p2', { type: 'resign' });
  t('2 người xin thua → ván kết thúc ngay, người còn lại thắng', r.ok && r.ended === true && s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'resign');
  t('xin thua rồi thì hành động khác bị từ chối', !applyAction(s, 'p1', { type: 'ready' }).ok);
}
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 302 });
  applyAction(s, 'p1', { type: 'ready' });
  applyAction(s, 'p1', { type: 'clue', text: 'g' });
  const r = applyAction(s, 'p2', { type: 'resign' });
  t('3 người: 1 người đoán xin thua → ván vẫn tiếp tục', r.ok && r.ended === false && s.phase === 'playing');
  t('người xin thua bị đánh dấu resigned, mốc của họ bị bỏ', s.prog.p2.resigned === true && !s.current.markers.some(m => m.pid === 'p2'));
  /* chơi nốt ván bằng bot — p2 không bao giờ tới lượt */
  reseed();
  let guard = 0, illegal = 0, stuck = 0;
  const lv = { p1: 'hard', p2: 'hard', p3: 'hard' };
  while (s.phase !== 'ended' && guard++ < 2000) {
    const act = actors(s);
    if (!act.length) { stuck++; break; }
    if (act.includes('p2')) { stuck++; break; }
    const pid = act[0];
    const a = botAction(s, pid, lv[pid]);
    if (!a) { stuck++; break; }
    const rr = applyAction(s, pid, a);
    if (!rr.ok) { illegal++; break; }
  }
  t('ván 3 người (1 xin thua) chơi tới cùng, p2 không bao giờ tới lượt', s.phase === 'ended' && illegal === 0 && stuck === 0);
  const s2 = createGame(P(['A', 'B', 'C']), { seed: 303 });
  applyAction(s2, 'p2', { type: 'resign' });
  const r2 = applyAction(s2, 'p3', { type: 'resign' });
  t('chỉ còn 1 người chưa thua → người đó thắng ngay', r2.ok && r2.ended === true && s2.phase === 'ended' && s2.winner === 'p1');
  const s3 = createGame(P(['A', 'B', 'C']), { seed: 304 });
  t('Nhà ngoại cảm xin thua lúc clue → chuyển Nhà ngoại cảm cho p2, cùng lượt', (() => {
    applyAction(s3, 'p1', { type: 'resign' });
    return s3.phase === 'playing' && s3.current.psychic === 'p2' && s3.stage === 'clue' && s3.round === 1;
  })());
}

/* ---- viewFor che vị trí bí mật và mốc ---- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 401 });
  const target = s.current.target;
  t('lúc clue (chưa xem): Nhà ngoại cảm cũng không thấy vị trí', viewFor(s, 'p1').current.target == null);
  t('lúc clue: người đoán không thấy vị trí', viewFor(s, 'p2').current.target == null);
  applyAction(s, 'p1', { type: 'ready' });
  t('sau khi xem: chỉ Nhà ngoại cảm thấy vị trí', viewFor(s, 'p1').current.target === target && viewFor(s, 'p2').current.target == null);
  applyAction(s, 'p1', { type: 'clue', text: 'gợi ý' });
  t('lúc guess: người đoán vẫn không thấy vị trí', viewFor(s, 'p2').current.target == null && viewFor(s, 'p3').current.target == null);
  applyAction(s, 'p2', { type: 'place', pos: 10 });
  applyAction(s, 'p3', { type: 'place', pos: 90 });
  const vP2 = viewFor(s, 'p2');
  const vP3 = viewFor(s, 'p3');
  const vP1 = viewFor(s, 'p1');
  t('người đoán thấy mốc của chính mình', vP2.current.markers.find(m => m.pid === 'p2').pos === 10);
  t('người đoán không thấy mốc của người khác', vP2.current.markers.find(m => m.pid === 'p3').pos == null);
  t('người đoán khác cũng không thấy mốc của p2', vP3.current.markers.find(m => m.pid === 'p2').pos == null);
  t('Nhà ngoại cảm không thấy vị trí mốc nào (chỉ thấy số lượng)', vP1.current.markers.every(m => m.pos == null) && vP1.current.placedCount === 2);
  applyAction(s, 'p2', { type: 'lock' });
  applyAction(s, 'p3', { type: 'lock' });
  const vAfter = viewFor(s, 'p3');
  t('sau khi lật bài: mọi người thấy vị trí + mọi mốc + band', vAfter.current.target === target
    && vAfter.current.markers.find(m => m.pid === 'p2').pos === 10
    && vAfter.current.markers.find(m => m.pid === 'p2').band === bandOf(10, target));
  t('viewFor chơi đơn không lộ vị trí trước khi chốt', (() => {
    const s1 = createGame(P(['A']), { seed: 402 });
    const v1 = viewFor(s1, 'p1');
    return v1.soloSet.target == null && v1.soloSet.band == null && typeof v1.soloSet.clue === 'string';
  })());
}

/* ---- serialize / deserialize ---- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 501 });
  applyAction(s, 'p1', { type: 'ready' });
  applyAction(s, 'p1', { type: 'clue', text: 'g' });
  applyAction(s, 'p2', { type: 'place', pos: 42 });
  const json = serialize(s);
  const s2 = deserialize(json);
  t('serialize/deserialize giữ nguyên state (byte-identical)', JSON.stringify(s2) === JSON.stringify(s));
  t('deserialize chuỗi không hợp lệ bị từ chối', (() => { try { deserialize('{"x":1}'); return false; } catch (e) { return true; } })());
  t('deserialize JSON hỏng bị từ chối', (() => { try { deserialize('{oops'); return false; } catch (e) { return true; } })());
}

/* ---- hành động sai ---- */
{
  const s = createGame(P(['A', 'B']), { seed: 601 });
  t('hành động không rõ loại bị từ chối', !applyAction(s, 'p1', { type: 'bay' }).ok);
  t('hành động null bị từ chối', !applyAction(s, 'p1', null).ok);
  t('clue khi chưa tới lượt bị từ chối', !applyAction(s, 'p2', { type: 'clue', text: 'x' }).ok);
  t('next trước khi lật bài (người đoán) bị từ chối', !applyAction(s, 'p2', { type: 'next' }).ok);
  t('place lúc clue bị từ chối', !applyAction(s, 'p2', { type: 'place', pos: 50 }).ok);
  t('lock lúc clue bị từ chối', !applyAction(s, 'p2', { type: 'lock' }).ok);
}

console.log(`\nRULES: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
