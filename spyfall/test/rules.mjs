// Test luật Spyfall. Chạy: node spyfall/test/rules.mjs
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { LOCATIONS } from '../js/locations.js';
import { botAction } from '../js/bot.js';

const P = (id, name) => ({ id, name });
const P3 = [P('p1', 'Một'), P('p2', 'Hai'), P('p3', 'Ba')];
const P5 = [...P3, P('p4', 'Bốn'), P('p5', 'Năm')];
const P8 = [...P5, P('p6', 'Sáu'), P('p7', 'Bảy'), P('p8', 'Tám')];
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

/* ván cố định: gián điệp p5, địa điểm đầu tiên, người hỏi đầu p1 */
function fixedGame(players = P5, opts = {}) {
  const s = E.createGame(players, opts);
  s.players.forEach(p => { p.isSpy = p.id === 'p5'; p.role = p.id === 'p5' ? 'spy' : 'Người bán vé'; });
  s.locationId = LOCATIONS[0].id;
  s.spyId = 'p5';
  s.askerId = 'p1';
  return s;
}
const spyId = s => s.spyId;
const nonSpies = s => s.players.filter(p => !p.isSpy).map(p => p.id);
/* hỏi + trả lời 1 lượt: asker hỏi target, target trả lời */
function askAnswer(s, from, to, q = 'Bạn thường làm gì ở đây?', a = 'Tôi làm việc ở đây mỗi ngày.') {
  let r = E.applyAsk(s, from, to, q);
  assert.ok(r.ok, 'ask phải ok: ' + r.reason);
  r = E.applyAnswer(s, to, a);
  assert.ok(r.ok, 'answer phải ok: ' + r.reason);
}
/* đưa ván tới pha vote */
function toVote(s) {
  const r = E.applyCallVote(s, 'p1');
  assert.ok(r.ok, 'callvote phải ok: ' + r.reason);
  assert.equal(s.phase, 'vote');
}
/* bỏ phiếu cho cả bàn: map pid -> target (bỏ qua người đã bầu rồi) */
function voteAll(s, map) {
  for (const p of s.players) {
    if (p.id in s.votes) continue;
    const r = E.applyVote(s, p.id, map[p.id]);
    assert.ok(r.ok, 'vote phải ok: ' + r.reason);
  }
}

test('tạo ván: 2 người bị từ chối, 9 người bị từ chối, 3–8 người ok; đúng 1 gián điệp, người thường có vai', () => {
  assert.throws(() => E.createGame(P3.slice(0, 2)), /3–8/);
  assert.throws(() => E.createGame([...P8, P('p9', 'Chín')]), /3–8/);
  for (let n = 3; n <= 8; n++) {
    const ps = Array.from({ length: n }, (_, i) => P('p' + (i + 1), 'N' + (i + 1)));
    const s = E.createGame(ps);
    assert.equal(s.players.length, n);
    assert.equal(s.players.filter(p => p.isSpy).length, 1);
    assert.equal(s.phase, 'ask');
    assert.ok(LOCATIONS.some(l => l.id === s.locationId));
    assert.ok(s.askerId);
    for (const p of s.players) {
      if (!p.isSpy) assert.ok(p.role && p.role !== 'spy', 'người thường phải có vai');
    }
  }
});

test('kho địa điểm: 24 địa điểm, mỗi nơi 4–6 vai, id duy nhất', () => {
  assert.equal(LOCATIONS.length, 24);
  const ids = new Set();
  for (const l of LOCATIONS) {
    assert.ok(!ids.has(l.id), 'trùng id ' + l.id);
    ids.add(l.id);
    assert.ok(l.roles.length >= 4 && l.roles.length <= 6, l.name + ' phải có 4–6 vai');
    assert.ok(l.kw.length >= 4 && l.qs.length >= 2);
    assert.ok(l.name && l.icon && l.desc);
  }
});

