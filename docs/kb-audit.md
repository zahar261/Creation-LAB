# Knowledge-base audit (Phase A, read-only)

Date: 30 October 2026. Scope: the 105 problems (`DATA.PROBLEMS`) and the 22 automatic science rules (`DATA.SRULES`) in `index.html`. Nothing was changed.

The full per-entry tables are in [`kb-audit-problems.csv`](kb-audit-problems.csv) and [`kb-audit-rules.csv`](kb-audit-rules.csv). Both open in Excel or Google Sheets.

## 1. Headline numbers

| Measure | Count | Of |
|---|---|---|
| Problems | 105 | |
| With an automatic numeric fix (preview, apply, undo) | **17** | 105 |
| Linked to at least one automatic rule that reads the recipe | **18** | 105 |
| With a citation (book, paper, standard) | **0** | 105 |
| Provenance noted as a third-party course video, uncited | 32 | 105 |
| Provenance "compiled from pastry fundamentals", no source | 72 | 105 |
| Cause written as a single mechanism (one or two clauses) | 34 | 105 |
| Cause text never mentions process (temperature, mixing, oven, time) | 54 | 105 |
| Fix text containing single-value numbers (e.g. "72 °C", "1%") | 28 | 105 |
| With discriminating questions | 0 | 105 |
| With a verification test for the next trial | 0 | 105 |
| With a stated trade-off | 0 | 105 |
| With an evidence level (established / consensus / hypothesis) | 0 | 105 |
| Rules with a cited threshold | **0** | 22 |

What the data model can hold today: `id, cat, title, cause` (one paragraph), `fix` (a list), `note`, and an optional `calc` link. There is no place for a differential diagnosis, questions, sources, evidence level, trade-offs or verification.

## 2. Flags (examples, not exhaustive)

**Causes too narrow**
- `custard`, "Pastry cream or custard is grainy or dull". The only cause given is starch type and granule size. It misses yolk scrambling, uneven tempering, no straining, undercooked starch (not boiled about 1–2 min), over-whisking after setting, and amylase from under-cooked yolk thinning the cream.
- `separate`, "Ganache or cream separates and oil appears". The only cause given is replacing an ingredient that carries an emulsifier. It misses the fat-to-water ratio of the recipe, temperature at emulsification, chocolate overheated, mixing method (whisk vs immersion blender), and adding cold liquid to warm chocolate.
- `sponge`, "Sponge collapses". The cause is limited to plant-protein foams.

**Single values presented as universal**: 28 entries. For example, "never above 72 °C" for cheesecake, or fixed gelatine percentages without a bloom strength or product type.

**Process and equipment rarely named as the cause**: 54 entries describe only the formula. A chef's most common real causes (oven calibration, mixing time, temperature at a step) are missing.

**Provenance**: 32 entries are written from a third-party course. They must be rewritten in original words with independent sources (see the directive, Phase C).

**Rules**: all 22 thresholds (for example gelatine 0.6–1.5 %, baking powder limits, meringue sugar ratio) are plausible professional ranges, but none is cited. Under the new policy each one must become either "sourced" or "working estimate".

## 3. Gap map by category

Counts come from keyword matching on titles, so one problem can fall in two categories.

| Category | Problems | Numeric fix | Rule-linked | Verdict |
|---|---|---|---|---|
| Sponges & cakes | 19 | 5 | 2 | Good breadth, shallow causes |
| Short pastry & tarts | 4 | 0 | 0 | **Thin** |
| Laminated doughs | 2 | 0 | 0 | **Thin** |
| Choux | 2 | 0 | 1 | **Thin** |
| Creams & custards | 11 | 1 | 0 | Causes too narrow |
| Ganache & emulsions | 13 | 4 | 0 | Core area; needs rule-based diagnosis |
| Chocolate & tempering | 9 | 0 | 0 | No numeric fixes |
| Mousses & bavarois | 7 | 0 | 1 | Gelatine and aeration logic missing |
| Meringue & foams | 14 | 1 | 1 | Broad, overlapping entries |
| Glazes (mirror, nappage) | 3 | 0 | 0 | **Thin** |
| Caramel & sugar work | 9 | 2 | 2 | OK |
| Fillings, jams & pectin | 12 | 3 | 6 | Best covered by rules |
| Frozen desserts | 8 | 1 | 6 | Rules good, causes thin |
| Yeast doughs & viennoiserie | 2 | 0 | 1 | **Thin** |
| Cookies & biscuits | 3 | 0 | 0 | **Thin** |
| Gluten-free | 0 | 0 | 0 | **Missing** |
| Shelf life & microbiology | 2 | 1 | 0 | **Thin**, and safety-critical |
| Industrial (freeze-thaw, vacuum, transport, condensation, colour fade) | 4 | 2 | 2 | **Thin** for a factory user |
| Gulf conditions (heat, humidity, cold chain, butter 80 vs 82 %, local flour protein) | 1 | 0 | 0 | **Missing**, and our differentiator |

Six entries are ingredient-technology questions rather than failures (for example "I want to cut the sugar without losing stability"). They belong in the library as guides, not in the diagnostic base.

## 4. Proposed target

Quality over quantity: **about 180 entries**, each passing the validator (sources, at least one testable rule, discriminating questions, a trade-off on every fix, a verification test).

| Priority | Categories | Target entries |
|---|---|---|
| 1. Owner's factory and the first five | Creams & custards, ganache, sponges, short pastry, choux | 60 |
| 2. Industrial and Gulf | Shelf life, freeze-thaw, transport, condensation, heat and humidity, ingredient variability | 30 |
| 3. Core pastry | Chocolate, mousses, meringue, glazes, caramel, jams, frozen | 60 |
| 4. Breadth | Laminated, yeast, cookies, gluten-free | 30 |

The existing 105 entries are merged into this set (deduplicated, rewritten in original words, causes widened). None is deleted until its replacement passes the validator. Old projects and links keep working.

## 5. Proof plan (Phase E)

The benchmark comprises 50 realistic failure cases (recipe, symptom, expert diagnosis), drafted from the owner's factory problems where possible. Top-1 and top-3 accuracy will be reported honestly. Entries stay labelled **draft** until a named reviewer approves them.
