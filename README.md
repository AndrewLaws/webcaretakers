# WebCaretakers.com: Calculator Hub

220+ calculators and tools targeting long-tail SEO keywords in web, marketing, AI, SEO, and tech. Built on a 25-year-old domain with historical authority in web hosting, broadband, email marketing, and small business IT.

## Revenue model

- Programmatic ads (AdSense/Raptive) via placement slots in every page
- Affiliate lead-generation via contextual "Next Step" CTAs per calculator

## Tech stack

- Static HTML, CSS, and vanilla JS (no frameworks)
- AWS S3 + CloudFront for hosting (us-east-1)
- Google Tag Manager for analytics and conversion tracking
- GA4 event tracking via dataLayer

## Project structure

```
site/                    Live site files (deployed to S3)
  index.html             Hub landing page
  assets/css/main.css    Shared styles
  assets/js/main.js      Shared calculator utilities and event tracking
  calculators/           Individual calculator pages
tests/                   Playwright test suite
deploy.sh                S3 deployment script
```

## URL structure

```
/calculators/{category}/{calculator-name}/
```

Each calculator is a directory with an `index.html` for clean URLs.

## Key documents

| File | Purpose |
|---|---|
| [ROADMAP.md](ROADMAP.md) | 220 calculator ideas across 20 categories, with build priority |
| [FUNCTIONS.md](FUNCTIONS.md) | Calculator specs, shared utilities, HTML contract, ad slots |
| [CHANGELOG.md](CHANGELOG.md) | What changed and when |
| [CLAUDE.md](CLAUDE.md) | Coding standards, style rules, and project constraints |

## Development

Tests first (James Kindred method). Write failing tests, then implementation.

```bash
npm test           # Run Playwright test suite
npm run test:html  # Run HTML linting
```

## Deployment

```bash
./deploy.sh
```

Runs tests, syncs `site/` to S3, and sets cache headers.
