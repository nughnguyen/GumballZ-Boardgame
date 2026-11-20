// Test luật Avalon. Chạy: node avalon/test/rules.mjs
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';

const P = (id, name) => ({ id, name });
const P5 = [P('p1', 'Một'), P('p2', 'Hai'), P('p3', 'Ba'), P('p4', 'Bốn'), P('p5', 'Năm')];
const P7 = [...P5, P('p6', 'Sáu'), P('p7', 'Bảy')];
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

/* ván cố định: gán vai theo ý muốn sau khi tạo */
function fixedGame(players = P5, roles = ['merlin', 'percival', 'servant', 'assassin', 'morgana']) {
  const s = E.createGame(players);
  s.players.forEach((p, i) => { p.role = roles[i % roles.length]; p.side = E.ROLE_INFO[p.role].side; });
  s.leader = 0; /* p1 làm thủ lĩnh đầu */
  return s;
}
const goodIds = s => s.players.filter(p => p.side === 'good').map(p => p.id);
const evilIds = s => s.players.filter(p => p.side === 'evil').map(p => p.id);
/* đưa ván tới pha vote: thủ lĩnh đề xuất đội size nhiệm vụ hiện tại */
function toVote(s, team) {
  const r = E.applyPropose(s, s.players[s.leader].id, team);
  assert.ok(r.ok, 'propose phải ok: ' + r.reason);
  return r;
}
/* bỏ phiếu cho cả bàn: map pid -> approve */
function voteAll(s, map) {
  for (const p of s.players) {
    const r = E.applyVote(s, p.id, map[p.id]);
    assert.ok(r.ok, 'vote phải ok: ' + r.reason);
  }
}
/* làm nhiệm vụ: map pid -> choice ('success'/'fail') */
function questAll(s, map) {
  const team = s.quests[s.questNo].team;
  for (const id of team) {
    const r = E.applyQuest(s, id, map[id] || 'success');
    assert.ok(r.ok, 'quest phải ok: ' + r.reason);
  }
}

test('tạo ván: 4 người bị từ chối, 11 người bị từ chối, 5–10 người ok', () => {
  assert.throws(() => E.createGame(P5.slice(0, 4)), /5–10/);
  assert.throws(() => E.createGame([...P5, ...P7.slice(5), P('p8', 'T'), P('p9', 'C'), P('p10', 'M'), P('p11', 'X')]), /5–10/);
  for (let n = 5; n <= 10; n++) {
    const ps = Array.from({ length: n }, (_, i) => P('p' + (i + 1), 'N' + (i + 1)));
    const s = E.createGame(ps);
    assert.equal(s.players.length, n);
    assert.deepEqual(s.questSizes, E.QUEST_SIZES[n]);
    assert.equal(s.phase, 'propose');
  }
});

test('bảng vai chuẩn: Thiện luôn đa số; Mordred từ 7 người, Oberon ở 9 người, Tay sai ở 10 người', () => {
  const count = roles => roles.reduce((m, r) => (m[r] = (m[r] || 0) + 1, m), {});
  assert.deepEqual(count(E.rolesFor(5)), { merlin: 1, percival: 1, servant: 1, assassin: 1, morgana: 1 });
  assert.deepEqual(count(E.rolesFor(6)), { merlin: 1, percival: 1, servant: 2, assassin: 1, morgana: 1 });
  assert.deepEqual(count(E.rolesFor(7)), { merlin: 1, percival: 1, servant: 2, assassin: 1, morgana: 1, mordred: 1 });
  assert.deepEqual(count(E.rolesFor(8)), { merlin: 1, percival: 1, servant: 3, assassin: 1, morgana: 1, mordred: 1 });
  assert.deepEqual(count(E.rolesFor(9)), { merlin: 1, percival: 1, servant: 4, assassin: 1, morgana: 1, oberon: 1 });
  assert.deepEqual(count(E.rolesFor(10)), { merlin: 1, percival: 1, servant: 4, assassin: 1, morgana: 1, mordred: 1, minion: 1 });
  for (let n = 5; n <= 10; n++) {
    const rs = E.rolesFor(n);
    assert.equal(rs.length, n);
    const good = rs.filter(r => E.ROLE_INFO[r].side === 'good').length;
    const evil = n - good;
    assert.ok(good > evil, `${n} người: Thiện ${good} phải nhiều hơn Ác ${evil}`);
    assert.deepEqual([good, evil], [[3, 2], [4, 2], [4, 3], [5, 3], [6, 3], [6, 4]][n - 5]);
  }
});

