// 🎧 Đoán Nhạc (Songless) – giao diện. Luật ở engine.js, danh sách bài ở songs.js (mã bài Apple Music), phòng/mạng dùng shared/net/simplenet.js.
// Nhạc: phát từ đầu bài qua khung SoundCloud (ẩn khi đoán), bài không có trên SoundCloud thì bản nghe thử 30 giây của Apple – web không lưu file nhạc nào.
import { makeNet } from '../../shared/net/simplenet.js?v=53';
import { DEF } from './def.js?v=1';
import * as E from './engine.js?v=1';
import { START } from './daily.js?v=1';
import { vnDay, dayNo, drawCard, shareText, history } from './daily-ui.js?v=1';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=16';
import { confirmBox } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet(DEF);
import { API } from '../../shared/net/api.js?v=29';
let OFFIDS = [];
fetch(API() + '/doannhac/off').then(r => r.json()).then(j => { if (j && j.ok) { E.setOff(j.off, j.src); OFFIDS = j.off.map(String); } }).catch(() => {}); /* bài anh đã xoá */
const PACKN = { mix: '🎲 Trộn hết', ...E.PACKS };
const TOTAL = E.STAGES[E.STAGES.length - 1];

// ---------- nhạc ----------
// 1) SoundCloud (anh dặn 25/11/2026: nghe TỪ ĐẦU BÀI như Songless) – khung phát SoundCloud ẩn khi đoán, hiện ra khi lật đáp án (ghi công người đăng).
// 2) Bài không có trên SoundCloud: bản nghe thử 30 giây của Apple (Apple tự cắt đoạn, thường là điệp khúc).
const meta = new Map(); /* mã bài Apple → { url, art, link } */
async function lookup(tr) {
  if (!tr || typeof tr.id !== 'number') return null;
  if (meta.has(tr.id)) return meta.get(tr.id);
  const p = fetch(`https://itunes.apple.com/lookup?id=${tr.id}&country=${tr.cc || 'VN'}`).then(r => r.json()).then(j => { const x = j.results && j.results[0]; if (!x || !x.previewUrl) throw 0; return { url: x.previewUrl, art: (x.artworkUrl100 || '').replace('100x100', '300x300'), link: x.trackViewUrl || '' }; })
    .catch(() => { meta.delete(tr.id); return null; });
  meta.set(tr.id, p); return p;
}
const au = new Audio(); au.preload = 'auto';
let playT = 0, playStart = 0, playLen = 0, curId = 0, vol = +(ls.get('db-vol') || 0.8);
au.volume = vol;
let SCW = null, scReady = null, scUrl = '', scStopAt = 0, scWait = false, scT = 0, scPos = 0, scPosAt = 0, scPrime = false;
const scBad = new Set();
const scApi = () => window.SC && window.SC.Widget ? Promise.resolve(window.SC) : (scApi.p = scApi.p || new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://w.soundcloud.com/player/api.js'; s.onload = () => ok(window.SC); s.onerror = () => { scApi.p = null; no(); }; document.head.appendChild(s); }));
const scSrc = (path, vis) => 'https://w.soundcloud.com/player/?url=' + encodeURIComponent('https://soundcloud.com' + path) + `&auto_play=false&hide_related=true&show_comments=false&show_reposts=false&show_teaser=false&visual=false&sharing=false&buying=false&download=false&show_user=${vis ? 'true' : 'false'}&show_artwork=${vis ? 'true' : 'false'}&color=%23ff7a45`;
async function scLoad(path) {
  try { await scApi(); } catch (e) { return false; }
  if (scUrl === path && scReady) return scReady;
  let box = document.getElementById('scbox'); if (!box) { box = document.createElement('div'); box.id = 'scbox'; box.setAttribute('aria-hidden', 'true'); document.body.appendChild(box); }
  scUrl = path; box.innerHTML = `<iframe allow="autoplay; encrypted-media" title="SoundCloud" width="300" height="120" src="${scSrc(path, false)}"></iframe>`;
  const w = SC.Widget(box.firstChild); SCW = w;
  /* nạp sẵn: phát im lặng một chút rồi dừng về 0 cho trình duyệt tải trước – bấm ▶ là có tiếng liền */
  const unprime = () => { if (!scPrime) return; scPrime = false; try { w.pause(); w.seekTo(0); w.setVolume(Math.round(vol * 100)); } catch (e) {} };
  scReady = new Promise(ok => { w.bind(SC.Widget.Events.READY, () => { scPrime = true; try { w.setVolume(0); w.play(); } catch (e) {} setTimeout(unprime, 4000); ok(true); }); w.bind(SC.Widget.Events.ERROR, () => { scBad.add(path); ok(false); }); setTimeout(() => ok(false), 10000); });
  w.bind(SC.Widget.Events.PLAY_PROGRESS, e => {
    if (scPrime) { if (e.currentPosition > 250) unprime(); return; }
    scPos = e.currentPosition; scPosAt = performance.now();
    if (scWait && e.currentPosition > 0) { scWait = false; clearTimeout(scT); drawBar(); } /* thanh chạy theo tiếng thật, không theo lúc bấm */
    if (scStopAt && e.currentPosition >= scStopAt) { w.pause(); scStopAt = 0; playLen = 0; drawBar(); }
  });
  return scReady;
}
const useSC = tr => tr && tr.sc && !scBad.has(tr.sc);
async function load(tr) { if (!tr) return; if (useSC(tr)) { scLoad(tr.sc); return; } const m = await lookup(tr); if (m && curId !== tr.id) { curId = tr.id; au.src = m.url; au.load(); } return m; }
async function play(tr, sec) {
  stop();
  if (useSC(tr) && await scLoad(tr.sc)) {
    scPrime = false; playLen = sec; scStopAt = sec * 1000; scWait = true; scPos = 0; scPosAt = performance.now(); playStart = performance.now();
    SCW.setVolume(Math.round(vol * 100)); SCW.seekTo(0); SCW.play();
    scT = setTimeout(() => { if (scWait) { scWait = false; scStopAt = 0; playLen = 0; drawBar(); ui.toast('Bấm ▶ lần nữa để nghe nha.'); } }, 6000);
    playT = setTimeout(() => { try { SCW.pause(); } catch (e) {} playLen = 0; drawBar(); }, sec * 1000 + 6000); /* phòng khi không có sự kiện tiến độ */
    drawBar(); return;
  }
  const m = await load(tr); if (!m) { ui.toast('Chưa tải được bài này – kiểm tra mạng rồi bấm lại nha.'); return; }
  scWait = true; drawBar(); try { au.currentTime = 0; await au.play(); } catch (e) { scWait = false; ui.toast('Bấm ▶ lần nữa để nghe nha.'); return; } scWait = false;
  playStart = performance.now(); playLen = sec; drawBar(); playT = setTimeout(() => { au.pause(); playLen = 0; drawBar(); }, sec * 1000);
}
function stop() { clearTimeout(playT); clearTimeout(scT); scStopAt = 0; scWait = false; try { au.pause(); } catch (e) {} try { SCW && SCW.pause(); } catch (e) {} playLen = 0; }
/* lật đáp án: bài SoundCloud thì hiện khung SoundCloud (ghi công người đăng), bài Apple thì ảnh bìa + link Apple Music */
function revealMedia(v) {
  const box = $('#rmedia'); if (!box) return;
  if (useSC(v.tr)) { box.innerHTML = `<iframe class="scvis" allow="autoplay; encrypted-media" title="SoundCloud" height="166" src="${scSrc(v.tr.sc, true)}"></iframe>`; return; }
  lookup(v.tr).then(x => { if (!x) return; const a = $('#art'); if (a && x.art) { a.src = x.art; a.hidden = false; } const l = $('#alink'); if (l && x.link) { l.href = x.link; l.hidden = false; } });
}
function drawBar() {
  const v = ui.view, bar = $('#sbar'); if (!bar || !v) return;
  const k = v.me ? v.me.k : 0, rev = v.phase === 'rev', unl = rev ? TOTAL : E.STAGES[k];
  const pos = !playLen || scWait ? 0 : Math.min(playLen, useSC(v.tr) ? scPos / 1000 + Math.min(0.3, (performance.now() - scPosAt) / 1000) : au.currentTime || 0);
  const pb = $('#playb'); if (pb) pb.classList.toggle('ld', !!(playLen && scWait)); /* đang tải tiếng: nút quay vòng */
  bar.querySelector('.unl').style.width = (unl / TOTAL * 100) + '%';
  bar.querySelector('.pos').style.width = (pos / TOTAL * 100) + '%';
  const tp = $('#tpos'); if (tp) tp.textContent = '0:' + String(Math.floor(pos)).padStart(2, '0');
  if (playLen) requestAnimationFrame(drawBar);
}

// ---------- phòng chờ ----------
function renderLobby(info, ui) {
  const o = info.opts, dis = ui.isHost ? '' : 'disabled', seg = (k, list) => `<div class="seg">${list.map(([v, nm]) => `<button type="button" data-opt="${k}" data-v="${v}" aria-pressed="${o[k] === v}" ${dis}>${nm}</button>`).join('')}</div>`;
  $('#pcount').textContent = `${info.players.length} người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected === false ? 'off' : ''}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' <small>· máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="chip" data-rm="${p.id}" aria-label="Mời ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && info.players.length < NET.MAX ? '<div class="row-btns"><button class="btn" id="btn-addbot">+ Thêm máy</button></div>' : '';
  $('#opts').innerHTML = `<div class="opt"><b>🎵 Gói nhạc</b>${seg('pack', Object.entries(PACKN).map(([k, n]) => [k, `${n} <small>(${E.packOf(k).length})</small>`]))}</div>
    <div class="opt"><b>🔁 Số bài</b>${seg('rounds', [[5, '5'], [8, '8'], [12, '12']])}</div>
    <div class="opt"><b>⏱️ Thời gian mỗi bài</b>${seg('t', [[30, '30 giây'], [45, '45 giây'], [60, '60 giây']])}</div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none';
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return; const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot();
  else if (b.dataset.opt) { const k = b.dataset.opt, v = k === 'pack' ? b.dataset.v : +b.dataset.v; h.setOpt(k, v); try { ls.set('db-opts', JSON.stringify({ ...h.opts, [k]: v })); } catch (x) {} }
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start({ day: '', off: OFFIDS });

// ---------- ván chơi ----------
let skew = 0, toSent = '', shown = '', lastTick = 0;
const left = v => v.deadline ? (v.deadline - (Date.now() + skew)) / 1000 : null;
const segs = () => E.STAGES.map((x, i) => `<i style="left:${(x / TOTAL * 100).toFixed(2)}%"></i>`).join('');
function render(v, prev) {
  skew = (v.now || Date.now()) - Date.now();
  if (v.tr) { const x = E.SONGS.find(z => String(z.id) === String(v.tr.id)); if (x) v.tr.sc = x.sc || null; } /* nguồn anh đổi ở Quản trị áp trên máy mình */
  const me = v.players.find(p => p.id === ui.myId);
  $('#round').textContent = v.opts.day ? `${DPN(v.opts.dpk || 'mix')} · #${dayNo(v.opts.day, START)}` : v.phase === 'ended' ? '🏁 Hết ván' : v.i < 0 ? 'Chuẩn bị…' : `Bài ${v.i + 1}/${v.total}`;
  $('#myscore').innerHTML = v.opts.day ? '' : me ? `<b>${me.pts}</b> điểm` : '<small>đang xem</small>';
  $('#board').innerHTML = v.players.length > 1 ? v.players.slice().sort((a, b) => b.pts - a.pts).map(p => `<div class="pl${p.done ? ' done' : ''}" data-pid="${p.id}">${avatar(p.name, 28)}<span>${esc(cleanName(p.name))}</span><b>${p.pts}</b>${p.last ? `<i>${p.last.ok ? `✅ ${E.STAGES[p.last.k]}s` : '❌'}</i>` : v.phase === 'q' ? `<i>${p.done ? '✔' : '🎧'}</i>` : ''}</div>`).join('') : '';
  const st = $('#stage'), acts = $('#acts'), key = `${v.gid}|${v.i}|${v.phase}|${v.me ? v.me.k + ':' + v.me.done : ''}`;
  if (v.tr && v.phase === 'q') load(v.tr);
  if (v.opts.day && (v.phase === 'rev' || v.phase === 'ended')) { if (shown !== 'day|' + v.gid) { shown = 'day|' + v.gid; renderDay(v, prev); } return; }
  if (v.phase === 'ended') {
    stop();
    if (shown !== key) {
      const w = v.players.filter(p => v.winners.includes(p.id));
      st.innerHTML = `<div class="endc"><h2>${v.players.length > 1 && w.length ? `🏆 ${w.map(p => esc(cleanName(p.name))).join(', ')} thắng!` : `🏁 Đoán đúng ${me ? me.ok : 0}/${v.total} bài`}</h2>${me ? `<p>Bạn được <b>${me.pts}</b> điểm</p>` : ''}<ol class="songs">${v.list.map(s => `<li><b>${esc(s.t)}</b> <small>${esc(s.a)}</small></li>`).join('')}</ol></div>`;
      acts.innerHTML = ui.isHost ? '<button class="btn big pri" data-a="again">🔁 Chơi lại</button><button class="btn" data-a="lobby">Về phòng chờ</button>' : '<p class="wait">Chờ chủ phòng mở ván mới…</p>';
    }
    shown = key; return;
  }
  if (v.phase === 'intro') { st.innerHTML = `<div class="intro"><h2>🎧 Đeo tai nghe nha!</h2><p>Nghe vài giây đầu rồi đoán tên bài</p><b id="cd"></b></div>`; acts.innerHTML = ''; shown = key; return; }
  if (shown === key) { drawBar(); return; }
  const rev = v.phase === 'rev', m = v.me, k = m ? m.k : 0;
  if (rev) { /* lật đáp án kiểu Songless (anh dặn 26/11/2026): BÀI HÁT LÀ… · Đoán ra sau / Trung bình · phân bố mọi người với bài này · khung phát · Chia sẻ / Tiếp */
    const s = v.song, val = dayVal(m), solo = v.players.length === 1;
    st.innerHTML = `<div class="rv"><small class="dk">BÀI HÁT LÀ</small><h2>${esc(s.t)} <span>– ${esc(s.a)}</span></h2></div>${m ? `<p class="res ${m.ok ? 'ok' : 'no'}">${emoBar(val, m.tries)}${me && me.last && me.last.p ? ` · +${me.last.p}` : ''}</p><div id="dcard"></div>` : ''}<div id="rmedia"></div><img class="art" id="art" alt="" hidden><a id="alink" class="alink" target="_blank" rel="noopener" hidden>Nghe trên Apple Music ↗</a>`;
    revealMedia(v);
    if (m) songCard($('#dcard'), s.id, val);
    const last = v.i + 1 >= v.total;
    acts.innerHTML = `<div class="row"><button class="btn" data-a="sshare">📤 Chia sẻ</button>${ui.isHost ? `<button class="btn pri nx" data-a="next">${last ? '🏁 Kết quả' : 'Tiếp ▶'}</button>` : `<button class="btn" data-a="playrev">▶ Nghe lại</button>`}</div>${solo || ui.isHost ? '' : '<p class="wait">Chờ chủ phòng sang bài tiếp…</p>'}`;
    if (prev && prev.phase === 'q') play(v.tr, TOTAL);
  } else {
    const done = m && m.done;
    /* giao diện kiểu Songless (anh dặn 26/11/2026): 6 ô đoán · thanh thời gian chia nấc · nút phát tròn · ô tìm bài có gợi ý · Bỏ qua / Gửi */
    st.innerHTML = `${slots(m, false)}<div class="tl"><div class="sbar" id="sbar"><span class="unl"></span><span class="pos"></span>${segs()}</div><div class="tlt"><span id="tpos">0:00</span><span>0:${String(TOTAL).padStart(2, '0')}</span></div></div>
      <div class="player"><button class="playb" id="playb" aria-label="Phát ${E.STAGES[k]} giây">▶</button><p class="hint">Đang mở <b>${E.STAGES[k]} giây</b> · đúng bây giờ được <b>${E.PTS[k]}</b> điểm</p></div>`;
    acts.innerHTML = done ? `<p class="res ${m.ok ? 'ok' : 'no'}">${m.ok ? `✅ Đúng rồi! (${E.STAGES[k]} giây)` : '🏳️ Chịu bài này'}</p>${v.players.length > 1 ? '<p class="wait">Chờ mọi người…</p>' : ''}`
      : m ? `<form class="gf" id="gf" autocomplete="off"><div class="sw"><span class="sic" aria-hidden="true">🔍</span><input id="gin" maxlength="${E.MAXLEN}" placeholder="Biết bài này? Gõ tên bài hoặc ca sĩ…" enterkeyhint="send" spellcheck="false" aria-label="Tên bài hát" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="sug"><ul class="sug" id="sug" role="listbox" hidden></ul></div>
        <div class="sb"><button class="btn skip" type="button" data-a="more">${k < E.STAGES.length - 1 ? `Bỏ qua (+${E.STAGES[k + 1] - E.STAGES[k]}s)` : 'Bỏ qua'}</button><button class="btn give" type="button" data-a="give" title="Chịu thua bài này">🏳️</button><button class="btn pri send" type="submit">Gửi</button></div></form>` : '<p class="wait">Đang xem…</p>';
    if (prev && (prev.i !== v.i || prev.phase !== 'q')) { stop(); setTimeout(() => $('#gin') && $('#gin').focus({ preventScroll: true }), 50); }
  }
  shown = key; drawBar();
}
/* 6 ô đoán kiểu Songless: sai ✗ (đỏ) · bỏ qua (xám) · đúng (xanh) · ô đang tới viền sáng */
function slots(m, rev) {
  const tries = m ? m.tries : [], n = E.STAGES.length;
  return `<ol class="slots">${Array.from({ length: n }, (_, i) => {
    const t = tries[i]; let cls = '', txt = '';
    if (m && m.ok && i === m.k) { cls = 'ok'; txt = '✓ Đúng rồi'; }
    else if (t != null) { cls = t ? 'no' : 'sk'; txt = t ? '✗ ' + esc(t) : '⏭ Bỏ qua'; }
    else if (!rev && m && !m.done && i === m.k) cls = 'cur';
    return `<li class="${cls}"><span>${txt}</span><small>${E.STAGES[i]}s</small></li>`;
  }).join('')}</ol>`;
}
/* gợi ý tên bài (thay datalist – điện thoại hiển thị tốt hơn) */
let sugList = [], sugI = -1;
function suggest(q) {
  const box = $('#sug'), inp = $('#gin'); if (!box || !inp) return;
  const f = E.fold(q); sugI = -1;
  if (f.length < 2) { box.hidden = true; inp.setAttribute('aria-expanded', 'false'); return; }
  const pk = ui.view && ui.view.opts ? (ui.view.opts.day ? 'mix' : ui.view.opts.pack) : 'mix';
  sugList = E.packOf(pk).map(i => E.SONGS[i]).filter(s => E.fold([s.t, s.a, ...(s.alt || [])].join(' ')).includes(f) || (s.t + ' ' + s.a).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 30);
  box.innerHTML = sugList.map((s, i) => `<li role="option" data-i="${i}"><b>${esc(s.t)}</b><small>${esc(s.a)}${s.alt ? ' · ' + esc(s.alt[0]) : ''}</small></li>`).join('');
  box.hidden = !sugList.length; inp.setAttribute('aria-expanded', String(!!sugList.length));
}
function pickSug(i) { const s = sugList[i], inp = $('#gin'); if (!s || !inp) return; inp.value = `${s.t} – ${s.a}`; $('#sug').hidden = true; }
document.addEventListener('input', e => { if (e.target.id === 'gin') suggest(e.target.value); });
document.addEventListener('keydown', e => {
  if (e.target.id !== 'gin') return; const box = $('#sug'); if (!box || box.hidden) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sugI = (sugI + (e.key === 'ArrowDown' ? 1 : -1) + sugList.length) % sugList.length; box.querySelectorAll('li').forEach((li, i) => li.classList.toggle('on', i === sugI)); }
  else if (e.key === 'Enter' && sugI >= 0) { e.preventDefault(); pickSug(sugI); }
  else if (e.key === 'Escape') box.hidden = true;
});
/* chạm để chọn bằng click (không phải pointerdown) – kéo ngón tay trên danh sách là cuộn, không bị chọn nhầm / đóng mất (anh báo 26/11/2026) */
document.addEventListener('pointerdown', e => { if (e.target.closest('#sug')) { if (e.pointerType === 'mouse') e.preventDefault(); return; } if (!e.target.closest('#gin')) { const b = $('#sug'); if (b) b.hidden = true; } });
document.addEventListener('click', e => { const li = e.target.closest('#sug li'); if (li) { pickSug(+li.dataset.i); } });
// ---------- 📅 Bài hôm nay ----------
const BK = [...E.STAGES.map((x, i) => ({ label: x + 's', of: v => v === i })), { label: 'X', of: v => v === E.STAGES.length, x: true }];
const dayVal = m => m && m.ok ? m.k : E.STAGES.length;
const emoBar = (v, tries) => E.STAGES.map((x, i) => i < v ? (tries[i] ? '🟥' : '⬛') : i === v ? '🟩' : '⬜').join('') + (v >= E.STAGES.length ? ' ❌' : '');
const DG = pk => 'dn-' + pk; /* mỗi thể loại một bảng điểm riêng (anh dặn 26/11/2026: làm lại từ hôm nay, kiểu Songless) */
const DPN = pk => pk === 'mix' ? '🎲 Tổng hợp' : PACKN[pk] || pk;
function dayCard(el, day, v, pk) {
  drawCard(el, { g: DG(pk), day, v, buckets: BK, mainLabel: 'Kết quả', main: x => x >= E.STAGES.length ? 'X' : E.STAGES[x] + 's',
    avg: list => { const ok = list.filter(x => x < E.STAGES.length); return ok.length ? ok.reduce((a, x) => a + E.STAGES[x], 0) / ok.length : null; }, avgFmt: a => (Math.round(a * 10) / 10).toLocaleString('vi-VN') + 's',
    sentence: (pct, x) => x >= E.STAGES.length ? `Bạn và ${pct}% người khác chưa đoán ra bài hôm nay` : `${pct}% người khác cũng đoán ra sau ${E.STAGES[x]} giây` });
}
const songKey = id => { let h = 5381; for (const ch of String(id)) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return 's' + h.toString(36); };
function songCard(el, id, v) {
  drawCard(el, { g: 'dnsong', day: songKey(id), song: true, v, buckets: BK, mainLabel: 'Đoán ra sau', main: x => x >= E.STAGES.length ? 'X' : E.STAGES[x] + 's',
    avg: list => { const ok = list.filter(x => x < E.STAGES.length); return ok.length ? ok.reduce((a, x) => a + E.STAGES[x], 0) / ok.length : null; }, avgFmt: a => (Math.round(a * 10) / 10).toLocaleString('vi-VN') + 's',
    sentence: (pct, x) => x >= E.STAGES.length ? `Bạn và ${pct}% người khác chưa đoán ra bài này` : `${pct}% người khác cũng đoán ra sau ${E.STAGES[x]} giây` });
}
function renderDay(v, prev) {
  const s = v.song, m = v.me, val = dayVal(m), no = dayNo(v.opts.day, START), pk = v.opts.dpk || 'mix';
  $('#round').textContent = `${DPN(pk)} · #${no}`; $('#myscore').innerHTML = ''; $('#board').innerHTML = '';
  $('#stage').innerHTML = `<div class="rv"><small class="dk">BÀI HÔM NAY LÀ</small><h2>${esc(s.t)} <span>– ${esc(s.a)}</span></h2></div><p class="res ${m && m.ok ? 'ok' : 'no'}">${emoBar(val, m ? m.tries : [])}</p><div id="dcard"></div><div id="rmedia"></div><img class="art" id="art" alt="" hidden><a id="alink" class="alink" target="_blank" rel="noopener" hidden>Nghe trên Apple Music ↗</a>`;
  revealMedia(v);
  dayCard($('#dcard'), v.opts.day, val, pk); drawDayBtn();
  const left = E.DPACKS.filter(k => !(v.opts.day in history(DG(k))) && k !== pk).length;
  $('#acts').innerHTML = `<div class="row"><button class="btn" data-a="dshare">📤 Chia sẻ</button><button class="btn pri nx" data-a="dnext">${left ? `Thể loại khác ▶` : 'Chơi tiếp ▶'}</button></div>`;
  if (prev && prev.phase === 'q') play(v.tr, TOTAL);
}
function dayShare(day, val, tries, pk) {
  const t = `Đoán Nhạc ${DPN(pk).replace(/^\S+\s/, '')} #${dayNo(day, START)} 🎧 ${val >= E.STAGES.length ? 'X' : E.STAGES[val] + 's'}/${TOTAL}s\n${emoBar(val, tries || [])}\ngumballzgames.vercel.app/doannhac/`;
  shareText(t).then(r => r === 'copy' && ui.toast('Đã chép kết quả – dán cho bạn bè nha 📋'));
}
function startSolo(extra) { if (ui.closeModal) ui.closeModal(); if (ui.net) ui.leave(); const h = ui.startHost(true, true); h.start(extra); }
/* 📅 chọn thể loại kiểu Songless: mỗi ô một bài hôm nay, chơi rồi thì hiện kết quả */
function startDay() {
  const day = vnDay(), no = dayNo(day, START);
  ui.openModal(`<div class="guide dpk"><h2>📅 Bài hôm nay #${no}</h2><p>Mỗi thể loại một bài – cả web đoán chung, mai đổi bài mới.</p><div class="dgrid">${E.DPACKS.map(k => { const h = history(DG(k)), done = day in h, v = h[day];
    return `<button class="dcell${done ? ' done' : ''}" data-dpk="${k}"><b>${esc(DPN(k))}</b><small>${done ? (v >= E.STAGES.length ? '❌ chưa ra' : `✅ ${E.STAGES[v]} giây`) : '▶ Chơi'}</small></button>`; }).join('')}</div><div id="dcard2"></div>
    <div class="btns"><button class="btn" id="m-more">🎯 Chơi nhiều bài</button><button class="btn" id="m-close">Đóng</button></div></div>`);
  $('#m-close').onclick = ui.closeModal;
  $('#m-more').onclick = () => { let o = {}; try { o = JSON.parse(ls.get('db-opts') || '{}'); } catch (e) {} startSolo({ day: '', pack: E.optOk('pack', o.pack) ? o.pack : 'mix', rounds: 8, t: 45 }); };
  document.querySelectorAll('[data-dpk]').forEach(b => b.onclick = () => {
    const k = b.dataset.dpk, h = history(DG(k));
    if (!(day in h)) return startSolo({ day, dpk: k });
    const box = $('#dcard2'); box.innerHTML = `<div class="btns"><button class="btn" id="m-share">📤 Chia sẻ ${esc(DPN(k))}</button></div><div id="dcard3"></div>`;
    dayCard($('#dcard3'), day, h[day], k); $('#m-share').onclick = () => dayShare(day, h[day], null, k);
  });
}
function drawDayBtn() { const b = $('#btn-day'); if (!b) return; const day = vnDay(), n = E.DPACKS.filter(k => day in history(DG(k))).length; b.innerHTML = `📅 Bài hôm nay <small>#${dayNo(day, START)} · ${n}/${E.DPACKS.length} thể loại</small>`; }
drawDayBtn(); setInterval(drawDayBtn, 60000);
$('#btn-day').onclick = startDay;
$('#stage').addEventListener('click', e => { const v = ui.view; if (e.target.closest('#playb') && v && v.tr && v.me) play(v.tr, E.STAGES[v.me.k]); });
$('#acts').addEventListener('click', e => {
  const b = e.target.closest('button[data-a]'), v = ui.view; if (!b || !v) return; const a = b.dataset.a;
  if (a === 'again') ui.net.raw.start({ day: '', off: OFFIDS }); else if (a === 'lobby') ui.net.raw.restart();
  else if (a === 'playrev') play(v.tr, TOTAL);
  else if (a === 'next') { stop(); ui.act({ type: 'next' }); }
  else if (a === 'sshare') { const val = dayVal(v.me); shareText(`Đoán Nhạc 🎧 ${v.song ? v.song.t + ' – ' + v.song.a : ''}: ${val >= E.STAGES.length ? 'X' : E.STAGES[val] + 's'}\n${emoBar(val, v.me ? v.me.tries : [])}\ngumballzgames.vercel.app/doannhac/`).then(r => r === 'copy' && ui.toast('Đã chép kết quả 📋')); }
  else if (a === 'dshare') dayShare(v.opts.day, dayVal(v.me), v.me && v.me.tries, v.opts.dpk || 'mix');
  else if (a === 'dnext') { stop(); startDay(); }
  else if (a === 'more' || a === 'give') { ui.act({ type: a }); if (a === 'more' && v.me && v.me.k < E.STAGES.length - 1) setTimeout(() => play(v.tr, E.STAGES[v.me.k + 1]), 120); }
});
$('#acts').addEventListener('submit', e => {
  e.preventDefault(); const v = ui.view, inp = $('#gin'); if (!v || !inp) return; const w = inp.value.trim(); if (!w) return;
  ui.act({ type: 'guess', text: w }); inp.value = '';
});
setInterval(() => {
  const v = ui.view; if (!v || !ui.net || v.phase === 'ended' || !v.deadline) return;
  const t = left(v), s = Math.ceil(t), bar = $('#tbar i');
  if (bar) { const tot = v.phase === 'q' ? v.t : v.phase === 'intro' ? E.INTRO_T : Math.max(E.REV_T, t); bar.style.transform = `scaleX(${Math.max(0, Math.min(1, t / tot))})`; bar.parentNode.dataset.ph = v.phase; }
  const cd = $('#cd'); if (cd) cd.textContent = s > 0 ? s : '🎵';
  if (t <= -0.5 && toSent !== v.gid + ':' + v.seq) { toSent = v.gid + ':' + v.seq; ui.act({ type: 'timeout' }); }
}, 200);
$('#hostbar').addEventListener('click', async e => { const b = e.target.closest('[data-h]'); if (b && ui.isHost && await confirmBox('Kết thúc ván và xem kết quả nhé?', { title: '🏁 Kết thúc?', ok: 'Kết thúc', cancel: 'Chơi tiếp' })) ui.act({ type: 'end' }); });
function openGuide() {
  ui.openModal(`<div class="guide"><h2>📖 Cách chơi Đoán Nhạc</h2>
    <p>Bấm <b>▶</b> nghe 1 giây đầu của bài hát rồi gõ tên bài. Đoán sai hoặc bấm <b>Nghe thêm</b> thì được nghe dài hơn: 1 → 2 → 4 → 7 → 11 → 16 giây.</p>
    <ul><li>Đúng càng sớm càng nhiều điểm: 100 · 80 · 60 · 40 · 25 · 15.</li><li>Gõ không dấu cũng được, sai một chữ vẫn tính. Ô gõ có gợi ý tên bài.</li><li><b>📅 Bài hôm nay</b>: cả web đoán chung một bài mỗi ngày, xong thì xem mình so với mọi người.</li><li>🎯 Chơi một mình: 8 bài liền theo gói nhạc bạn chọn.</li></ul>
    <p class="src">Nhạc phát thẳng từ SoundCloud (từ đầu bài) hoặc bản nghe thử chính thức của Apple Music – GumballZ không lưu file nhạc nào. Lật đáp án là thấy khung phát / link để nghe trọn bài và ủng hộ nghệ sĩ.</p>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawVol = () => { $('#btn-sound').textContent = vol > 0 ? '🔊' : '🔇'; }; drawVol();
/* 🔊 âm lượng bài hát (anh dặn 26/11/2026): bấm loa mở thanh kéo, kéo tới đâu nghe tới đó */
const setVol = v => { vol = Math.max(0, Math.min(1, v)); au.volume = vol; try { SCW && SCW.setVolume(Math.round(vol * 100)); } catch (e) {} ls.set('db-vol', String(vol)); drawVol(); $('#vol').value = Math.round(vol * 100); $('#volv').textContent = Math.round(vol * 100) + '%'; };
$('#btn-sound').onclick = e => { e.stopPropagation(); const b = $('#volbox'); b.hidden = !b.hidden; setVol(vol); };
$('#vol').oninput = e => setVol(+e.target.value / 100);
document.addEventListener('click', e => { if (!e.target.closest('#volbox, #btn-sound')) $('#volbox').hidden = true; });
$('#btn-solo').onclick = () => { let o = {}; try { o = JSON.parse(ls.get('db-opts') || '{}'); } catch (e) {} startSolo({ day: '', pack: E.optOk('pack', o.pack) ? o.pack : 'mix', rounds: E.optOk('rounds', o.rounds) ? o.rounds : 8, t: 45 }); };

const ui = gameKit({
  game: 'doannhac', net: NET,
  offline: h => { for (let i = 0; i < 2; i++) h.addBot(); },
  onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); },
  onState: (v, prev) => { if (v) { render(v, prev); $('#hostbar').innerHTML = ui.isHost && v.phase !== 'ended' && !v.opts.day ? '<button class="chip" data-h="end">🏁 Kết thúc ván</button>' : ''; } else { shown = ''; stop(); } },
});
