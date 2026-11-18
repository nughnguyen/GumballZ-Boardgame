// 🧪 Kiểm tra chuyển chủ phòng (chạy trên máy dev). Cần máy chủ tĩnh :8811 + wrangler dev :8787 như qa.mjs.
// Dùng: node tools/qa/migrate.mjs
//  A. chủ phòng biến mất đột ngột → người kế vị tiếp quản, người còn lại vào lại được; bản sao trạng thái ở máy khách phải được mã hoá
//  B. người kế vị tự rớt mạng 20 giây → KHÔNG được giành quyền của chủ phòng đang khoẻ
//  C. chủ phòng chủ động rời → người kế vị lên thay ngay
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const WEB = process.env.WEB || 'http://localhost:8811', CF = process.env.CF || 'ws://127.0.0.1:8787', G = process.env.GAME || 'uno';
const br = await chromium.launch();
const page = async () => {
  const c = await br.newContext({ viewport: { width: 390, height: 844 } });
  await c.route(/gstatic\.com\/firebasejs|peerjs|mqtt|hivemq|emqx/, r => r.abort());
  /* giả lập mất mạng thật: __netDown(true) đóng mọi WebSocket đang mở và làm mọi kết nối mới thất bại */
  await c.addInitScript(() => { const W = window.WebSocket, all = new Set(); let down = false;
    window.WebSocket = function (u, pr) { const w = new W(down ? 'ws://127.0.0.1:9/x' : u, pr); all.add(w); return w; }; window.WebSocket.prototype = W.prototype;
    for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) window.WebSocket[k] = W[k];
    window.__netDown = v => { down = v; if (v) for (const w of all) try { w.close(); } catch (e) {} }; });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message.slice(0, 160))); return p;
};
let fail = 0; const res = (ok, msg) => { if (!ok) fail++; console.log(`${ok ? '✅' : '❌'} ${msg}`); };
const isHost = p => p.evaluate(() => !!(window.__gumballzHost && !window.__gumballzHost.dead)).catch(() => false);
const inRoom = p => p.evaluate(() => !!(window.__gumballzRoom && window.__gumballzRoom.alive())).catch(() => false);
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return Date.now() - t; await new Promise(r => setTimeout(r, 500)); } return -1; };
async function room() {
  const host = await page(), a = await page(), b = await page();
  await host.goto(`${WEB}/${G}/?cf=${CF}`); await host.waitForTimeout(1200);
  await host.fill('#name', 'Chủ'); await host.click('#btn-create');
  await host.waitForFunction(() => /^[A-Z0-9]{4,6}$/.test(document.querySelector('#room-code')?.textContent.trim()), null, { timeout: 15000 });
  const code = (await host.textContent('#room-code')).trim();
  for (const [p, n] of [[a, 'An'], [b, 'Bơ']]) { await p.goto(`${WEB}/${G}/?cf=${CF}`); await p.waitForTimeout(1000); await p.fill('#name', n); await p.fill('#join-code', code); await p.click('#btn-join'); await p.waitForTimeout(1500); }
  await host.click('#btn-start'); await host.waitForTimeout(7000); /* chờ bản sao (5 giây/lần) tới người kế vị */
  return { host, a, b, code };
}
const bakOf = p => p.evaluate(() => { for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); if (k.startsWith('gumballz-bak-')) { const v = JSON.parse(sessionStorage.getItem(k)); return { enc: !!v.enc, snap: !!v.snap }; } } return null; });

{ // A
  const { host, a, b, code } = await room();
  const ba = await bakOf(a), bb = await bakOf(b);
  res(!!ba && ba.enc && !ba.snap && !!bb && bb.enc && !bb.snap, `A. bản sao ở máy khách đã mã hoá: ${JSON.stringify(ba)} ${JSON.stringify(bb)}`);
  await host.context().close();
  const t = await until(async () => (await isHost(a)) || (await isHost(b)), 45000);
  const newHost = (await isHost(a)) ? a : b, other = newHost === a ? b : a;
  res(t >= 0, `A. phòng ${code}: người kế vị tiếp quản sau ${Math.round(t / 1000)} giây`);
  const t2 = await until(() => inRoom(other), 30000);
  const hand = await newHost.evaluate(() => document.querySelectorAll('#hand [data-id]').length).catch(() => 0);
  res(t2 >= 0 && hand > 0, `A. người còn lại vào lại phòng (${Math.round(t2 / 1000)} giây), chủ mới còn ${hand} lá trên tay ${[...a.errs, ...b.errs].join(' | ')}`);
  await a.context().close(); await b.context().close();
}
{ // B
  const { host, a, b, code } = await room();
  await a.evaluate(() => window.__netDown(true)); await b.waitForTimeout(18000); const dropped = !(await inRoom(a)); await b.waitForTimeout(4000); await a.evaluate(() => window.__netDown(false));
  const t = await until(() => inRoom(a), 30000);
  res((await isHost(host)) && !(await isHost(a)) && t >= 0, `B. phòng ${code}: kế vị rớt mạng 22 giây – chủ phòng vẫn là chủ: ${await isHost(host)}, kế vị không giành quyền: ${!(await isHost(a))}, vào lại sau ${Math.round(t / 1000)} giây (lúc mất mạng có rớt khỏi phòng thật: ${dropped})`);
  // C
  await host.evaluate(() => window.__gumballzHost.destroy()); await host.waitForTimeout(300); await host.context().close();
  const t3 = await until(async () => (await isHost(a)) || (await isHost(b)), 20000);
  const nh = (await isHost(a)) ? a : b, ot = nh === a ? b : a;
  const t4 = await until(() => inRoom(ot), 30000);
  res(t3 >= 0 && t4 >= 0, `C. chủ phòng chủ động rời: kế vị lên thay sau ${Math.round(t3 / 1000)} giây, người còn lại vào lại sau ${Math.round(t4 / 1000)} giây ${[...a.errs, ...b.errs].join(' | ')}`);
  await a.context().close(); await b.context().close();
}
await br.close();
console.log(fail ? `\n❌ ${fail} mục lỗi` : '\n✅ Chuyển chủ phòng ổn.');
process.exit(fail ? 1 : 0);