test('đề xuất: chỉ thủ lĩnh được đề xuất, sai số người/trùng người bị từ chối', () => {
  const s = fixedGame();
  assert.equal(E.applyPropose(s, 'p2', ['p1', 'p2']).ok, false);
  assert.equal(E.applyPropose(s, 'p1', ['p1']).ok, false);
  assert.equal(E.applyPropose(s, 'p1', ['p1', 'p1']).ok, false);
  assert.equal(E.applyPropose(s, 'p1', ['p1', 'zz']).ok, false);
  const r = E.applyPropose(s, 'p1', ['p1', 'p2']);
  assert.ok(r.ok);
  assert.equal(s.phase, 'vote');
  assert.deepEqual(s.quests[0].team, ['p1', 'p2']);
});

test('bỏ phiếu: quá bán Thuận thì duyệt, hòa/thiếu thì bác và đổi thủ lĩnh', () => {
  const s = fixedGame();
  toVote(s, ['p1', 'p2']);
  voteAll(s, { p1: true, p2: true, p3: true, p4: false, p5: false });
  assert.equal(s.phase, 'quest');
  const s2 = fixedGame();
  toVote(s2, ['p1', 'p2']);
  voteAll(s2, { p1: true, p2: true, p3: false, p4: false, p5: false });
  assert.equal(s2.phase, 'propose');
  assert.equal(s2.leader, 1);
  assert.equal(s2.rejects, 1);
});

test('5 lần bác liên tiếp thì phe Ác thắng ngay', () => {
  const s = fixedGame();
  for (let i = 0; i < 5; i++) {
    const lead = s.players[s.leader].id;
    toVote(s, [lead, s.players[(s.leader + 1) % 5].id]);
    voteAll(s, { p1: false, p2: false, p3: false, p4: false, p5: false });
    if (i < 4) assert.equal(s.phase, 'propose');
  }
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'evil');
  assert.equal(s.endReason, 'rejects');
});

test('nhiệm vụ: Thiện bắt buộc Thành công; 0 lần thất bại thì thành công', () => {
  const s = fixedGame();
  toVote(s, ['p1', 'p2']);
  voteAll(s, { p1: true, p2: true, p3: true, p4: true, p5: true });
  assert.equal(E.applyQuest(s, 'p1', 'fail').ok, false); /* p1 là Merlin (Thiện) */
  questAll(s, { p1: 'success', p2: 'success' });
  assert.equal(s.quests[0].result, 'success');
  assert.equal(s.questNo, 1);
  assert.equal(s.phase, 'propose');
});

test('nhiệm vụ: 1 lần thất bại (ngưỡng 1) thì hỏng; Ác được chọn Thất bại', () => {
  const s = fixedGame();
  toVote(s, ['p1', 'p4']); /* p4 là Sát thủ (Ác) */
  voteAll(s, { p1: true, p2: true, p3: true, p4: true, p5: true });
  questAll(s, { p1: 'success', p4: 'fail' });
  assert.equal(s.quests[0].fails, 1);
  assert.equal(s.quests[0].result, 'fail');
});

test('nhiệm vụ 4 ở 7 người: 1 lần thất bại vẫn thành công, 2 lần mới hỏng', () => {
  const roles7 = ['merlin', 'percival', 'servant', 'servant', 'assassin', 'morgana', 'mordred'];
  const s = fixedGame(P7, roles7);
  assert.equal(s.failsNeeded[3], 2);
  /* thắng 3 nhiệm vụ đầu cho nhanh: nhiệm vụ 1–3 toàn Thiện thành công */
  for (let qi = 0; qi < 3; qi++) {
    const lead = s.players[s.leader].id;
    const team = goodIds(s).slice(0, s.questSizes[qi]);
    toVote(s, team);
    voteAll(s, Object.fromEntries(s.players.map(p => [p.id, true])));
    questAll(s, Object.fromEntries(team.map(id => [id, 'success'])));
    if (qi < 2) assert.equal(s.questNo, qi + 1);
  }
  /* tới nhiệm vụ 4 (cần 2 lần thất bại): đội có 2 Ác, chỉ 1 phá → vẫn thành công */
  assert.equal(s.phase, 'assassin'); /* Thiện đã thắng 3 nhiệm vụ → sang pha ám sát */
  assert.equal(s.questNo, 2); /* questNo vẫn chỉ nhiệm vụ vừa xong (index 2) */
  /* ván khác: kiểm tra riêng nhiệm vụ 4 với 1 lần thất bại */
  const s2 = fixedGame(P7, roles7);
  s2.questNo = 3; s2.quests[0].result = 'success'; s2.quests[1].result = 'success'; s2.quests[2].result = 'fail';
  s2.leader = 0; s2.phase = 'propose';
  toVote(s2, ['p1', 'p2', 'p3', 'p5']); /* p5 Sát thủ (Ác), còn lại Thiện */
  voteAll(s2, Object.fromEntries(s2.players.map(p => [p.id, true])));
  questAll(s2, { p1: 'success', p2: 'success', p3: 'success', p5: 'fail' });
  assert.equal(s2.quests[3].fails, 1);
  assert.equal(s2.quests[3].result, 'success');
});

