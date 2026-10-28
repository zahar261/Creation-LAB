// Usage: node tests/smoke.js [path/to/index.html]   — exits 1 if anything fails
const {chromium}=require('playwright');const path=require('path');
const FILE='file://'+path.resolve(process.argv[2]||path.join(__dirname,'index.html'));
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)}};
(async()=>{const b=await chromium.launch();
const mk=async(w=1000)=>{const c=await b.newContext({viewport:{width:w,height:900}});const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));await p.addInitScript(()=>{try{localStorage.setItem('zm-welcome','1')}catch(e){}window.print=()=>{window.__printed=(window.__printed||0)+1}});return p};
const toAr=async p=>{if(await p.evaluate(()=>document.documentElement.lang)!=='ar'){await p.evaluate(()=>document.getElementById('bLang').click());await p.waitForTimeout(400)}};
const newProj=async(p,txt)=>{await p.goto(FILE+'#dev');await p.waitForTimeout(900);await toAr(p);if(!await p.$('#pjn')){await p.evaluate(()=>document.querySelector('[data-newpj]').click());await p.waitForTimeout(400)}await p.fill('#pjn','اختبار');await p.click('[data-imp=new]');await p.fill('#impta',txt);await p.click('[data-impgo]');await p.waitForTimeout(400);await p.click('[data-impgo]',{timeout:1200}).catch(()=>{});await p.waitForTimeout(800)};

console.log('1) pages load without errors (both languages, phone + desktop)');
for(const w of[390,1280]){const p=await mk(w);for(const h of['home','dev','solve','calc','library','materials','rules','suppliers']){await p.goto(FILE+'#'+h);await p.waitForTimeout(500);await p.evaluate(()=>document.getElementById('bLang').click());await p.waitForTimeout(300)}
 ok(p.errs.length===0,'w='+w+' no JS errors '+p.errs.slice(0,2).join('|'))}

console.log('2) library');
{const p=await mk();await p.goto(FILE+'#library');await p.waitForTimeout(900);
 ok(await p.evaluate(()=>document.querySelectorAll('[data-lp]').length)>=40,'product grid has 40+ products');
 await toAr(p);ok(!/Creams & fillings/.test(await p.evaluate(()=>[...document.querySelectorAll('#p-library [data-lc]')].map(x=>x.innerText).join('|'))),'categories are Arabic in AR');
 const id=await p.evaluate(()=>[...document.querySelectorAll('[data-lstart]')].find(x=>/cheesecake/i.test(x.closest('details').innerText)).dataset.lstart);
 await p.evaluate(i=>document.querySelector('[data-lstart="'+i+'"]').click(),id);await p.waitForTimeout(900);
 const kg=+await p.evaluate(()=>document.querySelector('[data-rb]').value);ok(kg>0&&kg<6,'start-with-recipe batch = book yield ('+kg+' kg, not 10)');
 ok(p.errs.length===0,'no JS errors')}

console.log('3) import + nutrition + bake loss + override');
{const p=await mk();await newProj(p,'حليب 650\nصفار بيض 110\nسكر 135\nنشا ذرة 50\nزبدة 82% 50\nفانيلا 1 حبة');
 await p.evaluate(()=>document.querySelector('[data-wstab$="#nut"]').click());await p.waitForTimeout(200);
 const T=()=>p.evaluate(()=>{document.querySelectorAll('.nutr').forEach(d=>d.open=true);const d=document.querySelector('[data-pane=nut] .nutr');return d.innerText.replace(/\s+/g,' ')});
 let t=await T();ok(/تقدير/.test(t)&&/قبل الخَبز/.test(t),'badge Estimate + "before baking"');
 const k0=+(t.match(/الطاقة \(سعرة\) ([\d.]+)/)||[])[1];
 await p.fill('[data-rbl]','10');await p.keyboard.press('Tab');await p.waitForTimeout(700);t=await T();const k1=+(t.match(/الطاقة \(سعرة\) ([\d.]+)/)||[])[1];
 ok(Math.abs(k1-k0/0.9)<1.2,'bake loss 10% raises per-100g energy ('+k0+' → '+k1+')');
 await p.evaluate(()=>document.querySelectorAll('.nov').forEach(d=>d.open=true));await p.fill('[data-nov$="#kcal"]','123');await p.keyboard.press('Tab');await p.waitForTimeout(700);t=await T();
 ok(/معدّلة/.test(t)&&/123/.test(t),'chef override → badge Edited + value 123');
 await p.click('[data-novreset]');await p.waitForTimeout(700);t=await T();ok(!/معدّلة/.test(t),'reset override');
 ok(p.errs.length===0,'no JS errors')}

