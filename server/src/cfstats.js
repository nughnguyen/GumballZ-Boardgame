// 📈 Số liệu THẬT từ Cloudflare (GraphQL Analytics API) cho trang Quản trị – để khớp với trang Cloudflare thay vì chỉ ước tính.
// Cần 2 thứ trong cài đặt Worker gumballz-rooms: biến CF_ACCOUNT (mã tài khoản, đặt sẵn trong wrangler.jsonc)
// và secret CF_API_TOKEN (anh tự tạo: API token chỉ có quyền "Account Analytics: Read" – KHÔNG đưa vào repo).
const GQL = 'https://api.cloudflare.com/client/v4/graphql';
const GB = 0.125;
async function q(env, query, variables) {
  const r = await fetch(GQL, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + env.CF_API_TOKEN }, body: JSON.stringify({ query, variables }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || (j.errors && j.errors.length)) throw new Error((j.errors && j.errors[0] && j.errors[0].message) || 'HTTP ' + r.status);
  return j.data.viewer.accounts[0] || {};
}
const FULL = `query($a:String!,$d0:Date!,$d1:Date!,$m0:Date!){viewer{accounts(filter:{accountTag:$a}){
  dT:durableObjectsInvocationsAdaptiveGroups(filter:{date_geq:$d0,date_lt:$d1},limit:10){sum{requests} dimensions{type}}
  dM:durableObjectsInvocationsAdaptiveGroups(filter:{date_geq:$m0,date_lt:$d1},limit:10){sum{requests} dimensions{type}}
  pT:durableObjectsPeriodicGroups(filter:{date_geq:$d0,date_lt:$d1},limit:10){sum{activeTime duration rowsRead rowsWritten}}
  pM:durableObjectsPeriodicGroups(filter:{date_geq:$m0,date_lt:$d1},limit:10){sum{activeTime duration rowsRead rowsWritten}}
  wT:workersInvocationsAdaptive(filter:{date_geq:$d0,date_lt:$d1},limit:10){sum{requests}}
  wM:workersInvocationsAdaptive(filter:{date_geq:$m0,date_lt:$d1},limit:10){sum{requests}}}}}`;
const BASIC = `query($a:String!,$d0:Date!,$d1:Date!,$m0:Date!){viewer{accounts(filter:{accountTag:$a}){
  dT:durableObjectsInvocationsAdaptiveGroups(filter:{date_geq:$d0,date_lt:$d1},limit:10){sum{requests} dimensions{type}}
  dM:durableObjectsInvocationsAdaptiveGroups(filter:{date_geq:$m0,date_lt:$d1},limit:10){sum{requests} dimensions{type}}}}}`;
const tot = (rows, k) => (rows || []).reduce((s, r) => s + (Number(r.sum && r.sum[k]) || 0), 0);
function pack(a, s) {
  const rows = a['d' + s] || [], by = {};
  for (const r of rows) { const t = (r.dimensions && r.dimensions.type) || '?'; by[t] = (by[t] || 0) + (Number(r.sum.requests) || 0); }
  const reqRaw = Object.values(by).reduce((x, y) => x + y, 0), ws = by.hibernation || 0;
  const p = a['p' + s];
  return {
    reqRaw, /* đúng con số "Requests" trên trang Durable Objects của Cloudflare */
    req: Math.round(reqRaw - ws + ws / 20), /* lượt TÍNH TIỀN: tin WebSocket (loại "hibernation") chỉ tính 1/20 */
    by, /* theo loại: http (mở kết nối/gọi web), jsrpc (máy chủ gọi nhau), alarm (hẹn giờ), hibernation (tin trong phòng) */
    gbs: p ? Math.round(tot(p, 'activeTime') / 1e6 * GB) : null,
    dur: p ? tot(p, 'duration') : null,
    reads: p ? tot(p, 'rowsRead') : null,
    writes: p ? tot(p, 'rowsWritten') : null,
    worker: a['w' + s] ? tot(a['w' + s], 'requests') : null,
  };
}
export async function cfUsage(env) {
  if (!env.CF_API_TOKEN || !env.CF_ACCOUNT) return { ok: false, need: 'token' };
  const cache = caches.default, key = new Request('https://gumballz-rooms.workers.dev/cf-usage-cache');
  const hit = await cache.match(key); if (hit) return hit.json();
  const d = new Date(), day = x => x.toISOString().slice(0, 10);
  const d0 = day(d), d1 = day(new Date(d.getTime() + 864e5));
  /* kỳ tính tiền của gói Paid: tính từ ngày nâng gói (PAID_SINCE), lặp lại mỗi tháng vào đúng ngày đó */
  let m0 = d0.slice(0, 8) + '01';
  if (env.PAID_SINCE) { const k = +env.PAID_SINCE.slice(8, 10); let y = d.getUTCFullYear(), mo = d.getUTCMonth(); if (d.getUTCDate() < k) mo--; m0 = day(new Date(Date.UTC(y, mo, k))); if (m0 < env.PAID_SINCE) m0 = env.PAID_SINCE; }
  const v = { a: env.CF_ACCOUNT, d0, d1, m0 };
  let a, partial = null;
  try { a = await q(env, FULL, v); } catch (e) { partial = String(e.message || e).slice(0, 160); try { a = await q(env, BASIC, v); } catch (e2) { return { ok: false, msg: String(e2.message || e2).slice(0, 200) }; } }
  const out = { ok: true, at: Date.now(), today: pack(a, 'T'), month: pack(a, 'M'), since: m0, partial };
  try { out.who = await who(env, v); } catch (e) { out.whoErr = String(e.message || e).slice(0, 160); }
  await cache.put(key, new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json', 'Cache-Control': 'max-age=300' } }));
  return out;
}


/* Ai ngốn "thời gian thức" (GB-s) hôm nay: gộp theo loại Durable Object + top phòng – để biết nên cắt chỗ nào */
const WHO = `query($a:String!,$d0:Date!,$d1:Date!){viewer{accounts(filter:{accountTag:$a}){
  ns:durableObjectsPeriodicGroups(filter:{date_geq:$d0,date_lt:$d1},limit:20,orderBy:[sum_activeTime_DESC]){sum{activeTime} dimensions{namespaceId}}
  ob:durableObjectsPeriodicGroups(filter:{date_geq:$d0,date_lt:$d1},limit:40,orderBy:[sum_activeTime_DESC]){sum{activeTime} dimensions{namespaceId objectId}}}}}`;
async function who(env, v) {
  const a = await q(env, WHO, { a: v.a, d0: v.d0, d1: v.d1 });
  const named = {}; /* id của các DO "main" → tên */
  for (const [k, b] of [['LOBBY', 'Sảnh (Lobby)'], ['USERS', 'Tài khoản (Users)'], ['INBOX', 'Hộp thư (Inbox)']]) try { named[env[k].idFromName('main').toString()] = b; } catch (e) {}
  const nsName = {}, gbs = r => Math.round((Number(r.sum.activeTime) || 0) / 1e6 * GB);
  const objs = (a.ob || []).map(r => { const id = r.dimensions.objectId, nm = named[id]; if (nm) nsName[r.dimensions.namespaceId] = nm; return { id: String(id).slice(0, 10), name: nm || '', gbs: gbs(r) }; });
  const ns = (a.ns || []).map(r => ({ name: nsName[r.dimensions.namespaceId] || 'Phòng chơi (Room)', gbs: gbs(r) }));
  return { ns, top: objs.slice(0, 15) };
}

