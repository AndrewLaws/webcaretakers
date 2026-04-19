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

### Infrastructure
- AWS CLI configured (us-east-1, account 490734354255)
- Hosting moved to AWS Amplify; custom domain and SSL live on webcaretakers.com as of 2026-04-19
- Route 53 A (Alias) record points apex to Amplify CloudFront distribution; `www` CNAME points to the same
- AWS Budget alert active ($100/month)
- Legacy S3 buckets `webcaretakers.com` and `www.webcaretakers.com` no longer in the serving path