console.log('4) PDF');
{const p=await mk();await newProj(p,'حليب 650\nسكر 135');
 await p.evaluate(()=>document.querySelector('[data-pdf]').click());await p.waitForTimeout(1500);
 ok(await p.evaluate(()=>!!document.getElementById('pdfov')),'PDF overlay opens');
 ok(await p.evaluate(()=>document.querySelectorAll('#pdfov .pdfpg').length)>=1,'PDF pages built');
 await p.evaluate(()=>document.querySelector('[data-pdfact=print]').click());await p.waitForTimeout(800);
 ok(await p.evaluate(()=>window.__printed)>=1,'print button calls print()');
 ok(!/8F7B4F/i.test(await p.content()),'no old gold colour left');
 ok(p.errs.length===0,'no JS errors')}

console.log('5) problems search');
{const p=await mk();await p.goto(FILE+'#solve');await p.waitForTimeout(800);await toAr(p);
 const q=async s=>{await p.fill('#q',s);await p.waitForTimeout(600);return p.evaluate(()=>[...document.querySelectorAll('#p-solve button,#p-solve summary,#p-solve h3')].filter(x=>x.offsetParent&&x.innerText.length>12).slice(0,3).map(x=>x.innerText).join(' | '))};
 ok(/تشيز|Cheesecake/i.test(await q('تشيز كيك تشقق')),'cheesecake crack found');
 ok(/تشيز|Cheesecake/i.test(await q('هبوط')),'cheesecake sink among sink results');
 ok(p.errs.length===0,'no JS errors')}

console.log('6) replace base recipe is undoable');
{const p=await mk();await p.goto(FILE+'#library');await p.waitForTimeout(800);
 const id=await p.evaluate(()=>document.querySelector('[data-lstart]').dataset.lstart);await p.evaluate(i=>document.querySelector('[data-lstart="'+i+'"]').click(),id);await p.waitForTimeout(800);
 const n0=await p.evaluate(()=>document.querySelectorAll('[data-rr$="#m"]').length);
 const v=await p.evaluate(()=>[...document.querySelector('[data-rt]').options].map(o=>o.value).filter(Boolean)[3]);
 await p.selectOption('[data-rt]',v);await p.waitForTimeout(600);
 ok(await p.evaluate(()=>document.querySelectorAll('[data-rr$="#m"]').length)!==n0,'recipe replaced');
 await p.evaluate(()=>document.querySelector('[data-tact]').click());await p.waitForTimeout(600);
 ok(await p.evaluate(()=>document.querySelectorAll('[data-rr$="#m"]').length)===n0,'Undo restores the original rows');
 ok(p.errs.length===0,'no JS errors')}

console.log('7) stacked dialogs');
{const p=await mk();await newProj(p,'حليب 650\nسكر 135');
 await p.evaluate(()=>{const d=document.createElement('div');d.id='adj';document.body.appendChild(d)});
 await p.evaluate(()=>document.querySelector('[data-pdf]').click());await p.waitForTimeout(1200);
 ok(await p.evaluate(()=>!document.getElementById('adj')),'opening PDF closes the problem dialog')}


console.log('8) mobile layout and polish');
{const p=await mk(360);await p.goto(FILE+'#home');await p.waitForTimeout(700);
 ok(await p.evaluate(()=>{const r=document.getElementById('bTheme').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}),'theme button fully inside a 360px screen');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'no horizontal page overflow at 360px');
 await p.goto(FILE+'#calc');await p.waitForTimeout(600);
 ok(+await p.evaluate(()=>document.querySelector('#kg').value)<5,'calculator default batch follows the recipe, not 10 kg');
 ok(await p.evaluate(()=>document.getElementById('aboutHost').hidden),'About block hidden outside the home page');
 await p.goto(FILE+'#dev');await p.waitForTimeout(600);
 ok(!/\b(impHint|vsz)\b/.test(await p.evaluate(()=>document.body.innerText)),'no raw translation keys visible');
 ok(p.errs.length===0,'no JS errors')}

