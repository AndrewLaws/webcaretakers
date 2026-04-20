# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- US Mortgage Calculator at `/calculators/finance/mortgage-calculator/`: monthly PITI with principal & interest, property tax, home insurance, HOA and PMI broken out separately; down-payment $ / % toggle; 10/15/20/30-year terms; monthly breakdown table + life-of-loan totals (principal, total interest, total cost); ELI5, Prove-it, FAQ, long-form covering why split US vs UK and what the tool doesn't do; hreflang (en-US + x-default), Schema.org SoftwareApplication with `inLanguage: en-US` and `countriesSupported: US`; DataLayer `calculator_interaction` + `calculator_result` events with `loan_principal`, `loan_term_years`, `apr_percent`. Pure-logic module with 13 unit tests, Playwright page + hub tests
- New `Finance` category with hub at `/calculators/finance/` opened by US Mortgage; long-form explains why US and UK mortgages each get their own dedicated calculator (fixed-for-term vs fix-and-revert, PMI vs no PMI, escrow, arrangement fees, stamp duty)
- Primary nav submenu extended to include Finance across all pages
- `/calculators/` all-calculators hub: Finance section added, "Coming soon" row trimmed to Property only, US Mortgage added to JSON-LD `hasPart`
- BMI Calculator at `/calculators/health/bmi-calculator/`: metric + imperial unit toggle, WHO category (underweight/normal/overweight/obese) colour-coded pill, ELI5, Prove-it, FAQ, long-form honest caveats on limitations (muscle mass, athletes, age, children, ethnicity), SoftwareApplication + FAQPage JSON-LD, DataLayer events. Pure-logic module with 12 unit tests, Playwright page + hub tests (14)
- New `Health` category with hub at `/calculators/health/` opened by BMI
- Primary nav submenu extended to include Health across all pages
- `/calculators/` all-calculators hub: Health section added, "Coming soon" row trimmed to Finance + Property, BMI added to JSON-LD `hasPart`
- `CLAUDE.md`: new "Country-specific calculators" rule documenting the full localisation signal stack (URL slug, title/h1, meta, hreflang, Schema.org `inLanguage` + `countriesSupported`, cross-link, content signals) so UK and US variants get the right Google routing
- `scripts/prioritise.js` + 9 unit tests: batch SEMrush scoring (volume × CPC × (1 − competition)), 30-day per-keyword cache, sorted markdown output. `research/candidates.txt` seeded with ~45 roadmap candidates. `npm run prioritise`
- First prioritisation run confirms Finance + Health as the highest-value next categories to build

### Changed
- Photo Resizer download filename now includes a WebCaretakers brand trail: `<your-name>-resized-webcaretakers.<ext>`. Every saved, emailed or re-shared file carries a breadcrumb back to the tool that made it. Guarded by a Playwright test.

### Fixed
- Photo Resizer form and dropzone no longer render broken on first load: added global `[hidden] { display: none !important }` so `.calc-form` flex layout stops overriding the `hidden` attribute, and `.resizer-dropzone` now `display: block` so the label occupies its full container
- Photo Resizer now features on the homepage `Featured calculators` grid; the homepage test reads `categories.json` and asserts every live tool has a card so this cannot regress

