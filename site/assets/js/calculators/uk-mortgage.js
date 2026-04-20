// UK Mortgage calculator: pure-logic helpers. The UK version differs from the
// US sibling in three material ways:
//   1. Most UK mortgages fix for a short period (2/3/5 years) then revert to
//      the lender's Standard Variable Rate (SVR). We model that explicitly.
//   2. No PMI. Instead we handle product fees (which can be added to the loan
//      or paid upfront) and, for leasehold properties, ground rent and
//      service charge as separate monthly costs.
//   3. Stamp Duty Land Tax (England & NI, 2025/26 bands), with First-Time
//      Buyer relief up to £500k purchase price.

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

// Standard monthly P&I formula. Same shape as US.
function monthlyPayment({ principal, aprPercent, termYears }) {
  const n = termYears * 12;
  const r = aprPercent / 100 / 12;
  if (r === 0) return principal / n;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

// Remaining balance after k payments have been made, given the monthly
// payment calculated at the original rate. Standard amortisation identity.
function balanceAfterPayments({
  principal,
  aprPercent,
  termYears,
  paymentsMade,
}) {
  assertPositive(principal, 'principal');
  assertNonNegative(aprPercent, 'aprPercent');
  assertPositive(termYears, 'termYears');
  assertNonNegative(paymentsMade, 'paymentsMade');

  if (paymentsMade === 0) return round2(principal);

  const r = aprPercent / 100 / 12;
  const M = monthlyPayment({ principal, aprPercent, termYears });

  if (r === 0) {
    const balance = principal - M * paymentsMade;
    return round2(Math.max(0, balance));
  }

  const growth = Math.pow(1 + r, paymentsMade);
  const balance = principal * growth - M * ((growth - 1) / r);
  // Tiny negative float residue at the very end of the term is valid — clamp.
  return round2(Math.max(0, balance));
}

// SDLT bands for England & Northern Ireland, 2025/26 (post-April 2025).
// Each tuple: [upper band bound, marginal rate]. `Infinity` = the top band.
const SDLT_STANDARD_BANDS = [
  [125000, 0],
  [250000, 0.02],
  [925000, 0.05],
  [1500000, 0.10],
  [Infinity, 0.12],
];

// First-time buyer relief applies when the property price is £500,000 or less.
const SDLT_FTB_BANDS = [
  [300000, 0],
  [500000, 0.05],
];
const SDLT_FTB_MAX_PRICE = 500000;

function sdltFromBands(price, bands) {
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of bands) {
    if (price <= lower) break;
    const slice = Math.min(price, upper) - lower;
    tax += slice * rate;
    lower = upper;
    if (price <= upper) break;
  }
  return round2(tax);
}

function calculateStampDuty({ homePrice, firstTimeBuyer = false }) {
  assertPositive(homePrice, 'homePrice');
  if (firstTimeBuyer && homePrice <= SDLT_FTB_MAX_PRICE) {
    return sdltFromBands(homePrice, SDLT_FTB_BANDS);
  }
  return sdltFromBands(homePrice, SDLT_STANDARD_BANDS);
}

