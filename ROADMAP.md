# Roadmap: WebCaretakers Calculator Hub

Last updated: 2026-04-26

## Primary target market

US-first. SerpAPI and SEMrush set to `United States` / `us` database. The UK will follow naturally for generic terms. UK-specific calculators in the list below (e.g. the freelance tax one) need to be either renamed for the US market or reframed as country-optional with toggles.

## Overview

220 calculators and tools across 20 categories, targeting long-tail SEO keywords in web, marketing, AI, SEO, and closely related tech niches. Built on the topical authority of a 25-year-old domain that historically covered web hosting, broadband, email marketing, and small business IT.

Source: Manus AI Wayback Machine analysis (688 snapshots, 2001-2010) plus internal ideation.

## Cross-cutting features

### Cookie consent banner (blocking, Consent Mode v2)

Required before GTM/GA4 goes live. Must:
- Default to deny all non-essential cookies (GA4, ads) on first page load
- Block GTM tags from firing until the user clicks accept
- Implement Google Consent Mode v2: `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization` all denied by default, updated via `gtag('consent', 'update', ...)` on acceptance
- Persist choice in `localStorage` so the banner only appears once per user
- Honest, non-dark-pattern language: "Accept" and "Reject" given equal visual weight
- Written in the tone.md voice, not lawyer filler

Revisit later: switch to cookieless analytics (Plausible/Fathom) to remove the need for the banner entirely.

**Status:** [ ] Not started

### US/UK region switcher (currency and units only)

Scope is deliberately narrow: **the switcher only changes currency (USD ↔ GBP) and units of measurement (imperial ↔ metric)**. It does not change language, spelling, voice, or tone. The Andrew Laws British voice stays for all users regardless of region.

Site defaults to US (USD, miles, gallons, Fahrenheit, pounds for weight). A persistent toggle in the header or footer lets users switch to metric/GBP. Preference stored in `localStorage` so it sticks across pages and sessions. Every calculator reads the current preference and re-renders labels and conversions on toggle without a page reload.

**Considerations:**
- Pre-filled example values and placeholder text need both variants
- Conversions should be done client-side from a single canonical unit per calculator, so we don't maintain two sets of logic
- URL should remain the same (no `?units=uk`) to keep SEO clean; preference is user-side only
- Where a calculator is fundamentally country-specific (e.g. tax), the switcher swaps to a different calculator variant or hides inapplicable inputs

**Status:** [ ] Not started

### Footer disclaimer

Implemented 2026-04-19 in `site/index.html`. Covers: informational use, not professional advice, no liability, recommendation to consult a qualified professional, and affiliate disclosure. Six Playwright tests assert its presence and content.

**Status:** [x] Complete (homepage). Needs to propagate to every calculator page as they are built, ideally via a shared template include once we introduce a build step, or by base-template copy-paste until then.

### "Prove it" button

Add a "Prove it" button to every calculator. When clicked, the button reveals a step-by-step explanation of how the result was reached, written in plain English where the formula allows it. The goal is to build user trust and reduce bounce from sceptical visitors.

**Approach:**
- Each calculator exposes a `getWorkings()` function that returns an ordered array of plain-English steps
- Steps are rendered in a collapsible panel beneath the result, toggled by the button
- Where the formula is too technical for plain English, show labelled substitution steps (e.g. "Result = A / B = 500 / 12 = 41.7")
- Button label: "Prove it" (collapsed) / "Hide working" (expanded)
- Track toggle as a `calculator_interaction` DataLayer event with `action: 'prove_it'`

**Open questions:**
- Decide whether workings are authored manually per calculator or generated dynamically from formula metadata
- Manual is more work but produces better prose; dynamic is scalable but may read mechanically
- Consider a hybrid: dynamic substitution steps with an optional hand-written plain-English summary

**AI Overview citation pattern:** every Prove-it panel should not only show the math but also cite the underlying logic or authority (e.g. "This follows the 183-day tax residency rule used by most EU countries", "Based on FCC broadband minimums published in 2024"). Giving the reasoning a named source makes the page quotable by Gemini, ChatGPT, and Perplexity, which is how we earn AI Overview citations rather than just ranking.

**Status:** [ ] Not started

### ELI5 block (Explain like I'm 5)

Every calculator page gets a short "Explain like I'm 5" block at the top, directly under the h1 and intro paragraph, above the calculator itself. Scope is narrow: it explains what *this calculator* does in plain words, not the underlying concept or domain. The "Prove it" button remains the place for the deeper workings.

**Approach:**
- Placement: top of the page, above the calculator card
- Format: short heading ("Explain like I'm 5 (what even is this calculator?)") plus 2-4 short sentences
- Voice: plain, direct, no jargon, in Andrew Laws tone
- Scope: what this tool does and when you would use it, not a mini-essay on the topic
- Visual: subtle styling, not a massive coloured box; sits comfortably above the tool

**Status:** [ ] Not started (pattern established on broadband bandwidth calculator)

### Privacy policy page

A proper `/privacy/` page is needed before we switch analytics on. The cookie banner already links to it, but the page itself does not exist yet. Must cover: what we collect (GA4), what we do not collect, consent mode, third parties (Google, any ad/affiliate networks once live), data retention, contact address for removal requests, and cookie-by-cookie listing. Should be plain English, in the site voice, not a copy-pasted generator template.

**Status:** [ ] Not started

### Post-deploy indexing pushers

After each Amplify deploy, ping the search engines so new and updated calculator URLs are picked up faster than the default crawl cadence. Build-time tooling only, never runtime.

