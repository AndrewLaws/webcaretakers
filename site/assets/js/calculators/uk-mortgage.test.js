const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateUkMortgage,
  calculateStampDuty,
  balanceAfterPayments,
} = require('./uk-mortgage.js');

// --- Stamp Duty (England & NI, 2025/26 bands) ---

test('SDLT: £100k property, standard buyer → £0', () => {
  assert.equal(calculateStampDuty({ homePrice: 100000, firstTimeBuyer: false }), 0);
});

test('SDLT: £200k property, standard buyer → 2% of £75k = £1,500', () => {
  assert.equal(calculateStampDuty({ homePrice: 200000, firstTimeBuyer: false }), 1500);
});

test('SDLT: £400k property, standard buyer → £10,000', () => {
  // 0 on first 125k + 2% of 125k (£2,500) + 5% of 150k (£7,500) = £10,000
  assert.equal(calculateStampDuty({ homePrice: 400000, firstTimeBuyer: false }), 10000);
});

test('SDLT: £1,000,000 property, standard buyer → £41,250', () => {
  // 0 + 2,500 + 33,750 (5% of 675k) + 7,500 (10% of 75k) = 43,750... let me recompute
  // 0-125k: 0
  // 125k-250k: 2% of 125k = 2,500
  // 250k-925k: 5% of 675k = 33,750
  // 925k-1,000,000: 10% of 75,000 = 7,500
  // Total: 43,750
  assert.equal(calculateStampDuty({ homePrice: 1000000, firstTimeBuyer: false }), 43750);
});

test('SDLT FTB: £250k property → £0 (under £300k FTB threshold)', () => {
  assert.equal(calculateStampDuty({ homePrice: 250000, firstTimeBuyer: true }), 0);
});

test('SDLT FTB: £400k property → 5% of £100k = £5,000', () => {
  assert.equal(calculateStampDuty({ homePrice: 400000, firstTimeBuyer: true }), 5000);
});

test('SDLT FTB: £600k property → falls back to standard bands (£20,000)', () => {
  // Over £500k, FTB relief unavailable, use standard
  // 0 + 2,500 + 17,500 (5% of 350k) = 20,000
  assert.equal(calculateStampDuty({ homePrice: 600000, firstTimeBuyer: true }), 20000);
});

// --- Balance after fix period ---

test('balanceAfterPayments: after 0 payments, balance equals principal', () => {
  const bal = balanceAfterPayments({
    principal: 200000,
    aprPercent: 5,
    termYears: 25,
    paymentsMade: 0,
  });
  assert.equal(bal, 200000);
});

test('balanceAfterPayments: after full term, balance is ~0', () => {
  const bal = balanceAfterPayments({
    principal: 200000,
    aprPercent: 5,
    termYears: 25,
    paymentsMade: 300,
  });
  assert.ok(Math.abs(bal) < 0.5, `expected ~0, got ${bal}`);
});

test('balanceAfterPayments: after 2 years on a 25-year 5% loan, some principal paid', () => {
  const bal = balanceAfterPayments({
    principal: 200000,
    aprPercent: 5,
    termYears: 25,
    paymentsMade: 24,
  });
  // Should be slightly less than 200k — only a small principal dent in early years
  assert.ok(bal > 190000 && bal < 200000, `expected 190k-200k, got ${bal}`);
});

// --- Full UK mortgage calculation ---

test('calculateUkMortgage: 2-year fix then SVR, basic shape', () => {
  const r = calculateUkMortgage({
    homePrice: 400000,
    deposit: 80000,
    initialRatePercent: 4.5,
    fixYears: 2,
    svrRatePercent: 7.5,
    termYears: 25,
  });
  assert.equal(r.principal, 320000);
  assert.equal(r.deposit, 80000);
  assert.equal(r.loanToValue, 0.8);
  assert.equal(r.numberOfPayments, 300);
  assert.ok(r.fixMonthlyPI > 0);
  assert.ok(r.svrMonthlyPI > r.fixMonthlyPI, 'SVR rate is higher so payment should be higher');
  assert.ok(r.balanceAfterFix < 320000 && r.balanceAfterFix > 300000);
});

test('calculateUkMortgage: depositPercent works alongside deposit', () => {
  const r = calculateUkMortgage({
    homePrice: 400000,
    depositPercent: 20,
    initialRatePercent: 4.5,
    fixYears: 5,
    svrRatePercent: 7.5,
    termYears: 30,
  });
  assert.equal(r.deposit, 80000);
  assert.equal(r.principal, 320000);
});

