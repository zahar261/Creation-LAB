/* CREATION LAB diagnostic engine (knowledge base v2).
   Pure functions, no DOM: works in the browser (window.KBE) and in Node (require).
   A recipe is a list of rows: {n: name, g: grams, role: "cream"|"flour"|..., comp: {w, f, s, p}}
   where comp holds the water, fat, sugar and protein fractions (0..1) of that ingredient. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.KBE = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- recipe features ---------- */
  const sumRole = (rows, roles) => rows.reduce((a, r) => a + (roles.includes(r.role) ? +r.g || 0 : 0), 0);
  const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;

  function features(rows) {
    const T = rows.reduce((a, r) => a + (+r.g || 0), 0);
    let W = 0, F = 0, S = 0, P = 0, fp = 0, fg = 0, fw = 0;
    rows.forEach(r => {
      const g = +r.g || 0, c = r.comp || {};
      W += g * (c.w || 0); F += g * (c.f || 0); S += g * (c.s || 0); P += g * (c.p || 0);
      if (r.role === "flour") { fp += g * (c.p || 0); fg += g; fw += g * (c.w || 0); }
    });
    const g = roles => sumRole(rows, [].concat(roles));
    const flour = g("flour"), starch = g("starch"), egg = g("egg"), yolk = g("yolk"), white = g("white");
    const added = g(["sugar", "invert"]) + 0.8 * g(["glucose", "honey"]);
    const pct = v => (T > 0 ? (v / T) * 100 : NaN), per = (v, b) => (b > 0 ? v / b : NaN);
    return {
      tot: T,
      water: pct(W), fat: pct(F), sugar: pct(S), protein: pct(P),
      addedSugar: pct(added),
      /* thickening starch: pure starch plus about 75% of wheat flour (flour is mostly starch) */
      thickPct: pct(starch + 0.75 * flour),
      flourThick: starch + flour > 0 ? flour / (starch + flour) : NaN,
      /* yolk equivalent: a whole egg is about one third yolk by weight */
      yolkPct: pct(yolk + egg / 3),
      bpFlour: per(g("bp") + 3 * g("soda"), flour) * 100,
      sugarFlour: per(added, flour),
      /* added water only: the flour's own moisture does not hydrate gluten or dilute the structure */
      waterFlour: per(W - fw, flour),
      fatFlour: per(F, flour),
      eggFlour: per(egg + yolk + white, flour),
      fatWater: per(F, W),
      /* sugars per gram of water: sucrose saturates near 2 g per g of water at room temperature */
      sugarWater: per(S, W),
      gelPct: pct(g("gelatin")),
      flourProtein: fg > 0 ? (fp / fg) * 100 : NaN,
      has: role => rows.some(r => r.role === role && (+r.g || 0) > 0)
    };
  }

  /* feature labels and units, used in explanations */
  const FEAT = {
    water: { ar: "الماء", en: "water", u: "%" },
    fat: { ar: "الدهون", en: "fat", u: "%" },
    sugar: { ar: "السكريات", en: "sugars", u: "%" },
    addedSugar: { ar: "السكر المضاف", en: "added sugar", u: "%" },
    thickPct: { ar: "النشا (مع الدقيق)", en: "thickening starch", u: "%" },
    flourThick: { ar: "حصة الدقيق من مادة التكثيف", en: "flour share of the thickener", u: "" },
    yolkPct: { ar: "الصفار", en: "yolk", u: "%" },
    bpFlour: { ar: "البيكنج باودر من وزن الدقيق", en: "baking powder on flour weight", u: "%" },
    sugarFlour: { ar: "السكر مقابل الدقيق", en: "sugar to flour", u: "" },
    waterFlour: { ar: "الماء مقابل الدقيق", en: "water to flour", u: "" },
    fatFlour: { ar: "الدهون مقابل الدقيق", en: "fat to flour", u: "" },
    eggFlour: { ar: "البيض مقابل الدقيق", en: "egg to flour", u: "" },
    fatWater: { ar: "الدهون مقابل الماء", en: "fat to water", u: "" },
    sugarWater: { ar: "السكريات مقابل الماء", en: "sugars to water", u: "" },
    gelPct: { ar: "الجيلاتين", en: "gelatine", u: "%" },
    flourProtein: { ar: "بروتين الدقيق", en: "flour protein", u: "%" }
  };
  const fmt = (k, v) => (FEAT[k] && FEAT[k].u === "%" ? r1(v) : r2(v));

  /* ---------- rules ---------- */
  const rangeOf = (rule, ptype) => (rule.range[ptype] || rule.range.default);

  /* state: fire (condition met), near (within 15% of the window from the edge), clear, na (feature missing) */
  function evalRule(rule, F, ctx) {
    const v = F[rule.feat], rg = rangeOf(rule, (ctx && ctx.ptype) || "default");
    if (!rg || !isFinite(v)) return { state: "na" };
    const [lo, hi] = rg, w = (hi - lo) * 0.15;
    let state = "clear";
    if (rule.when === "above") state = v > hi ? "fire" : v > hi - w ? "near" : "clear";
    else if (rule.when === "below") state = v < lo ? "fire" : v < lo + w ? "near" : "clear";
    return { state, v, lo, hi, feat: rule.feat };
  }

  const L = (o, lang) => (o ? o[lang] || o.en || "" : "");
  function ruleText(res, rule, lang) {
    const f = FEAT[res.feat], u = f.u, ar = lang === "ar";
    const v = fmt(res.feat, res.v), lo = fmt(res.feat, res.lo), hi = fmt(res.feat, res.hi);
    const est = rule.evidence === "estimate" ? (ar ? " (نطاق تقديري)" : " (working estimate)") : "";
    const tail = res.state === "clear" ? (ar ? "، فهذا السبب غير مرجّح" : ", so this cause is unlikely") : "";
    return ar
      ? `${f.ar} في وصفتك ${v}${u}، والنطاق المعتاد ${lo}–${hi}${u}${est}${tail}.`
      : `Your ${f.en} is ${v}${u}; the usual range is ${lo}–${hi}${u}${est}${tail}.`;
  }

  /* ---------- fixes (gram changes computed from the user's own quantities) ---------- */
  const clone = rows => rows.map(r => Object.assign({}, r, { comp: Object.assign({}, r.comp) }));
  const roundG = g => (g < 10 ? Math.round(g * 10) / 10 : Math.round(g));

  function targetOf(t, res) {
    if (typeof t === "number") return t;
    if (t && t.rel && res) return (t.rel === "lo" ? res.lo : t.rel === "hi" ? res.hi : (res.lo + res.hi) / 2) + (t.add || 0);
    return NaN;
  }

  /* scale every row of the given roles by k */
  function scaleRoles(rows, roles, k) {
    return rows.map(r => (roles.includes(r.role) ? Object.assign({}, r, { g: (+r.g || 0) * k }) : r));
  }

  /* find k in [0.2, 3] so that feature(feat) reaches target when the roles are scaled by k (bisection) */
  function solve(rows, roles, feat, target) {
    const f = k => features(scaleRoles(rows, roles, k))[feat] - target;
    let a = 0.2, b = 3, fa = f(a), fb = f(b);
    if (!isFinite(fa) || !isFinite(fb) || fa * fb > 0) return null;
    for (let i = 0; i < 50; i++) { const m = (a + b) / 2, fm = f(m); if (fa * fm <= 0) { b = m; fb = fm; } else { a = m; fa = fm; } }
    return (a + b) / 2;
  }

  function applyOp(op, rows, res) {
    const roles = [].concat(op.role || op.from || []);
    const present = rows.some(r => roles.includes(r.role) && (+r.g || 0) > 0);
    if (!present && op.op !== "add") return { ok: false, why: { ar: "المكوّن غير موجود في وصفتك.", en: "That ingredient is not in your recipe." } };
    let out = clone(rows);
    if (op.op === "reach") {
      const t = targetOf(op.target, res), k = solve(out, roles, op.feat, t);
      if (k == null) return { ok: false, why: { ar: "ما يمكن الوصول للنطاق بتعديل هذا المكوّن وحده.", en: "The range cannot be reached by changing this ingredient alone." } };
      out = scaleRoles(out, roles, k);
    } else if (op.op === "ratio") {
      const base = sumRole(out, [].concat(op.base)), cur = sumRole(out, roles);
      if (!(base > 0) || !(cur > 0)) return { ok: false, why: { ar: "ما في أساس للحساب.", en: "Nothing to calculate from." } };
      out = scaleRoles(out, roles, (op.target * base) / cur);
    } else if (op.op === "swap") {
      const moved = sumRole(out, roles) * (op.frac == null ? 1 : op.frac);
      out = scaleRoles(out, roles, 1 - (op.frac == null ? 1 : op.frac));
      out.push({ n: L(op.name, "ar"), ne: L(op.name, "en"), g: moved * op.factor, role: op.to, comp: Object.assign({ w: 0, f: 0, s: 0, p: 0 }, op.comp), added: true });
    }
    out = out.filter(r => (+r.g || 0) > 0.05 || !r.added).map(r => Object.assign(r, { g: roundG(+r.g || 0) }));
    if (out.some(r => r.g < 0)) return { ok: false, why: { ar: "النتيجة فيها كمية سالبة.", en: "The result has a negative amount." } };
    const diff = [];
    out.forEach((r, i) => { const b = r.added ? 0 : +rows[i].g || 0; if (Math.abs(r.g - b) >= 0.1) diff.push({ n: r.n, ne: r.ne || r.n, from: b, to: r.g, d: roundG(r.g - b) }); });
    if (!diff.length) return { ok: false, why: { ar: "وصفتك أصلاً ضمن النطاق.", en: "Your recipe is already in range." } };
    return { ok: true, rows: out, diff, before: features(rows), after: features(out) };
  }

  /* ---------- diagnosis ---------- */
  const CONF = s => (s >= 4 ? "high" : s >= 2 ? "medium" : "low");

  function diagnose(entry, rows, opt) {
    opt = opt || {};
    const F = features(rows || []), ans = opt.answers || {}, sym = opt.symptom || null;
    const out = [];
    entry.causes.forEach(c => {
      if (sym && c.sym && !c.sym.includes(sym)) return;
      let score = c.prior || 0, rule = null, why = [];
      if (c.rule) {
        rule = evalRule(c.rule, F, opt);
        score += { fire: 3, near: 1, clear: -2, na: 0 }[rule.state];
        if (rule.state !== "na") why.push({ ar: ruleText(rule, c.rule, "ar"), en: ruleText(rule, c.rule, "en") });
      }
      Object.keys(ans).forEach(q => {
        const w = c.answers && c.answers[q] && c.answers[q][ans[q]];
        if (!w) return;
        score += w;
        const qq = (entry.questions || []).find(x => x.id === q), o = qq && qq.options.find(x => x.id === ans[q]);
        if (o && w > 0) why.push({ ar: "من إجابتك: " + o.ar + ".", en: "From your answer: " + o.en + "." });
      });
      const fixes = (c.fixes || []).map(fx => {
        if (fx.type !== "recipe") return Object.assign({}, fx);
        if (rule && rule.state === "clear") return Object.assign({}, fx, { result: { ok: false, why: { ar: "وصفتك ضمن النطاق، فما في حاجة لهذا التعديل.", en: "Your recipe is in range, so this change is not needed." } } });
        return Object.assign({}, fx, { result: applyOp(fx.op, rows || [], rule) });
      });
      out.push({ id: c.id, kind: c.kind, title: c.title, why: c.why, evidence: c.evidence, src: c.src, score, conf: CONF(score), rule, explain: why, fixes, verify: c.verify });
    });
    out.sort((a, b) => b.score - a.score);
    const unsure = !out.length || out[0].conf === "low";
    return { features: F, causes: out, unsure, check: unsure ? entry.unsure : null };
  }

  /* combine several symptoms: run each entry and merge, keeping the best score per cause id */
  function diagnoseMany(entries, rows, opt) {
    const all = new Map();
    entries.forEach(e => diagnose(e, rows, opt).causes.forEach(c => {
      const k = e.id + ":" + c.id, prev = all.get(k);
      if (!prev || c.score > prev.score) all.set(k, Object.assign({ entry: e.id }, c));
    }));
    return [...all.values()].sort((a, b) => b.score - a.score);
  }

  return { features, evalRule, applyOp, diagnose, diagnoseMany, FEAT, ruleText };
});
