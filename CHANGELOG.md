# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
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

### Infrastructure
- AWS CLI configured (us-east-1, account 490734354255)
- Hosting moved to AWS Amplify; custom domain and SSL live on webcaretakers.com as of 2026-04-19
- Route 53 A (Alias) record points apex to Amplify CloudFront distribution; `www` CNAME points to the same
- AWS Budget alert active ($100/month)
- Legacy S3 buckets `webcaretakers.com` and `www.webcaretakers.com` no longer in the serving path
