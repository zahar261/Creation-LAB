// Usage: node tests/smoke.js [path/to/index.html]   — exits 1 if anything fails
const {chromium}=require('playwright');const path=require('path');
const FILE='file://'+path.resolve(process.argv[2]||path.join(__dirname,'index.html'));
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)}};
(async()=>{const b=await chromium.launch();
const mk=async(w=1000)=>{const c=await b.newContext({viewport:{width:w,height:900}});const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));await p.addInitScript(()=>{try{localStorage.setItem('zm-welcome','1')}catch(e){}window.print=()=>{window.__printed=(window.__printed||0)+1}});return p};
const toAr=async p=>{if(await p.evaluate(()=>document.documentElement.lang)!=='ar'){await p.evaluate(()=>document.getElementById('bLang').click());await p.waitForTimeout(400)}};
const newProj=async(p,txt)=>{await p.goto(FILE+'#dev');await p.waitForTimeout(900);await toAr(p);await p.fill('#pjn','اختبار');await p.click('[data-imp=new]');await p.fill('#impta',txt);await p.click('[data-impgo]');await p.waitForTimeout(400);await p.click('[data-impgo]',{timeout:1200}).catch(()=>{});await p.waitForTimeout(800)};

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
 const T=()=>p.evaluate(()=>{document.querySelectorAll('.nutr').forEach(d=>d.open=true);const d=document.querySelector('.nutr');return d.innerText.replace(/\s+/g,' ')});
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
 await p.check('[data-rbk]');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>/Baker|الخباز|flour|دقيق/i.test(document.querySelector('.recb .dtab tr').innerText)),"baker's % can be switched on");
 ok(p.errs.length===0,'no JS errors')}

await b.close();console.log('\n'+pass+' passed, '+fail+' failed');process.exit(fail?1:0)})()
