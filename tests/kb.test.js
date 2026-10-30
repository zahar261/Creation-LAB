#!/usr/bin/env node
/* Unit tests for the diagnostic engine and the five v2 problems.
   Each rule gets three recipes: should fire, should not fire, borderline. */
const KBE = require("../kb/engine.js");
const KB = require("../kb/problems.json");
const P = id => KB.problems.find(p => p.id === id);
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log("  FAIL " + m); } };
const near = (a, b, t) => Math.abs(a - b) <= t;

/* typical compositions (fractions of water, fat, sugar, protein) */
const C = {
  milk: { w: .875, f: .035, s: .048, p: .034 }, cream: { w: .58, f: .35, s: .03, p: .02 },
  yolk: { w: .52, f: .27, s: .006, p: .16 }, egg: { w: .76, f: .10, s: .007, p: .125 },
  sugar: { w: 0, f: 0, s: 1, p: 0 }, starch: { w: .12, f: 0, s: 0, p: 0 },
  flour: { w: .13, f: .012, s: .003, p: .10 }, strong: { w: .13, f: .015, s: .003, p: .13 },
  butter: { w: .16, f: .82, s: .006, p: .009 }, dark: { w: .01, f: .42, s: .29, p: .08 },
  invert: { w: .2, f: 0, s: .8, p: 0 }, glucose: { w: .2, f: 0, s: .8, p: 0 },
  water: { w: 1, f: 0, s: 0, p: 0 }, bp: { w: 0, f: 0, s: 0, p: 0 }
};
const ROLE = { strong: "flour", dark: "chocolate" };
const R = spec => Object.entries(spec).map(([k, g]) => ({ n: k, g, role: ROLE[k] || k, comp: C[k] }));
const state = (id, cause, rows, ptype) => {
  const c = P(id).causes.find(x => x.id === cause);
  return KBE.evalRule(c.rule, KBE.features(rows), { ptype }).state;
};
const trio = (label, id, cause, fire, clear, border, ptype) => {
  ok(state(id, cause, fire, ptype) === "fire", label + ": should fire (" + state(id, cause, fire, ptype) + ")");
  ok(state(id, cause, clear, ptype) === "clear", label + ": should not fire (" + state(id, cause, clear, ptype) + ")");
  ok(state(id, cause, border, ptype) === "near", label + ": borderline should be near (" + state(id, cause, border, ptype) + ")");
};

console.log("kb) rules: fire / clear / borderline");
const pc = s => R(Object.assign({ milk: 1000, sugar: 220, yolk: 180, butter: 50 }, s));
trio("pastry cream starch level", "pastry-cream-grainy", "yolk-scramble", pc({ starch: 50 }), pc({ starch: 80 }), pc({ starch: 66 }));
trio("pastry cream flour share", "pastry-cream-grainy", "flour-thickener", pc({ flour: 90 }), pc({ starch: 80 }), pc({ flour: 45, starch: 50 }));
const ga = s => R(s);
const owner = ga({ dark: 300, cream: 250, glucose: 40, invert: 30, butter: 30 });
trio("ganache water (bonbon)", "ganache-split", "water-low", ga({ dark: 450, cream: 120, butter: 80 }), owner, ga({ dark: 430, cream: 130, butter: 70, invert: 20 }), "gb");
trio("ganache fat (bonbon)", "ganache-split", "fat-high", ga({ dark: 450, cream: 120, butter: 80 }), owner, ga({ dark: 300, cream: 260, butter: 40, invert: 30 }), "gb");
const ck = s => R(Object.assign({ flour: 250, sugar: 250, butter: 200, egg: 200, milk: 100, bp: 10 }, s));
trio("cake baking powder", "cake-sink", "over-leavened", ck({ bp: 16 }), ck({}), ck({ bp: 12.5 }));
trio("cake sugar to flour", "cake-sink", "sugar-high", ck({ sugar: 350 }), ck({}), ck({ sugar: 300 }));
trio("cake liquid to flour", "cake-sink", "liquid-high", ck({ milk: 300 }), ck({}), ck({ milk: 170 }));
const tt = s => R(Object.assign({ flour: 250, butter: 125, sugar: 100, egg: 50 }, s));
trio("tart water to flour", "tart-shell", "liquid-high", tt({ water: 40 }), tt({}), tt({ water: 13 }));
trio("tart fat to flour", "tart-shell", "fat-low", tt({ butter: 80 }), tt({}), tt({ butter: 100 }));
const ttf = p => [{ n: "flour", g: 250, role: "flour", comp: Object.assign({}, C.flour, { p }) }, ...R({ butter: 125, sugar: 100, egg: 50 })];
trio("tart flour protein", "tart-shell", "strong-flour", ttf(.13), ttf(.10), ttf(.108));
const ch = s => R(Object.assign({ water: 250, butter: 100, flour: 150, egg: 250 }, s));
trio("choux egg to flour", "choux-collapse", "paste-wet", ch({ egg: 330 }), ch({}), ch({ egg: 290 }));
trio("choux fat to flour", "choux-collapse", "fat-high", ch({ butter: 160 }), ch({}), ch({ butter: 125 }));
ok(state("ganache-split", "water-low", ga({ dark: 300, cream: 120, butter: 20 }), "gw") === "fire", "ganache ranges follow the product type (whipped ganache needs more water)");

