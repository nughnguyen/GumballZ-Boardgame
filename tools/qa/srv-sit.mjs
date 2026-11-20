// Test "khách vào phòng người đang chơi với máy rồi ngồi thay máy": NODE_PATH=/tmp/pwtest/node_modules node tools/qa/srv-sit.mjs <game> [số máy] [solo 1|0]
// Đo số tin WebSocket mỗi giây ở từng máy sau khi ngồi (bão tin = lag cả phòng) + ván còn chạy tiếp không.
// Cần máy chủ tĩnh :8128 (~/workspace/footer-redesign/serve8128.py) + wrangler dev :8787, trang game có #debug (uno có).
// Port từ upstream 032b525a, đổi key bgvn-* → gumballz-* và __bgvn* → __gumballz*.
import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright-core');
const SHELL = process.env.CHROME_SHELL || '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell';
const G = process.argv[2] || 'uno', NB = +(process.argv[3] || 2), SOLO = process.argv[4] !== '0', B = `http://127.0.0.1:8128/${G}/`, CF = 'cf=ws://127.0.0.1:8787'; let bad = 0; const errs = [];
const ok = (c, m, x = '') => { console.log((c ? '✅ ' : '❌ ') + m, x); if (!c) bad++; };
const br = await chromium.launch({ executablePath: SHELL, args: ['--no-sandbox'] });
const mk = async name => { const c = await br.newContext({ viewport: { width: 1100, height: 760 } }); await c.addInitScript(([n, g]) => { try { localStorage.setItem('gumballz-name', n); localStorage.setItem('gumballz-tut-' + g, '1'); } catch (e) {} }, [name, G]); const p = await c.newPage(); p.on('pageerror', e => { if (!/localStorage/.test(e.message)) errs.push(name + ': ' + e.message); }); p.__rx = 0; p.on('websocket', ws => ws.on('framereceived', () => p.__rx++)); return p; };
const net = `((window.__dbg && window.__dbg().net) || window.__gumballzHost)`;
const o = await mk('Chủ'); await o.goto(B + '?srv=1&' + CF + '#debug'); await o.waitForTimeout(2500); await o.fill('#name, #inp-name', 'Chủ').catch(() => {});
await o.click('#btn-create'); await o.waitForTimeout(3500);
const code = ((await o.textContent('#room-code, #lobby-code').catch(() => '')) || '').trim(); ok(/^[A-Z0-9]{5}$/.test(code), 'mở phòng', code);
for (let k = 0; k < NB; k++) { await o.evaluate(`${net}.addBot()`); await o.waitForTimeout(500); }
if (!SOLO) { await o.evaluate(() => { try { window.__gumballzRoom && 0; } catch (e) {} }); }
await o.evaluate(`${net}.start()`); await o.waitForTimeout(5000);
const g = await mk('Khách'); await g.goto(B + '?' + CF + '#debug'); await g.waitForTimeout(2500); await g.fill('#name, #inp-name', 'Khách').catch(() => {}); await g.fill('#join-code, #inp-code', code); await g.click('#btn-join'); await g.waitForTimeout(5000);
const seats = await g.evaluate(() => window.__gumballzOpenSeats || []); ok(seats.length > 0, 'khách thấy ghế máy để ngồi', JSON.stringify(seats));
if (seats.length && !process.env.NOSIT) await g.evaluate(id => window.__gumballzSit(id), seats[0].id);
await g.waitForTimeout(3000);
const snapV = p => p.evaluate(() => { const d = window.__dbg && window.__dbg(); const v = d && (d.view || d.shown || (d.ui && d.ui.view)) || {}; return { tc: v.turnCount, turn: v.turn ?? v.cur ?? v.current, n: JSON.stringify(v).length, log: (v.log || []).length, logN: v.logN, phase: v.phase, spec: v.spec, me: v.me || v.you, keys: Object.keys(v).slice(0, 25).join(',') }; });
console.log('chủ', JSON.stringify(await snapV(o))); console.log('khách', JSON.stringify(await snapV(g)));
o.__rx = 0; g.__rx = 0; await g.waitForTimeout(10000);
console.log('sau 10s chủ', JSON.stringify(await snapV(o))); console.log('sau 10s khách', JSON.stringify(await snapV(g)));
if (process.env.CLOSE) { await o.close(); g.__rx = 0; await g.waitForTimeout(30000); console.log('chủ đóng tab, 30s sau khách', JSON.stringify(await snapV(g)), 'tin', g.__rx); }
console.log(`tin/giây sau khi ngồi: chủ ${(o.__rx / 10).toFixed(1)} · khách ${(g.__rx / 10).toFixed(1)}`);
ok(o.__rx < 200 && g.__rx < 200, 'không có bão tin');
const me = await g.evaluate(() => { const d = window.__dbg && window.__dbg(); const v = d && (d.view || d.shown || (d.ui && d.ui.view)); return { spec: v && v.spec, me: d && (d.myId || (d.ui && d.ui.myId)) }; });
ok(me.spec === false || me.spec === undefined, 'khách thành người chơi', JSON.stringify(me));
if (process.env.LEAVE) {
  const lv = await g.$('#btn-leave'); if (lv) { await lv.click(); await g.waitForTimeout(800); const okb = await g.$('.dg-ok, .dg-btn.pri, button:has-text("Rời")'); if (okb) await okb.click().catch(() => {}); }
  await g.waitForTimeout(2500); console.log('sau khi rời: màn', await g.evaluate(() => document.querySelector('.screen.active')?.id), 'session', await g.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k]) => /sess|room|srv/i.test(k))))));
  await g.goto(B + '?' + CF + '#debug'); await g.waitForTimeout(5000); console.log('mở lại trang game: màn', await g.evaluate(() => document.querySelector('.screen.active')?.id));
}
ok(!errs.length, 'không có lỗi JS', errs.slice(0, 3).join(' | '));
await g.screenshot({ path: `tools/qa/out/srv-sit-${G}.png` });
await br.close(); console.log(bad ? `❌ ${bad} mục lỗi` : `✅ ${G}: ngồi thay máy ổn.`); process.exit(bad ? 1 : 0);
