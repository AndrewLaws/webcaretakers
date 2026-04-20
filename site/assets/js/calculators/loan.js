// General-purpose loan calculator: pure-logic helpers.
//
// Kept currency-neutral on purpose. The UI layer decides whether to render
// £, $, € (or anything else) — this module just does the maths.
//
// What it covers: fixed rate, fixed term, equal monthly payments (the shape
// of almost every personal, auto, and student loan marketed to consumers).
// What it doesn't cover: variable rates, arrangement or early-repayment
// fees, income-based repayment plans. Those are noted in the page copy.

function round2(n) {
  return Math.round(n * 100) / 100;
}

function assertPositive(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
}

function assertNonNegative(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be zero or positive`);
  }
}

// Standard monthly instalment formula. Same shape as the mortgage engines.
function monthlyPayment({ principal, aprPercent, termMonths }) {
  assertPositive(principal, 'principal');
  assertNonNegative(aprPercent, 'aprPercent');
  assertPositive(termMonths, 'termMonths');

  const r = aprPercent / 100 / 12;
  if (r === 0) return principal / termMonths;
  const factor = Math.pow(1 + r, termMonths);
  return (principal * r * factor) / (factor - 1);
}

// Simulate the loan month by month with an optional extra payment on top
// of the scheduled monthly. Returns total interest paid and the month the
// loan clears. Used to calculate the savings from overpayments.
function simulateWithExtra({ principal, aprPercent, termMonths, scheduledMonthly, extraMonthlyPayment }) {
  const r = aprPercent / 100 / 12;
  let balance = principal;
  let totalInterest = 0;
  let months = 0;
  const monthlyOutflow = scheduledMonthly + extraMonthlyPayment;
  // Cap the loop well beyond the scheduled term as a safety net.
  const maxMonths = termMonths * 2 + 12;

  while (balance > 0 && months < maxMonths) {
    months += 1;
    const interest = balance * r;
    let principalPaid = monthlyOutflow - interest;
    if (principalPaid >= balance) {
      // Last payment: pay what's left + this month's interest.
      totalInterest += interest;
      balance = 0;
      break;
    }
    totalInterest += interest;
    balance -= principalPaid;
  }

  return { monthsToPayOff: months, totalInterest };
}

function calculateLoan({
  amount,
  aprPercent,
  termYears,
  termMonths,
  extraMonthlyPayment = 0,
}) {
  assertPositive(amount, 'amount');
  assertNonNegative(aprPercent, 'aprPercent');

  let months = termMonths;
  if (!months && termYears) months = termYears * 12;
  if (!months) {
    throw new Error('Provide either termMonths or termYears');
  }
  assertPositive(months, 'termMonths');

  assertNonNegative(extraMonthlyPayment, 'extraMonthlyPayment');

  const m = monthlyPayment({ principal: amount, aprPercent, termMonths: months });
  const totalInterest = m * months - amount;
  const totalCost = amount + totalInterest;

  const r = aprPercent / 100 / 12;

  // Amortisation split on the very first and very last payment.
  // First: interest = balance * r; principal = monthly - interest.
  const firstInterest = amount * r;
  const firstPrincipal = m - firstInterest;

  // Last: the final payment pays off a small remaining balance plus that
  // month's interest. Closed form: principal_last = monthly / (1 + r),
  // interest_last = monthly - principal_last. At 0% rate, principal = monthly.
  let lastPrincipal, lastInterest;
  if (r === 0) {
    lastPrincipal = m;
    lastInterest = 0;
  } else {
    lastPrincipal = m / (1 + r);
    lastInterest = m - lastPrincipal;
  }

  let withExtra = null;
  if (extraMonthlyPayment > 0) {
    const sim = simulateWithExtra({
      principal: amount,
      aprPercent,
      termMonths: months,
      scheduledMonthly: m,
      extraMonthlyPayment,
    });
    withExtra = {
      extraMonthlyPayment: round2(extraMonthlyPayment),
      monthsToPayOff: sim.monthsToPayOff,
      monthsSaved: months - sim.monthsToPayOff,
      totalInterest: round2(sim.totalInterest),
      interestSaved: round2(totalInterest - sim.totalInterest),
    };
  }

  return {
    principal: round2(amount),
    aprPercent,
    termMonths: months,
    monthlyPayment: round2(m),
    totalInterest: round2(totalInterest),
    totalCost: round2(totalCost),
    firstPayment: {
      principal: round2(firstPrincipal),
      interest: round2(firstInterest),
    },
    lastPayment: {
      principal: round2(lastPrincipal),
      interest: round2(lastInterest),
    },
    withExtra,
  };
}

const exported = { calculateLoan, monthlyPayment };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.LoanCalc = exported;
}
