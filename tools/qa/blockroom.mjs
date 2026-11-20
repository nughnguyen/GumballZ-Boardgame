// Test: chủ phòng (phòng máy chủ) chặn một tài khoản → người đó bị đưa ra, vào lại không được.
// NODE_PATH=/tmp/pwtest/node_modules node tools/qa/blockroom.mjs [game]
// Cần máy chủ tĩnh :8128 (~/workspace/footer-redesign/serve8128.py) + wrangler dev :8787
// CHẠY VỚI: wrangler dev --local --port 8787 --var ADMIN_KEY:<giá trị test bất kỳ>
// (vé tài khoản /vip/id ký bằng ADMIN_KEY – dev local không có secret này thì vé rỗng, phòng không quét được).
// Port từ upstream 92812f5d, đổi key bgvn-* → gumballz-* và __bgvn* → __gumballz*, :8811 → :8128,
// playwright → playwright-core + headless-shell; chữ "không cho bạn vào" của upstream → kiểm tra Kẹo bị đưa về
// trang chính (kicked() chuyển hướng sau 2.6s) vì bản local không có dòng chữ đó.
import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright-core');
const SHELL = process.env.CHROME_SHELL || '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell';
const G = process.argv[2] || 'uno', B = `http://127.0.0.1:8128/${G}/`, API = 'http://127.0.0.1:8787', CF = 'cf=ws://127.0.0.1:8787'; let bad = 0; const errs = [];
const ok = (c, m, x = '') => { console.log((c ? '✅ ' : '❌ ') + m, x); if (!c) bad++; };
const post = (p, d, tok) => fetch(API + p, { method: 'POST', headers: { 'content-type': 'application/json', Origin: 'http://127.0.0.1:8128', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: JSON.stringify(d) }).then(r => r.json());
const acc = n => post('/auth/register', { username: 'br' + n.toLowerCase() + Date.now().toString(36).slice(-5), password: 'matkhau123', name: n });
const br = await chromium.launch({ executablePath: SHELL, args: ['--no-sandbox'] });
const mk = async name => { const a = await acc(name); const c = await br.newContext({ viewport: { width: 420, height: 800 } }); await c.addInitScript(([n, a, g]) => { try { localStorage.setItem('gumballz-name', n); localStorage.setItem('gumballz-tut-' + g, '1'); localStorage.setItem('gumballz-auth', JSON.stringify({ token: a.token, user: a.user })); } catch (e) {} }, [name, a, G]); const p = await c.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.acc = a; return p; };
const o = await mk('Chu'); await o.goto(B + `?srv=1&${CF}`); await o.waitForTimeout(2500); await o.fill('#name, #inp-name', 'Chu').catch(() => {});
await o.click('#btn-create'); await o.waitForTimeout(3500); const code = ((await o.textContent('#room-code, #lobby-code').catch(() => '')) || '').trim(); ok(/^[A-Z0-9]{5}$/.test(code), `mở phòng ${G}`, code);
const joinAs = async (p, n) => { await p.goto(B + `?${CF}`); await p.waitForTimeout(2000); await p.fill('#name, #inp-name', n).catch(() => {}); await p.fill('#join-code, #inp-code', code); await p.click('#btn-join'); await p.waitForTimeout(3500); };
const peers = () => o.evaluate(() => (window.__gumballzPeers || []).map(p => p.name).join(','));
const k = await mk('Keo'); await joinAs(k, 'Keo'); const m = await mk('Mochi'); await joinAs(m, 'Mochi');
ok(/Keo/.test(await peers()), 'Kẹo trong phòng', await peers());
await post('/friends/block', { id: k.acc.user.id }, o.acc.token); await o.evaluate(() => window.__gumballzRoom.reId()); await o.waitForTimeout(2500);
ok(!/Keo/.test(await peers()) && /Mochi/.test(await peers()), 'chủ phòng chặn → Kẹo bị đưa ra, Mochi ở lại', await peers());
await k.waitForTimeout(2000); ok(!k.url().includes('cf='), 'Kẹo bị đưa về trang chính sau khi bị mời ra', k.url());
await joinAs(k, 'Keo'); ok(!/Keo/.test(await peers()), 'Kẹo vào lại không được', await peers());
ok(!errs.length, 'không có lỗi JS', errs.slice(0, 3).join(' | '));
await br.close(); process.exit(bad ? 1 : 0);
