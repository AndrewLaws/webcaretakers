// US Mortgage calculator: pure-logic helpers. The page script handles the DOM;
// this module is the maths and it is unit-testable. Keep it country-neutral at
// the code level (dollars vs pounds is a rendering decision) so the UK sibling
// can reuse it.

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

function monthlyPAndI({ principal, aprPercent, termYears }) {
  assertPositive(principal, 'principal');
  assertNonNegative(aprPercent, 'aprPercent');
  assertPositive(termYears, 'termYears');

  const n = termYears * 12;
  const r = aprPercent / 100 / 12;

  if (r === 0) {
    return round2(principal / n);
  }
  const factor = Math.pow(1 + r, n);
  const payment = (principal * r * factor) / (factor - 1);
  return round2(payment);
}

function calculateMortgage({
  homePrice,
  downPayment,
  downPaymentPercent,
  aprPercent,
  termYears,
  propertyTaxYearly = 0,
  insuranceYearly = 0,
  hoaMonthly = 0,
  pmiMonthly = 0,
}) {
  assertPositive(homePrice, 'homePrice');
  assertNonNegative(aprPercent, 'aprPercent');
  assertPositive(termYears, 'termYears');

  let dp = downPayment;
  if (dp === undefined || dp === null) {
    if (downPaymentPercent === undefined || downPaymentPercent === null) {
      dp = 0;
    } else {
      if (downPaymentPercent < 0 || downPaymentPercent > 100) {
        throw new Error('downPaymentPercent must be between 0 and 100');
      }
      dp = homePrice * (downPaymentPercent / 100);
    }
  }
  assertNonNegative(dp, 'downPayment');
  if (dp >= homePrice) {
    throw new Error('Down payment cannot be greater than or equal to the home price');
  }

  assertNonNegative(propertyTaxYearly, 'propertyTaxYearly');
  assertNonNegative(insuranceYearly, 'insuranceYearly');
  assertNonNegative(hoaMonthly, 'hoaMonthly');
  assertNonNegative(pmiMonthly, 'pmiMonthly');

  const principal = round2(homePrice - dp);
  const loanToValue = round2((principal / homePrice) * 100) / 100;
  const numberOfPayments = termYears * 12;

  const monthlyPI = monthlyPAndI({ principal, aprPercent, termYears });
  const monthlyTax = round2(propertyTaxYearly / 12);
  const monthlyInsurance = round2(insuranceYearly / 12);
  const monthlyHoa = round2(hoaMonthly);
  const monthlyPmi = round2(pmiMonthly);
  const monthlyTotal = round2(
    monthlyPI + monthlyTax + monthlyInsurance + monthlyHoa + monthlyPmi
  );

  // Total interest over the life of the loan (P&I only; taxes/insurance/HOA
  // change year to year and are not capitalised into the loan).
  const totalInterest = round2(monthlyPI * numberOfPayments - principal);
  const totalCost = round2(principal + totalInterest);

  return {
    principal,
    downPayment: round2(dp),
    loanToValue,
    numberOfPayments,
    monthlyPI,
    monthlyTax,
    monthlyInsurance,
    monthlyHoa,
    monthlyPmi,
    monthlyTotal,
    totalInterest,
    totalCost,
  };
}

const exported = { calculateMortgage, monthlyPAndI };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.MortgageCalc = exported;
}
