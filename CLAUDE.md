# CLAUDE.md - WebCaretakers.com

## Project

Calculator Hub on webcaretakers.com (25-year-old legacy domain). Hundreds of hyper-specific calculators targeting long-tail SEO keywords. Revenue via programmatic ads (AdSense/Raptive) and affiliate lead-generation. Static hosting on AWS Amplify.

## Writing and style rules (non-negotiable)

**Before writing or rewriting any user-facing copy on the site, read [tone.md](tone.md).** It defines the Andrew Laws voice the site is written in. The rules below are the hard minimums; tone.md is the fuller picture.

- British English spelling throughout (organisation, colour, recognise, optimise, etc.)
- Never use em dashes. Use a comma, colon, or rewrite the sentence.
- Never describe anything as "automated" in client-facing content. Use "assessed", "reviewed", or "analysed".
- Plain, direct language. No marketing fluff, no unnecessary superlatives, no corporate waffle.
- Backlinks language must reflect earned links and opportunity identification, never "building backlinks".

## AI prompt style block

Any prompt sent to an external AI API must include:

```
STYLE RULES — apply to all output:
- Use British English spelling throughout
- Never use em dashes (—). Use a comma, colon, or rewrite the sentence.
- Use plain, direct language. No marketing fluff.
```

## API usage policy (non-negotiable)

All third-party API keys in `.env` (SerpAPI, SEMrush, Anthropic, Perplexity, Apify, Gemini) are **build-time and local-tooling only**. They must never be called from the live site at runtime. Acceptable uses:

- Local research scripts run by the developer
- Build-time generators that bake output into static HTML before deployment
- One-off CLI tooling

Unacceptable uses:
- Any fetch from browser JavaScript
- Any serverless endpoint the public site calls on demand

Rationale: cost control and abuse protection. A popular calculator that triggers a paid API on every user interaction is a six-figure invoice waiting to happen.

## Code standards

- Follow the James Kindred method: (1) Plan, (2) Failing tests, (3) Implementation.
- Never write implementation code before tests exist for new features.
- Write meaningful commit messages describing what changed and why.
- Run tests or verify the tool works after every change. Fix failures before committing.
- Never commit API keys, secrets, or .env files.
- Comment code where the "why" is not obvious. Do not add obvious comments.

## AWS

- Region: us-east-1
- Hosting: AWS Amplify (managed SSL, CloudFront under the hood)
- DNS: Route 53 (apex A-Alias and www CNAME both point at the Amplify CloudFront distribution)
- Hard blocker: No AWS Lambda or pay-per-use deployment without billing budgets documented.

## URL structure

- Calculators: `/calculators/{category}/{calculator-name}/`
- Category pages: `/calculators/{category}/`
- Each calculator is a directory with `index.html` for clean URLs.

## Country-specific calculators (UK, US, etc.)

When a calculator is only valid for one country (tax, mortgage, stamp duty, anything regulated), apply every one of these signals so Google routes the right users. Missing any one of them weakens the whole setup.

1. **URL slug**: country at the front, e.g. `/calculators/finance/uk-mortgage-calculator/`, `/calculators/finance/us-tax-calculator/`. Never hide country in the middle of the slug.
2. **`<title>` and `<h1>`**: start with the country, e.g. "UK Mortgage Calculator". Do not assume it from context.
3. **Meta description**: state the country focus in the first clause.
4. **hreflang tags in `<head>`**: self-reference the country, and cross-reference any sibling variant (UK ↔ US). Always include `x-default`.
   ```html
   <link rel="alternate" hreflang="en-GB" href="https://webcaretakers.com/calculators/finance/uk-mortgage-calculator/">
   <link rel="alternate" hreflang="en-US" href="https://webcaretakers.com/calculators/finance/mortgage-calculator/">
   <link rel="alternate" hreflang="x-default" href="https://webcaretakers.com/calculators/finance/mortgage-calculator/">
   ```
5. **Schema.org `SoftwareApplication`**: add `"inLanguage": "en-GB"` (or `en-US`) and `"countriesSupported": "GB"` (or `US`).
6. **Cross-link at the top of the page**: a small "Looking for the US version? →" / "UK version? →" callout so users self-route and link equity flows between variants.
7. **Content signals**: use the country's currency symbol, terminology (HMRC, IRS, council tax, property tax, stamp duty, PMI), and realistic thresholds. Do not mix examples across countries.
8. **`<html lang>`**: stays `en-GB` site-wide because we write in British English as a brand decision, even on US-targeted pages. The country-targeting work is done by the signals above, not by the root `lang` attribute.

Global calculators (BMI, percentage, photo resizer, etc.) do not need any of this — they stay on the site default.

## GTM and tracking

- GTM container in base template (head and body snippets).
- DataLayer events: `calculator_interaction`, `calculator_result`, `cta_click`.
- Every calculator interaction must be trackable as a conversion event in GA4.
