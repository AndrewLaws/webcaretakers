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

### Infrastructure
- AWS CLI configured (us-east-1, account 490734354255)
- S3 buckets `webcaretakers.com` and `www.webcaretakers.com` exist (since 2018)
- AWS Budget alert active ($100/month)
- ACM certificate, CloudFront distribution, and Route 53 DNS: in progress
