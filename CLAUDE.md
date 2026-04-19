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

## GTM and tracking

- GTM container in base template (head and body snippets).
- DataLayer events: `calculator_interaction`, `calculator_result`, `cta_click`.
- Every calculator interaction must be trackable as a conversion event in GA4.
