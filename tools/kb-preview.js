#!/usr/bin/env node
/* Builds docs/kb-v2-preview.html: a read-only Arabic review page of the v2 problems,
   with one worked example per problem run through the engine. Usage: node tools/kb-preview.js */
const fs = require("fs"), path = require("path");
const KBE = require("../kb/engine.js"), KB = require("../kb/problems.json");
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const SRC = Object.fromEntries(KB.sources.map(s => [s.id, s]));
const EVL = k => (KB.evidence[k] || {}).ar || k;
const CONF = { high: "عالي", medium: "متوسط", low: "منخفض" };

const C = {
  milk: { w: .875, f: .035, s: .048, p: .034 }, cream: { w: .58, f: .35, s: .03, p: .02 }, yolk: { w: .52, f: .27, s: .006, p: .16 },
  egg: { w: .76, f: .10, s: .007, p: .125 }, sugar: { w: 0, f: 0, s: 1, p: 0 }, starch: { w: .12, f: 0, s: 0, p: 0 },
  flour: { w: .13, f: .012, s: .003, p: .10 }, butter: { w: .16, f: .82, s: .006, p: .009 }, dark: { w: .01, f: .42, s: .29, p: .08 },
  invert: { w: .2, f: 0, s: .8, p: 0 }, glucose: { w: .2, f: 0, s: .8, p: 0 }, water: { w: 1, f: 0, s: 0, p: 0 }, bp: { w: 0, f: 0, s: 0, p: 0 }
};
const NAME = { milk: ["حليب", "Milk"], cream: ["كريمة 35%", "Cream 35%"], yolk: ["صفار", "Yolk"], egg: ["بيض", "Egg"], sugar: ["سكر", "Sugar"], starch: ["نشا ذرة", "Cornstarch"], flour: ["دقيق", "Flour"], butter: ["زبدة", "Butter"], dark: ["شوكولاتة داكنة 70%", "Dark chocolate 70%"], invert: ["سكر محوّل", "Invert sugar"], glucose: ["شراب جلوكوز", "Glucose syrup"], water: ["ماء", "Water"], bp: ["بيكنج باودر", "Baking powder"] };
const R = spec => Object.entries(spec).map(([k, g]) => ({ n: NAME[k][0], ne: NAME[k][1], g, role: k === "dark" ? "chocolate" : k, comp: C[k] }));
const EX = {
  "pastry-cream-grainy": { rows: R({ milk: 1000, sugar: 220, yolk: 180, flour: 90, butter: 50 }), opt: { answers: { when: "cook", boil: "yes", strain: "no" } }, say: "باتسيير بالدقيق، الحبيبات ظهرت أثناء الطبخ، غلت، وما انصفّت." },
  "ganache-split": { rows: R({ dark: 300, cream: 250, glucose: 40, invert: 30, butter: 30 }), opt: { ptype: "gb", answers: { when: "mix", temp: "hot", tool: "whisk" } }, say: "غاناش التوت (وصفتك)، انفصل أثناء الخلط فوق 45°م بالمضرب اليدوي." },
  "cake-sink": { rows: R({ flour: 250, sugar: 300, butter: 200, egg: 200, milk: 120, bp: 16 }), opt: { answers: { when: "oven", door: "no", crumb: "ok" } }, say: "كيك زبدة، هبط داخل الفرن، ما انفتح الباب، والوسط مخبوز." },
  "tart-shell": { rows: R({ flour: 250, butter: 110, sugar: 100, egg: 60, water: 30 }), opt: { symptom: "shrink", answers: { sym: "shrink", rest: "yes" } }, say: "عجينة تارت، انكمشت، والعجينة ارتاحت 30 دقيقة." },
  "choux-collapse": { rows: R({ water: 250, butter: 100, flour: 150, egg: 320 }), opt: { answers: { when: "out", inside: "wet", paste: "runny" } }, say: "شو، هبط أول ما طلع، الداخل رطب، والعجينة كانت سائلة." }
};