- Photo Resizer calculator at `/calculators/images/photo-resizer/`: client-side canvas resize with drag-and-drop, width/height with aspect-ratio lock, JPEG/WebP/PNG output, live quality slider, side-by-side original vs resized previews, blob download, ELI5, Prove-it, FAQ, long-form copy, SoftwareApplication + FAQPage JSON-LD, DataLayer events. Pure-logic module with 11 unit tests, Playwright page tests
- New `Images` category with hub at `/calculators/images/` and entry in `categories.json`
- Primary nav submenu extended to include Images across all pages
- `/calculators/` all-calculators hub updated to list Images section and include Photo Resizer in `hasPart` JSON-LD
- `links.json` entries for "Photo Resizer", "photo resizer", "image tools"
- Project scaffolding: `.gitignore`, `CLAUDE.md`, `README.md`
- Base HTML template with GTM placeholder, dataLayer events, ad slots, and CTA area
- Demo percentage calculator on hub landing page
- Shared CSS (`main.css`) with mobile-first responsive layout
- Shared JS (`main.js`) with calculator interaction and dataLayer event tracking
- Playwright test suite (27 tests) covering template structure, GTM, ads, accessibility, SEO, and responsiveness
- Deployment script (`deploy.sh`) for S3 sync
- `ROADMAP.md` with 220 calculator and tool ideas across 20 categories
- `FUNCTIONS.md` documenting calculator specifications and shared utilities
- `package.json` with test tooling (Playwright, htmlhint, serve)
- `scripts/generate-site-files.js` generator for `sitemap.xml`, `robots.txt`, `llms.txt`
- `scripts/generate-site-files.test.js` unit tests (6 tests, node:test runner)
- Git pre-commit hook at `.githooks/pre-commit` regenerates and auto-stages the three site index files on every commit
- Git pre-push hook at `.githooks/pre-push` prints a reminder checklist for ROADMAP, CHANGELOG, README, FUNCTIONS
- `npm test` now runs unit tests first, then Playwright; `npm run generate` runs the generator manually
- `tone.md` voice and style guide for all user-facing copy, referenced from `CLAUDE.md`
- Footer disclaimer on homepage covering informational-use, no liability, professional-advice guidance, and affiliate disclosure (6 Playwright tests)
- `.env.example` for SerpAPI and SEMrush keys, US market defaults
- Roadmap entries for UK/US measurement switcher and upcoming research pipeline
- `scripts/research.js` SERP + SEMrush research script with optional Anthropic synthesis (13 node:test unit tests)
- `npm run research -- "keyword"` CLI, with `--force` and `--synthesize` flags
- 30-day file-based caching on raw research pulls to control API cost
- Roadmap: five new categories (21-25) from Gemini research — digital sustainability, legal/AI compliance, AI unit economics, tech career, quick-fix tools
- Roadmap: AI Overview citation pattern added to the Prove-it spec (name the underlying source/logic, not just the math)
- Roadmap: cookie consent banner (blocking, Consent Mode v2) as a prerequisite for GA4 going live
- Live GTM container ID `GTM-PBCD82L6` wired into base template (head script + noscript fallback)
- Consent Mode v2 defaults block inserted before GTM: analytics, ads, ad_user_data, and ad_personalization default to denied until the user chooses
- Cookie consent banner on homepage with Accept/Reject buttons, privacy policy link, localStorage persistence, and `gtag('consent', 'update', ...)` on choice (7 Playwright tests)
- Cookie banner copy written in project voice (no corporate cookie waffle)
- Research synthesis prompt updated to pin primary market as United States while keeping British voice as a deliberate differentiator
- First calculator: Broadband Bandwidth Calculator at `/calculators/broadband/broadband-bandwidth-calculator/` with pure calc module (9 unit tests), Playwright page tests (9), SoftwareApplication + FAQPage JSON-LD, DataLayer events, Prove-it panel scaffold, ELI5 block
- Footer: left-aligned disclaimer in a 60rem column plus site-footer-nav with Home / All calculators / About / Privacy / Terms / Contact
- Calculator form layout: uniform `.calc-form` grid with label left, control right, dedicated checkbox row style, mobile stack at 540px
- ELI5 block styling and roadmap entry as a cross-cutting feature (top-of-page, scope is "what this calculator does")
- Roadmap: privacy policy page added as a prerequisite for switching GA4 on
- `/privacy/` page written in site voice, adapted from Yeseo policy to cover GA4, Consent Mode v2, cookies, Google, affiliates, and the fact that calculator inputs never leave the browser
- `/about/` page establishing Andrew Laws as the named author, linking to yeseo.io for E-E-A-T, with Person JSON-LD
- Footer trading-name line on homepage, privacy, about, and broadband calculator: "WebCaretakers is a trading name of Andrew Laws Associates Ltd" with company number and ICO reg
- "Save this calculator" bookmark nudge on the broadband calculator, platform-aware (⌘ D on Mac, Ctrl + D elsewhere)
- `/terms/` page in site voice: who the terms are with, accuracy disclaimer, no-liability, acceptable use, IP, affiliate note, availability, governing law (England and Wales)
- `/contact/` page with no form by design: two JS-assembled mailto addresses (hello@, privacy@), honest expectations, and a clear signpost that commercial enquiries go to yeseo.io instead
- Automatic internal linking: `links.json` source of truth, `scripts/internal-links.js` sweeper (12 node:test tests) wired into the pre-commit hook to wrap the first safe occurrence of each phrase in an anchor (skips nav/header/footer/headings/existing anchors, one link per URL per page, longest phrase wins, idempotent, respects `excludeFromLinking`); `node-html-parser` added as a dev dep
- Three-tier navigation (Home → Category hub → Calculator): `categories.json` source of truth, new primary nav with CSS-driven dropdown and click/Escape keyboard toggling, `/calculators/` all-calculators hub (CollectionPage JSON-LD), `/calculators/broadband/` category hub (CollectionPage + ItemList JSON-LD), nav rolled out across home, about, privacy, terms, contact, and the Broadband Bandwidth Calculator. 16 new Playwright tests in `tests/nav-and-hubs.spec.js` cover nav on every page, dropdown toggle behaviour, breadcrumbs, and hub JSON-LD.
- Second calculator: `/calculators/math/percentage-calculator/` with three modes (what is A% of B, A is what % of B, percentage change A→B), ELI5 block, Prove-it panel that shows the working, SoftwareApplication + FAQPage JSON-LD, DataLayer events including `calculator_mode`. Pure calc module `site/assets/js/calculators/percentage.js` with 12 node:test unit tests.
- New Math category hub at `/calculators/math/` listing the Percentage Calculator and a category intro. `categories.json` updated, Math added to the primary nav dropdown on every page, "See all calculators" hub extended.
- Homepage rewritten as a proper landing page: removed the inline demo calculator, added featured-calculator cards, site-rules section, a "Suggest a calculator" CTA to `/contact/`, and updated the title/description for the new positioning.
- Primary nav now wraps sensibly on narrow viewports (375px); list is vertical on mobile with submenus inlined, fixing an overflow regression the nav v1 introduced.
- `npm run test:unit` now also runs calculator-module tests under `site/assets/js/calculators/*.test.js` so the pure maths keeps a failing-test safety net on every commit.
- `links.json` extended with `percentage calculator`, Percentage Calculator, `broadband calculators`, and `math calculators` so internal linking propagates automatically on the next pre-commit sweep.

### Infrastructure
- AWS CLI configured (us-east-1, account 490734354255)
- Hosting moved to AWS Amplify; custom domain and SSL live on webcaretakers.com as of 2026-04-19
- Route 53 A (Alias) record points apex to Amplify CloudFront distribution; `www` CNAME points to the same
- AWS Budget alert active ($100/month)
- Legacy S3 buckets `webcaretakers.com` and `www.webcaretakers.com` no longer in the serving path