**Scope:**
- A Node script `scripts/post-deploy-index-ping.js` triggered after deploy (manual or via Amplify build hook).
- Diff `sitemap.xml` against the previous run to identify newly added URLs.
- Submit the sitemap to Google via the Search Console API (`sitemaps.submit`). Requires a service-account JSON in `.env.local` and the SA email granted Owner access in GSC under Settings > Users and permissions.
- POST the new URL list to the IndexNow protocol endpoint for Bing/Yandex/Seznam, with a key file at the site root.
- Log every submission to a local file so we have a record of what was pushed.

**Out of scope:**
- Google Indexing API (`urlNotifications.publish`): officially restricted to JobPosting and BroadcastEvent schemas. Using it for calculator pages is grey-area and risks the GSC property. Skip.
- Sitemap ping URL (`google.com/ping?sitemap=...`): deprecated June 2023. Skip.
- Anything that runs in the user's browser at request time. The CLAUDE.md no-runtime-API rule still applies.

**Status:** [ ] Not started. Documented here so we can pick it up once the calculator catalogue is large enough that crawl latency actually matters.

### Site navigation and category hubs

Three-tier IA: **Home → Category hub → Calculator**. Primary nav shows categories only (6–10 items max), with a dropdown listing the top calculators per category plus a "See all" link. Category hubs (`/calculators/{category}/`) are real pages with their own intro, grouped listings, and long-form SEO content, not thin redirects. The all-calculators index (`/calculators/`) is the A–Z fallback for users who don't know the category.

**Source of truth:** [`categories.json`](categories.json). Only categories with at least one published tool appear in the primary nav.

**Future work as the site scales:**
- Client-side search over a generated index (Lunr or Pagefind) once we pass ~50 calculators
- Mega-menu treatment (two-column dropdown) once any category has more than ~8 tools
- Sub-category grouping inside large category hubs (e.g. Broadband > Home, Broadband > Business)
- Generator script that builds primary nav HTML from `categories.json` once the category count makes hand-maintenance error-prone

**Status:** [x] v1 shipped (dropdown nav with Broadband and Math categories, three hub pages, hand-maintained nav across all pages, 16 Playwright tests, mobile-overflow fix at 375px). Mobile hamburger toggle added 2026-04-26: nav collapses behind a button at ≤720px and expands via `[data-nav-open]` on the header; injected by `main.js` so the per-page HTML doesn't have to change. 7 Playwright tests at iPhone 13 Pro width (390px) plus a desktop control.

---

## Outstanding per-calculator work

- **Broadband Bandwidth Calculator:** add an affiliate link to a broadband provider comparison/switching service. Currently has the CTA block but no real affiliate partner wired in. Decide partner, add disclosed affiliate link, update JSON-LD / copy if needed.

---

## Site SEO programme

The shipping pause is the chance to do the SEO work properly rather than feed the catalogue. Goal: get webcaretakers.com ranking on the calculators we already have, on the back of the 25-year domain. Each item below is tracked the same way the calculator pipeline is, with a Status flag.