test('hỏi đáp: chỉ người tới lượt được hỏi, không tự hỏi mình, câu hỏi 1–120 ký tự', () => {
  const s = fixedGame();
  assert.equal(E.applyAsk(s, 'p2', 'p3', 'Hỏi gì?').ok, false); /* chưa tới lượt p2 */
  assert.equal(E.applyAsk(s, 'p1', 'p1', 'Hỏi gì?').ok, false); /* tự hỏi mình */
  assert.equal(E.applyAsk(s, 'p1', 'p3', '').ok, false);
  assert.equal(E.applyAsk(s, 'p1', 'p3', 'x'.repeat(121)).ok, false);
  assert.equal(E.applyAsk(s, 'p1', 'zz', 'Hỏi gì?').ok, false);
  const r = E.applyAsk(s, 'p1', 'p2', 'Bạn thường làm gì ở đây?');
  assert.ok(r.ok);
  assert.equal(s.phase, 'ask');
  assert.deepEqual(s.pendingQ, { from: 'p1', to: 'p2', text: 'Bạn thường làm gì ở đây?' });
  assert.equal(E.applyAsk(s, 'p1', 'p3', 'Hỏi nữa?').ok, false); /* đang chờ trả lời */
});

test('trả lời: chỉ người được hỏi, trả lời xong thì tới lượt mình hỏi tiếp', () => {
  const s = fixedGame();
  E.applyAsk(s, 'p1', 'p2', 'Bạn thường làm gì ở đây?');
  assert.equal(E.applyAnswer(s, 'p3', 'Trả lời.').ok, false); /* không phải người được hỏi */
  assert.equal(E.applyAnswer(s, 'p2', '').ok, false);
  const r = E.applyAnswer(s, 'p2', 'Tôi làm việc ở đây.');
  assert.ok(r.ok);
  assert.equal(s.pendingQ, null);
  assert.equal(s.askerId, 'p2'); /* người trả lời hỏi tiếp */
  assert.equal(s.qa.length, 1);
  assert.equal(s.qa[0].a, 'Tôi làm việc ở đây.');
});

test('hô bỏ phiếu: bất kỳ ai cũng hô được, sang pha vote', () => {
  const s = fixedGame();
  askAnswer(s, 'p1', 'p2');
  assert.equal(s.askerId, 'p2');
  const r = E.applyCallVote(s, 'p4');
  assert.ok(r.ok);
  assert.equal(s.phase, 'vote');
  assert.equal(E.applyAsk(s, 'p1', 'p2', 'Hỏi?').ok, false);
  assert.equal(E.applyCallVote(s, 'p1').ok, false);
});

test('bỏ phiếu: không tự bầu mình, không bầu 2 lần, buộc tội đúng gián điệp thì sang pha đoán', () => {
  const s = fixedGame();
  toVote(s);
  assert.equal(E.applyVote(s, 'p1', 'p1').ok, false);
  assert.ok(E.applyVote(s, 'p1', 'p5').ok);
  assert.equal(E.applyVote(s, 'p1', 'p4').ok, false); /* đã bầu rồi */
  voteAll(s, { p2: 'p5', p3: 'p5', p4: 'p2', p5: 'p1' });
  assert.equal(s.phase, 'guess');
  assert.equal(s.accusedId, 'p5');
});

test('hòa phiếu thì không ai bị buộc tội, gián điệp thắng ván', () => {
  const s = fixedGame(P5, { target: 2 });
  toVote(s);
  voteAll(s, { p1: 'p5', p2: 'p5', p3: 'p4', p4: 'p3', p5: 'p1' });
  /* p5: 2 phiếu (p1, p2) nhiều nhất → bị buộc tội, đúng là gián điệp */
  assert.equal(s.phase, 'guess');
  assert.equal(s.accusedId, 'p5');
  const s2 = fixedGame(P5, { target: 2 });
  toVote(s2);
  voteAll(s2, { p1: 'p2', p2: 'p1', p3: 'p1', p4: 'p2', p5: 'p3' });
  /* p1: 2 (p2,p3), p2: 2 (p1,p4), p3: 1 (p5) → hòa p1–p2 */
  assert.equal(s2.phase, 'roundover');
  assert.equal(s2.endReason, 'tie');
  assert.deepEqual(s2.roundWinnerIds, ['p5']);
});

test('buộc tội nhầm người thì gián điệp thắng ván ngay', () => {
  const s = fixedGame(P5, { target: 2 });
  toVote(s);
  voteAll(s, { p1: 'p2', p2: 'p3', p3: 'p2', p4: 'p5', p5: 'p1' });
  assert.equal(s.phase, 'roundover');
  assert.equal(s.endReason, 'wrong-accuse');
  assert.deepEqual(s.roundWinnerIds, ['p5']);
  assert.equal(s.wins.p5, 1);
});

