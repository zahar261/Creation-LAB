#!/usr/bin/env node
/* Validates kb/problems.json. Rejects any entry missing a source, a testable rule,
   a trade-off on every fix or a verification step. Usage: node tools/validate-kb.js [file] */
const fs = require("fs"), path = require("path");
const KBE = require("../kb/engine.js");
const file = process.argv[2] || path.join(__dirname, "..", "kb", "problems.json");
const kb = JSON.parse(fs.readFileSync(file, "utf8"));
const errs = [], warn = [];
const EV = new Set(Object.keys(kb.evidence || {}));
const SRC = new Set((kb.sources || []).map(s => s.id));
const OPS = new Set(["reach", "ratio", "swap"]);
const bi = (o, where) => { if (!o || typeof o.ar !== "string" || !o.ar.trim() || typeof o.en !== "string" || !o.en.trim()) errs.push(where + ": needs Arabic and English text"); };
const src = (list, where) => {
  if (!Array.isArray(list) || !list.length) return errs.push(where + ": no source");
  list.forEach(s => { if (!SRC.has(s)) errs.push(where + ": unknown source " + s); });
};
const ev = (e, where) => { if (!EV.has(e)) errs.push(where + ": evidence must be one of " + [...EV].join(", ")); };

["established", "consensus", "estimate"].forEach(k => { if (!EV.has(k)) errs.push("evidence level missing: " + k); });
(kb.sources || []).forEach(s => { if (!s.cite || !s.type) errs.push("source " + s.id + ": needs cite and type"); });

const ids = new Set();
let nCause = 0, nRule = 0, nEst = 0, nFix = 0, nRecipe = 0;
(kb.problems || []).forEach(p => {
  const at = "problem " + p.id;
  if (!p.id || ids.has(p.id)) errs.push(at + ": missing or duplicate id"); ids.add(p.id);
  if (!p.category) errs.push(at + ": no category");
  if (!["draft", "reviewed"].includes(p.status)) errs.push(at + ": status must be draft or reviewed");
  if (p.status === "reviewed" && !(p.reviewedBy && p.reviewedBy.name && p.reviewedBy.date)) errs.push(at + ": reviewed entries need reviewedBy.name and date");
  bi(p.symptom, at + " symptom");
  if (!p.symptom || !p.symptom.syn || !(p.symptom.syn.ar || []).length || !(p.symptom.syn.en || []).length) errs.push(at + ": needs Arabic and English synonyms");
  bi(p.see, at + " see"); bi(p.notFormula, at + " notFormula"); bi(p.unsure, at + " unsure");
  ["rescue", "prevent"].forEach(k => { if (!p[k] || !(p[k].ar || []).length || (p[k].ar || []).length !== (p[k].en || []).length) errs.push(at + " " + k + ": needs matching Arabic and English lists"); });
  if (p.rescue && p.rescue.safety) { bi(p.rescue.safety, at + " safety"); src(p.rescue.safety.src, at + " safety"); }

  const qs = p.questions || [];
  if (qs.length > 3) errs.push(at + ": at most three questions");
  const qmap = {};
  qs.forEach(q => { bi(q, at + " question " + q.id); if (!(q.options || []).length || q.options.length < 2) errs.push(at + " question " + q.id + ": needs two or more options"); (q.options || []).forEach(o => bi(o, at + " option " + q.id + "." + o.id)); qmap[q.id] = new Set((q.options || []).map(o => o.id)); });

  const causes = p.causes || [];
  if (causes.length < 3) errs.push(at + ": needs at least three causes (differential diagnosis)");
  if (!causes.some(c => c.rule)) errs.push(at + ": needs at least one rule tested on the recipe");
  if (!causes.some(c => c.kind === "process")) errs.push(at + ": needs at least one process cause");
  causes.forEach(c => {
    nCause++;
    const ca = at + " cause " + c.id;
    if (!["formula", "process", "equipment"].includes(c.kind)) errs.push(ca + ": kind must be formula, process or equipment");
    bi(c.title, ca + " title"); bi(c.why, ca + " why"); bi(c.verify, ca + " verify");
    ev(c.evidence, ca); src(c.src, ca);
    if (!c.rule && !Object.keys(c.answers || {}).length) errs.push(ca + ": a cause with no rule needs question weights");
    Object.entries(c.answers || {}).forEach(([q, m]) => {
      if (!qmap[q]) return errs.push(ca + ": answer refers to unknown question " + q);
      Object.keys(m).forEach(o => { if (!qmap[q].has(o)) errs.push(ca + ": unknown option " + q + "." + o); });
    });
    if (c.rule) {
      nRule++;
      const r = c.rule;
      if (!KBE.FEAT[r.feat]) errs.push(ca + ": unknown feature " + r.feat);
      if (!["above", "below"].includes(r.when)) errs.push(ca + ": rule.when must be above or below");
      Object.entries(r.range || {}).forEach(([k, v]) => { if (!Array.isArray(v) || v.length !== 2 || !(v[0] < v[1])) errs.push(ca + ": bad range " + k); });
      if (!r.range || !r.range.default) errs.push(ca + ": rule needs a default range");
      ev(r.evidence, ca + " rule"); src(r.src, ca + " rule");
      if (r.evidence === "estimate") { nEst++; if (!r.note) warn.push(ca + ": estimated threshold without a note"); }
    }
    if (!(c.fixes || []).length) errs.push(ca + ": needs at least one fix");
    (c.fixes || []).forEach((f, i) => {
      nFix++;
      const fa = ca + " fix " + (i + 1);
      bi(f, fa); bi(f.tradeoff, fa + " trade-off"); ev(f.evidence, fa); src(f.src, fa);
      if (!["recipe", "process"].includes(f.type)) errs.push(fa + ": type must be recipe or process");
      if (f.type === "recipe") { nRecipe++; if (!f.op || !OPS.has(f.op.op)) errs.push(fa + ": recipe fix needs op of " + [...OPS].join("/")); }
    });
  });
});

console.log(`kb: ${ids.size} problems, ${nCause} causes, ${nRule} rules (${nEst} working estimates), ${nFix} fixes (${nRecipe} computed)`);
warn.forEach(w => console.log("  warn " + w));
if (errs.length) { errs.forEach(e => console.log("  FAIL " + e)); process.exit(1); }
console.log("  ok   every entry has sources, a rule, trade-offs and verification");