console.log('9) apply a fix to my recipe + import formats + batch scaling');
{const p=await mk();await newProj(p,'جبنة كريمية 848\nبيض كامل 216\nصفار بيض 49\nسكر 231\nنشا ذرة 21\nعصير ليمون 35');
 await p.evaluate(()=>document.querySelector('[data-adjrec]').click());await p.waitForTimeout(500);
 await p.click('.adjp[data-ap=cheesecake-crack]');await p.waitForTimeout(500);
 ok(/بيض كامل/.test(await p.evaluate(()=>document.getElementById('adjprev').innerText)),'cheesecake fix previews on the recipe');
 await p.click('[data-aapply]');await p.waitForTimeout(700);
 const m=await p.evaluate(()=>[...document.querySelectorAll('[data-rr$="#m"]')].map(i=>+i.value));
 ok(m[1]<216&&m[2]>49,'apply moved whole egg to yolk ('+m.slice(0,3)+')');
 await p.evaluate(()=>document.querySelector('[data-undo]').click());await p.waitForTimeout(500);
 ok((await p.evaluate(()=>[...document.querySelectorAll('[data-rr$="#m"]')].map(i=>+i.value)))[1]===216,'undo restores');
 ok(p.errs.length===0,'no JS errors')}
{const p=await mk();
 const imp=async t=>{await newProj(p,t);return p.evaluate(()=>[...document.querySelectorAll('[data-rr$="#m"]')].map(i=>+i.value))};
 ok((await imp('Sugar, 135\nMilk, 650 g')).join()==='135,650','comma after name is cleaned');
 ok((await imp('3 بيضات\nنص كيلو سكر\nربع كيلو زبدة')).join()==='150,500,250','eggs count + half/quarter kilo');
 ok((await imp('دقيق 100%\nماء 65%\nملح 2%')).join()==='100,65,2','baker percentages import');
 await newProj(p,'جبنة 848\nبيض 216\nسكر 231\nنشا 21');
 const tots=[];for(const kg of['10','0.5','3.3','25']){await p.fill('[data-rb]',kg);await p.keyboard.press('Tab');await p.waitForTimeout(400);tots.push(Math.round((await p.evaluate(()=>[...document.querySelectorAll('[data-rr$="#m"]')].map(i=>+i.value))).reduce((a,b)=>a+b,0)))}
 ok(tots.join()==='10000,500,3300,25000','batch scaling hits the requested total exactly ('+tots+')');
 await p.fill('[data-rb]','0.001');await p.keyboard.press('Tab');await p.waitForTimeout(300);await p.fill('[data-rb]','2');await p.keyboard.press('Tab');await p.waitForTimeout(400);
 ok(Math.round((await p.evaluate(()=>[...document.querySelectorAll('[data-rr$="#m"]')].map(i=>+i.value))).reduce((a,b)=>a+b,0))===2000&&(await p.evaluate(()=>+document.querySelector('[data-rr$="#m"]').value))>800,'scaling down to 1 g and back loses nothing')}

