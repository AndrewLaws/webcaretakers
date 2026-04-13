# Functions: Calculator Specifications

This document describes the shared utilities and the specification pattern for individual calculators.

## Shared utilities

### dataLayer event tracking (`main.js`)

All calculators use a shared event tracking system that pushes to the GTM dataLayer.

| Event name | Trigger | Data pushed |
|---|---|---|
| `calculator_interaction` | User changes any input field | `calculator_name`, `field_name` |
| `calculator_result` | Form is submitted and result is calculated | `calculator_name`, `result_value` |
| `cta_click` | User clicks a link or button inside a `[data-cta="next-step"]` block | `cta_type`, `cta_text` |

### Calculator HTML contract

Every calculator page must include:

```html
<section data-calculator>
  <!-- Inputs: any combination of input, select, textarea -->
  <form>
    <input type="..." name="..." />
    <button type="submit" data-calculate>Calculate</button>
  </form>
  <div data-calculator-results>
    <p class="result-display">...</p>
  </div>
</section>
```

The `data-calculator` attribute is required for `main.js` to bind event listeners.

### Ad slot placement

Four ad slots are included in the base template:

| Slot | Attribute | Placement |
|---|---|---|
| Header leaderboard | `data-ad-slot="header"` | Above site header |
| In-content | `data-ad-slot="in-content"` | Between intro text and calculator |
| Below results | `data-ad-slot="below-results"` | Below calculator results |
| Sidebar | `data-ad-slot="sidebar"` | Right sidebar (desktop), below content (mobile) |

### CTA block

Generic affiliate CTA area, to be customised per calculator:

```html
<div data-cta="next-step" class="cta-block">
  <h3>...</h3>
  <p>...</p>
  <a href="..." class="cta-link">...</a>
</div>
```

## Calculator specification pattern

Each new calculator should be documented here before implementation. Use this template:

### [Calculator Name]

- **URL:** `/calculators/{category}/{slug}/`
- **Category:** e.g. broadband, email-marketing, ai
- **Inputs:** list of input fields with types and validation
- **Calculation:** formula or logic description
- **Output:** what the result display shows
- **CTA:** affiliate or next-step link type
- **DataLayer events:** any custom events beyond the standard three
- **Notes:** edge cases, data sources, or assumptions

---

## Implemented calculators

### Percentage Calculator (demo)

- **URL:** `/` (hub landing page, demo only)
- **Category:** general
- **Inputs:** `percentage` (number), `value` (number)
- **Calculation:** `(percentage / 100) * value`
- **Output:** calculated result to 2 decimal places
- **CTA:** generic placeholder
- **DataLayer events:** standard three (`calculator_interaction`, `calculator_result`, `cta_click`)