What already exists (so we don't redo it): per-category sitemaps plus a master `sitemap.xml`, a `robots.txt` pointing at it, an `llms.txt`, an author page, a `/privacy/` directory, and build-time scripts for schema, author meta, FAQ JSON-LD and internal links under `scripts/`. The work below builds on that foundation.

### 1. Search Console and Bing Webmaster baseline

Get clean, monitored data flowing before we change anything else, otherwise we are optimising blind.

- Verify the apex and www in Google Search Console (DNS TXT via Route 53), pick one as canonical property
- Submit `sitemap.xml` and confirm all per-category sitemaps are discovered
- Verify the same property in Bing Webmaster Tools and submit the sitemap there
- Set up weekly export of Performance data (queries, pages, CTR, position) so we have a local record beyond the 16-month GSC window
- Audit Coverage report for excluded URLs, fix the legitimate ones, ignore the noise
- Confirm Core Web Vitals report is populating (needs CrUX data, may take 28 days)

**Status:** [ ] Not started

### 2. Privacy page, consent banner and GA4 switch-on

Analytics is the feedback loop for everything else. Currently blocked.

- Audit the existing `/privacy/index.html` against what we actually do (GA4, Consent Mode v2, ad networks, affiliates) and rewrite in the tone.md voice if it is template filler
- Ship the cookie consent banner described in the Cross-cutting features section
- Wire GA4 through GTM with consent defaults set to denied
- Define the four conversion events: `calculator_interaction`, `calculator_result`, `cta_click`, `prove_it_open`
- Link GA4 to GSC so query-to-page-to-event attribution works in one place

**Status:** [ ] Not started

### 3. Schema audit and consolidation

Already partially in place via `scripts/inject-seo-schema.js` and `scripts/fix-faq-jsonld.js`. Make it consistent and complete across every published calculator.

- Inventory current JSON-LD by calculator: `SoftwareApplication`, `FAQPage`, `BreadcrumbList`, `Organization`, `WebSite` with `SearchAction`
- Every calculator must have `SoftwareApplication` plus `BreadcrumbList`, and `FAQPage` where the page actually has FAQs (no fabricated FAQs just to add schema)
- Add `Organization` and `WebSite` once at the site level, not per page
- Country-targeted calculators: confirm `inLanguage` and `countriesSupported` are set per CLAUDE.md
- Validate every page against Google's Rich Results Test as part of the build; fail the build on schema errors
- Remove any schema that misrepresents the page (Google penalises this and it is a real risk on a hub site)

**Status:** [~] In progress. 2026-04-30: audited 132 pages, baseline is healthier than expected — 110/110 calculators carry SoftwareApplication + FAQPage + BreadcrumbList + Organization, all 15 category hubs carry CollectionPage + nested ItemList + BreadcrumbList. Built `scripts/validate-jsonld.js` (with 15 unit tests) wired into `npm test` via `npm run validate:schema`. Validator parses every JSON-LD block, walks nested properties (so `CollectionPage.mainEntity = { @type: ItemList }` is detected correctly), enforces page-type contracts, and rejects empty `FAQPage.mainEntity` so we never ship fabricated FAQs. All 132 pages currently pass. Still to do: Rich Results Test integration, schema-misrepresentation review.

### 4. Title, meta and heading sweep

Cheap, high-leverage. Do it once GSC has 4 weeks of data so we are rewriting against real queries.

- Export GSC queries per page, identify the dominant query and the long-tail variants
- Rewrite `<title>` to lead with the dominant query, kept under 60 characters where possible
- Rewrite meta descriptions to match search intent in the first clause, in the tone.md voice, no marketing fluff
- Confirm one `<h1>` per page and that it matches the title intent
- Sub-headings (`<h2>`, `<h3>`) should mirror the question phrasing users actually type (the GSC query export tells us this)
- Track before/after CTR per URL in a simple spreadsheet so we can prove the lift

**Status:** [ ] Not started

### 5. Internal linking pass

The site has `scripts/internal-links.js` already. The work is editorial: making sure the right calculators link to the right siblings.

- Each calculator gets a "Related calculators" block of three to five hand-chosen siblings, not a generic auto-list
- Each category hub links to every calculator in the category and to the two or three closest sibling categories
- Every calculator links back up to its category hub via breadcrumbs (this is also the `BreadcrumbList` schema source)
- Cross-link UK/US sibling pairs at the top of the page per CLAUDE.md country rules
- The homepage links to the top calculator in each live category, not to all of them
- Audit for orphan pages (pages with zero internal links in) using a crawl of the live site

**Status:** [~] In progress. 2026-04-30: in-link audit clean — zero orphans across 110 calculators, lowest in-link count is 1, top pages get 12–15 (word-count, unit-converter, read-time-calculator, photo-resizer, compound-interest). Found and fixed a duplication bug: `inject-seo-schema.js` auto-generated a `class="related-calcs"` block on every page but its dedup check missed pages with hand-picked `<!-- related-calculators-block -->` blocks, so 53 pages shipped with two "Related calculators" sections. Widened the dedup check (also looks for the hand-picked marker) and ran a one-off cleanup script (`scripts/strip-duplicate-related-calcs.js`) to strip the duplicate auto blocks. 53 pages cleaned, 0 skipped, all tests pass. Hand-picked block rollout in progress: writing (2/2 done) and business (2/2 done) converted with intent-driven anchor text and a one-line frame. Remaining 53 by category: cybersecurity 8, math 6, broadband 6, ai 6, seo 4, property 4, productivity 4, images 4, fun 4, conversions 4, health 3. Pattern documented: hand-picked blocks reuse the `related-calcs` styling hooks for visual consistency but carry the `<!-- related-calculators-block -->` marker comment immediately above the section so the inject-seo-schema dedup check and the strip script's negative-lookbehind regex both treat them correctly. Still to do: cross-link UK/US sibling pairs at top of page, homepage one-link-per-category review, hand-picked block rollout for the remaining 53.

### 6. Category hub long-form content

Currently most hubs are thin lists. The roadmap promises real pages with intros, grouped listings and long-form SEO content (see Site navigation section above). This is the biggest single ranking lever we have.

- For each live category, write 600 to 1,200 words of genuinely useful intro content above the calculator grid
- Cover: what the category is, who uses these tools, when to reach for which one, common mistakes
- Tone.md voice, British English, no marketing fluff, no AI-template phrasing
- Sub-category groupings inside the hub where the calculator count justifies it (Broadband > Home, Broadband > Business, etc.)
- An FAQ block at the bottom of each hub answering the top three to five GSC queries for the hub URL

**Status:** [~] In progress. 2026-04-30: audit revealed the long-form work was already done — every one of the 15 hubs has 593 to 982 words of long-form content, well inside the 600 to 1,200 target. The real gap is hub-level FAQ blocks: zero of 15 hubs had one. Built the pattern on the health hub: five `<details>` questions covering the top first-principles queries (medical-advice disclaimer, why-different-answers, which-to-start-with, units, data-privacy) plus matching FAQPage JSON-LD with five Question/Answer pairs. Placed between the calculator grid and the closing caveats long-form section so the page reads intro → long-form → grid → FAQ → caveat-closer. Validates clean against the schema linter. Note: questions are first-principles guesses, not GSC-derived; once GSC data flows (task #1) we will refine each hub's FAQ to match real queries. FAQ rollout in progress: health, broadband and finance done (3/15). Each hub gets five questions tailored to that category's actual visitor intent (broadband: speed-needed, why-slow, FTTC-vs-FTTP, VPN, streaming bandwidth; finance: UK-vs-US, accuracy-vs-lender, APR-vs-rate, overpay-vs-invest, data-privacy), with internal links from FAQ answers into the relevant calculators for in-link flow. 12 hubs remaining: ai, business, conversions, cybersecurity, fun, images, math, productivity, property, seo, wedding, writing. Still to do: continue FAQ rollout, sub-category groupings inside large hubs, refine FAQ content once GSC data is available.

### 7. ELI5 and Prove-it rollout

Already designed (see Cross-cutting features). The SEO value is twofold: depth-of-content signal for Google, and citation-ready facts for AI Overviews and Perplexity.

- Roll out the ELI5 block to every published calculator
- Roll out the Prove-it panel with the AI Overview citation pattern (named source per workings step)
- Track `prove_it_open` as a GA4 event and watch engagement vs control pages for six to eight weeks

**Status:** [ ] Not started (pattern established on broadband bandwidth calculator)

### 8. Core Web Vitals baseline and budget

Static site on Amplify and CloudFront, so we should be fast by default. Confirm it, then hold the line.

- Run Lighthouse and PageSpeed Insights on a sample of 10 calculators (across category templates)
- Record LCP, INP, CLS for each, set a per-template budget that we will not regress past
- Add a build-time check (Lighthouse CI or similar) that fails the deploy if a template breaks budget
- Specific known wins to verify: image lazy-loading, font-display: swap, no render-blocking JS, preloaded LCP image where relevant
- Re-baseline once GSC's CWV report has 28 days of field data so we are tuning to real users not lab numbers

**Status:** [ ] Not started

### 9. Backlinks and digital PR

The 25-year domain authority is the moat. The job is to earn fresh, topical links to specific calculators so the equity flows down to ranking pages, not just the homepage.

- Identify the five calculators with the highest commercial intent and the best chance of being cited (likely: broadband bandwidth, UK marathon difficulty, UK rent vs buy, TDEE, pregnancy due date)
- For each, list 10 to 20 sites that already link to similar tools (use SEMrush or Ahrefs free tier)
- Outreach is opportunity-led: a useful tool, a relevant journalist or blogger, a clear reason to link. Never "building backlinks" language per CLAUDE.md
- Track all outreach in `links.json` (already in repo) with status: contacted, responded, linked, dead
- Reactive PR: monitor HARO/Qwoted/Featured for queries that match calculator topics
- No paid links, no link networks, no PBNs. The domain is too old and too valuable to risk.

**Status:** [ ] Not started

### 10. Post-deploy indexing pushers

Already in the roadmap (see Cross-cutting features), reproduced here so it lives in the SEO programme. Lower priority than 1 to 6 but worth doing once the catalogue update cadence picks back up.

- `scripts/post-deploy-index-ping.js` diffs `sitemap.xml`, calls GSC `sitemaps.submit`, POSTs to IndexNow for Bing/Yandex/Seznam, logs every submission

**Status:** [~] In progress. 2026-04-30: built `scripts/post-deploy-index-ping.js` (296 lines) with 12 unit tests covering sitemap parsing, URL diff, payload shape and chunking. Walks `site/sitemap.xml` (treated as a sitemapindex pointing at the per-category urlsets), collects all canonical URLs, diffs against `.indexnow-snapshot.json`, and POSTs added URLs (chunked at the 10k IndexNow limit) to `https://api.indexnow.org/IndexNow`. Every run appends to `.indexnow-log.jsonl`. First run writes the baseline snapshot without pinging unless `--initial-publish` is set, so we cannot accidentally spam the entire catalogue. `--dry-run` flag for safe inspection. Exposed via `npm run index:ping` and `npm run index:ping:dry`. INDEXNOW_KEY documented in `.env.example`; key file expected at `site/<key>.txt` and the script verifies its contents match before doing anything. Snapshot and log files are gitignored. GSC submission is intentionally deferred (stub `submitToGsc` documented in the script): it needs a Google service account JSON granted Owner on the GSC property, which depends on task #1. Still to do: provision the IndexNow key, generate the verification file, run `--initial-publish` once after the next deploy, and add the GSC submission once #1 lands.

### 11. Monitoring and review cadence

SEO without a review loop is just hope. Set the loop now.

- Monthly: GSC Performance review, top movers up and down, queries per page, CTR outliers
- Monthly: rank tracking on a fixed list of 30 to 50 priority queries (SerpAPI is fine, build-time only per CLAUDE.md)
- Quarterly: full content audit of every published calculator (still accurate? still on intent? still the right CTA?)
- Quarterly: backlink delta, flag toxic links via GSC if needed
- Annual: full technical re-audit (schema, CWV, internal links, sitemap hygiene)

**Status:** [ ] Not started

### Suggested order of work

1, 2, 3 in parallel (data + analytics + schema baseline)
Then 5, 6, 7 (the on-page work that needs the data from step 1 to be sharp)
Then 4 (title/meta sweep, after 4 weeks of GSC data)
Then 8 (CWV with real-user data)
Then 9, 10, 11 (link building and ongoing loops, by which point we have something worth pointing links at)

---

## Build priority

- **Tier 1 (first cluster):** Calculators with direct historical authority from the domain's past content
- **Tier 2:** High-volume, low-build-difficulty calculators in core categories
- **Tier 3:** Expansion into adjacent marketing and tech categories

## Status key

- [ ] Not started
- [x] Complete
- [~] In progress

---

## Recently shipped (off the original 220-list)

These were built in response to keyword research, traffic priorities or user requests rather than from the Tier 1 list. Source of truth for live calculators is `categories.json`; this section is just a quick map of what's been added beyond the original roadmap.

- [x] UK Sportive Difficulty Calculator (Health, UK-localised, 2026-04-29) — cycling sibling, GPX upload, physics-based power model, Strava cycling categorisation
- [x] UK Marathon Course Difficulty Calculator (Health, UK-localised, 2026-04-29) — GPX upload, Strava-style GAP, late-race fatigue weighting, climb detection
- [x] Pregnancy Due Date Calculator (Health, 2026-04-26)
- [x] TDEE Calculator (Health, 2026-04-26)
- [x] UK Rent vs Buy Calculator (Property, UK-localised, 2026-04-26)
- [x] Cooking Measurements Converter (Conversions, 2026-04-26)
- [x] Discount Calculator (Math, 2026-04-26)
- [x] Domain Renewal True Cost Calculator (Business)
- [x] IT Support Build vs Buy Calculator (Business)
- [x] Rental Yield Calculator (Property)
- [x] English to Suffolk Translator (Suffolk)
- [x] Suffolk Lorem Ipsum (Suffolk)
- [x] Unit Converter (Conversions)

In-flight (background workers): HEIC to JPG converter, WebP to JPG converter, Image Compressor — search-language-driven image tools targeting how users actually phrase the query.

## Tier 1: Historical Authority (build first)

These map directly to content that existed on webcaretakers.com between 2001-2010.

- [~] Broadband Bandwidth Requirement Calculator (80-120k searches/mo)
- [ ] Email Marketing ROI Calculator (15-25k searches/mo)
- [ ] iCal Event Generator Tool (40-60k searches/mo)
- [ ] Web Hosting Storage and Bandwidth Estimator (15-25k searches/mo)
- [ ] Website Health and Speed Budget Calculator (10-20k searches/mo)
- [ ] IT Support Build vs Buy Calculator (5-10k searches/mo)
- [ ] Domain Renewal True Cost Calculator (8-15k searches/mo)
- [ ] Website Photo Resizer Tool (150k searches/mo)

---

## 1. Broadband and Internet (12)

- [ ] Broadband Speed to File Download Time Calculator
- [ ] Data Usage Estimator
- [ ] Broadband Cost Per GB Calculator
- [ ] VPN Speed Overhead Calculator
- [ ] Wi-Fi vs Ethernet Latency Comparison Tool
- [ ] ISP Switching Savings Calculator
- [ ] Broadband Contention Ratio Impact Calculator
- [ ] Leased Line vs Broadband Cost Comparison
- [ ] Remote Work Bandwidth Requirements Calculator
- [ ] 4G/5G vs Fibre Broadband Speed Calculator
- [ ] Network Latency to User Experience Impact Calculator
- [ ] Business Broadband ROI Calculator

## 2. Web Hosting and Domains (14)

- [ ] Shared vs VPS vs Dedicated Server Cost Calculator
- [ ] Domain Name Renewal Cost Tracker
- [ ] Web Hosting Downtime Cost Calculator
- [ ] CDN Cost Estimator
- [ ] Domain Portfolio ROI Calculator
- [ ] SSL Certificate Cost Comparison Tool
- [ ] Hosting Migration Cost Estimator
- [ ] Object Storage Cost Calculator (S3/R2/Backblaze)
- [ ] Domain Appraisal Value Estimator
- [ ] Subdomain vs Subdirectory SEO Impact Estimator
- [ ] Managed WordPress Hosting Break-Even Calculator
- [ ] Email Hosting Cost Per Mailbox Calculator
- [ ] WHOIS Privacy Cost-Benefit Tool
- [ ] Server Resource Requirements Estimator

## 3. Email Marketing (13)

- [ ] Email List Growth Rate Calculator
- [ ] Email Deliverability Score Estimator
- [ ] Email Revenue Per Subscriber Calculator
- [ ] Unsubscribe Rate Impact Calculator
- [ ] Email Send Frequency Optimiser
- [ ] A/B Test Sample Size Calculator for Email
- [ ] Email Warm-Up Schedule Generator
- [ ] ESP Cost Comparison Calculator
- [ ] Email Sequence ROI Calculator
- [ ] Re-engagement Campaign Value Calculator
- [ ] Email Click-to-Open Rate Benchmarking Tool
- [ ] List Hygiene Savings Calculator
- [ ] Email Preview Text Character Counter

## 4. Website Performance and SEO (15)

- [ ] Core Web Vitals Score to Ranking Impact Estimator
- [ ] Page Speed to Bounce Rate Calculator
- [ ] Technical SEO Audit Time Estimator
- [ ] Crawl Budget Calculator
- [ ] Internal Link Equity Distribution Tool
- [ ] Keyword Difficulty to Traffic Potential Ratio Calculator
- [ ] Organic Traffic Value Calculator
- [ ] Featured Snippet Click-Through Rate Estimator
- [ ] Backlink Profile Decay Calculator
- [ ] XML Sitemap Size and Priority Calculator
- [ ] Robots.txt Crawl Blocking Impact Estimator
- [ ] Canonical Tag Audit Complexity Estimator
- [ ] Schema Markup Coverage Calculator
- [ ] Keyword Cannibalisation Severity Score
- [ ] SEO ROI Calculator

## 5. IT and Technology (12)

- [ ] IT Support Cost Per User Calculator
- [ ] Software Licence Audit Cost Estimator
- [ ] Hardware Refresh Cycle Cost Calculator
- [ ] Cloud vs On-Premise Infrastructure Cost Comparison
- [ ] IT Downtime Cost Calculator
- [ ] Backup Storage Cost Estimator
- [ ] Device Management Cost Per Endpoint
- [ ] IT Helpdesk Ticket Cost Calculator
- [ ] Office 365 vs Google Workspace Cost Comparison
- [ ] Remote Work IT Setup Cost Calculator
- [ ] Cybersecurity Spend as a Percentage of IT Budget Tool
- [ ] Technology Debt Accumulation Calculator

## 6. Small Business and Freelance (13)

- [ ] Freelance Day Rate Calculator
- [ ] Project Profitability Calculator
- [ ] Agency Overhead Recovery Rate Calculator
- [ ] Website Project Scope Creep Cost Calculator
- [ ] SaaS Tool Budget Audit Calculator
- [ ] Freelance Tax Estimate Calculator (UK)
- [ ] Client Acquisition Cost Calculator for Agencies
- [ ] Proposal Win Rate and Revenue Estimator
- [ ] Retainer vs Project Revenue Stability Comparison
- [ ] Small Business Website ROI Calculator
- [ ] Web Design Project Pricing Calculator
- [ ] Contractor vs Employee Cost Comparison (Tech Roles)
- [ ] Business Domain and Branding Cost Estimator

## 7. AI and Machine Learning (14)

- [ ] AI API Cost Calculator (OpenAI/Anthropic/Gemini)
- [ ] LLM Token Length Estimator
- [ ] AI Content Production Cost vs Human Writer Cost Comparison
- [ ] AI Model Accuracy to Business Impact Calculator
- [ ] Training Data Volume Requirements Estimator
- [ ] AI Chatbot Deflection Rate Calculator
- [ ] RAG Pipeline Cost Estimator
- [ ] AI Tool ROI Calculator
- [ ] Prompt Engineering Time Value Calculator
- [ ] AI Image Generation Cost Per Asset Calculator
- [ ] Fine-Tuning vs Prompting Cost Trade-Off Calculator
- [ ] AI Adoption Readiness Score
- [ ] Vector Database Storage Cost Estimator
- [ ] AI Content Detection Risk Score

## 8. Social Media Marketing (11)

- [ ] Social Media Posting Frequency ROI Calculator
- [ ] Influencer Marketing Cost Per Engagement Calculator
- [ ] Social Media Management Time Cost Calculator
- [ ] Organic Reach Decline Calculator
- [ ] Social Media Follower Growth Rate Calculator
- [ ] LinkedIn Outreach Response Rate Calculator
- [ ] Social Media Conversion Funnel Calculator
- [ ] User-Generated Content Value Estimator
- [ ] Social Proof Calculator
- [ ] Twitter/X Ad Cost Estimator
- [ ] Social Media Content Calendar Time Estimator

## 9. PPC and Paid Advertising (12)

- [ ] Google Ads Quality Score Impact on CPC Calculator
- [ ] Break-Even ROAS Calculator
- [ ] PPC Budget Burn Rate Calculator
- [ ] Ad Frequency Cap Calculator
- [ ] Remarketing Audience Size Estimator
- [ ] Landing Page Conversion Rate Impact on CPA Calculator
- [ ] PPC Competitor Spend Estimator
- [ ] Negative Keyword Savings Calculator
- [ ] Google Shopping Feed Coverage Calculator
- [ ] Smart Bidding vs Manual Bidding Cost Comparison
- [ ] Display Network CPM to Impression Calculator
- [ ] Ad Copy A/B Test Statistical Significance Calculator

## 10. Content Marketing and Copywriting (12)

- [ ] Content Audit Time Estimator
- [ ] Blog Post Word Count to Read Time Calculator
- [ ] Content Production Cost Calculator
- [ ] Content Decay Rate Estimator
- [ ] Pillar Page and Cluster Content ROI Calculator
- [ ] Headline Character Count and CTR Estimator
- [ ] Content Repurposing ROI Calculator
- [ ] Guest Post Outreach ROI Calculator
- [ ] Editorial Calendar Capacity Planner
- [ ] Readability Score to Conversion Rate Estimator
- [ ] Long-Form vs Short-Form Content ROI Comparison
- [ ] Content Localisation Cost Estimator

## 11. Analytics and Data (10)

- [ ] GA4 Event Tracking Coverage Calculator
- [ ] Bounce Rate vs Engagement Rate Conversion Tool
- [ ] Statistical Significance Calculator for A/B Tests
- [ ] Data Sampling Impact Estimator
- [ ] Attribution Model Comparison Calculator
- [ ] Cohort Retention Rate Calculator
- [ ] Dashboard Build Time Estimator
- [ ] Data Layer Implementation Complexity Estimator
- [ ] Conversion Funnel Drop-Off Value Calculator
- [ ] First-Party Data Collection ROI Estimator

## 12. CRM and Sales (10)

- [ ] Sales Funnel Conversion Rate Calculator
- [ ] CRM Platform Cost Per User Comparison
- [ ] Lead Response Time to Close Rate Calculator
- [ ] Customer Lifetime Value Calculator
- [ ] Sales Quota Attainment Probability Calculator
- [ ] CRM Data Hygiene Cost Calculator
- [ ] Sales Cycle Length to Cash Flow Impact Calculator
- [ ] Upsell and Cross-Sell Revenue Potential Calculator
- [ ] Inbound vs Outbound Lead Cost Comparison
- [ ] CRM Adoption Rate to Revenue Impact Calculator

## 13. Ecommerce and Online Retail (12)

- [ ] Ecommerce Conversion Rate Benchmark Tool
- [ ] Shopping Cart Abandonment Revenue Recovery Calculator
- [ ] Product Margin Calculator with Fulfilment Costs
- [ ] Ecommerce Return Rate Cost Calculator
- [ ] Marketplace Fee Comparison Tool (Amazon vs eBay vs Etsy)
- [ ] Subscription Box Churn Rate Revenue Impact Calculator
- [ ] Flash Sale Discount Margin Impact Calculator
- [ ] Ecommerce Email Sequence Revenue Attribution Calculator
- [ ] Product Photography Cost ROI Estimator
- [ ] Fulfilment Cost Per Order Calculator
- [ ] Ecommerce Customer Acquisition Cost Calculator
- [ ] Checkout Optimisation Revenue Impact Calculator

## 14. Cybersecurity and Privacy (11)

- [ ] Data Breach Cost Estimator
- [ ] Password Strength to Crack Time Calculator
- [ ] Password Generator (configurable length and character sets; client-side only, nothing transmitted)
- [ ] GDPR Fine Risk Estimator
- [ ] Phishing Simulation Click Rate Benchmarking Tool
- [ ] SSL Certificate Expiry Revenue Impact Calculator
- [ ] Cyber Insurance Premium Estimator
- [ ] Two-Factor Authentication Adoption ROI Calculator
- [ ] Cookie Consent Rate Impact on Analytics Accuracy Tool
- [ ] Security Audit Frequency Cost Calculator
- [ ] VPN for Business Cost vs Risk Trade-Off Calculator

## 15. Web Development and Design (14)

- [ ] Website Redesign ROI Calculator
- [ ] Responsive Design Testing Time Estimator
- [ ] API Rate Limit and Throttling Calculator
- [ ] Web Font Load Time Impact Calculator
- [ ] Image Optimisation File Size Savings Calculator
- [ ] JavaScript Bundle Size to Load Time Calculator
- [ ] A/B Testing Duration Calculator
- [ ] CMS Migration Time Estimator
- [ ] Accessibility Compliance Gap Estimator
- [ ] Third-Party Script Load Time Impact Tool
- [ ] Design System Build Time Estimator
- [ ] Web Project Hourly Rate Adequacy Calculator
- [ ] Progressive Web App vs Native App Cost Comparison
- [ ] HTTP Request Reduction Impact on Load Speed Calculator

## 16. Video and Podcast Marketing (10)

- [ ] YouTube CPM Revenue Estimator
- [ ] Podcast Sponsorship Rate Calculator
- [ ] Video Production Cost Per Minute Estimator
- [ ] Podcast Episode Download to Listener Ratio Calculator
- [ ] Video SEO Optimisation Checklist Score
- [ ] Podcast Launch Break-Even Calculator
- [ ] Video Thumbnail A/B Test Impact on CTR Calculator
- [ ] Repurposing Video Content ROI Calculator
- [ ] Podcast Advertising CPM Comparison Tool
- [ ] Video Ad Skip Rate to Cost Efficiency Calculator

## 17. Affiliate and Referral Marketing (10)

- [ ] Affiliate Commission Structure Profitability Calculator
- [ ] Affiliate Programme Setup Cost Estimator
- [ ] Referral Programme Viral Coefficient Calculator
- [ ] Affiliate Traffic Quality Score
- [ ] Affiliate Cookie Window Impact Calculator
- [ ] Affiliate Network Fee Comparison Tool
- [ ] Content Affiliate Earnings Per Click Calculator
- [ ] Affiliate Fraud Detection Cost Estimator
- [ ] Referral Incentive Break-Even Calculator
- [ ] Affiliate Programme ROI Calculator

## 18. Marketing Strategy and Planning (11)

- [ ] Marketing Budget Allocation Calculator
- [ ] Channel Attribution Revenue Share Calculator
- [ ] Go-to-Market Launch Budget Estimator
- [ ] Customer Payback Period Calculator
- [ ] Marketing Qualified Lead to Revenue Conversion Calculator
- [ ] Brand Awareness Campaign Reach and Frequency Calculator
- [ ] Campaign Objective to KPI Mapping Tool
- [ ] Marketing Team Headcount to Revenue Ratio Benchmarking Tool
- [ ] Seasonal Marketing Spend Adjustment Calculator
- [ ] Competitor Share of Voice Estimator
- [ ] New Market Entry Digital Marketing Budget Estimator

## 19. SaaS and Software Business (12)

- [ ] MRR to ARR Conversion Calculator
- [ ] SaaS Churn Rate to Customer Lifetime Calculator
- [ ] SaaS Pricing Tier Margin Calculator
- [ ] Free Trial to Paid Conversion Rate Benchmarking Tool
- [ ] Net Revenue Retention Calculator
- [ ] SaaS CAC to LTV Ratio Calculator
- [ ] Product-Led Growth Viral Coefficient Calculator
- [ ] SaaS Revenue Runway Calculator
- [ ] Freemium Conversion Rate Revenue Impact Calculator
- [ ] SaaS Support Cost Per Ticket Calculator
- [ ] Annual vs Monthly Billing Revenue Acceleration Calculator
- [ ] SaaS Onboarding Cost Per Customer Calculator

## 20. Webmaster Tools and Utilities (14)

Note: developer-centric utilities (Base64, JSON formatter, Unix timestamp, JWT decoder, regex tester) are deprioritised. Tech-savvy users reach for an LLM for these now rather than a web tool. The items below that remain are either non-developer in audience or have clear SEO demand from a broader audience.

- [x] Character and Word Count Tool (already in roadmap; broad audience beyond developers) - `/calculators/writing/word-count/`
- [x] Reading Time Estimator (paste any text, get estimated minutes to read, useful for writers, editors, and marketers) - `/calculators/writing/read-time-calculator/`
- [ ] Text Case Converter (camelCase, snake_case, UPPER CASE, Title Case, sentence case — writer and developer crossover)
- [ ] Text Diff Tool (paste two blocks of text, see what changed — proofreading, contract revisions, code review)
- [x] URL Slug Generator and Validator - `/calculators/seo/url-slug-generator/`
- [x] Meta Title and Description Length Checker - `/calculators/seo/meta-length-checker/`
- [ ] Colour Contrast Ratio Checker (WCAG)
- [ ] Base64 Encoder and Decoder (lower priority — see note above)
- [ ] Unix Timestamp to Human-Readable Date Converter (lower priority — see note above)
- [ ] HTTP Status Code Reference and Lookup Tool
- [ ] UTM Parameter Builder
- [ ] robots.txt Rule Tester
- [ ] CSS Specificity Calculator
- [ ] JSON to CSV Converter

## 21. Digital Sustainability and Green Tech (4)

Context: ESG reporting is becoming mandatory for many firms in 2025-2026, making "digital carbon" a high-intent B2B search area.

- [ ] AI Inference Carbon Footprint Calculator (CO2 impact of LLM queries by model size and data centre region)
- [ ] Website Carbon Benchmarker (emissions from data transfer, green hosting status, dark-mode savings)
- [ ] Email Inbox Bloat Emission Estimator (annual carbon cost of unread newsletters and stored attachments across a company)
- [ ] Cloud vs On-Prem Energy Efficiency Comparison (PUE benchmarks for major cloud providers vs typical SMB server rooms)

## 22. Legal, Privacy and AI Compliance (4)

Context: EU AI Act and evolving privacy laws create fear-based high-intent traffic. Users want a quick "am I in trouble?" assessment.

- [ ] EU AI Act Risk Tiering Tool (Prohibited / High-Risk / Limited / Minimal based on 2026 enforcement guidelines)
- [ ] AI Act Fine Estimator (up to €35m or 7% of global turnover based on violation and company size)
- [ ] Privacy Policy Readability and Risk Score (time-to-read plus missing 2026-standard clauses like AI training opt-outs)
- [ ] Digital Nomad Safe Harbor Tax Day Counter (183-day residency tracking across jurisdictions)

## 23. Advanced Infrastructure and AI Unit Economics (4)

Context: shift from "AI hype" to "AI operations" puts the cost of scaling front and centre.

- [ ] GPU Unit Economics Build vs Rent (3-year TCO of buying H100/A100 cluster vs renting from Lambda, AWS, Azure)
- [ ] Small Language Model Savings Estimator (ROI of switching from frontier to Mini/Flash models, 10-30x cheaper)
- [ ] API Caching ROI Calculator (savings from 40-60% cache hit rate on search or LLM APIs, key for agentic workflows)
- [ ] Cloud Egress Hidden Cost Estimator (1TB egress cost AWS/GCP vs Cloudflare/Akamai zero-egress)

## 24. Tech Career and Human Capital (4)

Context: highly shareable on LinkedIn and Reddit, drives natural pull traffic.

- [ ] Remote Work Geo-Arbitrage Parity Calculator ($150k London salary valued in Lisbon, Bali, Austin, factoring local inflation and 2026 digital nomad visas)
- [ ] The Meeting Tax Real-Time Burner (live running cost of a meeting based on attendees and hourly rates)
- [ ] RSU and Stock Option Real Value Estimator (total compensation with vesting, strike prices, tax hits)
- [ ] Tech Stack Obsolescence Timer (half-life of a developer's skills based on GitHub and job-market trends)

## 25. Everyday Calculators and Utilities (7)

Context: high search volume, general audience, no backend required. These sit outside the core web/marketing/tech focus but fit naturally on a calculator hub and pull broad organic traffic. Privacy angle ("everything stays in your browser") is a genuine differentiator over ad-heavy sites that do the same job badly.

- [x] Age in Months Calculator (ships as a Fun-category tool with a Parenting Hell podcast framing; doubles as the canonical age-calculator answer for anyone searching years/months/days between two dates) — `/calculators/fun/age-in-months-calculator/`
- [x] Date Difference Calculator (ships in the Fun category as the canonical "gap between two dates" tool; covers years, months, days, weeks, hours and Mon-Fri business days) — `/calculators/fun/date-difference-calculator/`
- [x] Tip Calculator (ships in the Finance category with a currency toggle and an optional round-up-per-person mode for awkward splits) — `/calculators/finance/tip-calculator/`
- [x] Savings Goal Calculator (ships in the Finance category; solves the annuity-future-value formula for the monthly contribution, factors in starting balance and optional interest) — `/calculators/finance/savings-goal-calculator/`
- [ ] Password Generator (configurable length and character sets; also listed under Cybersecurity — whichever category fits the URL better wins; client-side only)
- [ ] EXIF Data Viewer (drag in a photo, see all embedded metadata: GPS coordinates, camera model, date taken — privacy angle: "check what your images reveal before you post them"; fits under the existing Images category)
- [x] Unit Converter — `/calculators/conversions/unit-converter/` (length, mass, volume, temperature, speed, area; all common units shown at once)

## 26. High-Utility Quick-Fix Tools (3)

Context: target zero-click AI Overviews by providing immediate, definitive answers.

- [ ] Social Media Spam Probability Checker (predicts likelihood of a cold outreach being flagged by LinkedIn or Gmail)
- [ ] Video Hook Retention Predictor (estimates first-3-seconds drop-off based on headline and thumbnail loudness)
- [ ] API Health and Latency Impact Calculator (how a 200ms delay compounds across a multi-step journey and hits conversion)