console.log("kb) computed fixes");
const fixOf = (id, cause, rows, opt) => KBE.diagnose(P(id), rows, opt).causes.find(c => c.id === cause).fixes.find(f => f.type === "recipe").result;
{ const r = fixOf("cake-sink", "over-leavened", ck({ bp: 16 }));
  ok(r.ok && r.rows.find(x => x.role === "bp").g === 10, "cake: baking powder set to 4% of 250 g flour = 10 g"); }
{ const r = fixOf("cake-sink", "sugar-high", ck({ sugar: 350 }));
  ok(r.ok && r.rows.find(x => x.role === "sugar").g === 275, "cake: sugar set to 1.1 x flour = 275 g"); }
{ const r = fixOf("ganache-split", "water-low", ga({ dark: 450, cream: 120, butter: 80 }), { ptype: "gb" });
  ok(r.ok && near(r.after.water, 15, 0.2) && r.diff.length === 1 && r.diff[0].n === "cream" && r.diff[0].d > 0, "ganache: cream raised until water reaches 15% (" + (r.after && r.after.water.toFixed(2)) + ")"); }
{ const r = fixOf("ganache-split", "fat-high", ga({ dark: 330, cream: 230, butter: 60, invert: 30 }), { ptype: "gb" });
  ok(r.ok && near(r.after.fat, 39, 0.2), "ganache: cream raised until fat is 39% (" + (r.after && r.after.fat.toFixed(2)) + ")"); }
{ const r = fixOf("tart-shell", "liquid-high", tt({ water: 40 }));
  ok(r.ok && near(r.after.waterFlour, 0.26, 0.01) && r.rows.every(x => x.g >= 0), "tart: water and egg reduced to 0.26 of flour"); }
{ const r = fixOf("pastry-cream-grainy", "flour-thickener", pc({ flour: 90 }));
  ok(r.ok && r.rows.find(x => x.role === "flour").g === 0 && r.rows.find(x => x.added && x.role === "starch").g === 45, "pastry cream: 90 g flour swapped for 45 g cornstarch"); }
{ const r = fixOf("pastry-cream-grainy", "yolk-scramble", pc({ starch: 50 }));
  ok(r.ok && near(r.after.thickPct, 4.5, 0.05), "pastry cream: starch raised to 4.5%"); }
{ const r = fixOf("choux-collapse", "paste-wet", ch({ egg: 330 }));
  ok(r.ok && r.rows.find(x => x.role === "egg").g === 270, "choux: egg set to 1.8 x 150 g flour = 270 g"); }
{ const r = fixOf("cake-sink", "over-leavened", ck({}));
  ok(!r.ok && /in range|ضمن/.test(r.why.en + r.why.ar), "no change is proposed when the recipe is already in range"); }
{ const r = KBE.applyOp({ op: "reach", role: "butter", feat: "fat", target: 30 }, ga({ dark: 450, cream: 120, butter: 80 }), null);
  ok(!r.ok && /cannot be reached/.test(r.why.en), "an unreachable target is reported honestly, not forced"); }
{ const r = KBE.applyOp({ op: "ratio", role: "bp", base: "flour", target: 0.04 }, R({ flour: 200, sugar: 100 }), null);
  ok(!r.ok, "a fix on an ingredient that is not in the recipe is refused"); }