console.log('10) security: poisoned backup / share link must not run code');
{const fs=require('fs'),os=require('os'),zlib=require('zlib');
 const PAY='"><img src=x onerror="window.__x=(window.__x||0)+1"><svg/onload="window.__x=(window.__x||0)+1">';
 const bad={id:PAY,name:PAY,goal:PAY,tpl:'cust',batch:1,trials:[{d:PAY,ch:PAY,res:PAY}],recs:[{id:PAY,tpl:'cust',batch:1,name:PAY,rows:[{n:PAY,ne:PAY,o:1,m:1}],meth:{ar:[PAY],en:[PAY]}}],shape:{img:'javascript:alert(1)',layers:[{id:PAY,name:PAY,type:'round',w:10,h:2,dens:1}]},'__proto__':{polluted:1}};
 const bk=os.tmpdir()+'/zm-bad-backup.json';fs.writeFileSync(bk,JSON.stringify({app:'creation-lab',v:1,data:{'zm-projects':[bad]}}));
 const p=await mk();await p.goto(FILE+'#dev');await p.waitForTimeout(500);
 await p.setInputFiles('#bkFile',bk);await p.waitForTimeout(500);
 await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/bk/.test(x.outerHTML)&&/دمج|merge|استعادة|restore|add|إضافة/i.test(x.textContent));b&&b.click()});await p.waitForTimeout(700);
 for(const h of['dev','home','library','solve','calc']){await p.goto(FILE+'#'+h);await p.waitForTimeout(500)}
 await p.goto(FILE+'#dev');await p.waitForTimeout(600);
 await p.evaluate(()=>{try{openPdfView()}catch(e){}});await p.waitForTimeout(700);
 ok(await p.evaluate(()=>window.__x===undefined),'poisoned backup does not execute script');
 ok(await p.evaluate(()=>({}).polluted===undefined),'no prototype pollution from backup');
 ok(await p.evaluate(()=>(JSON.parse(localStorage.getItem('zm-projects')||'[]')).length>=0),'app still alive after hostile backup');
 const tok='g'+zlib.gzipSync(Buffer.from(JSON.stringify({app:'creation-lab',v:1,p:bad}))).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 await p.goto(FILE+'#share='+tok);await p.waitForTimeout(900);
 await p.evaluate(()=>{const b=document.querySelector('[data-shr=add]');b&&b.click()});await p.waitForTimeout(700);
 for(const h of['dev','home']){await p.goto(FILE+'#'+h);await p.waitForTimeout(500)}
 ok(await p.evaluate(()=>window.__x===undefined),'poisoned share link does not execute script')}
{const p=await mk();await newProj(p,'flour 50 g\negg 100 g');await p.evaluate(()=>document.querySelector('[data-radd]').click());await p.waitForTimeout(300);
 const inp=p.locator('input[data-rr$="#n"]').last();await inp.click();await inp.type('cre',{delay:30});await p.waitForTimeout(300);
 ok((await p.evaluate(()=>document.querySelectorAll('#acl button').length))>0,'ingredient suggestions appear while typing');
 await p.evaluate(()=>{const b=document.querySelector('#acl button');b&&b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))});await p.waitForTimeout(300);
 ok((await p.evaluate(()=>[...document.querySelectorAll('input[data-rr$="#n"]')].pop().value)).length>2,'picking a suggestion fills the ingredient');
 ok(!(await p.evaluate(()=>/Baker|الخباز/.test(document.querySelector('.recb .dtab').innerText))),"baker's % hidden by default");
 await p.evaluate(()=>document.querySelector('.ws-more').open=true);await p.check('[data-rbk]');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>/Baker|الخباز|flour|دقيق/i.test(document.querySelector('.recb .dtab tr').innerText)),"baker's % can be switched on");
 ok(p.errs.length===0,'no JS errors')}

console.log('11) formula science: water activity, POD, PAC');
{const p=await mk();
 const sci=async t=>{await newProj(p,t);return p.evaluate(()=>{const d=document.querySelector('.sci');if(!d)return null;const n=d.querySelector('[data-aw]');return{aw:+n.dataset.aw,pod:+d.dataset.pod,pac:+d.dataset.pac}})};
 let r=await sci('cream 35% 200\ndark chocolate 60% 300');ok(r&&r.aw>0.85&&r.aw<0.92,'ganache 1:1.5 aw in the real range ('+(r&&r.aw)+')');
 r=await sci('sugar 500\nwater 500');ok(r&&r.aw>0.91&&r.aw<0.95,'50% sugar syrup aw about 0.93 ('+(r&&r.aw)+')');
 r=await sci('honey 1000');ok(r&&r.aw<0.7,'honey is shelf stable ('+(r&&r.aw)+')');
 r=await sci('whole milk 640\ncream 35% 140\nsugar 140\ndextrose 40\nskim milk powder 35');
 const pac=r.pac,pod=r.pod;
 ok(r.aw>0.95&&pac>22&&pac<32,'ice cream base: aw high, PAC in the gelato range ('+r.aw+', PAC '+pac+')');
 ok(pod>14&&pod<22,'ice cream base POD ('+pod+')');
 {const m=await mk(390);await newProj(m,'cream 35% 200\ndark chocolate 60% 300');ok(await m.evaluate(()=>[...document.querySelectorAll('.nutr')].every(d=>{d.open=true;const t=d.querySelector('table');if(!t)return true;const w=t.parentElement;return w.scrollWidth<=w.clientWidth+1})),'nutrition + science tables fit a phone screen (values not hidden off-screen)')}
 ok(p.errs.length===0,'no JS errors')}

