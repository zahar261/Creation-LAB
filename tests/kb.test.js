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
  water: { w: 1, f: 0, s: 0, p: 0 }, bp: { w: 0, f: 0, s: 0, p: 0 },
  white: { w: .88, f: 0, s: .007, p: .11 }, gelatin: { w: .12, f: 0, s: 0, p: .86 },
  cheese: { w: .55, f: .34, s: .03, p: .06 }, cocoabutter: { w: 0, f: 1, s: 0, p: 0 },
  salt: { w: 0, f: 0, s: 0, p: 0 }, yeast: { w: .05, f: 0, s: 0, p: .4 }, yeastfresh: { w: .7, f: 0, s: 0, p: .12 }, binder: { w: .1, f: 0, s: 0, p: 0 }, fruit: { w: .86, f: 0, s: .07, p: .01 }
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


console.log("kb) rules for creams and ganache (batch 2)");
trio("pastry cream thin: starch", "pastry-cream-thin", "starch-low", pc({ starch: 50 }), pc({ starch: 80 }), pc({ starch: 66 }));
const an = s => R(Object.assign({ milk: 500, cream: 500, yolk: 200 }, s));
trio("anglaise sugar", "anglaise-curdled", "sugar-low", an({ sugar: 60 }), an({ sugar: 200 }), an({ sugar: 120 }));
const wc = s => R(Object.assign({ cream: 500, sugar: 40 }, s));
trio("whipped cream fat", "whipped-cream-fail", "fat-low", wc({ milk: 200 }), wc({}), wc({ milk: 70 }));
const bc = s => R(Object.assign({ butter: 500, white: 150, sugar: 250 }, s));
trio("buttercream fat to water", "buttercream-split", "water-high", bc({ water: 150 }), bc({}), bc({ water: 50 }));
const ms = g => R({ cream: 500, milk: 200, sugar: 100, dark: 200, gelatin: g });
trio("mousse gelatine", "mousse-not-set", "gelatin-low", ms(4), ms(8), ms(7));
trio("ganache soft: water (bonbon)", "ganache-soft", "water-high", owner, ga({ dark: 450, cream: 120, butter: 80 }), ga({ dark: 350, cream: 200, butter: 30, invert: 20 }), "gb");
trio("ganache grainy: sugar to water", "ganache-grainy", "sugar-crystal", ga({ dark: 450, cream: 100, sugar: 60 }), owner, ga({ dark: 450, cream: 130, sugar: 20 }));
const cb = s => R(Object.assign({ sugar: 100 }, s));
trio("baked custard yolk", "baked-custard-fail", "egg-low", cb({ cream: 700, milk: 300, yolk: 60 }), cb({ cream: 500, yolk: 100 }), cb({ cream: 500, yolk: 60, sugar: 60 }));

console.log("kb) batch 2 fixes");
{ const r = fixOf("whipped-cream-fail", "fat-low", wc({ milk: 200 }));
  ok(r.ok && near(r.after.fat, 30, 0.1) && r.diff[0].d < 0, "whipped cream: milk reduced until fat is 30%"); }
{ const r = fixOf("buttercream-split", "water-high", bc({ water: 150 }));
  ok(r.ok && near(r.after.fatWater, 1.6, 0.02), "buttercream: butter raised to fat 1.6 x water"); }
{ const r = fixOf("mousse-not-set", "gelatin-low", ms(4));
  ok(r.ok && near(r.after.gelPct, 0.9, 0.05) && r.rows.find(x => x.role === "gelatin").g > 4, "mousse: gelatine raised to 0.9%"); }
{ const r = fixOf("ganache-soft", "water-high", owner, { ptype: "gb" });
  ok(r.ok && near(r.after.water, 21, 0.2) && r.diff[0].n === "cream" && r.diff[0].d < 0, "soft ganache: cream reduced until water is 21% (" + (r.after && r.after.water.toFixed(2)) + ")"); }
{ const d = KBE.diagnose(P("ganache-grainy"), ga({ dark: 450, cream: 100, sugar: 60 }), {}), c = d.causes.find(x => x.id === "sugar-crystal");
  const sw = c.fixes[0].result, rc = c.fixes[1].result;
  ok(sw.ok && sw.rows.find(x => x.added && x.role === "invert").g === 30 && sw.rows.find(x => x.role === "sugar").g === 30, "grainy ganache: half the sugar swapped for invert sugar");
  ok(rc.ok && near(rc.after.sugarWater, 1.8, 0.02), "grainy ganache: or cream raised until sugars are 1.8 x water"); }
{ const r = fixOf("baked-custard-fail", "egg-low", cb({ cream: 700, milk: 300, yolk: 60 }));
  ok(r.ok && near(r.after.yolkPct, 10, 0.1), "baked custard: yolk raised to 10%"); }
{ const d = KBE.diagnose(P("ganache-grainy"), ga({ dark: 450, cream: 100 }), {}), c = d.causes.find(x => x.id === "sugar-crystal");
  ok(!c.fixes[0].result.ok && c.fixes[1].result.ok, "with no added sugar the invert swap is refused and the cream fix is offered"); }

