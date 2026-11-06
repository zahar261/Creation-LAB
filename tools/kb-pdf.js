#!/usr/bin/env node
/* Builds a printable Arabic guide of every guided diagnosis in kb/problems.json.
   Usage: node tools/kb-pdf.js <out.pdf> [--html <out.html>]
   Uses the pre-installed Playwright Chromium; nothing is fetched from the network. */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const KB = JSON.parse(fs.readFileSync(path.join(ROOT, "kb/problems.json"), "utf8"));
const KBE = require(path.join(ROOT, "kb/engine.js"));
const out = process.argv[2] || "creation-lab-diagnosis-guide.pdf";
const htmlOut = process.argv.indexOf("--html") > 0 ? process.argv[process.argv.indexOf("--html") + 1] : null;

const CAT = { custard: "الكريمات والكاسترد", cream: "الكريمة المخفوقة وكريمة الزبدة", ganache: "الغاناش", mousse: "الموس", cake: "الكيك", dough: "التارت والعجائن", choux: "الشو", industrial: "التصنيع وظروف الخليج", chocolate: "الشوكولاتة", meringue: "الميرنغ", yeast: "عجائن الخميرة", laminated: "العجائن المورقة", cookies: "الكوكيز", glutenfree: "الخالي من الغلوتين", jam: "المربى والجيلي", caramel: "الكراميل والسكر", glaze: "الجليز", frozen: "الآيس كريم والسوربيه" };
const PT = { gb: "غاناش بونبون", gt: "غاناش تارت", gw: "غاناش مخفوق", ic: "آيس كريم", so: "سوربيه" };
const EV = { established: "علم ثابت", consensus: "إجماع مهني", estimate: "تقدير عمل" };
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ar = o => (o && (o.ar || o.en)) || "";
const fmt = v => (Math.round(v * 100) / 100).toString();
const font = w => "file://" + path.join(ROOT, "fonts", "plex-arabic-" + w + ".woff2");
const fontL = w => "file://" + path.join(ROOT, "fonts", "plex-latin-" + w + ".woff2");

const order = Object.keys(CAT);
const probs = KB.problems.slice().sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
const byCat = order.map(c => [c, probs.filter(p => p.category === c)]).filter(([, l]) => l.length);
const nRules = KB.problems.reduce((n, p) => n + p.causes.filter(c => c.rule).length, 0);
const nCauses = KB.problems.reduce((n, p) => n + p.causes.length, 0);
const nFix = KB.problems.reduce((n, p) => n + p.causes.reduce((m, c) => m + (c.fixes || []).filter(f => f.op).length, 0), 0);
let dt = ""; try { dt = new Date().toLocaleDateString("ar-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric" }); } catch (_) {}

