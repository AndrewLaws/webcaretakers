# WebCaretakers.com: Calculator Hub

A growing hub of calculators and tools targeting long-tail SEO keywords in web, marketing, AI, SEO, finance, health, property, and tech. Built on a 25-year-old domain with historical authority in web hosting, broadband, email marketing, and small business IT. Currently 108 live calculators across 15 categories; full list is the source-of-truth `categories.json`. Roadmap targets 220+ tools long term.

## Revenue model

- Programmatic ads (AdSense/Raptive) via placement slots in every page
- Affiliate lead-generation via contextual "Next Step" CTAs per calculator

## Tech stack

- Static HTML, CSS, and vanilla JS (no frameworks)
- AWS Amplify hosting with managed SSL (us-east-1)
- Google Tag Manager for analytics and conversion tracking
- GA4 event tracking via dataLayer

## Project structure

```
site/                    Live site files (deployed to Amplify)
  index.html             Hub landing page
  sitemap.xml            Generated on every commit
  robots.txt             Generated on every commit
  llms.txt               Generated on every commit
  assets/css/main.css    Shared styles
  assets/js/main.js      Shared calculator utilities and event tracking
  calculators/           Individual calculator pages
scripts/                 Build and generator scripts (plus node:test unit tests)
tests/                   Playwright test suite
.githooks/               Git pre-commit and pre-push hooks
deploy.sh                Deployment script
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
| [tone.md](tone.md) | Voice and style guide for all user-facing copy on the site |

## Development

Tests first (James Kindred method). Write failing tests, then implementation.

```bash
npm test           # Run unit tests (node:test) and Playwright suite
npm run test:unit  # Unit tests only
npm run test:html  # HTML linting
npm run generate   # Regenerate sitemap.xml, robots.txt, llms.txt manually
```

Git hooks are installed via `core.hooksPath = .githooks`. The pre-commit hook regenerates the three site index files and auto-stages them. The pre-push hook prints a reminder checklist for keeping reference docs in sync. If you clone fresh, run `git config core.hooksPath .githooks` once.

## Deployment

```bash
./deploy.sh
```

Runs tests, syncs `site/` to S3, and sets cache headers.