console.log("kb) batch 2 diagnosis");
const seed2 = [
  ["pastry-cream-thin", pc({ starch: 80 }), { answers: { when: "later", boil: "no" } }, "amylase"],
  ["anglaise-curdled", an({ sugar: 200 }), { answers: { temp: "hot", heat: "direct" } }, "overheated"],
  ["whipped-cream-fail", wc({}), { answers: { result: "butter", speed: "high" } }, "overwhipped"],
  ["buttercream-split", bc({}), { answers: { look: "soupy", meringue: "warm" } }, "too-warm"],
  ["mousse-not-set", ms(8), { answers: { fruit: "fresh", time: "long" } }, "enzymes"],
  ["ganache-soft", owner, { ptype: "gb", answers: { choc: "dark", set: "good", use: "cut" } }, "water-high"],
  ["ganache-soft", ga({ dark: 450, cream: 120, butter: 80 }), { ptype: "gb", answers: { choc: "milk", set: "good" } }, "milk-fat"],
  ["ganache-grainy", ga({ dark: 450, cream: 100, sugar: 60 }), { answers: { feel: "sandy", when: "days" } }, "sugar-crystal"],
  ["ganache-grainy", owner, { answers: { feel: "waxy", temp: "cycle" } }, "fat-bloom"],
  ["baked-custard-fail", cb({ cream: 500, yolk: 100 }), { answers: { result: "holes", bake: "hot", jiggle: "firm" } }, "overbaked"]
];
seed2.forEach(([id, rows, opt, want]) => { const c = top(id, rows, opt).map(x => x.id); if (c[0] === want) t1++; if (c.slice(0, 3).includes(want)) t3++; ok(c.slice(0, 3).includes(want), id + ": expected " + want + " in the top 3, got " + c.slice(0, 3).join(", ")); });
console.log(`  all seed cases: top-1 ${t1}/${seed.length + seed2.length}, top-3 ${t3}/${seed.length + seed2.length}`);

console.log("kb) rules for cakes, tarts, cookies and choux (batch 3)");
trio("dry cake: sugar", "cake-dry", "sugar-low", ck({ sugar: 150 }), ck({}), ck({ sugar: 210 }));
trio("dry cake: fat", "cake-dry", "fat-low", ck({ butter: 100 }), ck({}), ck({ butter: 140 }));
trio("dry cake: liquid", "cake-dry", "liquid-low", ck({ milk: 0 }), ck({}), ck({ milk: 30 }));
trio("dense cake: baking powder", "cake-dense", "bp-low", ck({ bp: 5 }), ck({}), ck({ bp: 8 }));
trio("domed cake: liquid", "cake-dome-crack", "liquid-low", ck({ milk: 0 }), ck({}), ck({ milk: 30 }));
const gn = s => R(Object.assign({ egg: 200, sugar: 125, flour: 125 }, s));
trio("genoise: egg", "genoise-fail", "egg-low", gn({ egg: 150 }), gn({}), gn({ egg: 180 }));
trio("tart crack: liquid", "tart-crack", "liquid-low", tt({ egg: 20 }), tt({}), tt({ egg: 37 }));
trio("tart crack: fat", "tart-crack", "fat-high", tt({ butter: 200 }), tt({}), tt({ butter: 170 }));
const cc = s => R(Object.assign({ flour: 280, sugar: 300, butter: 226, egg: 100 }, s));
trio("cookies: sugar", "cookies-spread", "sugar-high", cc({ sugar: 380 }), cc({}), cc({ sugar: 320 }));
trio("cookies: fat", "cookies-spread", "fat-high", cc({ butter: 330 }), cc({}), cc({ butter: 255 }));
trio("choux crack: egg", "choux-crack", "paste-dry", ch({ egg: 200 }), ch({}), ch({ egg: 234 }));
const cs = s => R(Object.assign({ cheese: 850, sugar: 230 }, s));
trio("cheesecake: egg to cheese", "cheesecake-crack", "egg-high", cs({ egg: 450 }), cs({ egg: 200 }), cs({ egg: 360 }));

