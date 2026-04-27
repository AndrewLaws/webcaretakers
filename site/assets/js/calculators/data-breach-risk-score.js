// Data Breach Risk Score — pure-logic scorer.
//
// Self-assessment, browser-only. No API calls, ever.
//
// The engine maps each answer to a points value (0 = best, higher = worse).
// Each category has a max weight; the user's score is summed and normalised
// to 0-100 where 100 is the worst possible. We surface the per-category
// contributions so the page can show a breakdown bar and a "fix the top 3"
// projection.

'use strict';

// Each category has a key (matches the form field name), a max weight, and
// a scoring map from the option value to a 0..1 severity. The on-page score
// for that category is severity * weight. We chose weights so that the
// password-manager + 2FA + reuse trio dominates: those three together can
// account for ~50 points, which reflects how credential stuffing and
// infostealers actually drive most consumer breaches in 2026.
const CATEGORIES = [
  {
    key: 'reuse',
    label: 'Password reuse',
    weight: 18,
    options: { never: 0, some: 0.55, most: 1 },
    optionLabels: { never: 'Never reuse', some: 'Reuse on some', most: 'Reuse on most' },
  },
  {
    key: 'manager',
    label: 'Password manager',
    weight: 16,
    options: { yes: 0, no: 1 },
    optionLabels: { yes: 'Using a password manager', no: 'No password manager' },
  },
  {
    key: 'twofa',
    label: '2FA on critical accounts',
    weight: 16,
    options: { all: 0, some: 0.5, none: 1 },
    optionLabels: { all: '2FA on all critical accounts', some: '2FA on some', none: 'No 2FA' },
  },
  {
    key: 'phishing',
    label: 'Phishing awareness',
    weight: 14,
    // Special-cased below (3 sub-questions). Severity = wrong_count / 3.
  },
  {
    key: 'updates',
    label: 'Software updates',
    weight: 10,
    options: { auto: 0, monthly: 0.25, prompted: 0.6, rarely: 1 },
    optionLabels: { auto: 'Auto-updates on', monthly: 'Monthly check', prompted: 'Only when prompted', rarely: 'Rarely' },
  },
  {
    key: 'cascade',
    label: 'Account cascade risk',
    weight: 9,
    options: { low: 0, medium: 0.55, high: 1 },
    optionLabels: { low: 'Few cascading accounts', medium: 'A handful', high: 'Many cascading accounts' },
  },
  {
    key: 'hibp',
    label: 'Have I Been Pwned check',
    weight: 7,
    options: { recent: 0, year: 0.5, never: 1 },
    optionLabels: { recent: 'Checked in the last 3 months', year: 'Checked in the last year', never: 'Never checked' },
  },
  {
    key: 'wifi',
    label: 'Public WiFi without VPN',
    weight: 5,
    options: { never: 0, sometimes: 0.5, often: 1 },
    optionLabels: { never: 'Never on public WiFi without VPN', sometimes: 'Sometimes', often: 'Often' },
  },
  {
    key: 'accounts',
    label: 'Online account count',
    weight: 3,
    options: { under50: 0, between: 0.55, over200: 1 },
    optionLabels: { under50: 'Under 50 accounts', between: '50 to 200 accounts', over200: 'Over 200 accounts' },
  },
  {
    key: 'aliases',
    label: 'Email aliases / + addressing',
    weight: 2,
    options: { yes: 0, no: 1 },
    optionLabels: { yes: 'Using email aliases', no: 'No email aliases' },
  },
];

