// 🔗 Nối từ – giao diện. Luật ở engine.js, máy ở bot.js, phòng/mạng dùng shared/net/simplenet.js. Kho từ: words.txt (Hồ Ngọc Đức, GPL – xem credits/).
import { makeNet } from '../../shared/net/simplenet.js?v=49';
import { DEF } from './def.js?v=16';
import * as E from './engine.js?v=16';
import { botAction } from './bot.js?v=16';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';
import { API } from '../../shared/net/api.js?v=27';
import { humanToken } from '../../shared/ui/turnstile.js?v=1';
/* 🗳️ Từ vừa được cả bàn bỏ phiếu nhận: báo lên máy chủ để vào kho từ chờ duyệt (POST /noitu/voted kèm mã Turnstile) */
let votedKey = '';
async function reportVoted(w, yes, no) {
  const k = w + '|' + yes + '|' + no; if (k === votedKey) return; votedKey = k;
  try { const ts = await humanToken('noitu'); await fetch(API() + '/noitu/voted', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ w, yes, no, ts }), signal: AbortSignal.timeout(10000) }); } catch (e) {}
}
import { openNews, newsBadge } from '../../shared/ui/news.js?v=176';

{ const get = f => fetch(f).then(r => (r.ok ? r.text() : '')).catch(() => ''); const [a, b, c, d] = await Promise.all([get('words.txt?v=4'), get('words-wikt.txt?v=2'), get('words-gumballz.txt?v=1'), get('words-uts.txt?v=1')]); E.setDict((a + '\n' + b + '\n' + c + '\n' + d).split('\n')); } /* + kho từ cộng đồng: từ cả bàn bỏ phiếu nhận và máy chủ đã kiểm trên web là có thật (GET /noitu/words) */
fetch(API() + '/noitu/words', { signal: AbortSignal.timeout(8000) }).then(r => r.json()).then(j => j && j.ok && E.addWords(j.words)).catch(() => {}); /* hai kho từ: Hồ Ngọc Đức (GPL) + tên mục từ Wiktionary tiếng Việt (CC BY-SA) */ /* máy nào làm chủ phòng (hoặc chơi với máy) mới cần kho từ để chấm; tải sẵn cho gọn */
const NET = makeNet(DEF);
const LV = { 1: 'Dễ', 2: 'Vừa', 3: 'Khó' };
let sound = ls.get('noitu-sound') !== '0', endShown = null, dl = 0, total = 1, lastTO = 0, ac = null;
function beep(kind) {
  if (!sound) return;
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    const notes = { ok: [[660, 0, .07], [880, .07, .1]], miss: [[220, 0, .18], [165, .14, .22]], tick: [[1100, 0, .03]], end: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1047, .36, .3]] }[kind] || [];
    for (const [f, at, len] of notes) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(.1, t + at + .012); g.gain.exponentialRampToValueAtTime(.0001, t + at + len); o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + len + .03); }
  } catch (e) {}
}
const wordHTML = w => { const p = String(w || '').split(' '), b = p.pop(); return `${esc(p.join(' '))} <i>${esc(b || '')}</i>`; }; /* tiếng cuối (để nối tiếp) tô màu – Tự do có thể là cả câu */
$('#hero').innerHTML = '<div class="demo"><b>gà <i>mái</i></b>→<b>mái <i>nhà</i></b>→<b>nhà <i>cửa</i></b></div>';
// ---------- phòng chờ ----------
function renderLobby(info, ui) {
  const o = info.opts, dis = ui.isHost ? '' : 'disabled', n = info.players.length, seg = (k, list) => `<div class="seg">${list.map(([v, nm]) => `<button type="button" data-opt="${k}" data-v="${v}" aria-pressed="${o[k] === v}" ${dis}>${nm}</button>`).join('')}</div>`;
  $('#pcount').textContent = `${n}/8 người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' <small>· máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && n < 8 ? `<div class="row-btns"><button class="btn" id="btn-addbot">+ Thêm máy</button></div>` : '';
  $('#opts').innerHTML = `<div class="opt"><b>⏱️ Thời gian mỗi lượt</b>${seg('time', [[15, '15 giây'], [20, '20 giây'], [30, '30 giây']])}</div>
    <div class="opt"><b>❤️ Số mạng</b>${seg('lives', [[2, '2'], [3, '3'], [5, '5']])}<small>Hết giờ hoặc chịu thua lượt thì mất 1 mạng. Hết mạng là bị loại.</small></div>
    <div class="opt"><b>🎤 Kiểu chơi</b>${seg('free', [[0, '📖 Từ điển'], [1, '🎤 Tự do (freestyle)']])}<small>${o.free ? 'Tự do: nối cả cụm từ hoặc câu (tối đa 12 tiếng), bắt đầu bằng tiếng cuối của câu trước. Câu nào không có sẵn trong từ điển thì cả bàn bỏ phiếu nhận hay không.' : 'Từ điển: từ phải có trong từ điển, từ lạ thì cả bàn bỏ phiếu.'}</small></div>
    <div class="opt"><b>🤖 Sức máy</b>${seg('level', [[1, 'Dễ'], [2, 'Vừa'], [3, 'Khó']])}<small>Chỉ dùng khi có máy trong bàn.</small></div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none'; $('#btn-start').disabled = n < 2; $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return; const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm); else if (b.id === 'btn-addbot') h.addBot(); else if (b.dataset.opt) h.setOpt(b.dataset.opt, +b.dataset.v);
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start();
// ---------- ván chơi ----------
const nameOf = (v, id) => { const p = v.players.find(x => x.id === id); return p ? esc(cleanName(p.name)) : '?'; };
function draw(v, fresh) {
  const me = ui.myId, ended = v.phase === 'ended', myTurn = !v.spec && v.cur === me && !ended;
  const l0 = v.last; if (l0 && l0.t === 'ok' && l0.voted && l0.by === me) reportVoted(l0.word, l0.voted.yes, l0.voted.no); /* từ của mình vừa được cả bàn nhận thì báo lên máy chủ */
  $('#round').textContent = ended ? '🏁 Hết ván' : `🔗 Chuỗi thứ ${v.round}`;
  $('#seats').innerHTML = v.players.map(p => `<div class="seat${p.id === v.cur ? ' turn' : ''}${p.out ? ' out' : ''}${(v.away || []).includes(p.id) ? ' away' : ''}" data-pid="${p.id}">${avatar(p.name, 28)}<span class="nm">${esc(cleanName(p.name))}${p.id === me ? ' (bạn)' : ''}<small>${p.out ? 'bị loại' : '❤️'.repeat(p.lives)}</small></span></div>`).join('');
  const lastBy = v.chain.length ? v.chain[v.chain.length - 1].by : null;
  $('#card').innerHTML = `<span class="clk" id="clk"></span><div class="lbl">${ended ? 'Từ cuối cùng' : 'Nối tiếp từ này'}</div><div class="w${v.word.split(' ').length > 3 ? ' long' : ''}">${wordHTML(v.word)}</div><div class="who">${lastBy ? `${lastBy === me ? 'Bạn' : nameOf(v, lastBy)} vừa nối` : 'Từ mở đầu chuỗi'}</div><div class="bar"><i id="bar"></i></div>`;
  if (fresh) { $('#card').classList.remove('pop'); void $('#card').offsetWidth; $('#card').classList.add('pop'); }
  $('#chain').innerHTML = v.chain.map(c => `<span>${esc(c.w)}</span>`).join('<em>→</em>');
  let msg = '', acts = '';
  const l = v.last;
  const lastLine = !l ? '' : l.t === 'ok' ? (l.voted ? `🗳️ Cả bàn nhận từ "${esc(l.word)}" (${l.voted.yes} đồng ý · ${l.voted.no} không).` : '') : l.t === 'rej' ? `🗳️ Cả bàn không nhận "${esc(l.word)}" (${l.yes} đồng ý · ${l.no} không) – ${l.by === me ? 'bạn' : nameOf(v, l.by)} tìm từ khác nha.` : `${l.by === me ? 'Bạn' : nameOf(v, l.by)} ${l.why === 'time' ? 'hết giờ' : l.why === 'pass' ? 'chịu thua lượt' : l.why === 'dead' ? `bí vì từ "${esc(l.dead || '')}" không còn gì để nối` : 'trả lời sai'}, mất 1 mạng${l.out ? ' và bị loại' : ''}.${l.hint && l.why !== 'dead' ? ` <span class="hint">Lẽ ra nối được: ${esc(l.hint)}</span>` : ''}`;
  if (ended) { msg = v.winner === me ? '🎉 Bạn thắng – vua nối từ là đây!' : `${v.spec ? '🏆' : '😵'} ${nameOf(v, v.winner)} thắng!`; if (lastLine) msg += `<br><small>${lastLine}</small>`;
    acts = ui.isHost ? '<button class="btn pri" data-a="again">🔁 Ván nữa</button><button class="btn" data-a="lobby">Về phòng chờ</button>' : ''; }
  else if (v.phase === 'vote') { const V = v.vote, mine = V.by === me, can = V.vs.includes(me) && !V.done.includes(me);
    msg = `<div>🗳️ Từ điển chưa có "<span style="font-weight:900;color:var(--acc,#6d28d9)">${esc(V.w)}</span>" – ${mine ? 'đang hỏi cả bàn' : `${nameOf(v, V.by)} hỏi cả bàn`}: có từ này không?<br><small>${V.done.length}/${V.vs.length} người đã bấm · ai chưa bấm khi hết giờ thì không tính, hoà thì nhận</small></div>`;
    acts = can ? '<button class="btn pri" data-a="yes">✅ Có từ này</button><button class="btn" data-a="no">❌ Không có</button>' : ''; }
  else { msg = v.spec ? '<small>👀 Bạn đang xem.</small>' : myTurn ? `Tới lượt bạn – nối từ bắt đầu bằng "<b>${esc(v.need)}</b>"` : `<small>Chờ ${nameOf(v, v.cur)} nối…</small>`;
    if (lastLine) msg += `<br><small>${lastLine}</small>`;
    acts = myTurn ? '<button class="btn" data-a="pass">🙈 Chịu, bí rồi</button>' : ''; }
  $('#msg').innerHTML = msg; $('#acts').innerHTML = acts;
  $('#pre').textContent = v.need + ' '; { const fr = !!(v.opts && v.opts.free); $('#inp').maxLength = fr ? 80 : 24; $('#inp').placeholder = fr ? 'gõ tiếp cụm từ / câu của bạn…' : 'gõ tiếng thứ hai…'; } $('#say').classList.toggle('off', !myTurn || v.phase === 'vote'); $('#say').style.display = ended || v.spec || v.phase === 'vote' ? 'none' : '';
  if (fresh && !myTurn) $('#inp').value = '';
  if (myTurn && fresh) { $('#inp').value = ''; if (matchMedia('(pointer:fine)').matches) $('#inp').focus(); }
  tickClock();
}
/* đồng hồ lượt: chủ phòng báo còn bao nhiêu ms; về 0 thì bất kỳ ai trong bàn cũng báo "hết giờ" (engine tự kiểm lại) */
function tickClock() {
  const v = ui.view; if (!v) return; const on = (v.phase === 'play' || v.phase === 'vote') && v.left >= 0, left = on ? Math.max(0, dl - performance.now()) : 0, sec = Math.ceil(left / 1000), c = $('#clk'), b = $('#bar');
  if (c) { c.textContent = on ? sec : ''; c.style.display = on ? '' : 'none'; c.classList.toggle('low', on && sec <= 5); } if (b) b.style.width = on ? Math.min(100, left / total * 100) + '%' : '0';
  if (on && left <= 0 && !v.spec && performance.now() - lastTO > 1500) { lastTO = performance.now(); ui.act({ type: 'timeout' }); }
  if (on && sec <= 5 && sec > 0 && v.cur === ui.myId && tickClock.s !== v.seq + ':' + sec) { tickClock.s = v.seq + ':' + sec; beep('tick'); }
}
setInterval(tickClock, 200);
function render(v, prev) {
  const fresh = !prev || prev.gid !== v.gid || prev.seq !== v.seq;
  if (v.left >= 0 && fresh) { dl = performance.now() + v.left; total = v.phase === 'vote' ? E.VOTE_MS : Math.max(v.opts.time * 1000, v.left); }
  if (fresh && prev && prev.gid === v.gid && v.last && v.last !== prev.last && JSON.stringify(v.last) !== JSON.stringify(prev.last)) beep(v.last.t === 'ok' ? 'ok' : 'miss');
  /* từ được cả bàn nhận: máy chủ phòng tự ghi vào kho từ chờ duyệt (SrvRoom.ntSeen, 18/11/2026) – máy người chơi không gửi nữa */
  draw(v, fresh);
  if (v.phase === 'ended') { if (endShown !== v.gid) { endShown = v.gid; beep('end'); } } else endShown = null;
}
$('#say').addEventListener('submit', e => {
  e.preventDefault(); const v = ui.view; if (!v || v.spec || v.cur !== ui.myId || v.phase !== 'play') return;
  let t = E.norm($('#inp').value); if (!t) return; if (v.opts && v.opts.free) { if (t.split(' ')[0] !== v.need || t.split(' ').length === 1) t = v.need + ' ' + t; } else if (t.split(' ').length === 1) t = v.need + ' ' + t; /* chỉ gõ tiếng thứ hai cũng được; Tự do: gõ phần còn lại của câu */
  ui.act({ type: 'word', text: t }); $('#inp').select();
});
$('#acts').addEventListener('click', e => {
  const b = e.target.closest('button'), v = ui.view; if (!b || !v) return; const a = b.dataset.a;
  if (a === 'yes' || a === 'no') ui.act({ type: 'vote', ok: a === 'yes' }); else if (a === 'pass') ui.act({ type: 'pass' }); else if (a === 'again' && ui.isHost) ui.net.raw.start(); else if (a === 'lobby' && ui.isHost) ui.net.raw.restart();
});
function openGuide() {
  ui.openModal(`<div class="guide"><h2>📖 Cách chơi Nối từ</h2>
    <p><b>Mục tiêu:</b> là người cuối cùng còn mạng.</p>
    <ul><li>Mỗi từ có <b>đúng 2 tiếng</b>. Từ của bạn phải <b>bắt đầu bằng tiếng cuối</b> của từ trước: <i>gà <b>mái</b></i> → <i><b>mái</b> nhà</i> → <i>nhà cửa</i>…</li>
    <li>Tiếng đầu đã điền sẵn, bạn chỉ cần gõ tiếng thứ hai rồi bấm <b>Nối</b>.</li>
    <li>Từ đã dùng trong ván thì không được dùng lại.</li>
    <li><b>Hết giờ</b> hoặc bấm <b>Chịu, bí rồi</b> thì mất 1 mạng, bàn mở chuỗi mới.</li>
    <li>Đưa ra từ <b>khó nối</b> là đòn hiểm: người kế vẫn được thử (từ lạ thì cả bàn bỏ phiếu), không nghĩ ra kịp thì mất mạng.</li>
    <li>Game chấm theo từ điển hơn ${Math.floor(E.dictSize() / 1000)}.000 từ. Từ nào từ điển chưa có (như <i>tỏi phi</i>) thì <b>cả bàn bỏ phiếu</b>: đồng ý nhiều hơn hoặc hoà là nhận. Từ được nhận sẽ được máy chủ tìm trên web, có thật thì thêm hẳn vào từ điển cho mọi người. Chơi với máy thì game tự nhận nếu cả hai tiếng là tiếng có thật.</li></ul>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('noitu-sound', sound ? '1' : '0'); drawSound(); beep('ok'); };
$('#btn-news-home').onclick = () => openNews('noitu'); newsBadge($('#btn-news-home'), 'noitu');
const ui = gameKit({ game: 'noitu', net: NET, onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); }, onState: (v, prev) => { if (v) render(v, prev); else endShown = null; }, offline: h => { h.addBot(); h.addBot(); } });