console.log("kb) batch 3 fixes");
{ const r = fixOf("cake-dry", "sugar-low", ck({ sugar: 150 }));
  ok(r.ok && r.rows.find(x => x.role === "sugar").g === 250, "dry cake: sugar raised to the flour weight (250 g)"); }
{ const r = fixOf("cake-dense", "bp-low", ck({ bp: 5 }));
  ok(r.ok && r.rows.find(x => x.role === "bp").g === 10, "dense cake: baking powder raised to 4% (10 g)"); }
{ const r = fixOf("genoise-fail", "egg-low", gn({ egg: 150 }));
  ok(r.ok && r.rows.find(x => x.role === "egg").g === 200, "genoise: egg set to 1.6 x 125 g flour = 200 g"); }
{ const r = fixOf("tart-crack", "liquid-low", tt({ egg: 20 }));
  ok(r.ok && near(r.after.waterFlour, 0.22, 0.01), "tart crack: egg raised to water 0.22 of flour"); }
{ const r = fixOf("cookies-spread", "fat-high", cc({ butter: 330 }));
  ok(r.ok && near(r.after.fatFlour, 0.75, 0.01) && r.diff[0].d < 0, "cookies: butter reduced to fat 0.75 of flour"); }
{ const r = fixOf("cheesecake-crack", "egg-high", cs({ egg: 450 }));
  ok(r.ok && near(r.rows.find(x => x.role === "egg").g, 297.5, 1), "cheesecake: egg set to 35% of 850 g cheese"); }

console.log("kb) batch 3 diagnosis");
const seed3 = [
  ["cake-dry", ck({}), { answers: { bake: "long", when: "fresh", store: "wrapped" } }, "overbaked"],
  ["cake-dry", ck({}), { answers: { bake: "ok", when: "nextday", store: "open" } }, "storage"],
  ["cake-dense", ck({}), { answers: { butter: "cold", mix: "brief", agent: "fresh" } }, "creaming"],
  ["cake-dense", ck({ bp: 5 }), { answers: { butter: "soft", mix: "brief" } }, "bp-low"],
  ["cake-dome-crack", ck({}), { answers: { oven: "hot", pan: "ok" } }, "oven-hot"],
  ["genoise-fail", gn({}), { answers: { whip: "thin", fold: "gentle" } }, "underwhipped"],
  ["tart-crack", tt({}), { answers: { temp: "cold", mix: "smooth" } }, "too-cold"],
  ["cookies-spread", cc({}), { answers: { butter: "melted", chill: "no", tray: "warm" } }, "butter-warm"],
  ["choux-crack", ch({ egg: 200 }), { answers: { paste: "stiff", oven: "mod" } }, "paste-dry"],
  ["cheesecake-crack", cs({ egg: 200 }), { answers: { mix: "slow", bake: "hot", cool: "slow" } }, "oven"]
];
seed3.forEach(([id, rows, opt, want]) => { const c = top(id, rows, opt).map(x => x.id); if (c[0] === want) t1++; if (c.slice(0, 3).includes(want)) t3++; ok(c.slice(0, 3).includes(want), id + ": expected " + want + " in the top 3, got " + c.slice(0, 3).join(", ")); });
console.log(`  all seed cases: top-1 ${t1}/${seed.length + seed2.length + seed3.length}, top-3 ${t3}/${seed.length + seed2.length + seed3.length}`);