function ruleHtml(r) {
  const F = KBE.FEAT[r.feat] || { ar: r.feat, u: "" };
  const rng = Object.entries(r.range).map(([k, [lo, hi]]) => `<span class="rg"><b>${k === "default" ? "" : esc(PT[k] || k) + ": "}</b><bdi dir="ltr">${fmt(lo)}–${fmt(hi)}${F.u === "%" ? "%" : ""}</bdi></span>`).join("");
  return `<div class="rule"><span class="rl">قاعدة الوصفة</span> ${esc(F.ar)} ${r.when === "below" ? "أقل من" : "أعلى من"} النطاق ${rng} <span class="ev ${r.evidence}">${esc(EV[r.evidence] || r.evidence)}</span>${r.note ? `<div class="rn">${esc(ar(r.note))}</div>` : ""}</div>`;
}
function causeHtml(c, i) {
  return `<div class="cause"><div class="ch"><span class="no">${i + 1}</span><b>${esc(ar(c.title))}</b><span class="kd ${c.kind}">${c.kind === "formula" ? "الوصفة" : "التنفيذ"}</span><span class="ev ${c.evidence}">${esc(EV[c.evidence] || "")}</span><span class="src">${(c.src || []).map(esc).join(" · ")}</span></div>
  <p class="why">${esc(ar(c.why))}</p>${c.rule ? ruleHtml(c.rule) : ""}
  ${(c.fixes || []).map(f => `<div class="fix"><span class="fl">${f.op ? "تعديل محسوب" : "الحل"}</span>${esc(ar(f))}${f.tradeoff ? `<div class="to">المقابل: ${esc(ar(f.tradeoff))}</div>` : ""}</div>`).join("")}
  ${c.verify ? `<div class="vf"><span>تحقّق:</span> ${esc(ar(c.verify))}</div>` : ""}</div>`;
}
function probHtml(p, n) {
  return `<section class="prob"><div class="ph"><span class="pn">${String(n).padStart(2, "0")}</span><span class="pc">${esc(CAT[p.category] || p.category)}</span><span class="st">مسودة · بانتظار مراجعة خبير</span></div>
  <h2>${esc(ar(p.symptom))}</h2><p class="see">${esc(ar(p.see))}</p>
  ${p.questions && p.questions.length ? `<div class="qs"><b>أسئلة تفرّق بين الأسباب</b><ol>${p.questions.map(q => `<li>${esc(ar(q))} <span>${q.options.map(o => esc(ar(o))).join(" / ")}</span></li>`).join("")}</ol></div>` : ""}
  <h3>الأسباب المحتملة</h3>${p.causes.map(causeHtml).join("")}
  <div class="tri"><div><h4>إنقاذ الدفعة</h4><ul>${(p.rescue ? p.rescue.ar : []).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
  <div><h4>الوقاية</h4><ul>${(p.prevent ? p.prevent.ar : []).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div></div>
  ${p.notFormula ? `<p class="nf"><b>متى المشكلة مو من الوصفة:</b> ${esc(ar(p.notFormula))}</p>` : ""}</section>`;
}

const ART = `<svg class="art" viewBox="0 0 600 420" preserveAspectRatio="none"><rect width="600" height="420" fill="#0E2931"/><path d="M0 0H300C240 100 150 170 0 240Z" fill="#12484C"/><path d="M0 0H200C160 70 90 125 0 170Z" fill="#2B7574"/><path d="M0 0H110C90 40 50 75 0 100Z" fill="#12484C"/><path d="M462 0H530C498 150 372 262 0 352V300C330 222 440 128 462 0Z" fill="#E2E2E0"/><path d="M540 0H600V18C562 176 420 296 0 402V362C378 270 508 152 540 0Z" fill="#861211"/></svg>`;

