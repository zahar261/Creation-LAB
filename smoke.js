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

await b.close();console.log('\n'+pass+' passed, '+fail+' failed');process.exit(fail?1:0)})()
