// Test phòng "máy chủ giữ ván" của UNÔ (?srv=1): tạo phòng, khách vào, bắt đầu, chủ phòng biến mất 75 giây thì ván vẫn phải chạy, chủ phòng quay lại đúng ghế.
// Cần máy chủ tĩnh :8811 + wrangler dev :8787. Chạy: node tools/qa/srvhost.mjs
import { chromium } from 'playwright';
const B='http://localhost:8811/uno/', CF='cf=ws://127.0.0.1:8787';
const br=await chromium.launch();
const mk=async(name)=>{const c=await br.newContext({viewport:{width:1100,height:760}});await c.addInitScript(n=>{localStorage.setItem('gumballz-name',n);localStorage.setItem('gumballz-tut-off','1')},name);const p=await c.newPage();p.on('pageerror',e=>console.log(name,'ERR',e.message));p.on('console',m=>{if(m.type()==='error'&&!/mqtt|WebSocket|peerjs|favicon|404/i.test(m.text()))console.log(name,'C',m.text().slice(0,160))});return p};
const st=p=>p.evaluate(()=>{const d=window.__dbg&&window.__dbg();return d&&d.view?{phase:d.view.phase,turn:d.view.turnCount,n:d.view.players.length,me:d.view.me&&d.view.me.id,hand:(d.view.hand||d.view.me&&d.view.me.hand||[]).length}:null});
const o=await mk('Chủ');await o.goto(B+'?srv=1&'+CF+'#debug');await o.waitForTimeout(1500);
await o.click('#btn-create');await o.waitForTimeout(3000);
const code=(await o.textContent('#room-code').catch(()=>''))||'';console.log('code',code,'plist',await o.evaluate(()=>document.querySelector('#plist,#players,.plist')?.innerText.replace(/\n/g,' | ').slice(0,200)));
await o.click('#btn-addbot').catch(e=>console.log('no addbot'));await o.waitForTimeout(600);
const g=await mk('Khách');await g.goto(B+'?'+CF+'#debug');await g.waitForTimeout(1200);await g.fill('#join-code',code.trim());await g.click('#btn-join');await g.waitForTimeout(3000);
console.log('lobby owner:',await o.evaluate(()=>document.querySelector('#plist,.plist')?.innerText.replace(/\n/g,' | ').slice(0,200)));
console.log('lobby guest:',await g.evaluate(()=>document.querySelector('#plist,.plist')?.innerText.replace(/\n/g,' | ').slice(0,200)));
await o.click('#btn-start');await o.waitForTimeout(5000);
console.log('after start o',await st(o),'g',await st(g));
await o.screenshot({path:'tools/qa/out/srv-owner.png'});
// chủ phòng "biến mất" (đóng tab) – ván phải tự chạy tiếp cho khách
await o.goto('about:blank');await g.waitForTimeout(75000);
const s1=await st(g);console.log('owner gone 75s → guest',s1);
await o.goto(B+'?'+CF+'#debug');await o.waitForTimeout(5000);
console.log('owner back',await st(o),'screen',await o.evaluate(()=>document.querySelector('.screen.active')?.id));
await g.screenshot({path:'tools/qa/out/srv-guest.png'});await o.screenshot({path:'tools/qa/out/srv-owner2.png'});
await br.close();