// Recommendation copy per category, written so each one tells the user what
// to do and why. Order is the impact order surfaced when severity is high.
const RECOMMENDATIONS = {
  manager: {
    headline: 'Set up a password manager today',
    body: 'This is the single biggest move you can make. Bitwarden and 1Password both have free or low-cost personal tiers. Once you have one, you can stop reusing passwords without trying to memorise sixty different strings.',
  },
  reuse: {
    headline: 'Stop reusing passwords across accounts',
    body: 'When one site gets breached, attackers stuff those credentials into every other login form on the internet. If you reuse a password, one leak is all the leaks.',
  },
  twofa: {
    headline: 'Turn on 2FA for email, banking and primary cloud accounts first',
    body: 'Use an authenticator app (Aegis, 2FAS, the password manager itself) over SMS where possible. Email 2FA matters most: whoever owns your email can reset every other account.',
  },
  phishing: {
    headline: 'Tighten your phishing reflex',
    body: 'Never click a link in a "your account is at risk" email. Open a fresh tab, type the site in by hand, and check from there. The convincing ones are now indistinguishable from the real thing at a glance.',
  },
  updates: {
    headline: 'Turn on auto-updates for the operating system and browser',
    body: 'Infostealer malware almost always rides in on a known, already-patched bug. Auto-updates close that window. Set it once, forget it.',
  },
  cascade: {
    headline: 'Lock down your primary email account first',
    body: 'Whichever email address resets the most other accounts is your single highest-value target. Long unique password, hardware key or app-based 2FA, and a recovery code printed somewhere safe.',
  },
  hibp: {
    headline: 'Check Have I Been Pwned and sign up for alerts',
    body: 'Free, takes a minute. The notification service tells you the moment your address shows up in a future leak so you can rotate that password.',
  },
  wifi: {
    headline: 'Use a VPN on public WiFi or skip sensitive logins',
    body: 'Coffee-shop WiFi is fine for reading the news. It is not fine for logging into your bank. A reputable VPN, or just tethering off your phone, removes the risk.',
  },
  accounts: {
    headline: 'Prune dormant accounts',
    body: 'Each old account is a chance for your details to leak in someone else\'s breach. Delete the ones you do not use, and keep the active ones in a manager so you can see the list.',
  },
  aliases: {
    headline: 'Use email aliases or plus-addressing for sign-ups',
    body: 'Aliases (Apple Hide My Email, Fastmail Masked Email, SimpleLogin) or plus-addressing (you+netflix@example.com) let you see exactly which service leaked your address, and burn the alias without losing your real inbox.',
  },
};

const RECOMMENDATIONS_ORDER_HINT = ['manager', 'reuse', 'twofa', 'phishing', 'updates', 'cascade', 'hibp', 'wifi', 'accounts', 'aliases'];

function severityFor(key, answers) {
  if (key === 'phishing') {
    let wrong = 0;
    if (answers.phish1 === 'wrong') wrong++;
    if (answers.phish2 === 'wrong') wrong++;
    if (answers.phish3 === 'wrong') wrong++;
    return wrong / 3;
  }
  const cat = CATEGORIES.find(c => c.key === key);
  if (!cat || !cat.options) return 0;
  const v = answers[key];
  return typeof cat.options[v] === 'number' ? cat.options[v] : 0;
}

// Compute total score 0..100, plus per-category contributions and an ordered
// recommendation list. Categories with severity 0 are dropped from
// recommendations: nothing to fix is the right answer.
function score(answers) {
  const breakdown = CATEGORIES.map(c => {
    const sev = severityFor(c.key, answers);
    const points = sev * c.weight;
    return {
      key: c.key,
      label: c.label,
      weight: c.weight,
      severity: sev,
      points: round2(points),
    };
  });
  const total = breakdown.reduce((a, b) => a + b.points, 0);
  const score = Math.round(total);
  const category = categoryFor(score);
  const recommendations = breakdown
    .filter(b => b.severity > 0)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      // Stable tie-break: use the canonical hint order.
      return RECOMMENDATIONS_ORDER_HINT.indexOf(a.key) - RECOMMENDATIONS_ORDER_HINT.indexOf(b.key);
    })
    .map(b => Object.assign({}, b, RECOMMENDATIONS[b.key]));
  return { score, category, breakdown, recommendations };
}

// "If you fixed the top N, what would your score be?" — re-run scoring with
// those categories driven to severity 0.
function scoreIfFixed(answers, topN) {
  const result = score(answers);
  const fixedKeys = result.recommendations.slice(0, topN).map(r => r.key);
  const adjusted = Object.assign({}, answers);
  fixedKeys.forEach(k => {
    if (k === 'phishing') {
      adjusted.phish1 = 'right';
      adjusted.phish2 = 'right';
      adjusted.phish3 = 'right';
    } else {
      // Drive each fixed category to its best option.
      const cat = CATEGORIES.find(c => c.key === k);
      if (cat && cat.options) {
        const best = Object.keys(cat.options).reduce((bestKey, key) =>
          cat.options[key] < cat.options[bestKey] ? key : bestKey,
          Object.keys(cat.options)[0]);
        adjusted[k] = best;
      }
    }
  });
  const after = score(adjusted);
  return { before: result.score, after: after.score, fixedKeys };
}

function categoryFor(s) {
  if (s <= 20) return 'Low';
  if (s <= 40) return 'Moderate';
  if (s <= 60) return 'Elevated';
  if (s <= 80) return 'High';
  return 'Critical';
}

function round2(n) { return Math.round(n * 100) / 100; }

const exported = {
  CATEGORIES,
  RECOMMENDATIONS,
  score,
  scoreIfFixed,
  categoryFor,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.DataBreachRiskScore = exported;
}