console.log("kb) rules for production and Gulf conditions (batch 4)");
const fz = sg => R({ milk: 1000, sugar: sg, starch: 60 });
trio("freeze-thaw: sugar to water", "freeze-thaw-weep", "sugar-low", fz(100), fz(500), fz(330));
trio("mould: sugar to water (water activity proxy)", "mould-fast", "water-high", ck({ sugar: 150 }), ck({ sugar: 400 }), ck({}));
const bt = f => [{ n: "butter", g: 500, role: "butter", comp: { w: 1 - f - .02, f, s: .006, p: .009 } }, ...R({ flour: 1000, water: 500, sugar: 100 })];
trio("laminating butter fat", "laminate-leak", "butter-type", bt(.80), bt(.82), bt(.813));
trio("butter switch: fat", "butter-switch", "fat-lower", bt(.80), bt(.82), bt(.813));
const cf = p => [{ n: "flour", g: 250, role: "flour", comp: Object.assign({}, C.flour, { p }) }, ...R({ sugar: 250, butter: 200, egg: 200, milk: 100, bp: 10 })];
trio("tough cake: flour protein", "cake-tough", "strong-flour", cf(.12), cf(.08), cf(.10));
trio("tough cake: sugar", "cake-tough", "sugar-low", ck({ sugar: 150 }), ck({}), ck({ sugar: 210 }));

console.log("kb) batch 4 fixes");
{ const r = fixOf("butter-switch", "fat-lower", bt(.80));
  const add = r.rows.find(x => x.added);
  ok(r.ok && add && add.g === 488 && r.rows.find(x => !x.added && x.role === "butter").g === 0 && near(r.after.butterFat, 82, 0.1), "80% butter swapped for 488 g of 82% butter (same fat, less water)"); }
{ const r = fixOf("freeze-thaw-weep", "sugar-low", fz(100));
  ok(r.ok && near(r.after.sugarWater, 0.4, 0.01), "freeze-thaw: sugar raised to 0.4 of the water"); }
{ const r = fixOf("cake-tough", "strong-flour", cf(.12));
  ok(r.ok && r.rows.find(x => x.role === "flour").g === 200 && r.rows.find(x => x.added && x.role === "starch").g === 50, "tough cake: 20% of the flour swapped for cornstarch"); }

console.log("kb) batch 4 diagnosis");
const seed4 = [
  ["freeze-thaw-weep", fz(500), { answers: { freeze: "normal", thaw: "fridge", thick: "modified" } }, "slow-freeze"],
  ["freeze-thaw-weep", fz(500), { answers: { freeze: "blast", thaw: "fridge", thick: "native" } }, "native-starch"],
  ["mould-fast", ck({ sugar: 400 }), { answers: { pack: "warm", store: "cold", where: "surface" } }, "packed-warm"],
  ["mould-fast", ck({ sugar: 400 }), { answers: { pack: "cool", store: "room" } }, "storage-warm"],
  ["laminate-leak", bt(.82), { answers: { room: "hot", butter: "sheet", rest: "long" } }, "too-warm"],
  ["laminate-leak", bt(.82), { answers: { room: "ok", butter: "sheet", rest: "short" } }, "short-rest"],
  ["cake-tough", cf(.08), { answers: { mix: "long", flour: "cake" } }, "overmixed"],
  ["cake-tough", cf(.12), { answers: { mix: "brief", flour: "bread" } }, "strong-flour"],
  ["butter-switch", bt(.80), { answers: { change: "dough", fat: "80" } }, "fat-lower"],
  ["butter-switch", bt(.82), { answers: { change: "melt", fat: "82" } }, "softness"]
];
seed4.forEach(([id, rows, opt, want]) => { const c = top(id, rows, opt).map(x => x.id); if (c[0] === want) t1++; if (c.slice(0, 3).includes(want)) t3++; ok(c.slice(0, 3).includes(want), id + ": expected " + want + " in the top 3, got " + c.slice(0, 3).join(", ")); });
const NS = seed.length + seed2.length + seed3.length + seed4.length;
console.log(`  all seed cases: top-1 ${t1}/${NS}, top-3 ${t3}/${NS}`);