console.log('12) PWA files + pinned PDF libraries');
{const fs=require('fs'),crypto=require('crypto'),html=fs.readFileSync(path.resolve(process.argv[2]||'index.html'),'utf8'),dir=path.dirname(path.resolve(process.argv[2]||'index.html'));
 const mf=JSON.parse(fs.readFileSync(path.join(dir,'manifest.webmanifest'),'utf8'));
 ok(/<link rel="manifest" href="manifest.webmanifest">/.test(html)&&!/application\/manifest\+json/.test(html),'real manifest file, no blob: manifest (blocked by CSP)');
 ok(mf.icons.every(i=>fs.existsSync(path.join(dir,i.src)))&&mf.icons.some(i=>i.sizes==='512x512'),'manifest icons exist (incl. 512px)');
 ok(fs.existsSync(path.join(dir,'sw.js'))&&/serviceWorker\.register\("sw\.js"\)/.test(html),'service worker for offline use');
 for(const [file,key] of [['vendor/html2canvas-1.4.1.min.js','SRI_H2C'],['vendor/jspdf-2.5.1.umd.min.js','SRI_JSPDF']]){
  const want=(html.match(new RegExp(key+'="(sha384-[^"]+)"'))||[])[1],got='sha384-'+crypto.createHash('sha384').update(fs.readFileSync(path.join(dir,file))).digest('base64');
  ok(want&&want===got,file+' matches its integrity hash')}
 ok(!/["']https:\/\/[^"']+\.js["'](?![^\]]*?,i:)/.test(html.slice(html.indexOf('const PDFLIB'),html.indexOf('const loadJs'))),'every CDN script carries an integrity hash');
 const p=await mk();await newProj(p,'milk 650\nsugar 135');await p.evaluate(()=>document.querySelector('[data-pdf]').click());await p.waitForTimeout(800);
 await p.evaluate(()=>{const b=document.querySelector('[data-pdfact=save],[data-pdfact=dl],[data-pdfact=pdf]');b&&b.click()});await p.waitForTimeout(2500);
 ok(await p.evaluate(()=>!!(window.jspdf&&window.html2canvas)),'PDF libraries load from the local vendor copy');
 ok(p.errs.length===0,'no JS errors')}

console.log('13) backup restore keeps custom materials and aliases');
{const fs=require('fs'),os=require('os');const bk=os.tmpdir()+'/zm-cm-backup.json';
 fs.writeFileSync(bk,JSON.stringify({app:'creation-lab',v:1,data:{'zm-projects':[],'zm-custmat':[{id:'cm_t1',name:'مادة اختبار',en:'Test stuff',cat:'add',src:'user',water:50,fat:0,protein:0,sugar:50,allergens:[]}],'zm-alias':{'شي غريب':'cm_t1'}}}));
 const p=await mk();await p.goto(FILE+'#dev');await p.waitForTimeout(700);await p.setInputFiles('#bkFile',bk);await p.waitForTimeout(400);
 await p.evaluate(()=>document.querySelector('[data-bk=go]').click());await p.waitForTimeout(400);
 const st=await p.evaluate(()=>({cm:JSON.parse(localStorage.getItem('zm-custmat')||'[]').map(x=>x.id),al:JSON.parse(localStorage.getItem('zm-alias')||'{}')}));
 ok(st.cm.includes('cm_t1'),'custom material restored');ok(st.al['شي غريب']==='cm_t1','ingredient alias restored');
 ok(p.errs.length===0,'no JS errors')}

