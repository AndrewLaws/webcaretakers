# Roadmap: WebCaretakers Calculator Hub

Last updated: 2026-04-22

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

### Site navigation and category hubs

Three-tier IA: **Home → Category hub → Calculator**. Primary nav shows categories only (6–10 items max), with a dropdown listing the top calculators per category plus a "See all" link. Category hubs (`/calculators/{category}/`) are real pages with their own intro, grouped listings, and long-form SEO content, not thin redirects. The all-calculators index (`/calculators/`) is the A–Z fallback for users who don't know the category.

**Source of truth:** [`categories.json`](categories.json). Only categories with at least one published tool appear in the primary nav.

**Future work as the site scales:**
- Client-side search over a generated index (Lunr or Pagefind) once we pass ~50 calculators
- Mega-menu treatment (two-column dropdown) once any category has more than ~8 tools
- Sub-category grouping inside large category hubs (e.g. Broadband > Home, Broadband > Business)
- Generator script that builds primary nav HTML from `categories.json` once the category count makes hand-maintenance error-prone

**Status:** [x] v1 shipped (dropdown nav with Broadband and Math categories, three hub pages, hand-maintained nav across all pages, 16 Playwright tests, mobile-overflow fix at 375px)

---

## Outstanding per-calculator work

- **Broadband Bandwidth Calculator:** add an affiliate link to a broadband provider comparison/switching service. Currently has the CTA block but no real affiliate partner wired in. Decide partner, add disclosed affiliate link, update JSON-LD / copy if needed.

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
- [ ] Unit Converter (length, weight, temperature, volume, speed — broad long-tail coverage; one well-built tool beats dozens of thin single-unit pages)

## 26. High-Utility Quick-Fix Tools (3)

Context: target zero-click AI Overviews by providing immediate, definitive answers.

- [ ] Social Media Spam Probability Checker (predicts likelihood of a cold outreach being flagged by LinkedIn or Gmail)
- [ ] Video Hook Retention Predictor (estimates first-3-seconds drop-off based on headline and thumbnail loudness)
- [ ] API Health and Latency Impact Calculator (how a 200ms delay compounds across a multi-step journey and hits conversion)
