// 🀄 Mậu Binh – giao diện. Luật ở engine.js, bot ở bot.js, bài ở cards.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Liêng / Cờ Đam:
// chủ phòng giữ state, khách chỉ gửi action). Tiền cược (xu) lấy từ ví chung
// (shared/ui/wallet.js): mỗi chi 5 xu, hết ván tự trừ/cộng phần chênh lệch
// điểm chi vào ví — engine chỉ ghi điểm chi, không đụng ví.
import { createGame, applyAction, viewFor, actors, OPT_CHOICES, MIN_PLAYERS, MAX_PLAYERS, evaluateRows } from './engine.js?v=1';
import { botAction, bestArrangement } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import { cardHTML } from './cards.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=14';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=9';
import { balance, spend, addXu } from '../../shared/ui/wallet.js?v=7';

const NET = makeNet({
  game: 'maubinh', min: MIN_PLAYERS, max: MAX_PLAYERS, maxSeats: MAX_PLAYERS + 6,
  minMsg: 'Mậu Binh cần 2–4 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: { chi: 5, maxPlayers: 4, timer: 0 },
  optOk: (k, v) => (OPT_CHOICES[k] || []).includes(v),
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 1200 + Math.random() * 1500,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu'],
  allowLocal: true,
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
let aiCount = 3; /* đấu máy: tổng số người (mình + máy) */
const modeBtns = [...document.querySelectorAll('[data-mode]')];
const countBtns = [...document.querySelectorAll('#count-seg [data-count]')];
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#fld-count').style.display = (m === 'ai-easy' || m === 'ai-hard') ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  try { localStorage.setItem('gumballz-maubinh-mode', m); } catch (e) {}
}
function setCount(n) {
  aiCount = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, +n || 3));
  countBtns.forEach(b => { b.classList.toggle('on', +b.dataset.count === aiCount); b.setAttribute('aria-pressed', +b.dataset.count === aiCount); });
  try { localStorage.setItem('gumballz-maubinh-count', String(aiCount)); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
countBtns.forEach(b => b.addEventListener('click', () => setCount(+b.dataset.count)));
try {
  const sm = localStorage.getItem('gumballz-maubinh-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
  const sc = +localStorage.getItem('gumballz-maubinh-count');
  setCount(sc >= 2 && sc <= 4 ? sc : 3);
} catch (e) { setMode('ai-hard'); setCount(3); }

/* ---------- ví xu (hiện số dư ở màn hình chính + trong ván) ---------- */
function drawWallet() {
  const b = balance();
  const h = $('#wallet-bal'); if (h) h.textContent = b.toLocaleString('vi-VN');
  const g = $('#wallet-bal-game'); if (g) g.textContent = b.toLocaleString('vi-VN');
}
drawWallet();
try { addEventListener('gumballz-wallet', drawWallet); } catch (e) {}

/* ---------- phòng chờ ---------- */
let lastLobby = null;
function renderLobby(info, ui) {
  lastLobby = info;
  const ps = info.players || [];
  $('#pcount').textContent = `${ps.length}/${MAX_PLAYERS} người`;
  $('#plist').innerHTML = ps.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  const o = info.opts || {};
  const maxP = o.maxPlayers || MAX_PLAYERS;
  $('#add-box').innerHTML = !ui.isHost ? '' : (ps.length < maxP
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : `<p class="note">Phòng đã đủ ${maxP} người (mức tối đa chủ phòng đã chọn).</p>`);
  const dis = ui.isHost ? '' : 'disabled';
  $('#opts').innerHTML = `<div class="opt"><b>💰 Cược mỗi chi</b><div class="seg">${[[0, '🆓 Chơi vui (0 xu)'], [5, '5 xu'], [10, '10 xu']].map(([v, n]) => `<button type="button" data-chi="${v}" aria-pressed="${+o.chi === v}" ${dis}>${n}</button>`).join('')}</div><small>Thắng 1 chi được ${o.chi || 0} xu, thua 1 chi mất từng ấy — trừ/cộng thẳng vào ví chung khi hết ván. Thua nhiều hơn số xu đang có thì chỉ trừ tới hết ví.</small></div>
  <div class="opt"><b>👥 Số người tối đa</b><div class="seg">${[2, 3, 4].map(v => `<button type="button" data-maxp="${v}" aria-pressed="${maxP === v}" ${dis}>${v}</button>`).join('')}</div><small>Phòng đủ số này thì không thêm được người nữa.</small></div>
  <div class="opt"><b>⏱️ Đồng hồ xếp bài</b><div class="seg">${[[0, 'Tắt'], [30, '30 giây'], [60, '60 giây']].map(([v, n]) => `<button type="button" data-timer="${v}" aria-pressed="${+o.timer === v}" ${dis}>${n}</button>`).join('')}</div><small>Hết giờ mà chưa xếp xong thì game tự xếp giúp bạn (xếp theo cách thắng nhiều chi nhất).</small></div>`;
  const bal = balance();
  $('#wallet-note').innerHTML = `🪙 Ví của bạn: <b>${bal.toLocaleString('vi-VN')} xu</b>${o.chi > 0 ? ` — mỗi ván tối đa thắng/thua ${3 * (MAX_PLAYERS - 1) * o.chi} xu (3 chi × ${MAX_PLAYERS - 1} đối thủ).` : ''}`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = ps.length < MIN_PLAYERS || ps.length > maxP;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.net.raw;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
  else if (b.id === 'btn-addlocal') {
    const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt ai người đó cầm máy xếp bài.', { title: '👥 Tên người chơi cùng máy', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
  else if (b.dataset.chi && ui.isHost) h.setOpt('chi', +b.dataset.chi);
  else if (b.dataset.maxp && ui.isHost) h.setOpt('maxPlayers', +b.dataset.maxp);
  else if (b.dataset.timer && ui.isHost) h.setOpt('timer', +b.dataset.timer);
});
$('#btn-start-online').onclick = () => {
  if (!ui.isHost) return;
  const n = (lastLobby && lastLobby.players || []).length, maxP = (lastLobby && lastLobby.opts && lastLobby.opts.maxPlayers) || MAX_PLAYERS;
  if (n > maxP) { tip(`Phòng đang có ${n} người, vượt tối đa ${maxP} — mời bớt 1 người ra đã.`); return; }
  ui.net.raw.start();
};
/* chế độ local: mở phòng offline trên máy này; đấu máy thì thêm máy sẵn theo số người đã chọn */
$('#btn-start').onclick = () => {
  ui.startHost(true);
};

/* ---------- ví xu trong ván: trừ/cộng chênh lệch điểm chi khi hết ván ---------- */
const settledGids = new Set();
function maybeSettle(v) {
  if (!v || v.phase !== 'ended' || settledGids.has(v.gid)) return;
  settledGids.add(v.gid);
  if (!(v.chi > 0)) return; /* chơi vui: điểm chỉ để tính thắng thua, ví không đụng tới */
  let net = 0;
  for (const p of v.players) {
    if (!ui.controls(p.id) || !p.res) continue;
    const d = p.res.delta || 0;
    if (d > 0) { addXu(d); net += d; }
    else if (d < 0) { const pay = Math.min(balance(), -d); if (pay > 0) { spend(pay); net -= pay; } }
  }
  drawWallet();
  if (net !== 0 && mode !== 'pvp') tip(net > 0 ? `🪙 +${net.toLocaleString('vi-VN')} xu vào ví!` : `🪙 −${(-net).toLocaleString('vi-VN')} xu từ ví.`);
}

/* ---------- đồng hồ xếp bài (mỗi máy tự chạy cho người mình điều khiển) ---------- */
let arrangeInt = null, arrangeDeadline = 0, arrangeDeadlineGid = '';
function stopArrangeTimer() { if (arrangeInt) { clearInterval(arrangeInt); arrangeInt = null; } arrangeDeadline = 0; arrangeDeadlineGid = ''; }
function drawArrangeTimer() {
  const left = Math.max(0, Math.ceil((arrangeDeadline - Date.now()) / 1000));
  const el = $('#timer-left'); if (el) el.textContent = left;
  const chip = $('#timer-chip'); if (chip) chip.classList.toggle('low', left <= 10);
}
function autoArrange(pid) {
  const pv = viewForPlayer(pid);
  const p = pv && pv.you;
  if (!p || p.arranged || !p.cards) return;
  if (p.special) { ui.actAs(pid, { type: 'special' }); tip(`${cleanName(pv.players.find(x => x.id === pid)?.name || 'bạn')} có bài đặc biệt — game tự nhận giúp bạn.`); return; }
  const rows = bestArrangement(p.cards);
  ui.actAs(pid, { type: 'arrange', rows: { top: rows.top.map(c => c.id), mid: rows.mid.map(c => c.id), bot: rows.bot.map(c => c.id) } });
  tip('Hết giờ — game tự xếp bài giúp bạn.');
}
function maybeStartArrangeTimer(v) {
  if (!v || v.phase !== 'arrange' || !v.timer) { stopArrangeTimer(); return; }
  if (arrangeDeadlineGid === v.gid && arrangeInt) { drawArrangeTimer(); return; }
  stopArrangeTimer();
  arrangeDeadlineGid = v.gid;
  arrangeDeadline = Date.now() + v.timer * 1000;
  arrangeInt = setInterval(() => {
    drawArrangeTimer();
    if (Date.now() < arrangeDeadline) return;
    stopArrangeTimer();
    const s = cur;
    if (!s || s.phase !== 'arrange') return;
    for (const p of s.players) if (!p.arranged && ui.controls(p.id)) autoArrange(p.id);
  }, 250);
}

/* ---------- chuyền tay: xếp bài của từng người trên máy này ---------- */
const rawState = () => (ui.net && ui.net.raw && ui.net.raw.state) || null;
/* ảnh chụp ván của 1 người chơi cùng máy (chỉ chủ phòng giữ state gốc) */
const viewForPlayer = pid => {
  if (!pid) return null;
  if (pid === (cur && cur.me)) return cur;
  const s = rawState();
  return s ? viewFor(s, pid) : null;
};
const hasLocals = v => (v.players || []).some(p => p.local);
const arrangeQueue = v => (v.players || []).filter(p => !p.arranged && ui.controls(p.id)).map(p => p.id);
/* trạng thái xếp bài trên máy này (khay + 3 chi đang xếp dở) */
let arrangeLocal = null; /* {gid, pid, tray:[id], top:[id], mid:[id], bot:[id], active, sel} */
let peekPid = null; /* ghế đang mở bài xếp (chuyền tay) — đổi người thì che lại */
function ensureArrangeLocal(v, pid) {
  const pv = viewForPlayer(pid);
  if (!pv || !pv.you || !pv.you.cards) return null;
  if (!arrangeLocal || arrangeLocal.gid !== v.gid || arrangeLocal.pid !== pid) {
    arrangeLocal = { gid: v.gid, pid, tray: pv.you.cards.map(c => c.id), top: [], mid: [], bot: [], active: 'bot', sel: null };
  }
  return arrangeLocal;
}
const cardMapOf = pv => { const m = new Map(); for (const c of (pv.you.cards || [])) m.set(c.id, c); return m; };
const ROW_CAP = { top: 3, mid: 5, bot: 5 };
const ROW_NAME = { top: 'Đầu', mid: 'Giữa', bot: 'Cuối' };

/* ---------- ván chơi ---------- */
let cur = null, endShownGid = null, lastLogN = 0;
const unit = v => (v.chi > 0 ? 'xu' : 'điểm');

function seatHTML(v, p) {
  const won = v.phase === 'ended' && (v.winnerIds || []).includes(p.id);
  const sc = v.phase === 'ended' && p.res ? p.res.score : null;
  return `<div class="seat${p.arranged ? ' done' : ''}">${avatar(p.name, 40)}<b>${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}</b>
    ${v.phase === 'ended' ? `<span class="score${sc < 0 ? ' neg' : ''}">${sc > 0 ? '+' : ''}${sc} chi</span>` : p.arranged ? '<span class="ok-tag">✅ đã xếp</span>' : '<span class="wait-tag">🤔 đang xếp…</span>'}
    ${won ? '<span class="ok-tag">🏆 Thắng</span>' : ''}
    <small>${p.isBot ? 'máy ' + (p.level === 'easy' ? 'Dễ' : 'Khó') : p.local ? 'cùng máy' : ''}</small></div>`;
}
function rowCardsHTML(cards, mini = true) {
  if (!cards || !cards.length) return '';
  return cards.map(c => cardHTML(c, mini ? 'mini' : '')).join('');
}
function rowWLT(v, pid, rowKey) {
  /* thắng/thua chi này trước các đối thủ (chỉ dùng khi hết ván) */
  const me = (v.players || []).find(p => p.id === pid);
  if (!me || !me.res || !me.res.vs) return '';
  const k = rowKey === 'top' ? 0 : rowKey === 'mid' ? 1 : 2;
  let w = 0, l = 0;
  for (const chis of Object.values(me.res.vs)) { if (chis[k] === 1) w++; else if (chis[k] === -1) l++; }
  if (!w && !l) return 'hòa';
  return `<span class="chi-w">✓${w}</span> · <span class="chi-l">✗${l}</span>`;
}
function showdownHTML(v) {
  return `<div class="showdown">${v.players.map(p => {
    const res = p.res || {};
    const won = (v.winnerIds || []).includes(p.id);
    const badge = res.special ? `🌟 ${esc(res.specialLabel || 'Bài đặc biệt')}` : res.foul ? '<span class="sd-badge foul">💥 Binh lủng!</span>' : '';
    const score = res.score != null ? `<span class="sd-score${res.score < 0 ? ' neg' : ''}">${res.score > 0 ? '+' : ''}${res.score} chi${v.chi > 0 ? ` · ${res.delta > 0 ? '+' : ''}${res.delta} xu` : ''}</span>` : '';
    let body = '';
    if (res.special) {
      body = `<p style="margin:8px 0 0;font-weight:800">🌟 ${esc(res.specialLabel || 'Bài đặc biệt')} — thắng cả 3 chi trước mỗi đối thủ!</p>`;
    } else if (p.rows) {
      const ev = res.evals || {};
      body = ['top', 'mid', 'bot'].map(k => `<div class="sd-row"><span class="sd-name">${k === 'top' ? 'Đầu' : k === 'mid' ? 'Giữa' : 'Cuối'}</span><div class="sd-cards">${rowCardsHTML(p.rows[k])}</div><div class="sd-eval">${esc((ev[k] || {}).label || '')}<br>${rowWLT(v, p.id, k)}</div></div>`).join('');
      if (res.foul) body += `<p style="margin:8px 0 0;font-weight:800;color:#b3232a">💥 Binh lủng — 3 chi xếp ngược, thua cả 3 chi trước mọi người!</p>`;
    }
    return `<div class="sd-player${won ? ' win' : ''}"><div class="sd-head"><b>${avatar(p.name, 28)} ${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${won ? ' 🏆' : ''}</b><span class="sd-badge">${badge}</span>${score}</div>${body}</div>`;
  }).join('')}</div>`;
}

function renderArrangeArea(v) {
  const area = $('#game-area');
  const queue = arrangeQueue(v);
  const pid = queue[0] || null;
  if (!pid) {
    /* mình xếp xong hết rồi — chờ người khác / máy */
    const done = v.players.filter(p => p.arranged).length;
    area.innerHTML = `<div class="waiting-box"><p>✅ Bạn đã xếp xong!</p><p>Đang chờ ${esc(v.players.filter(p => !p.arranged).map(p => cleanName(p.name)).join(', ') || '…')} xếp bài… (${done}/${v.players.length} người đã xong)</p><p>🤖 Máy xếp xong là lật bài ngay.</p></div>`;
    $('#game-actions').innerHTML = '';
    return;
  }
  const pv = viewForPlayer(pid);
  if (!pv || !pv.you) { area.innerHTML = `<div class="waiting-box"><p>Đang tải bài…</p></div>`; return; }
  const p = v.players.find(x => x.id === pid) || {};
  const myName = cleanName(p.name || 'bạn');
  /* chuyền tay: che bài cho tới khi người tới lượt bấm xem */
  if (hasLocals(v) && pid !== v.me && peekPid !== pid) {
    area.innerHTML = `<div class="waiting-box"><p>📱 Tới lượt <b>${esc(myName)}</b> xếp bài — đưa máy cho ${esc(myName)} rồi bấm xem bài.</p><button class="btn big pri" id="btn-peek">👁 Xem bài của ${esc(myName)}</button></div>`;
    const pk = $('#btn-peek');
    if (pk) pk.onclick = () => { peekPid = pid; Snd.deal(); render(cur, null); };
    $('#game-actions').innerHTML = '';
    return;
  }
  const al = ensureArrangeLocal(v, pid);
  if (!al) { area.innerHTML = `<div class="waiting-box"><p>Đang tải bài…</p></div>`; return; }
  const cmap = cardMapOf(pv);
  const placed = [...al.top, ...al.mid, ...al.bot];
  const trayCards = al.tray.filter(id => !placed.includes(id)).map(id => cmap.get(id)).filter(Boolean);
  const rows = { top: al.top.map(id => cmap.get(id)).filter(Boolean), mid: al.mid.map(id => cmap.get(id)).filter(Boolean), bot: al.bot.map(id => cmap.get(id)).filter(Boolean) };
  const ev = evaluateRows(rows.top.length || rows.mid.length || rows.bot.length ? { top: rows.top, mid: rows.mid, bot: rows.bot } : null);
  const full = placed.length === 13;
  const foul = full && ev && ev.foul;
  const special = pv.you.special;
  area.innerHTML = `
    ${special ? `<div class="special-banner"><b>🌟 Bài đặc biệt: ${esc(special.label)}</b><p>Bài này thắng luôn cả 3 chi trước mỗi đối thủ — không cần xếp!</p><button class="btn big pri" id="btn-special">🎉 Nhận bài đặc biệt</button></div>` : ''}
    <div class="arrange-area">
      <h3>🀄 ${pid === v.me ? 'Xếp bài của bạn' : `Xếp bài của ${esc(myName)}`} — bấm 1 lá ở khay rồi bấm vào chi muốn đặt</h3>
      ${foul ? `<div class="foul-note">💥 Binh lủng! Chi trên đang mạnh hơn chi dưới — xếp lại đi, không là thua cả 3 chi đấy!</div>` : ''}
      ${['top', 'mid', 'bot'].map(k => {
        const list = rows[k];
        const label = list.length === ROW_CAP[k] ? (ev ? (k === 'top' ? ev.top.label : k === 'mid' ? ev.mid.label : ev.bot.label) : '') : `${list.length}/${ROW_CAP[k]} lá`;
        return `<div class="arr-row${al.active === k ? ' active' : ''}${foul && (k === 'top' || k === 'mid') ? ' foul-warn' : ''}" data-row="${k}">
          <div class="arr-head"><b>${k === 'top' ? '⬆️ Đầu' : k === 'mid' ? '➡️ Giữa' : '⬇️ Cuối'} (${ROW_CAP[k]} lá)</b><span class="eval${foul ? ' foul' : ''}">${esc(label)}</span></div>
          <div class="arr-cards">${list.map(c => cardHTML(c)).join('') || `<div class="slot-empty">Bấm lá bài ở khay rồi bấm vào đây</div>`}</div>
        </div>`;
      }).join('')}
      <div class="tray"><div class="tray-head">🎴 Khay bài — còn ${trayCards.length} lá chưa xếp</div><div class="tray-cards">${trayCards.map(c => cardHTML(c, al.sel === c.id ? 'sel' : '')).join('') || '<span style="font-weight:800;color:#2f9e63">Đã xếp hết 13 lá! Bấm “Xác nhận” nhé ✅</span>'}</div></div>
    </div>`;
  /* nút hành động */
  const ga = $('#game-actions');
  ga.innerHTML = `<button class="btn" id="act-auto">🤖 Xếp tự động</button>
    <button class="btn" id="act-clear">↩️ Trả hết về khay</button>
    <button class="btn pri" id="act-confirm" ${full && !foul ? '' : 'disabled'} title="${!full ? 'Xếp đủ 13 lá đã nhé' : foul ? 'Đang binh lủng — xếp lại cho 3 chi mạnh dần đã' : 'Xong! Gửi bài lên bàn'}">✅ Xác nhận xếp bài</button>`;
  /* tương tác: bấm lá ở khay → chọn; bấm chi → đặt lá đã chọn vào đó; bấm lá trong chi → trả về khay */
  area.querySelectorAll('.tray .pc').forEach(el => {
    el.onclick = () => {
      const id = el.dataset.id;
      al.sel = al.sel === id ? null : id;
      Snd.place();
      renderArrangeArea(v);
    };
  });
  area.querySelectorAll('.arr-row').forEach(rowEl => {
    rowEl.onclick = e => {
      const k = rowEl.dataset.row;
      const placedEl = e.target.closest('.pc');
      if (placedEl) {
        /* trả lá trong chi về khay */
        const id = placedEl.dataset.id;
        al[k] = al[k].filter(x => x !== id);
        if (al.sel === id) al.sel = null;
        Snd.place();
        renderArrangeArea(v);
        return;
      }
      if (al.sel) {
        if (al[k].length >= ROW_CAP[k]) { tip(`Chi ${ROW_NAME[k]} đã đủ ${ROW_CAP[k]} lá rồi.`); return; }
        al[k].push(al.sel);
        al.sel = null;
        Snd.place();
        renderArrangeArea(v);
        return;
      }
      al.active = k;
      renderArrangeArea(v);
    };
  });
  const sp = $('#btn-special');
  if (sp) sp.onclick = () => { Snd.arrange(); ui.actAs(pid, { type: 'special' }); peekPid = null; };
  $('#act-auto').onclick = () => {
    const rowsBest = bestArrangement(pv.you.cards);
    al.top = rowsBest.top.map(c => c.id); al.mid = rowsBest.mid.map(c => c.id); al.bot = rowsBest.bot.map(c => c.id);
    al.sel = null; Snd.arrange();
    renderArrangeArea(v);
  };
  $('#act-clear').onclick = () => { al.top = []; al.mid = []; al.bot = []; al.sel = null; Snd.place(); renderArrangeArea(v); };
  const cf = $('#act-confirm');
  if (cf) cf.onclick = () => {
    if (!full || foul) return;
    Snd.arrange();
    ui.actAs(pid, { type: 'arrange', rows: { top: [...al.top], mid: [...al.mid], bot: [...al.bot] } });
    peekPid = null;
    arrangeLocal = null;
  };
}

function render(v, prev) {
  cur = v;
  if (!v) {
    endShownGid = null; peekPid = null; arrangeLocal = null; lastLogN = 0;
    stopArrangeTimer(); return;
  }
  /* âm thanh: ván mới thì chia bài; có log mới thì kêu theo hành động */
  if (prev && prev.gid !== v.gid) { Snd.deal(); lastLogN = 0; }
  if (v.log && v.log.length > lastLogN) {
    const fresh = v.log.slice(lastLogN);
    for (const l of fresh) {
      if (/đã xếp xong|đặc biệt/.test(l.text)) Snd.arrange();
    }
  }
  lastLogN = v.log ? v.log.length : 0;
  if (v.log && v.log.length === 0) lastLogN = 0;
  /* ví xu: trừ/cộng chênh lệch điểm chi khi hết ván */
  maybeSettle(v);
  /* đồng hồ xếp bài */
  maybeStartArrangeTimer(v);
  /* đổi người xếp thì che bài lại (chuyền tay) */
  const q = arrangeQueue(v);
  if (prev && q.length && (!arrangeLocal || arrangeLocal.pid !== q[0])) peekPid = null;
  const done = v.players.filter(p => p.arranged).length;
  const timerChip = v.timer && v.phase === 'arrange' ? ` <span class="timer-chip" id="timer-chip">⏱️ <b id="timer-left">${Math.max(0, Math.ceil((arrangeDeadline - Date.now()) / 1000))}</b>s</span>` : '';
  $('#round').innerHTML = v.phase === 'ended'
    ? `🏁 ${esc(v.winLabel || 'Ván đã kết thúc!')}`
    : `🀄 Đang xếp bài — ${done}/${v.players.length} người đã xong${timerChip}`;
  $('#seats').innerHTML = v.players.map(p => seatHTML(v, p)).join('');
  $('#chi-amt').textContent = v.chi > 0 ? `${v.chi} xu / chi` : 'Chơi vui (0 xu)';
  $('#chi-sub').textContent = v.phase === 'ended'
    ? (v.winnerIds.length ? `🏆 ${v.winnerIds.map(id => esc(cleanName((v.players.find(p => p.id === id) || {}).name))).join(' & ')} thắng ván` : 'Hòa — không ai hơn ai')
    : `Mỗi chi thắng +1 điểm · tối đa ${3 * (v.players.length - 1)} điểm/ván`;
  if (v.phase === 'ended') {
    $('#game-area').innerHTML = showdownHTML(v);
    $('#game-actions').innerHTML = '';
  } else {
    renderArrangeArea(v);
  }
  const log = $('#log');
  log.innerHTML = v.log.slice(-12).reverse().map(l => `<div>${esc(l.text)}</div>`).join('') || '<div>Chưa có gì.</div>';
  /* kết thúc: hộp thoại (1 lần / ván)
     Số ván/thắng do stats.watch() tự ghi khi ván kết thúc (simplenet bọc onState)
     — KHÔNG gọi record() tay ở đây, kẻo đếm trùng. Xu chênh lệch chi do maybeSettle()
     cộng/trừ vào ví. Huy hiệu riêng (mb-*) do SP.maubinh trong shared/ui/stats.js tự
     phát hiện từ view — main.js không ghi gì thêm. */
  if (v.phase === 'ended' && endShownGid !== v.gid && !v.spec) {
    endShownGid = v.gid;
    Snd.flip();
    const iWon = (v.winnerIds || []).includes(v.me);
    if (iWon) Snd.winJingle();
    const rows = v.players.map(p => {
      const res = p.res || {};
      return `<tr><td>${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${(v.winnerIds || []).includes(p.id) ? ' 🏆' : ''}</td><td>${res.special ? `🌟 ${esc(res.specialLabel || 'Bài đặc biệt')}` : res.foul ? '💥 Binh lủng' : esc(res.label || '—')}</td><td>${res.score > 0 ? '+' : ''}${res.score || 0} chi</td><td>${v.chi > 0 ? (res.delta > 0 ? `+${res.delta} xu` : res.delta < 0 ? `${res.delta} xu` : '0 xu') : '—'}</td></tr>`;
    }).join('');
    ui.openModal(`<h2>${v.winnerIds.length ? (iWon ? '🏆 Bạn thắng!' : '🏆 ' + esc(cleanName((v.players.find(p => p.id === v.winnerIds[0]) || {}).name)) + ' thắng!') : '🤝 Ván hòa!'}</h2>
      <p style="text-align:center">${esc(v.winLabel || '')}</p>
      <table class="reveal-tbl"><tr><th>Người chơi</th><th>Bài</th><th>Điểm chi</th><th>Xu</th></tr>${rows}</table>
      <div class="btn-col">${ui.isHost
        ? '<button class="btn big pri" id="m-again">🔁 Chơi ván mới</button><button class="btn" id="m-lobby">Về phòng chờ</button>'
        : '<button class="btn" id="m-close">Đóng — chờ chủ phòng mở ván mới</button>'}
      <button class="btn" id="m-home">🏠 Về trang chủ</button></div>`);
    const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); ui.net.raw.start(); };
    const lobby = $('#m-lobby'); if (lobby) lobby.onclick = () => { ui.closeModal(); ui.net.raw.restart(); };
    const close = $('#m-close'); if (close) close.onclick = ui.closeModal;
    $('#m-home').onclick = () => { ui.closeModal(); ui.leave(); setTimeout(() => { location.href = '../'; }, 250); };
  }
}

/* ---------- nút phụ ---------- */
function openGuide() { ui.openModal(GUIDE_HTML); const c = $('#m-close'); if (c) c.onclick = ui.closeModal; }
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
$('#btn-log').onclick = () => {
  const v = cur, log = v ? v.log.slice().reverse() : [];
  ui.openModal(`<h2>📜 Nhật ký trận đấu</h2>${log.length ? `<ul class="logl">${log.map(l => `<li class="${l.kind || ''}">${esc(l.text)}</li>`).join('')}</ul>` : '<p style="text-align:center;color:var(--muted)">Chưa có gì.</p>'}<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
};
$('#btn-new').onclick = () => {
  if (!cur) return;
  if (!ui.isHost) { tip('Chỉ chủ phòng mở ván mới được.'); return; }
  ui.net.raw.start();
};
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'maubinh', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      for (let i = 1; i < aiCount; i++) h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
    }
    /* pvp (chuyền tay): chủ phòng thêm người/máy ở phòng chờ */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => { render(v, prev); },
});

/* 🏠 nút home phải về đúng trang chủ web (gameKit chỉ về màn hình đầu của game) */
$('#btn-leave').onclick = async () => {
  const r = await confirmBox(ui.isHost ? 'Bạn là chủ phòng: rời đi là cả phòng giải tán.' : 'Bạn có thể vào lại bằng mã phòng.', { title: 'Rời ván?', ok: 'Rời ván', cancel: 'Ở lại', danger: true });
  if (r) { ui.leave(); setTimeout(() => { location.href = '../'; }, 250); }
};
