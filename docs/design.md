# CREATION LAB — Design system and experience principles

Status: **draft for the owner's approval** (step 1 of the design directive). Nothing in the app has been restyled yet.

---

## 1. Audit of the current interface (October 2026)

Screens captured at 390 px (phone) and 1280 px (desktop), Arabic, dark theme, with two real projects (berry ganache bonbon, New York cheesecake).

Ranked from most to least damaging to the "serious instrument" feeling:

| # | Finding | Where | Why it reads as amateur |
|---|---|---|---|
| 1 | **No ingredients on the first phone screen.** Title, project subtitle, a row of five pill buttons, a 4/7 ring and four indicator tiles fill 844 px before the first ingredient row appears. | Workspace, 390 px | The job of the screen (the recipe) is pushed below the fold. A professional tool opens on the work, not on decoration. |
| 2 | **Card soup with equal weight.** Below the recipe: production plan, add recipe, product photo, trial log, PDF details. Six cards with the same border, radius and padding, all with large titles. Desktop page is 3,000 px tall. | Workspace, both | Nothing says "this is the main thing". The eye has no resting point. |
| 3 | **Saturated pill buttons everywhere.** Five equal-height burgundy or outlined pills in the header (PDF, label, save version, share, cost), plus pills inside cards. | All | Pills plus saturated fill plus equal sizing reads as a consumer app or a game menu. |
| 4 | **Emoji and decorative icons.** ✨ on "Balance", 🔬, 🏷️, 🩺, 📚, 🧮 and 🗓️ on the home tiles, 👋 in the greeting. | Home, workspace | Emoji are the main "toy" signal. They render differently on every phone and cannot carry meaning reliably. |
| 5 | **Hidden results.** The "Nutrition & shelf life" tab shows only a label button. The actual values sit inside two closed accordions. | Workspace, nutrition tab | The user taps a tab and sees nothing. Results must be visible, not behind a second tap. |
| 6 | **Numbers without a verdict next to them.** The indicator tiles show "aw 0.90" and "Sweetness: light", but not the target window for this product type. The verdict ("needs balancing") is far from the numbers that cause it. | Workspace summary | The "so what?" is missing. The user must already be an expert to read the tiles. |
| 7 | **Composition is a static stacked bar with a legend.** There is no target, no zone and no movement when a quantity changes until the page re-renders. | Ingredients tab | It shows *what is*, never *what it should be*. |
| 8 | **Problem search misses the obvious answer.** "الغاناش انفصل" returns only "whipped ganache grainy or split". It misses the core ganache-split problem, and there are no follow-up questions. | Solve | It feels like a keyword list, not a technologist. |
| 9 | **Floating project bar covers content.** The "your project / open" pill floats over the footer and library cards on desktop. | Solve, library | Overlapping chrome looks unfinished. |
| 10 | **Typography is generic.** System sans for both Arabic and Latin, headings very large (46 px) with tight leading next to small 12 px body notes. Numbers are not consistently tabular, and units are the same weight as values. | All | Hierarchy comes from size jumps and colour, not from a type scale. |
| 11 | **Background gradients and glows.** Radial burgundy glow behind headers and a gradient "continue" card on home. | Home, workspace | Decoration competes with data. |
| 12 | **Six navigation destinations plus a footer site map.** Start, Projects, +, Library, Fix, with Calculator, Materials, Rules and Suppliers in the footer. | Shell | Too many places. The footer site map is a website pattern, not an app pattern. |

What already works and must be kept: the burgundy brand colour, bilingual RTL, the 44 px tap targets, the bottom tab bar on phone, the workspace tabs, the live scores, the PDF quality, and speed (everything is local).

---

## 2. Design principles

1. **One screen, one job.** The project page is a workspace: the recipe table, and next to it (desktop) or under it in a bottom sheet (phone) a **live analysis panel** that updates on every keystroke. Everything else (plan, label, log, PDF details) moves into secondary panels opened on demand.
2. **Instrument, not toy.** Dense but calm. Neutral surfaces, **one** accent (burgundy), and semantic colours only for status (in range / watch / out of range). No decorative gradients, glows or emoji. One line-icon set (1.5 px stroke, 20 px grid).
3. **Numbers are the hero.** Tabular figures everywhere, units dimmed and smaller, hierarchy by size and weight, not by colour.
4. **Every number answers "so what?".** A value that matters is always shown with its target window for the chosen product, and a verdict word. No raw value without a judgement.
5. **No dead ends.** Every warning carries a one-tap fix with a preview and an undo.
6. **Speed is a feature.** No spinners for local work. Transitions of 150 ms or less. Smooth on a mid-range phone.
7. **Arabic first, not mirrored English.** A professional Arabic typeface with a matching Latin face (self-hosted, subsetted), Western digits in data, correct RTL spacing, and direction-aware icons.