test('calculateUkMortgage: product fee added to loan increases principal', () => {
  const noFee = calculateUkMortgage({
    homePrice: 400000,
    deposit: 80000,
    initialRatePercent: 4.5,
    fixYears: 2,
    svrRatePercent: 7.5,
    termYears: 25,
    productFee: 0,
  });
  const withFee = calculateUkMortgage({
    homePrice: 400000,
    deposit: 80000,
    initialRatePercent: 4.5,
    fixYears: 2,
    svrRatePercent: 7.5,
    termYears: 25,
    productFee: 1500,
    feeAddedToLoan: true,
  });
  assert.equal(withFee.principal, noFee.principal + 1500);
  assert.ok(withFee.fixMonthlyPI > noFee.fixMonthlyPI);
});

test('calculateUkMortgage: product fee paid upfront does NOT increase principal', () => {
  const r = calculateUkMortgage({
    homePrice: 400000,
    deposit: 80000,
    initialRatePercent: 4.5,
    fixYears: 2,
    svrRatePercent: 7.5,
    termYears: 25,
    productFee: 1500,
    feeAddedToLoan: false,
  });
  assert.equal(r.principal, 320000);
  assert.equal(r.productFee, 1500);
  assert.equal(r.feeAddedToLoan, false);
});

test('calculateUkMortgage: includes monthly extras (ground rent, service charge, buildings)', () => {
  const r = calculateUkMortgage({
    homePrice: 400000,
    deposit: 80000,
    initialRatePercent: 4.5,
    fixYears: 2,
    svrRatePercent: 7.5,
    termYears: 25,
    groundRentYearly: 300,
    serviceChargeYearly: 1800,
    buildingsInsuranceYearly: 240,
  });
  assert.equal(r.monthlyGroundRent, 25);
  assert.equal(r.monthlyServiceCharge, 150);
  assert.equal(r.monthlyBuildingsInsurance, 20);
  // Monthly total during fix = fixPI + 25 + 150 + 20
  assert.equal(
    r.monthlyTotalDuringFix,
    Math.round((r.fixMonthlyPI + 195) * 100) / 100
  );
});

test('calculateUkMortgage: computes stamp duty for standard buyer', () => {
  const r = calculateUkMortgage({
    homePrice: 400000,
    deposit: 80000,
    initialRatePercent: 4.5,
    fixYears: 2,
    svrRatePercent: 7.5,
    termYears: 25,
    firstTimeBuyer: false,
  });
  assert.equal(r.stampDuty, 10000);
});

test('calculateUkMortgage: FTB on £400k gets FTB relief', () => {
  const r = calculateUkMortgage({
    homePrice: 400000,
    deposit: 80000,
    initialRatePercent: 4.5,
    fixYears: 2,
    svrRatePercent: 7.5,
    termYears: 25,
    firstTimeBuyer: true,
  });
  assert.equal(r.stampDuty, 5000);
});

test('calculateUkMortgage: total interest accounts for fix + SVR rates', () => {
  const r = calculateUkMortgage({
    homePrice: 400000,
    deposit: 80000,
    initialRatePercent: 4.5,
    fixYears: 2,
    svrRatePercent: 7.5,
    termYears: 25,
  });
  // Over 25 years you'll pay a lot of interest on a £320k loan
  // Fix payments × 24 + SVR payments × 276 - principal = total interest
  const expected =
    r.fixMonthlyPI * 24 + r.svrMonthlyPI * 276 - r.principal;
  assert.ok(
    Math.abs(r.totalInterest - expected) < 1,
    `expected ~${expected}, got ${r.totalInterest}`
  );
});

test('calculateUkMortgage: throws on deposit >= home price', () => {
  assert.throws(() =>
    calculateUkMortgage({
      homePrice: 400000,
      deposit: 400000,
      initialRatePercent: 4.5,
      fixYears: 2,
      svrRatePercent: 7.5,
      termYears: 25,
    })
  );
});

test('calculateUkMortgage: throws on fixYears >= termYears', () => {
  assert.throws(() =>
    calculateUkMortgage({
      homePrice: 400000,
      deposit: 80000,
      initialRatePercent: 4.5,
      fixYears: 25,
      svrRatePercent: 7.5,
      termYears: 25,
    })
  );
});

test('calculateUkMortgage: rounds money fields to 2 decimals', () => {
  const r = calculateUkMortgage({
    homePrice: 333333,
    deposit: 66666,
    initialRatePercent: 4.37,
    fixYears: 3,
    svrRatePercent: 7.99,
    termYears: 28,
  });
  Object.entries(r).forEach(([k, v]) => {
    if (typeof v === 'number' && !Number.isInteger(v)) {
      const d = String(v).split('.')[1] || '';
      assert.ok(d.length <= 2, `${k} has more than 2 decimals: ${v}`);
    }
  });
});