test('gián điệp bị buộc tội: đoán đúng địa điểm thì thắng, đoán sai thì cả đội thắng', () => {
  const s = fixedGame(P5, { target: 2 });
  toVote(s);
  voteAll(s, { p1: 'p5', p2: 'p5', p3: 'p5', p4: 'p2', p5: 'p1' });
  assert.equal(s.phase, 'guess');
  assert.equal(E.applyGuess(s, 'p1', LOCATIONS[0].id).ok, false); /* không phải gián điệp */
  const r = E.applyGuess(s, 'p5', LOCATIONS[0].id);
  assert.ok(r.ok);
  assert.equal(r.correct, true);
  assert.equal(s.phase, 'roundover');
  assert.equal(s.endReason, 'spy-guess');
  assert.deepEqual(s.roundWinnerIds, ['p5']);
  const s2 = fixedGame(P5, { target: 2 });
  toVote(s2);
  voteAll(s2, { p1: 'p5', p2: 'p5', p3: 'p5', p4: 'p2', p5: 'p1' });
  E.applyGuess(s2, 'p5', LOCATIONS[1].id);
  assert.equal(s2.endReason, 'spy-guess-wrong');
  assert.deepEqual(s2.roundWinnerIds.sort(), ['p1', 'p2', 'p3', 'p4'].sort());
});

test('gián điệp đoán sớm: đúng thắng ngay, sai thua ngay; người thường không đoán được', () => {
  const s = fixedGame(P5, { target: 2 });
  assert.equal(E.applySpyGuess(s, 'p1', LOCATIONS[0].id).ok, false);
  const r = E.applySpyGuess(s, 'p5', LOCATIONS[0].id);
  assert.ok(r.ok);
  assert.equal(r.correct, true);
  assert.equal(s.endReason, 'spy-early-guess');
  assert.deepEqual(s.roundWinnerIds, ['p5']);
  const s2 = fixedGame(P5, { target: 2 });
  E.applySpyGuess(s2, 'p5', LOCATIONS[5].id);
  assert.equal(s2.endReason, 'spy-early-wrong');
  assert.deepEqual(s2.roundWinnerIds.sort(), ['p1', 'p2', 'p3', 'p4'].sort());
});

test('ván tiếp theo: giữ điểm, đổi ván, địa điểm và gián điệp mới', () => {
  const s = fixedGame(P5, { target: 2 });
  toVote(s);
  voteAll(s, { p1: 'p2', p2: 'p3', p3: 'p2', p4: 'p5', p5: 'p1' }); /* buộc tội nhầm → gián điệp thắng ván 1 */
  assert.equal(s.phase, 'roundover');
  assert.equal(s.wins.p5, 1);
  assert.equal(E.applyNext(s, 'p2').ok, true);
  assert.equal(s.phase, 'ask');
  assert.equal(s.roundNo, 2);
  assert.equal(s.wins.p5, 1); /* điểm giữ nguyên */
  assert.equal(s.qa.length, 0);
  assert.equal(s.votes && Object.keys(s.votes).length, 0);
});

test('thắng đủ số ván mục tiêu thì thắng trận', () => {
  const s = fixedGame(P5, { target: 2 });
  /* ván 1: gián điệp thắng (buộc tội nhầm) */
  toVote(s);
  voteAll(s, { p1: 'p2', p2: 'p3', p3: 'p2', p4: 'p5', p5: 'p1' });
  assert.equal(s.phase, 'roundover');
  E.applyNext(s, 'p1');
  /* ván 2: gián điệp lại thắng — gán lại vai cố định sau khi chia lại */
  s.players.forEach(p => { p.isSpy = p.id === 'p5'; p.role = p.id === 'p5' ? 'spy' : 'Người bán vé'; });
  s.spyId = 'p5';
  toVote(s);
  voteAll(s, { p1: 'p2', p2: 'p3', p3: 'p2', p4: 'p5', p5: 'p1' });
  assert.equal(s.phase, 'ended');
  assert.deepEqual(s.winnerIds, ['p5']);
  assert.equal(s.matchWinner, 'spy');
  assert.equal(s.wins.p5, 2);
});

