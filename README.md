# WebCaretakers.com - Calculator Hub

A collection of hyper-specific calculators hosted on webcaretakers.com, targeting long-tail SEO keywords.

## Tech stack

- Static HTML, CSS, and vanilla JS (no frameworks)
- AWS S3 + CloudFront for hosting
- Google Tag Manager for analytics and conversion tracking
- GA4 for event tracking

## URL structure

```
/calculators/{category}/{calculator-name}/
```

Each calculator lives in its own directory with an `index.html` for clean URLs.

## Development

Tests first (James Kindred method):

```bash
npm test
```

## Deployment

```bash
./deploy.sh
```

Syncs the site to S3 and invalidates the CloudFront cache.