console.log("kb) rules for chocolate, mousse and meringue (batch 5)");
trio("bloom: filling fat", "chocolate-bloom", "fat-migration", ga({ dark: 450, cream: 120, butter: 80 }), owner, ga({ dark: 300, cream: 260, butter: 40, invert: 30 }));
trio("temper: added butter", "temper-fail", "foreign-fat", R({ dark: 1000, butter: 50 }), R({ dark: 1000 }), R({ dark: 1000, butter: 18 }));
trio("seize: little water", "chocolate-seize", "little-liquid", R({ dark: 1000, water: 50 }), R({ dark: 1000, cocoabutter: 300 }), R({ dark: 1000 }));
const md = (cr, mk) => R({ cream: cr, milk: mk, sugar: 100, dark: 200, gelatin: 8 });
trio("mousse: whipped cream share", "mousse-dense", "cream-low", md(200, 500), md(500, 200), md(380, 320));
const mg = sg => R({ white: 100, sugar: sg });
trio("meringue weep: sugar to white", "meringue-weep", "sugar-low", mg(60), mg(150), mg(90));
trio("meringue whip: sugar to white", "meringue-wont-whip", "sugar-high", mg(250), mg(150), mg(190));

console.log("kb) batch 5 fixes");
{ const r = fixOf("meringue-weep", "sugar-low", mg(60)); ok(r.ok && r.rows.find(x => x.role === "sugar").g === 100, "meringue: sugar raised to the whites' weight (100 g)"); }
{ const r = fixOf("meringue-wont-whip", "sugar-high", mg(250)); ok(r.ok && r.rows.find(x => x.role === "sugar").g === 180, "meringue: sugar lowered to 1.8 x whites (180 g)"); }
{ const r = fixOf("mousse-dense", "cream-low", md(200, 500)); ok(r.ok && near(r.after.creamPct, 45, 0.2), "mousse: cream raised to 45% of the weight"); }

console.log("kb) batch 5 diagnosis");
const seed5 = [
  ["chocolate-bloom", owner, { answers: { feel: "dry", store: "fridge", temper: "yes" } }, "sugar-bloom"],
  ["chocolate-bloom", owner, { answers: { feel: "greasy", store: "warm", temper: "no" } }, "fat-bloom"],
  ["temper-fail", R({ dark: 1000 }), { answers: { method: "eye", work: "nk" } }, "not-tempered"],
  ["temper-fail", R({ dark: 1000 }), { answers: { method: "curve", work: "hot", room: "hot" } }, "lost-temper"],
  ["chocolate-seize", R({ dark: 1000, cocoabutter: 300 }), { answers: { water: "yes", heat: "gentle" } }, "water-contact"],
  ["chocolate-seize", R({ dark: 1000, cocoabutter: 300 }), { answers: { water: "no", heat: "strong" } }, "overheated"],
  ["mousse-dense", md(500, 200), { answers: { whip: "stiff", fold: "gentle" } }, "whip-state"],
  ["meringue-weep", mg(150), { answers: { sugar: "slow", air: "humid", bake: "dry" } }, "humidity"],
  ["meringue-wont-whip", mg(150), { answers: { fat: "yes", sugar: "foam", how: "never" } }, "fat"],
  ["meringue-wont-whip", mg(150), { answers: { fat: "no", sugar: "foam", how: "over" } }, "overwhipped"]
];
seed5.forEach(([id, rows, opt, want]) => { const c = top(id, rows, opt).map(x => x.id); if (c[0] === want) t1++; if (c.slice(0, 3).includes(want)) t3++; ok(c.slice(0, 3).includes(want), id + ": expected " + want + " in the top 3, got " + c.slice(0, 3).join(", ")); });
const NS5 = NS + seed5.length;
console.log(`  all seed cases: top-1 ${t1}/${NS5}, top-3 ${t3}/${NS5}`);