test('viewFor: gián điệp không thấy địa điểm, người thường thấy địa điểm + vai; gián điệp + địa điểm chỉ lộ khi ván ngã ngũ', () => {
  const s = fixedGame();
  const vSpy = E.viewFor(s, 'p5');
  assert.equal(vSpy.amSpy, true);
  assert.equal(vSpy.myLocation, null);
  assert.equal(vSpy.myRole, 'spy');
  assert.equal(vSpy.spyId, null);
  assert.equal(vSpy.locationId, null);
  assert.equal(vSpy.locationList.length, 24);
  const vCiv = E.viewFor(s, 'p1');
  assert.equal(vCiv.amSpy, false);
  assert.equal(vCiv.myLocation.id, LOCATIONS[0].id);
  assert.equal(vCiv.myLocation.name, LOCATIONS[0].name);
  assert.equal(vCiv.myRole, 'Người bán vé');
  assert.equal(vCiv.spyId, null);
  /* sau khi ván kết thúc: lộ hết */
  toVote(s);
  voteAll(s, { p1: 'p5', p2: 'p5', p3: 'p5', p4: 'p2', p5: 'p1' });
  E.applyGuess(s, 'p5', LOCATIONS[1].id);
  const vEnd = E.viewFor(s, 'p1');
  assert.equal(vEnd.spyId, 'p5');
  assert.equal(vEnd.locationId, LOCATIONS[0].id);
  assert.equal(vEnd.roles.p5, 'spy');
  assert.equal(vEnd.roles.p1, 'Người bán vé');
});

test('xin thua: gián điệp xin thua thì đội thắng, người thường xin thua thì gián điệp thắng', () => {
  const s = fixedGame();
  E.applyResign(s, 'p5');
  assert.equal(s.endReason, 'resign');
  assert.deepEqual(s.roundWinnerIds.sort(), ['p1', 'p2', 'p3', 'p4'].sort());
  const s2 = fixedGame();
  E.applyResign(s2, 'p1');
  assert.deepEqual(s2.roundWinnerIds, ['p5']);
});

test('serialize/deserialize giữ nguyên trạng thái; hành động sai bị từ chối', () => {
  const s = fixedGame();
  askAnswer(s, 'p1', 'p2');
  const s2 = E.deserialize(E.serialize(s));
  assert.equal(E.serialize(s), E.serialize(s2));
  assert.equal(E.applyAnswer(s2, 'p1', 'Trả lời.').ok, false); /* không có câu hỏi chờ */
  assert.equal(E.applyVote(s2, 'p1', 'p2').ok, false); /* chưa tới pha bỏ phiếu */
  assert.throws(() => E.deserialize('{"x":1}'), /không hợp lệ/);
});

test('bot ra hành động hợp lệ ở mọi pha (cả 2 cấp độ)', () => {
  for (const level of ['easy', 'hard']) {
    const s = E.createGame(P5);
    let guard = 0;
    /* hỏi đáp vài lượt rồi hô bỏ phiếu bằng tay */
    while (s.qa.length < 3 && guard++ < 20) {
      const acts = E.actors(s);
      assert.ok(acts.length, 'không còn người chơi');
      const pid = acts[0];
      const p = s.players.find(x => x.id === pid);
      const a = botAction(s, pid, p);
      assert.ok(a && (a.type === 'ask' || a.type === 'answer' || a.type === 'spyguess'), `bot ask ${level} ${pid}: ${JSON.stringify(a)}`);
      const r = E.applyAction(s, pid, a);
      assert.ok(r.ok, `ask ${level} ${pid}: ${r.reason}`);
      if (s.phase !== 'ask') break;
    }
    if (s.phase === 'roundover' || s.phase === 'ended') {
      /* gián điệp Khó đoán sớm đúng/sai — ván kết thúc sớm là đúng luật, bỏ qua phần bỏ phiếu */
      assert.ok(true, `bot ${level} kết thúc ván sớm bằng đoán sớm`);
      continue;
    }
    if (s.phase === 'ask') E.applyCallVote(s, s.players[0].id);
    assert.equal(s.phase, 'vote');
    for (const p of s.players) {
      const a = botAction(s, p.id, p);
      assert.ok(a && a.type === 'vote', `bot vote ${level} ${p.id}: ${JSON.stringify(a)}`);
      const r = E.applyAction(s, p.id, a);
      assert.ok(r.ok, `vote ${level} ${p.id}: ${r.reason}`);
    }
    if (s.phase === 'guess') {
      const a = botAction(s, s.spyId, s.players.find(x => x.id === s.spyId));
      assert.ok(a && a.type === 'guess' && a.location, `bot guess ${level}`);
      const r = E.applyAction(s, s.spyId, a);
      assert.ok(r.ok, `guess ${level}: ${r.reason}`);
    }
    assert.ok(s.phase === 'roundover' || s.phase === 'ended', `bot ${level} phải kết thúc ván, đang ở ${s.phase}`);
  }
});

console.log(`\n${pass} test luật đạt.`);