console.log('14) cloud sync never overwrites newer data from another device');
{const seed=await mk();await newProj(seed,'حليب 100');const PJS=await seed.evaluate(()=>localStorage.getItem('zm-projects'));
 const run=async remoteTs=>{const c=await b.newContext({viewport:{width:1000,height:900}});const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.addInitScript(([ts,pjs])=>{try{if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.setItem('zm-welcome','1');localStorage.setItem('zm-projects',pjs);
    localStorage.setItem('zm-cloud',JSON.stringify({access:'a',refresh:'r',email:'t@t.t',uid:'u1'}));localStorage.setItem('zm-cloud-ts',JSON.stringify('2026-10-27T10:00:00.000Z'));localStorage.setItem('zm-cloud-dirty','1')}}catch(e){}
   window.__posts=0;const F=window.fetch;window.fetch=async(u,o)=>{u=String(u);if(/supabase\.co\/rest\/v1\/user_data/.test(u)){if(o&&o.method==='POST'){window.__posts++;return new Response('[{"updated_at":"2026-10-27T12:00:00.000+00:00"}]',{status:201})}return new Response(JSON.stringify([{data:{'zm-projects':[{id:'premote',name:'remote',recs:[]}]},updated_at:ts}]),{status:200})}return F(u,o)}},[remoteTs,PJS]);
  await p.goto(FILE+'#dev');await p.waitForFunction(()=>window.__posts>0||document.getElementById('adj'),null,{timeout:8000}).catch(()=>{});await p.waitForTimeout(600);
  const r=await p.evaluate(()=>({posts:window.__posts,dialog:!!document.getElementById('adj')}));if(p.errs.length)r.errs=p.errs;await c.close();return r};
 let r=await run('2026-10-27T10:00:00+00:00');ok(r.posts===1&&!r.dialog,'same instant in Supabase format → upload, no false conflict ('+JSON.stringify(r)+')');
 r=await run('2026-10-27T11:00:00.123456+00:00');ok(r.posts===0&&r.dialog,'cloud copy is newer → ask the user, upload nothing ('+JSON.stringify(r)+')')}

console.log('15) recipe balancing + auto-balance');
{const p=await mk();await newProj(p,'كريمة 35% 200\nشوكولاتة داكنة 60% 300\nشراب جلوكوز 30\nسكر محول 30\nزبدة 82% 40');
 ok(await p.evaluate(()=>!!document.querySelector('.bal [data-rbal]')),'balancing panel with product picker');
 await p.selectOption('[data-rbal]','gb');await p.waitForTimeout(500);
 const sc=()=>p.evaluate(()=>(document.querySelector('[data-balscore]')||{dataset:{}}).dataset.balscore);
 const st=await p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('.baltab tr')].map(r=>[r.dataset.balk,r.className])));
 ok(st.water==='bal-hi'&&st.aw==='bal-hi'&&st.cb==='bal-ok','bonbon ganache: water and aw flagged high, cocoa butter ok ('+await sc()+')');
 ok(await p.evaluate(()=>document.querySelectorAll('.baltips li').length)>=2,'tips explain what to change');
 const before=await p.evaluate(()=>[...document.querySelectorAll('[data-rr$="#m"]')].map(i=>+i.value));
 await p.click('[data-bauto]');await p.waitForTimeout(400);ok(await p.evaluate(()=>!!document.querySelector('.balprop [data-bapply]')),'auto-balance shows a proposal before changing anything');
 ok((await p.evaluate(()=>[...document.querySelectorAll('[data-rr$="#m"]')].map(i=>+i.value))).join()===before.join(),'proposal does not touch the recipe yet');
 await p.click('[data-bapply]');await p.waitForTimeout(500);const after=await p.evaluate(()=>[...document.querySelectorAll('[data-rr$="#m"]')].map(i=>+i.value));
 ok(await sc()==='7/7','after applying, every value is in range ('+await sc()+')');ok(after[1]===before[1],'locked chocolate kept its grams ('+after[1]+')');
 await p.evaluate(()=>document.querySelector('[data-tact]').click());await p.waitForTimeout(500);
 ok((await p.evaluate(()=>[...document.querySelectorAll('[data-rr$="#m"]')].map(i=>+i.value))).join()===before.join(),'undo restores the recipe');
 await newProj(p,'whole milk 640\ncream 35% 140\nsugar 140\ndextrose 40\nskim milk powder 35');await p.evaluate(()=>document.querySelector('.bal').open=true);await p.selectOption('[data-rbal]','ic');await p.waitForTimeout(500);
 ok(await sc()==='6/6','classic gelato base is balanced for ice cream ('+await sc()+')');
 ok(p.errs.length===0,'no JS errors')}