let n = 0;
const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>دليل التشخيص — CREATION LAB</title><style>
@font-face{font-family:PA;src:url(${font(400)});font-weight:400}@font-face{font-family:PA;src:url(${font(600)});font-weight:600}@font-face{font-family:PA;src:url(${font(700)});font-weight:700}
@font-face{font-family:PL;src:url(${fontL(400)});font-weight:400}@font-face{font-family:PL;src:url(${fontL(600)});font-weight:600}@font-face{font-family:PL;src:url(${fontL(700)});font-weight:700}
@page{size:A4;margin:16mm 15mm 16mm}
*{box-sizing:border-box}body{margin:0;font-family:PA,PL,sans-serif;color:#0E2931;font-size:10.2pt;line-height:1.65;-webkit-print-color-adjust:exact;print-color-adjust:exact}
bdi,.src,.pn{font-family:PL,PA}
.cover{height:265mm;position:relative;overflow:hidden;border-radius:6mm;color:#E2E2E0;page-break-after:always;display:flex;flex-direction:column;justify-content:flex-end;padding:18mm 16mm}
.cover{background:#0E2931}.cover .art{position:absolute;top:0;left:0;width:100%;height:58%;z-index:0}.cover>*:not(.art):not(.brand){position:relative;z-index:1}
.brand{position:absolute;z-index:1;top:14mm;left:14mm;font:700 13pt PL;letter-spacing:.3em}.brand span{color:#8CC4C0}
.cover h1{font-size:34pt;line-height:1.15;margin:0 0 4mm;color:#fff}.cover .sub{font-size:13pt;color:#C4CFCE;margin:0 0 9mm;max-width:150mm}
.stats{display:flex;gap:4mm;margin-bottom:9mm}.stats div{border:1px solid #2B4A4F;border-radius:3mm;padding:3mm 5mm;background:#0B2229}.stats b{display:block;font:700 20pt PL}.stats span{font-size:9pt;color:#9DB5B3}
.meta{font-size:9pt;color:#9DB5B3}.meta b{color:#E08A84}
.intro{page-break-after:always}
h1.sec{font-size:20pt;margin:0 0 4mm;border-bottom:2px solid #861211;padding-bottom:2mm;display:inline-block}
.box{border:1px solid #C3CDCC;border-radius:3mm;padding:4mm 5mm;margin:0 0 4mm;background:#F2F2F0}
.box h3{margin:0 0 2mm;font-size:11.5pt}
.legend{display:grid;grid-template-columns:1fr 1fr 1fr;gap:3mm}
.toc{columns:2;column-gap:10mm;font-size:9.6pt}.toc h4{margin:3mm 0 1mm;color:#861211;font-size:10pt;break-after:avoid}.toc div{display:flex;gap:2mm;break-inside:avoid}.toc div span{font-family:PL;color:#4E6466;min-width:7mm}
.prob{page-break-before:always}
.ph{display:flex;align-items:center;gap:3mm;font-size:8.6pt;margin-bottom:1mm}
.pn{background:#0E2931;color:#fff;font-weight:700;border-radius:2mm;padding:.5mm 2.5mm}.pc{color:#2B7574;font-weight:600}.st{margin-inline-start:auto;color:#9A6B12;border:1px solid #D2A24C;border-radius:2mm;padding:0 2mm}
h2{font-size:17pt;margin:1mm 0 1mm;line-height:1.3}.see{color:#3E5658;margin:0 0 3mm}
h3{font-size:11.5pt;margin:4mm 0 2mm;color:#12484C}
.qs{background:#F2F2F0;border-radius:2.5mm;padding:2.5mm 4mm;font-size:9.2pt}.qs ol{margin:1mm 0 0;padding-inline-start:5mm}.qs li span{color:#4E6466}
.cause{border:1px solid #C3CDCC;border-inline-start:3px solid #2B7574;border-radius:2.5mm;padding:2.5mm 4mm;margin:0 0 2.5mm;break-inside:avoid}
.ch{display:flex;align-items:center;gap:2mm;flex-wrap:wrap}.ch b{font-size:11pt}.no{font:700 9pt PL;color:#2B7574}
.kd,.ev{font-size:8pt;border-radius:1.5mm;padding:0 1.8mm;font-weight:600}.kd.formula{background:#12484C;color:#fff}.kd.process{background:#D9DEDC;color:#12484C}
.ev.established{background:#E0EDE5;color:#2F7D4F}.ev.consensus{background:#DCE9E8;color:#12484C}.ev.estimate{background:#F4E9D3;color:#8A5E0E}
.src{margin-inline-start:auto;font-size:8pt;color:#4E6466}
.why{margin:1.2mm 0}
.rule{background:#0E2931;color:#E2E2E0;border-radius:2mm;padding:1.8mm 3mm;margin:1.5mm 0;font-size:9.2pt}.rule .rl{color:#8CC4C0;font-weight:700}.rule .rg{margin-inline-end:2mm}.rule .rg bdi{font-weight:700;color:#fff}.rule .rn{color:#9DB5B3;font-size:8.4pt;margin-top:.8mm}
.fix{margin:1.5mm 0 0;padding-inline-start:3mm;border-inline-start:2px solid #861211}.fix .fl{font-weight:700;color:#861211;margin-inline-end:2mm}.to{color:#4E6466;font-size:8.8pt}
.vf{font-size:8.8pt;color:#3E5658;margin-top:1mm}.vf span{font-weight:700}
.tri{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:3mm;break-inside:avoid}.tri>div{background:#F2F2F0;border-radius:2.5mm;padding:2.5mm 4mm}.tri h4{margin:0 0 1mm;font-size:10pt;color:#12484C}.tri ul{margin:0;padding-inline-start:4.5mm}
.nf{font-size:9.2pt;color:#3E5658;margin-top:3mm}
.srcs{page-break-before:always}.srcs li{margin-bottom:2mm;font-family:PL,PA;direction:ltr;text-align:left;font-size:9pt}
</style></head><body>
<section class="cover">${ART}<div class="brand">CREATION <span>LAB</span></div>
<h1>دليل التشخيص العلمي<br>لمشاكل الحلويات</h1><p class="sub">كل مشكلة بأسبابها المحتملة، وقاعدة تُقرأ من أرقام الوصفة، والتعديل المقترح مع مقابله، وطريقة التحقق، والإنقاذ والوقاية.</p>
<div class="stats"><div><b>${KB.problems.length}</b><span>مشكلة</span></div><div><b>${nCauses}</b><span>سبب</span></div><div><b>${nRules}</b><span>قاعدة وصفة</span></div><div><b>${nFix}</b><span>تعديل محسوب</span></div></div>
<div class="meta">${esc(dt)} · <b>مسودة للمراجعة</b> · ZAHAR ANASS · zaharcreationlab.com</div></section>
<section class="intro"><h1 class="sec">كيف تقرأ الدليل</h1>
<div class="box"><h3>حالة المحتوى</h3>كل المشاكل في هذا الدليل <b>مسودة بانتظار مراجعة خبير</b>. الأرقام المكتوب عليها «تقدير عمل» نطاقات عملية من الخبرة والمراجع، وليست حدوداً قياسية؛ جرّبها على دفعات صغيرة قبل الإنتاج.</div>
<div class="legend"><div class="box"><h3><span class="ev established">علم ثابت</span></h3>مبدأ علمي موثّق في المراجع.</div><div class="box"><h3><span class="ev consensus">إجماع مهني</span></h3>ممارسة متفق عليها بين المحترفين.</div><div class="box"><h3><span class="ev estimate">تقدير عمل</span></h3>نطاق تقريبي يحتاج اعتماد بالتجربة.</div></div>
<div class="box"><h3>أجزاء كل مشكلة</h3><b>أسئلة تفرّق</b> بين الأسباب · <b>الأسباب</b>: من <span class="kd formula">الوصفة</span> أو من <span class="kd process">التنفيذ</span> · <b>قاعدة الوصفة</b>: المؤشر ونطاقه، والمنصة تقارنه بأرقام وصفتك · <b>الحل</b> ومقابله · <b>تحقّق</b>: كيف تتأكد إن هذا هو السبب · <b>إنقاذ الدفعة</b> و<b>الوقاية</b>. المصادر مرقّمة (S1…) وقائمتها في آخر الدليل.</div>
<h1 class="sec" style="margin-top:4mm">المحتويات</h1><div class="toc">${byCat.map(([c, l]) => `<h4>${esc(CAT[c])}</h4>${l.map(p => `<div><span>${String(probs.indexOf(p) + 1).padStart(2, "0")}</span>${esc(ar(p.symptom))}</div>`).join("")}`).join("")}</div></section>
${probs.map(p => probHtml(p, ++n)).join("")}
<section class="srcs"><h1 class="sec">المصادر</h1><ol>${KB.sources.map(s => `<li><b>${esc(s.id)}</b> — ${esc(s.cite)}</li>`).join("")}</ol>
<div class="box" style="direction:rtl;text-align:right;font-family:PA">الشرح مكتوب بصياغة المنصة ولا ينسخ نصوص المراجع. هذا الدليل أداة مساعدة لرئيس الإنتاج، ولا يغني عن التجربة والقياس وقرار الخبير.</div></section>
</body></html>`;

if (htmlOut) fs.writeFileSync(htmlOut, html);
(async () => {
  const { chromium } = require("playwright");
  const b = await chromium.launch();
  const p = await b.newPage();
  const tmp = path.join(path.dirname(path.resolve(out)), ".kb-guide.html");
  fs.writeFileSync(tmp, html);
  await p.goto("file://" + tmp, { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: "<span></span>",
    footerTemplate: '<div style="width:100%;font-size:7.5pt;color:#4E6466;padding:0 15mm;display:flex;justify-content:space-between;font-family:sans-serif"><span>CREATION LAB · Diagnosis guide (draft)</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>' });
  await b.close(); fs.unlinkSync(tmp);
  console.log("wrote " + out);
})();