function calculateUkMortgage({
  homePrice,
  deposit,
  depositPercent,
  initialRatePercent,
  fixYears,
  svrRatePercent,
  termYears,
  productFee = 0,
  feeAddedToLoan = false,
  groundRentYearly = 0,
  serviceChargeYearly = 0,
  buildingsInsuranceYearly = 0,
  firstTimeBuyer = false,
}) {
  assertPositive(homePrice, 'homePrice');
  assertNonNegative(initialRatePercent, 'initialRatePercent');
  assertPositive(fixYears, 'fixYears');
  assertNonNegative(svrRatePercent, 'svrRatePercent');
  assertPositive(termYears, 'termYears');

  if (fixYears >= termYears) {
    throw new Error('fixYears must be less than termYears');
  }

  let dp = deposit;
  if (dp === undefined || dp === null) {
    if (depositPercent === undefined || depositPercent === null) {
      dp = 0;
    } else {
      if (depositPercent < 0 || depositPercent > 100) {
        throw new Error('depositPercent must be between 0 and 100');
      }
      dp = homePrice * (depositPercent / 100);
    }
  }
  assertNonNegative(dp, 'deposit');
  if (dp >= homePrice) {
    throw new Error('Deposit cannot be greater than or equal to the home price');
  }

  assertNonNegative(productFee, 'productFee');
  assertNonNegative(groundRentYearly, 'groundRentYearly');
  assertNonNegative(serviceChargeYearly, 'serviceChargeYearly');
  assertNonNegative(buildingsInsuranceYearly, 'buildingsInsuranceYearly');

  const basePrincipal = homePrice - dp;
  const principal = feeAddedToLoan ? basePrincipal + productFee : basePrincipal;

  const numberOfPayments = termYears * 12;
  const fixPayments = fixYears * 12;
  const svrPayments = numberOfPayments - fixPayments;

  // Monthly payment during the fix period, amortised over the full term at the
  // initial rate (how lenders actually quote the fix payment).
  const fixMonthlyPI = monthlyPayment({
    principal,
    aprPercent: initialRatePercent,
    termYears,
  });

  // Balance when the fix ends.
  const balanceAfterFix = balanceAfterPayments({
    principal,
    aprPercent: initialRatePercent,
    termYears,
    paymentsMade: fixPayments,
  });

  // New monthly payment on the remaining balance, at SVR, over the remaining
  // term. Real life has more wrinkles (remortgage, overpayments, ERCs) but
  // this is the honest baseline.
  const remainingTermYears = termYears - fixYears;
  const svrMonthlyPI =
    balanceAfterFix > 0
      ? monthlyPayment({
          principal: balanceAfterFix,
          aprPercent: svrRatePercent,
          termYears: remainingTermYears,
        })
      : 0;

  const totalInterest =
    fixMonthlyPI * fixPayments + svrMonthlyPI * svrPayments - principal;
  const totalCost = principal + totalInterest;

  const monthlyGroundRent = groundRentYearly / 12;
  const monthlyServiceCharge = serviceChargeYearly / 12;
  const monthlyBuildingsInsurance = buildingsInsuranceYearly / 12;
  const monthlyExtras =
    monthlyGroundRent + monthlyServiceCharge + monthlyBuildingsInsurance;

  const monthlyTotalDuringFix = fixMonthlyPI + monthlyExtras;
  const monthlyTotalAfterFix = svrMonthlyPI + monthlyExtras;

  const stampDuty = calculateStampDuty({ homePrice, firstTimeBuyer });

  const upfrontCosts = round2(
    dp + stampDuty + (feeAddedToLoan ? 0 : productFee)
  );

  return {
    homePrice: round2(homePrice),
    deposit: round2(dp),
    principal: round2(principal),
    loanToValue: round2((principal / homePrice) * 100) / 100,
    numberOfPayments,
    fixYears,
    fixPayments,
    svrPayments,
    fixMonthlyPI: round2(fixMonthlyPI),
    svrMonthlyPI: round2(svrMonthlyPI),
    balanceAfterFix: round2(balanceAfterFix),
    monthlyGroundRent: round2(monthlyGroundRent),
    monthlyServiceCharge: round2(monthlyServiceCharge),
    monthlyBuildingsInsurance: round2(monthlyBuildingsInsurance),
    monthlyExtras: round2(monthlyExtras),
    monthlyTotalDuringFix: round2(monthlyTotalDuringFix),
    monthlyTotalAfterFix: round2(monthlyTotalAfterFix),
    totalInterest: round2(totalInterest),
    totalCost: round2(totalCost),
    stampDuty,
    productFee: round2(productFee),
    feeAddedToLoan: !!feeAddedToLoan,
    upfrontCosts,
    firstTimeBuyer: !!firstTimeBuyer,
  };
}

const exported = {
  calculateUkMortgage,
  calculateStampDuty,
  balanceAfterPayments,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.UkMortgageCalc = exported;
}