---

## 3. Design tokens (proposal)

All tokens become CSS variables on `:root`, redefined for light and dark.

### Colour
| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#141012` | `#F7F5F2` | page |
| `--surface-1` | `#1C1719` | `#FFFFFF` | panels |
| `--surface-2` | `#241E20` | `#F1EEEA` | inputs, table stripes |
| `--line` | `#3A3134` | `#E2DDD6` | hairlines (1 px) |
| `--ink` | `#F2EEE9` | `#1D1A1B` | primary text |
| `--ink-2` | `#B9B0A8` | `#5E5753` | secondary text, units |
| `--accent` | `#A3223F` | `#8E1A33` | the single brand accent: primary button, focus, selection |
| `--ok` | `#5FA37A` | `#2F7D4F` | in range |
| `--watch` | `#D2A24C` | `#9A6B12` | near the edge |
| `--bad` | `#D9644F` | `#B23A26` | out of range |

All text and status pairs are checked for WCAG AA (4.5:1 for body, 3:1 for large figures and UI).

### Type
- Arabic: **IBM Plex Sans Arabic** (400, 500, 600). Latin and figures: **IBM Plex Sans** with `font-variant-numeric: tabular-nums`. Both are open-licence (OFL), self-hosted and subsetted. Target about 90 KB in total.
- Scale (px): 12 · 13 · 15 (body) · 17 · 20 · 24 · 32. Line height is 1.5 for body and 1.2 for figures.
- Big figures (scores, totals): 24–32 px, weight 600. Units at 0.7 em in `--ink-2`.

### Space, shape, depth, motion
- Spacing on a 4 px grid: 4 · 8 · 12 · 16 · 24 · 32.
- Radius: 6 px (inputs, buttons), 10 px (panels). **No pills** except status chips.
- Elevation: hairline borders instead of shadows. One soft shadow for floating sheets only.
- Motion: 120 ms ease-out for values and panels. Off under `prefers-reduced-motion`.
- Buttons: primary (filled accent, one per screen), secondary (outlined), quiet (text). Height 40 px desktop, 44 px phone.

---

## 4. Signature experiences (to be mocked up next)

| | Experience | What the user sees |
|---|---|---|
| A | **Paste to insight** | Paste a recipe, and within 5 seconds see a composition ring, one verdict line ("Stable, slightly low in sugar for a 5-day shelf life") and the top 3 actions. |
| B | **Formulation map** | Water / fat / sugar / solids chart with the safe zone of the product type shaded and the recipe as a marker. Moving an ingredient slider moves the marker live, and aw, texture and shelf life update. |
| C | **What-if sandbox** | "Try a change" works on a scratch copy, with a side-by-side delta (cost, composition, aw, shelf life, texture risk), then Keep or Discard. |
| D | **Version compare** | Pick any two versions and see a clear diff with the winner highlighted. Builds on the existing version history. |
| E | **Guided diagnosis** | Pick the symptom, answer 2 to 3 questions, get a ranked diagnosis with the numeric fix as a preview. |
| F | **PDF and label as products** | Typeset like a technical data sheet a QA auditor would accept. |
| G | **Command palette** | Ctrl/⌘ K finds a recipe, ingredient, problem or action. Builds on the existing search. |

---

## 5. Navigation (proposal)

Four areas: **Projects · Library · Costing · Settings**. "Solve a problem" becomes an action inside a project (and in the command palette), not a destination. Calculator, materials, rules and suppliers live inside the Library. The footer site map is removed from the app shell. The primary action (New project) is always one tap away.

---

## 6. Process and acceptance

1. Audit and principles: **this document** (done, awaiting approval).
2. Tokens and components in `index.html`, documented here.
3. Mockups of 3 screens (workspace with live panel, formulation map, guided diagnosis) for approval.
4. Rebuild screen by screen. After each screen: smoke tests, before/after screenshots at 390 and 1280 px, and an Arabic report.

Acceptance: verdict within 5 s of pasting; core task in 3 taps or fewer; the product page needs no more than 2 phone screens for the core workflow; Lighthouse mobile ≥ 95 for Performance, Accessibility and Best Practices; WCAG AA; all fields labelled; full keyboard use on desktop; all tests green; and a blind test with 3 chefs (run by the owner).
