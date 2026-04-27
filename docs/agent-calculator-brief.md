# Calculator-build agent brief

You are building a single calculator on the WebCaretakers calculator hub. The repo root is `/Users/andrewlaws/Documents/Claude/webcaretakers`. You are running inside your own git worktree branched from main; treat all paths as relative to the repo root.

## Tone and style (hard rules)

- British English throughout. Examples: organisation, optimise, colour, recognise, analyse.
- Never use em-dashes (—). Use a comma, a colon, parentheses, or rewrite the sentence.
- Never describe anything as "automated" in user-facing copy. Use "assessed", "reviewed", "analysed", "checked".
- Plain, direct prose. No marketing fluff, no superlatives, no corporate waffle.
- Read `tone.md` if anything about voice feels uncertain. The Andrew Laws voice is direct, slightly dry, never patronising.

## Technical rules

- Static HTML and vanilla JS. No build step, no bundler, no external libraries.
- No runtime API calls. All logic must run in the user's browser. Web platform APIs (`Intl`, `crypto`, `Date`, `Web Crypto`) are fine.
- The cookie banner is now handled by `site/assets/js/main.js`. Do **not** add an inline post-banner script. Just include the banner markup and the `<script src="/assets/js/main.js"></script>` tag at the end of `<body>`.
- The Consent Mode v2 default-denied gtag block stays inline in `<head>` (it must run before GTM loads).

## File layout

- Page: `site/calculators/{category}/{slug}/index.html`
- JS: `site/assets/js/calculators/{slug}.js`
- Unit tests: `site/assets/js/calculators/{slug}.test.js` (uses `node:test`)
- Playwright tests: `tests/{slug}.spec.js`

## Use as your template

Copy `site/calculators/cybersecurity/hash-generator/index.html` as the page skeleton. It has the current correct structure: cookie banner markup with no inline post-script, GTM head block, JSON-LD blocks, breadcrumb pattern, header, footer with disclaimer, and `main.js` script tag at end of body.

## Required page elements

- `<html lang="en-GB">`
- `<title>` and `<meta name="description">` written in the Andrew Laws voice
- Canonical link, OpenGraph tags
- JSON-LD `SoftwareApplication` for the calculator (with `applicationCategory` matching the calculator category, e.g. `BusinessApplication` for Property/Productivity, `UtilitiesApplication` for Conversions, `EducationalApplication` for Math, `MultimediaApplication` for Fun, `BusinessApplication` for SEO)
- JSON-LD `FAQPage` with at least three genuine Q&As
- Breadcrumb nav: Home > Calculators > {Category} > {Calculator name}
- Single `<h1>` matching the calculator name
- Short ELI5 paragraph explaining what the tool does in one sentence
- Calculator panel with form inputs and a results area
- "Prove it" `<details>` block showing the working/maths so the user can audit the result
- FAQ section with at least three Q&As (mirror the `FAQPage` JSON-LD)
- Long-form prose section (at least 250 words) covering when to use it, common mistakes, edge cases, in the tone.md voice
- Footer with disclaimer (already in the template)

## Country signals (only if calculator is country-specific)

If your calculator is UK-only or US-only (taxes, mortgages, regulated thresholds), follow `CLAUDE.md` country-targeting section in full:
- Country in the URL slug front (e.g. `uk-mortgage-overpayment-calculator`)
- Country in `<title>` and `<h1>` first clause
- Country in meta description first clause
- `hreflang` tags self-referencing en-GB or en-US plus `x-default`
- Schema `inLanguage` and `countriesSupported`
- Country-specific terminology, currency symbol, realistic thresholds

## DataLayer events

Push to `window.dataLayer`:
- `calculator_interaction` on input change (include `field` and `calculator_name`)
- `calculator_result` on calculate (include `calculator_name` and high-level result summary fields)
- `prove_it` when the user opens the prove-it `<details>` panel (include `calculator_name`)

## Kindred method

Write failing tests first. Implement to make them pass. Run them after every meaningful change.

- Unit tests cover pure-function maths and edge cases (`node --test site/assets/js/calculators/{slug}.test.js`).
- Playwright tests cover page rendering, breadcrumbs, ELI5 presence, calculate flow, prove-it visibility, JSON-LD validity, hub registration (the calc appears on `/calculators/{category}/` and `/calculators/`), and at least one realistic interaction.

## Registration files (every one of these must be updated)

1. `categories.json` — add a tool entry under the right category's `tools` array. Maintain alphabetical order if the category already does, otherwise append.
2. `links.json` — add three phrase mappings: the calculator name, plus two long-tail synonyms a user might write inline (e.g. "fraction calculator", "add fractions"). All point at the calculator URL.
3. `site/assets/search-index.json` — add a tool entry under the category's section. Match the existing structure.
4. `site/calculators/index.html` — add a `<li class="category-card">` under the right category section AND a `SoftwareApplication` entry to the `hasPart` JSON-LD `ItemList`.
5. `site/calculators/{category}/index.html` — add a `<li class="category-card">` AND a `ListItem` to the `mainEntity.itemListElement` JSON-LD with the next position number.
6. `site/sitemap.xml` — add a `<url>` entry with `<lastmod>2026-04-27</lastmod>`.

## Verification before reporting back

- `node --test site/assets/js/calculators/{slug}.test.js` is green
- `npx playwright test tests/{slug}.spec.js` is green
- The page loads under `npx serve site -l 8080` and looks right
- All JSON files (`categories.json`, `links.json`, `site/assets/search-index.json`) parse cleanly with `python3 -c "import json; json.load(open('FILE'))"`

## Do NOT commit, do NOT push

The sandbox will block commits inside agent worktrees. Leave the worktree dirty. The orchestrator will commit your changes and merge the branch back into main.

## Reporting back

When done, report:
- Calculator slug
- List of files created and modified
- Unit test count (passed)
- Playwright test count (passed)
- Any rough edges, design choices that surprised you, or follow-ups worth flagging