console.log("kb) rules for yeast, laminated, cookies and gluten-free (batch 6)");
const br = s => R(Object.assign({ flour: 1000, water: 650, salt: 20, yeast: 10 }, s));
trio("bread: yeast low", "bread-dense", "yeast-low", br({ yeast: 4 }), br({}), br({ yeast: 8 }));
trio("bread: salt high", "bread-dense", "salt-high", br({ salt: 30 }), br({}), br({ salt: 21.5 }));
trio("overproof: yeast high", "dough-overproofed", "yeast-high", br({ yeast: 35 }), br({}), br({ yeast: 23 }));
ok(KBE.features(R({ flour: 1000, water: 650, salt: 20, yeastfresh: 30 })).yeastFlour === 1, "fresh yeast counts as a third of its weight (30 g fresh = 1% instant)");
const cr = s => R(Object.assign({ flour: 1000, water: 330, milk: 250, sugar: 100, salt: 20, yeast: 10 }, s));
trio("croissant: stiff dough", "croissant-dense", "stiff-dough", cr({ water: 200 }), cr({}), cr({ water: 300 }));
trio("hard cookies: fat", "cookies-hard", "fat-low", cc({ butter: 100 }), cc({}), cc({ butter: 140 }));
trio("cookies not spreading: sugar", "cookies-nospread", "sugar-low", cc({ sugar: 140 }), cc({}), cc({ sugar: 185 }));
const gf = x => R({ starch: 400, egg: 200, sugar: 200, butter: 150, binder: x });
trio("gluten-free: binder", "gf-crumbly", "binder-low", gf(0), gf(3), gf(2));

console.log("kb) batch 6 fixes");
{ const r = fixOf("bread-dense", "yeast-low", br({ yeast: 4 })); ok(r.ok && r.rows.find(x => x.role === "yeast").g === 10, "bread: instant yeast raised to 1% (10 g)"); }
{ const r = fixOf("bread-dense", "salt-high", br({ salt: 30 })); ok(r.ok && r.rows.find(x => x.role === "salt").g === 20, "bread: salt set to 2% (20 g)"); }
{ const r = fixOf("croissant-dense", "stiff-dough", cr({ water: 200 })); ok(r.ok && near(r.after.waterFlour, 0.56, 0.01), "croissant: water raised to 0.56 of flour"); }
{ const r = fixOf("cookies-nospread", "sugar-low", cc({ sugar: 140 })); ok(r.ok && r.rows.find(x => x.role === "sugar").g === 252, "cookies: sugar raised to 0.9 x 280 g flour = 252 g"); }

console.log("kb) batch 6 diagnosis");
const seed6 = [
  ["bread-dense", br({}), { answers: { water: "hot", proof: "ok", yeast: "fresh" } }, "yeast-dead"],
  ["bread-dense", br({}), { answers: { water: "ok", proof: "short", yeast: "fresh" } }, "underproofed"],
  ["dough-overproofed", br({}), { answers: { room: "hot", time: "ok" } }, "too-warm"],
  ["croissant-dense", cr({}), { answers: { proof: "short", butter: "ok" } }, "underproofed"],
  ["croissant-dense", cr({}), { answers: { proof: "ok", butter: "broke" } }, "butter-broke"],
  ["cookies-hard", cc({}), { answers: { bake: "brown", store: "sealed" } }, "overbaked"],
  ["cookies-nospread", cc({}), { answers: { chill: "frozen", flour: "scale" } }, "too-cold"],
  ["gf-crumbly", gf(0), { answers: { binder: "none", rest: "yes" } }, "binder-low"],
  ["gf-crumbly", gf(3), { answers: { binder: "yes", rest: "no" } }, "no-rest"]
];
seed6.forEach(([id, rows, opt, want]) => { const c = top(id, rows, opt).map(x => x.id); if (c[0] === want) t1++; if (c.slice(0, 3).includes(want)) t3++; ok(c.slice(0, 3).includes(want), id + ": expected " + want + " in the top 3, got " + c.slice(0, 3).join(", ")); });
const NS6 = NS5 + seed6.length;
console.log(`  all seed cases: top-1 ${t1}/${NS6}, top-3 ${t3}/${NS6}`);