const srcs = l => (l || []).map(id => `<a href="#src-${id}" class="s">[${id.slice(1)}]</a>`).join("");
const ev = e => `<span class="ev ev-${e}">${esc(EVL(e))}</span>`;
const list = a => `<ul>${(a || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;

function demo(p) {
  const ex = EX[p.id]; if (!ex) return "";
  const d = KBE.diagnose(p, ex.rows, ex.opt);
  const rows = ex.rows.map(r => `<tr><td>${esc(r.n)}</td><td class="n">${r.g}</td></tr>`).join("");
  const causes = d.causes.slice(0, 3).map((c, i) => {
    const fx = c.fixes.find(f => f.type === "recipe" && f.result && f.result.ok);
    return `<li><b>${i + 1}. ${esc(c.title.ar)}</b> <span class="cf cf-${c.conf}">${CONF[c.conf]}</span>${c.explain.map(e => `<div class="ex">${esc(e.ar)}</div>`).join("")}${fx ? `<div class="fx"><span>التعديل المحسوب:</span> ${fx.result.diff.map(x => `${esc(x.n)} من <span class="n">${x.from}</span> إلى <span class="n">${x.to}</span> غ`).join("، ")}</div>` : ""}</li>`;
  }).join("");
  return `<div class="demo"><div class="dh">مثال حي من المحرك</div><p class="say">${esc(ex.say)}</p><table class="rc">${rows}</table><ol class="rk">${causes}</ol></div>`;
}

function problem(p) {
  const qs = p.questions.map(q => `<li>${esc(q.ar)} <span class="opts">${q.options.map(o => esc(o.ar)).join(" · ")}</span></li>`).join("");
  const cs = p.causes.map(c => `<section class="cause"><h3>${esc(c.title.ar)} <span class="kind">${c.kind === "formula" ? "الوصفة" : "التنفيذ"}</span> ${ev(c.evidence)} ${srcs(c.src)}</h3>
    <p>${esc(c.why.ar)}</p>
    ${c.rule ? `<p class="rule"><b>القاعدة على وصفتك:</b> ${esc(KBE.FEAT[c.rule.feat].ar)} ${c.rule.when === "above" ? "أعلى من" : "أقل من"} النطاق ${Object.entries(c.rule.range).map(([k, v]) => `${k === "default" ? "" : esc(k) + ": "}<span class="n">${v[0]}–${v[1]}</span>`).join("، ")} ${ev(c.rule.evidence)} ${srcs(c.rule.src)}${c.rule.note ? `<br><small>${esc(c.rule.note.ar)}</small>` : ""}</p>` : ""}
    ${c.fixes.map(f => `<div class="fix"><b>${f.type === "recipe" ? "تعديل الوصفة (محسوب بالغرام)" : "تعديل التنفيذ"}:</b> ${esc(f.ar)} ${ev(f.evidence)} ${srcs(f.src)}<div class="to"><b>الثمن:</b> ${esc(f.tradeoff.ar)}</div></div>`).join("")}
    <p class="ver"><b>كيف تتأكد في التجربة الجاية:</b> ${esc(c.verify.ar)}</p></section>`).join("");
  return `<article id="${p.id}"><header><h2>${esc(p.symptom.ar)}</h2><span class="st">مسودة، بانتظار مراجع</span></header>
  <p class="see">${esc(p.see.ar)}</p><p class="syn"><b>كلمات يكتبها الشيف:</b> ${p.symptom.syn.ar.map(esc).join("، ")}</p>
  <h4>الأسئلة (ضغطة وحدة لكل سؤال)</h4><ol class="qs">${qs}</ol>
  <h4>الأسباب المحتملة</h4>${cs}
  <h4>أنقذ الدفعة الحين</h4>${list(p.rescue.ar)}${p.rescue.safety ? `<p class="safe"><b>سلامة الغذاء:</b> ${esc(p.rescue.safety.ar)} ${srcs(p.rescue.safety.src)}</p>` : ""}
  <h4>الوقاية</h4>${list(p.prevent.ar)}
  <p class="nf"><b>متى المشكلة مو من الوصفة:</b> ${esc(p.notFormula.ar)}</p>
  ${demo(p)}</article>`;
}

const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>مراجعة قاعدة المعرفة</title><style>
:root{--bg:#141012;--s1:#1C1719;--s2:#241E20;--line:#3A3134;--ink:#F2EEE9;--ink2:#B9B0A8;--acc:#A3223F;--ok:#5FA37A;--watch:#D2A24C;--bad:#D9644F}
@media (prefers-color-scheme:light){:root:not([data-theme="dark"]){--bg:#F7F5F2;--s1:#fff;--s2:#F1EEEA;--line:#E2DDD6;--ink:#1D1A1B;--ink2:#5E5753;--acc:#8E1A33;--ok:#2F7D4F;--watch:#9A6B12;--bad:#B23A26}}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.7 "IBM Plex Sans Arabic","Segoe UI",Tahoma,sans-serif}
.w{max-width:860px;margin:0 auto;padding:16px}h1{font-size:22px;margin:8px 0 4px}h2{font-size:19px;margin:0}h3{font-size:15px;margin:0 0 4px}h4{font-size:14px;color:var(--ink2);margin:18px 0 6px}
.lead{color:var(--ink2);margin:0 0 12px}nav{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 18px}nav a{color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:6px 10px;text-decoration:none;font-size:14px;min-height:32px}
article{background:var(--s1);border:1px solid var(--line);border-radius:10px;padding:16px;margin:0 0 18px}article header{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}
.st{font-size:12px;color:var(--watch);border:1px solid var(--watch);border-radius:12px;padding:1px 8px}.see{margin:6px 0}.syn{color:var(--ink2);font-size:13px;margin:0}
.cause{border-top:1px solid var(--line);padding:10px 0}.cause p{margin:4px 0}.kind{font-size:12px;color:var(--ink2);border:1px solid var(--line);border-radius:4px;padding:0 6px;font-weight:400}
.ev{font-size:11.5px;border-radius:4px;padding:0 6px;font-weight:400;white-space:nowrap}.ev-established{color:var(--ok);border:1px solid var(--ok)}.ev-consensus{color:var(--ink2);border:1px solid var(--line)}.ev-estimate{color:var(--watch);border:1px dashed var(--watch)}
.s{color:var(--acc);text-decoration:none;font-size:12px;margin-inline-start:3px}.rule{background:var(--s2);border-radius:6px;padding:6px 10px;font-size:14px}.rule small{color:var(--ink2)}
.fix{margin:6px 0;font-size:14px}.to{color:var(--ink2);font-size:13px}.ver{font-size:14px;color:var(--ink2)}.n{direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums}
.qs li,.opts{font-size:14px}.opts{color:var(--ink2);display:block}.safe{border-inline-start:3px solid var(--bad);padding-inline-start:10px;font-size:14px}.nf{font-size:14px;background:var(--s2);border-radius:6px;padding:6px 10px}
.demo{border:1px solid var(--acc);border-radius:8px;padding:12px;margin-top:14px}.dh{font-weight:600;color:var(--acc);font-size:14px}.say{margin:4px 0 8px;font-size:14px}
.rc{border-collapse:collapse;font-size:13.5px;margin-bottom:6px}.rc td{padding:2px 10px 2px 0;border-bottom:1px solid var(--line)}.rk{padding-inline-start:0;list-style:none;margin:0}.rk li{padding:6px 0;border-top:1px solid var(--line)}
.ex{font-size:13.5px;color:var(--ink2)}.fx{font-size:13.5px}.fx span:first-child{color:var(--ok)}.cf{font-size:12px;border-radius:4px;padding:0 6px}.cf-high{color:var(--bad);border:1px solid var(--bad)}.cf-medium{color:var(--watch);border:1px solid var(--watch)}.cf-low{color:var(--ink2);border:1px solid var(--line)}
.refs li{font-size:13px;color:var(--ink2);direction:ltr;text-align:left}ul,ol{margin:4px 0;padding-inline-start:20px}
</style></head><body><div class="w">
<h1>مراجعة قاعدة المعرفة: أول 5 مشاكل</h1>
<p class="lead">نسخة للمراجعة فقط، ولسه ما دخلت المنصة. كل سبب معه مصدر ودرجة ثقة، وكل إصلاح معه ثمنه وطريقة التأكد منه. الأرقام اللي عليها «تقدير عمل» تحتاج اعتماد مراجع قبل ما تنعرض كحقيقة.</p>
<p class="lead">درجات الثقة: ${ev("established")} مبني على كتب علم الغذاء · ${ev("consensus")} ممارسة مهنية متفق عليها · ${ev("estimate")} رقم تقديري يحتاج اعتماد.</p>
<nav>${KB.problems.map(p => `<a href="#${p.id}">${esc(p.symptom.ar)}</a>`).join("")}</nav>
${KB.problems.map(problem).join("")}
<article><h2>المصادر</h2><ol class="refs">${KB.sources.map(s => `<li id="src-${s.id}">[${s.id.slice(1)}] ${esc(s.cite)}</li>`).join("")}</ol>
<p class="lead" style="margin-top:8px">النصوص مكتوبة بصياغتنا، وما فيها نسخ من الكتب أو الدورات.</p></article>
</div></body></html>`;
fs.writeFileSync(path.join(__dirname, "..", "docs", "kb-v2-preview.html"), html);
console.log("wrote docs/kb-v2-preview.html");