console.log('16) share options, cost on demand, chocolate from the label');
{const p=await mk();await newProj(p,'حليب 650\nسكر 135');
 ok(await p.evaluate(()=>!document.getElementById('pj-cost')),'cost card hidden by default');
 await p.click('[data-costtog]');await p.waitForTimeout(400);ok(await p.evaluate(()=>!!document.getElementById('pj-cost')),'cost card shows on demand');
 await p.fill('[data-pp]','9');await p.keyboard.press('Tab');await p.waitForTimeout(300);
 await p.context().grantPermissions(['clipboard-read','clipboard-write']).catch(()=>{});
 await p.click('[data-shr=make]');await p.waitForTimeout(300);ok(await p.evaluate(()=>document.querySelectorAll('#adj [data-sho]').length===3),'share asks what to include');
 await p.uncheck('#adj [data-sho=qty]');await p.click('[data-shgo]');await p.waitForTimeout(800);
 const url=await p.evaluate(async()=>{try{return await navigator.clipboard.readText()}catch(e){const t=document.querySelector('#bkMsg textarea,textarea.field');return t?t.value:''}});
 const tok=(url.match(/#share=(.+)$/)||[])[1];let obj=null;if(tok){obj=await p.evaluate(async t=>{const s=t.slice(1).replace(/-/g,'+').replace(/_/g,'/');const bin=Uint8Array.from(atob(s+'==='.slice((s.length+3)%4)),c=>c.charCodeAt(0));const txt=t[0]==='g'?await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bin);return JSON.parse(txt)},tok)}
 ok(obj&&!obj.p.prices&&obj.p.recs[0].rows.every(z=>z.m===0),'shared link leaves out prices and quantities when asked');
 await newProj(p,'شوكولاتة الشيف 100');await p.evaluate(()=>document.querySelector('[data-umap]').click());await p.waitForTimeout(300);
 await p.evaluate(()=>document.querySelector('[data-ucustom]').click());await p.waitForTimeout(200);
 await p.fill('[data-cv=fat]','38');await p.fill('[data-cv=sugar]','30');await p.evaluate(()=>document.querySelector('[data-ucf] details').open=true);
 await p.check('[data-cchoc]');await p.fill('[data-cv=cocoa]','70');await p.fill('[data-cv=milk]','0');await p.evaluate(()=>document.querySelector('[data-ucsave]').click());await p.waitForTimeout(500);
 const cm=await p.evaluate(()=>JSON.parse(localStorage.getItem('zm-custmat')||'[]').pop());ok(cm&&cm.cat==='choc'&&cm.cb===38&&cm.mf===0,'label chocolate stored with cocoa butter split ('+JSON.stringify(cm&&{cb:cm.cb,mf:cm.mf})+')');
 ok(p.errs.length===0,'no JS errors')}

console.log('17) app interface: home, project list vs workspace, tabs, compare, settings');
{const p=await mk(390);await p.goto(FILE+'#home');await p.waitForTimeout(800);await toAr(p);
 ok(await p.evaluate(()=>!!document.querySelector('#dash .dash-big')&&document.querySelector('#dash').getBoundingClientRect().top<innerHeight/2),'home opens on the app start screen');
 ok(await p.evaluate(()=>getComputedStyle(document.querySelector('#p-home .lab')).display!=='none'&&document.documentElement.scrollHeight>innerHeight*2.5),'the presentation stays below it, so the home page scrolls down');
 await p.evaluate(()=>document.querySelector('[data-dashmore]').click());await p.waitForTimeout(1200);
 ok(await p.evaluate(()=>scrollY>200),'"about the platform" jumps down to it');await p.evaluate(()=>scrollTo(0,0));
 await p.goto(FILE+'#dev');await p.waitForTimeout(700);ok(await p.evaluate(()=>!!document.querySelector('[data-ptype=gb]')),'new project asks the product type');
 await p.fill('#pjn','غاناش');await p.click('[data-ptype=gb]');await p.click('[data-imp=new]');await p.fill('#impta','كريمة 35% 200\nشوكولاتة داكنة 60% 300\nشراب جلوكوز 30\nسكر محول 30\nزبدة 82% 40');await p.click('[data-impgo]');await p.waitForTimeout(400);await p.click('[data-impgo]',{timeout:1200}).catch(()=>{});await p.waitForTimeout(800);
 ok(await p.evaluate(()=>document.getElementById('p-dev').dataset.mode==='ws'&&!document.getElementById('pjn')),'opening a project shows only the workspace');
 ok(await p.evaluate(()=>/5\/7/.test(document.querySelector('.ws-score').innerText)&&document.querySelectorAll('.ws-ind>div').length===4),'summary: score ring + 4 indicators (picked type applied)');
 ok(await p.evaluate(()=>{const r=document.querySelector('.dtab.ingt tbody tr');return r.getBoundingClientRect().height<70}),'one line per ingredient on a phone');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no sideways scroll in the workspace at 390px');
 await p.click('[data-wstab$="#bal"]');await p.waitForTimeout(200);ok(await p.evaluate(()=>document.querySelector('.ws').dataset.tab==='bal'&&getComputedStyle(document.querySelector('[data-pane=bal]')).display!=='none'&&getComputedStyle(document.querySelector('[data-pane=ing]')).display==='none'),'tabs switch panes on a phone');
 await p.click('.ws-score [data-bauto]');await p.waitForTimeout(500);await p.click('[data-bapply]');await p.waitForTimeout(500);
 await p.selectOption('[data-bcmp$="#0"]',{index:1});await p.waitForTimeout(400);
 ok(await p.evaluate(()=>{const t=document.querySelector('.cmpt');return t&&t.rows[0].cells.length===3&&/5\/7/.test(t.innerText)&&/7\/7/.test(t.innerText)}),'compare: current recipe next to the version before balancing (7/7 vs 5/7)');
 await p.click('[data-wsback]');await p.waitForTimeout(400);ok(await p.evaluate(()=>document.getElementById('p-dev').dataset.mode==='list'&&!!document.getElementById('pjn')),'back button returns to the project list');
 await p.evaluate(()=>document.querySelector('[data-pj]').click());await p.waitForTimeout(400);
 await p.evaluate(()=>document.getElementById('bSet').click());await p.waitForTimeout(500);ok(await p.evaluate(()=>!!document.getElementById('bkCard')&&!!document.getElementById('clCard')),'settings button opens backup and account');
 await p.goto(FILE+'#home');await p.waitForTimeout(600);ok(await p.evaluate(()=>!!document.querySelector('.dash-cont')&&/7\/7/.test(document.querySelector('.dash-cont').innerText)),'home: continue card with the balance score');
 ok(p.errs.length===0,'no JS errors '+p.errs.slice(0,2).join('|'))}

console.log('18) scrolling: project opens at the top, back-to-top button');
{const p=await mk(390);await newProj(p,'حليب 650\nسكر 135');
 ok(await p.evaluate(()=>scrollY<5&&document.querySelector('[data-wsback]').getBoundingClientRect().top>0),'after import the project opens at the top (title and back button visible)');
 await p.goto(FILE+'#library');await p.waitForTimeout(700);await p.evaluate(()=>scrollTo(0,6000));await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!document.getElementById('toTop').hidden),'back-to-top button appears on a long page');
 await p.evaluate(()=>document.getElementById('toTop').click());await p.waitForTimeout(1500);ok(await p.evaluate(()=>scrollY<5),'back-to-top returns to the top');
 ok(p.errs.length===0,'no JS errors')}

await b.close();console.log('\n'+pass+' passed, '+fail+' failed');process.exit(fail?1:0)})()