console.log("kb) rules for jams, caramel, glazes and frozen (batch 7)");
const jm = x => R({ fruit: 1000, sugar: x });
trio("jam: sugar", "jam-runny", "sugar-low", jm(600), jm(1500), jm(1100));
const cm = (sg, gl) => R({ sugar: sg, glucose: gl, cream: 300, butter: 50 });
trio("caramel: glucose share", "caramel-grainy", "doctor-low", cm(500, 0), cm(400, 100), cm(440, 60));
const mr = g => R({ glucose: 300, sugar: 300, water: 150, cream: 200, gelatin: g });
trio("mirror glaze: gelatine", "mirror-glaze-fail", "gel-low", mr(5), mr(20), mr(13));
const ic = x => R({ milk: 600, cream: 250, sugar: x });
trio("ice cream icy: solids", "icecream-icy", "solids-low", ic(80), ic(200), ic(150));
trio("ice cream hard: sugar", "icecream-hard", "sugar-low", ic(80), ic(200), ic(150));
const sb = x => R({ fruit: 1000, water: 300, sugar: x });
trio("sorbet: sugar", "sorbet-icy", "sugar-low", sb(200), sb(400), sb(330));

console.log("kb) batch 7 fixes");
{ const r = fixOf("caramel-grainy", "doctor-low", cm(500, 0)); const g = r.rows.find(x => x.added && x.role === "glucose");
  ok(r.ok && g && g.g === 125 && r.rows.find(x => x.role === "sugar" && !x.added).g === 400, "caramel: 100 g of sugar swapped for 125 g glucose syrup (same sugar)"); }
{ const r = fixOf("jam-runny", "sugar-low", jm(600)); ok(r.ok && near(r.after.sugar, 60, 0.2), "jam: sugar raised until sugars are 60%"); }
{ const r = fixOf("mirror-glaze-fail", "gel-low", mr(5)); ok(r.ok && near(r.after.gelPct, 1.8, 0.05), "mirror glaze: gelatine raised to 1.8%"); }
{ const r = fixOf("sorbet-icy", "sugar-low", sb(200)); ok(r.ok && near(r.after.sugar, 27, 0.2), "sorbet: sugar raised to 27%"); }

console.log("kb) batch 7 diagnosis");
const seed7 = [
  ["jam-runny", jm(1500), { answers: { pectin: "hm", acid: "no", cook: "test" } }, "acid-low"],
  ["jam-runny", jm(1500), { answers: { pectin: "hm", acid: "yes", cook: "time" } }, "undercooked"],
  ["caramel-grainy", cm(400, 100), { answers: { stir: "yes", walls: "crystals", when: "cook" } }, "seeding"],
  ["caramel-grainy", cm(400, 100), { answers: { stir: "no", walls: "clean", when: "later" } }, "humid-storage"],
  ["mirror-glaze-fail", mr(20), { answers: { temp: "hot", cake: "frozen" } }, "wrong-temp"],
  ["mirror-glaze-fail", mr(20), { answers: { temp: "ok", cake: "soft", blend: "under" } }, "cake-soft"],
  ["icecream-icy", ic(200), { answers: { when: "stored", store: "swing" } }, "heat-shock"],
  ["icecream-hard", ic(200), { answers: { temp: "cold", sugar: "mix" } }, "too-cold"],
  ["sorbet-icy", sb(400), { answers: { fruit: "pulpy", store: "swing" } }, "heat-shock"]
];
seed7.forEach(([id, rows, opt, want]) => { const c = top(id, rows, opt).map(x => x.id); if (c[0] === want) t1++; if (c.slice(0, 3).includes(want)) t3++; ok(c.slice(0, 3).includes(want), id + ": expected " + want + " in the top 3, got " + c.slice(0, 3).join(", ")); });
const NS7 = NS6 + seed7.length;
console.log(`  all seed cases: top-1 ${t1}/${NS7}, top-3 ${t3}/${NS7}`);
console.log(`\nkb: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