console.log("kb) explanations quote the chef's numbers (both languages)");
{ const d = KBE.diagnose(P("ganache-split"), ga({ dark: 450, cream: 120, butter: 80 }), { ptype: "gb" });
  const c = d.causes.find(x => x.id === "water-low");
  ok(c.explain[0].ar === "الماء في وصفتك 13.4%، والنطاق المعتاد 14–22% (نطاق تقديري).", "Arabic explanation: " + c.explain[0].ar);
  ok(c.explain[0].en === "Your water is 13.4%; the usual range is 14–22% (working estimate).", "English explanation: " + c.explain[0].en); }
{ const d = KBE.diagnose(P("cake-sink"), ck({ bp: 16 }));
  const c = d.causes.find(x => x.id === "over-leavened");
  ok(c.explain[0].en === "Your baking powder on flour weight is 6.4%; the usual range is 3–5%.", "consensus thresholds carry no estimate tag: " + c.explain[0].en); }

console.log("kb) diagnosis ranks causes from recipe and answers");
const top = (id, rows, opt) => KBE.diagnose(P(id), rows, opt).causes;
const seed = [
  ["pastry-cream-grainy", pc({ starch: 80 }), { answers: { boil: "no", when: "cook" } }, "starch-undercooked"],
  ["pastry-cream-grainy", pc({ starch: 80 }), { answers: { when: "beat" } }, "gel-broken"],
  ["pastry-cream-grainy", pc({ starch: 50 }), { answers: { when: "cook", boil: "yes", strain: "yes" } }, "yolk-scramble"],
  ["pastry-cream-grainy", pc({ flour: 90 }), { answers: { boil: "yes", strain: "yes" } }, "flour-thickener"],
  ["ganache-split", owner, { ptype: "gb", answers: { when: "mix", temp: "hot" } }, "too-hot"],
  ["ganache-split", owner, { ptype: "gb", answers: { when: "set", temp: "cold" } }, "too-cold"],
  ["ganache-split", ga({ dark: 450, cream: 120, butter: 80 }), { ptype: "gb", answers: { when: "mix", temp: "ok", tool: "blender" } }, "fat-high"],
  ["ganache-split", owner, { ptype: "gb", answers: { when: "days" } }, "storage-heat"],
  ["cake-sink", ck({ bp: 16 }), { answers: { when: "oven", door: "no", crumb: "ok" } }, "over-leavened"],
  ["cake-sink", ck({}), { answers: { when: "out", door: "no", crumb: "wet" } }, "underbaked"],
  ["cake-sink", ck({}), { answers: { when: "oven", door: "yes", crumb: "ok" } }, "door-opened"],
  ["tart-shell", tt({}), { symptom: "shrink", answers: { rest: "no" } }, "gluten-rest"],
  ["tart-shell", tt({ water: 40 }), { symptom: "shrink", answers: { rest: "yes" } }, "liquid-high"],
  ["tart-shell", tt({}), { symptom: "soggy", answers: { blind: "pale" } }, "underbaked-base"],
  ["choux-collapse", ch({}), { answers: { when: "out", inside: "wet", paste: "v" } }, "underbaked-shell"],
  ["choux-collapse", ch({ egg: 330 }), { answers: { paste: "runny", inside: "dry", when: "oven" } }, "paste-wet"]
];
let t1 = 0, t3 = 0;
seed.forEach(([id, rows, opt, want]) => { const c = top(id, rows, opt).map(x => x.id); if (c[0] === want) t1++; if (c.slice(0, 3).includes(want)) t3++; ok(c.slice(0, 3).includes(want), id + ": expected " + want + " in the top 3, got " + c.slice(0, 3).join(", ")); });
console.log(`  seed cases: top-1 ${t1}/${seed.length}, top-3 ${t3}/${seed.length} (author-written, not yet the expert benchmark)`);
{ const d = KBE.diagnose(P("cake-sink"), ck({}), {});
  ok(d.unsure && /thermometer/.test(d.check.en), "with in-range numbers and no answers the engine says it cannot tell and what to check"); }
{ const d = KBE.diagnose(P("tart-shell"), tt({}), { symptom: "soggy" });
  ok(d.causes.every(c => ["underbaked-base", "wet-filling"].includes(c.id)), "the symptom filter keeps only causes of that symptom"); }
{ const m = KBE.diagnoseMany([P("tart-shell"), P("cake-sink")], tt({}), {});
  ok(m.length > 5 && m[0].score >= m[m.length - 1].score && m.some(c => c.entry === "cake-sink"), "several symptoms combine into one ranked list"); }

console.log(`\nkb: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