test('Thiện thắng 3 nhiệm vụ → pha ám sát; Sát thủ đoán đúng Merlin thì Ác lật kèo', () => {
  const s = fixedGame();
  for (let qi = 0; qi < 3; qi++) {
    const team = goodIds(s).slice(0, s.questSizes[qi]);
    toVote(s, team);
    voteAll(s, Object.fromEntries(s.players.map(p => [p.id, true])));
    questAll(s, Object.fromEntries(team.map(id => [id, 'success'])));
  }
  assert.equal(s.phase, 'assassin');
  const assassin = s.players.find(p => p.role === 'assassin').id;
  assert.equal(E.applyAssassin(s, 'p1', 'p2').ok, false); /* không phải Sát thủ */
  const r = E.applyAssassin(s, assassin, 'p1'); /* p1 là Merlin */
  assert.ok(r.ok);
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'evil');
  assert.equal(s.endReason, 'assassin');
});

test('Sát thủ đoán sai Merlin thì phe Thiện thắng', () => {
  const s = fixedGame();
  for (let qi = 0; qi < 3; qi++) {
    const team = goodIds(s).slice(0, s.questSizes[qi]);
    toVote(s, team);
    voteAll(s, Object.fromEntries(s.players.map(p => [p.id, true])));
    questAll(s, Object.fromEntries(team.map(id => [id, 'success'])));
  }
  const assassin = s.players.find(p => p.role === 'assassin').id;
  E.applyAssassin(s, assassin, 'p2'); /* p2 là Percival, không phải Merlin */
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'good');
  assert.equal(s.endReason, 'assassin-wrong');
});

test('Ác phá hỏng 3 nhiệm vụ thì thắng ngay, không qua pha ám sát', () => {
  const s = fixedGame();
  for (let qi = 0; qi < 3; qi++) {
    const team = [evilIds(s)[0], ...goodIds(s)].slice(0, s.questSizes[qi]);
    toVote(s, team);
    voteAll(s, Object.fromEntries(s.players.map(p => [p.id, true])));
    const picks = {};
    for (const id of team) picks[id] = evilIds(s).includes(id) ? 'fail' : 'success';
    questAll(s, picks);
  }
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'evil');
  assert.equal(s.endReason, 'quests');
});

test('kiến thức: Merlin thấy Ác trừ Mordred; Percival thấy Merlin+Morgana; Oberon không thấy ai; Hiệp sĩ không thấy gì', () => {
  const roles7 = ['merlin', 'percival', 'servant', 'servant', 'assassin', 'morgana', 'mordred'];
  const s = fixedGame(P7, roles7);
  const merlinView = E.viewFor(s, 'p1');
  assert.deepEqual(merlinView.knownEvil.sort(), ['p5', 'p6'].sort()); /* Sát thủ, Morgana — không có Mordred p7 */
  assert.equal(merlinView.myRole, 'merlin');
  const percivalView = E.viewFor(s, 'p2');
  assert.deepEqual(percivalView.merlinCandidates.sort(), ['p1', 'p6'].sort());
  const servantView = E.viewFor(s, 'p3');
  assert.deepEqual(servantView.knownEvil, []);
  const assassinView = E.viewFor(s, 'p5');
  assert.deepEqual(assassinView.knownEvil.sort(), ['p6', 'p7'].sort()); /* Morgana + Mordred, không có mình */
  /* Oberon (9 người): không thấy ai, không ai thấy mình */
  const P9 = [...P7, P('p8', 'Tám'), P('p9', 'Chín')];
  const roles9 = ['merlin', 'percival', 'servant', 'servant', 'servant', 'servant', 'assassin', 'morgana', 'oberon'];
  const s9 = fixedGame(P9, roles9);
  const oberonView = E.viewFor(s9, 'p9');
  assert.deepEqual(oberonView.knownEvil, []);
  const ass9View = E.viewFor(s9, 'p7');
  assert.deepEqual(ass9View.knownEvil, ['p8']); /* chỉ thấy Morgana, không thấy Oberon */
  const merlin9View = E.viewFor(s9, 'p1');
  assert.deepEqual(merlin9View.knownEvil.sort(), ['p7', 'p8', 'p9'].sort()); /* Merlin VẪN thấy Oberon */
});

test('viewFor không lộ vai người khác: players không có role/side, roles chỉ hiện khi kết thúc', () => {
  const s = fixedGame();
  const v = E.viewFor(s, 'p1');
  assert.ok(!('role' in v.players[0]) && !('side' in v.players[0]));
  assert.equal(v.roles, null);
  assert.equal(v.myRole, 'merlin');
  s.phase = 'ended'; s.winner = 'good'; s.winnerIds = goodIds(s);
  const v2 = E.viewFor(s, 'p1');
  assert.equal(v2.roles.p1, 'merlin');
  assert.equal(v2.roles.p4, 'assassin');
});

test('xin thua: phe của người xin thua thua luôn', () => {
  const s = fixedGame();
  const r = E.applyResign(s, 'p1');
  assert.ok(r.ok);
  assert.equal(s.winner, 'evil');
  assert.equal(s.endReason, 'resign');
  const s2 = fixedGame();
  E.applyResign(s2, 'p4');
  assert.equal(s2.winner, 'good');
});

test('view ám sát: chỉ Sát thủ thấy mình là Sát thủ + danh sách mục tiêu; người khác không biết ai là Sát thủ', () => {
  const s = fixedGame();
  const ass = s.players.find(p => p.role === 'assassin').id; /* p4 */
  const vAss = E.viewFor(s, ass);
  assert.equal(vAss.iAmAssassin, true);
  assert.deepEqual(vAss.assassinTargets.sort(), ['p1', 'p2', 'p3'].sort()); /* Thiện + không tính mình/Morgana */
  const vMerlin = E.viewFor(s, 'p1');
  assert.equal(vMerlin.iAmAssassin, false);
  assert.deepEqual(vMerlin.assassinTargets, []);
  assert.equal(vMerlin.players[3].role, undefined); /* không lộ vai Sát thủ */
  /* Oberon (9 người) nằm trong danh sách mục tiêu vì Sát thủ không biết Oberon là Ác */
  const P9 = [...P7, P('p8', 'Tám'), P('p9', 'Chín')];
  const roles9 = ['merlin', 'percival', 'servant', 'servant', 'servant', 'servant', 'assassin', 'morgana', 'oberon'];
  const s9 = fixedGame(P9, roles9);
  const vAss9 = E.viewFor(s9, 'p7');
  assert.ok(vAss9.assassinTargets.includes('p9'), 'Oberon phải nằm trong mục tiêu đoán');
  assert.ok(!vAss9.assassinTargets.includes('p8'), 'Morgana (Ác đã biết) không nằm trong mục tiêu');
});

test('serialize/deserialize giữ nguyên trạng thái; hành động sai bị từ chối', () => {
  const s = fixedGame();
  toVote(s, ['p1', 'p2']);
  voteAll(s, { p1: true, p2: true, p3: true, p4: true, p5: true });
  const s2 = E.deserialize(E.serialize(s));
  assert.equal(E.serialize(s), E.serialize(s2));
  assert.equal(E.applyVote(s2, 'p1', true).ok, false); /* đã qua pha bỏ phiếu */
  assert.equal(E.applyQuest(s2, 'p3', 'success').ok, false); /* p3 không trong đội */
  assert.throws(() => E.deserialize('{"x":1}'), /không hợp lệ/);
});

test('bot ra hành động hợp lệ ở mọi pha (cả 2 cấp độ)', () => {
  for (const level of ['easy', 'hard']) {
    const s = fixedGame();
    /* đưa ván tới pha quest: lặp đề xuất + bỏ phiếu cho tới khi đội được duyệt */
    let guard = 0;
    while (s.phase !== 'quest' && s.phase !== 'ended' && guard++ < 10) {
      const lead = s.players[s.leader].id;
      const a1 = botAction(s, lead, { level });
      assert.ok(a1 && a1.type === 'propose' && a1.team.length === s.questSizes[s.questNo], `bot propose ${level}: ${JSON.stringify(a1)}`);
      const r1 = E.applyAction(s, lead, a1);
      assert.ok(r1.ok, `propose ${level}: ${r1.reason}`);
      for (const p of s.players) {
        if (s.phase !== 'vote') break;
        const a = botAction(s, p.id, { level });
        assert.ok(a && a.type === 'vote', `bot vote ${level} ${p.id}: ${JSON.stringify(a)}`);
        const r = E.applyAction(s, p.id, a);
        assert.ok(r.ok, `vote ${level} ${p.id}: ${r.reason}`);
      }
    }
    assert.equal(s.phase, 'quest', `bot ${level} không vào được pha quest`);
    /* pha quest: bot trong đội */
    const team = s.quests[s.questNo].team;
    for (const id of team) {
      const a = botAction(s, id, { level });
      assert.ok(a && a.type === 'quest' && (a.choice === 'success' || a.choice === 'fail'), `bot quest ${level} ${id}`);
      const r = E.applyAction(s, id, a);
      assert.ok(r.ok, `quest ${level} ${id}: ${r.reason}`);
    }
    /* pha assassin nếu tới: bot Sát thủ */
    if (s.phase === 'assassin') {
      const ass = s.players.find(p => p.role === 'assassin').id;
      const a = botAction(s, ass, { level });
      assert.ok(a && a.type === 'assassin' && a.target, `bot assassin ${level}`);
    }
  }
});

console.log(`\n${pass} test luật đạt.`);
