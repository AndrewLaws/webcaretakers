'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const {
  calculateUKSalaryTax,
  effectivePersonalAllowance,
  calcIncomeTax,
  calcNI,
  calcStudentLoan,
  STUDENT_LOAN_PLANS
} = require('./uk-salary-tax.js');

// ─── Personal allowance taper ───────────────────────────────────────────────

test('PA is full below taper threshold', () => {
  assert.equal(effectivePersonalAllowance(50000), 12570);
});

test('PA tapers at £100k (edge — still full)', () => {
  assert.equal(effectivePersonalAllowance(100000), 12570);
});

test('PA tapers at £110k: 12570 - 5000 = 7570', () => {
  assert.equal(effectivePersonalAllowance(110000), 7570);
});

test('PA is zero at £125,140 and above', () => {
  assert.equal(effectivePersonalAllowance(125140), 0);
  assert.equal(effectivePersonalAllowance(150000), 0);
});

// ─── Income tax ─────────────────────────────────────────────────────────────

test('no income tax on zero salary', () => {
  assert.equal(calcIncomeTax(0).totalTax, 0);
});

test('no tax below personal allowance', () => {
  assert.equal(calcIncomeTax(12000).totalTax, 0);
});

test('basic rate only — £30,000 salary', () => {
  // Taxable = 30000 - 12570 = 17430 @ 20% = 3486
  const t = calcIncomeTax(30000);
  assert.equal(t.totalTax, 3486);
  assert.equal(t.higherTax, 0);
});

test('basic rate only — £50,000 salary (below 50,270)', () => {
  // Taxable = 50000 - 12570 = 37430 @ 20% = 7486
  const t = calcIncomeTax(50000);
  assert.equal(t.totalTax, 7486);
});

test('higher rate kicks in at £60,000', () => {
  // basic: (50270-12570)*0.20 = 7540; higher: (60000-50270)*0.40 = 3892
  const t = calcIncomeTax(60000);
  assert.equal(t.basicTax,  7540);
  assert.equal(t.higherTax, 3892);
  assert.equal(t.totalTax, 11432);
});

test('tapered PA at £110,000', () => {
  // PA = 7570; basic = (50270-7570)*0.20 = 8540; higher = (110000-50270)*0.40 = 23892
  const t = calcIncomeTax(110000);
  assert.equal(t.basicTax,  8540);
  assert.equal(t.higherTax, 23892);
  assert.equal(t.totalTax,  32432);
});

test('additional rate kicks in above £125,140', () => {
  const t = calcIncomeTax(130000);
  assert.ok(t.additionalTax > 0);
});

// ─── National Insurance ─────────────────────────────────────────────────────

test('no NI below primary threshold', () => {
  assert.equal(calcNI(12000), 0);
});

test('NI main rate at £30,000: (30000-12570)*0.08 = 1394.40', () => {
  assert.equal(calcNI(30000), 1394.40);
});

test('NI main + upper rate at £60,000', () => {
  // main: (50270-12570)*0.08 = 3016; upper: (60000-50270)*0.02 = 194.60
  assert.equal(calcNI(60000), 3210.60);
});

// ─── Student loan ───────────────────────────────────────────────────────────

test('no student loan for "none" plan', () => {
  assert.equal(calcStudentLoan(50000, 'none'), 0);
});

test('Plan 2 student loan at £40,000: (40000-27295)*0.09 = 1143.45', () => {
  assert.equal(calcStudentLoan(40000, 'plan2'), 1143.45);
});

test('postgrad loan below threshold returns 0', () => {
  assert.equal(calcStudentLoan(20000, 'postgrad'), 0);
});

// ─── Full calculation ────────────────────────────────────────────────────────

test('take-home for £30,000 no student loan', () => {
  const r = calculateUKSalaryTax({ grossSalary: 30000, studentLoan: 'none' });
  // tax=3486, NI=1394.40, deductions=4880.40, take-home=25119.60
  assert.equal(r.incomeTax.totalTax, 3486);
  assert.equal(r.nationalInsurance, 1394.40);
  assert.equal(r.totalDeductions, 4880.40);
  assert.equal(r.takeHomeAnnual, 25119.60);
});

test('monthly and weekly take-home are derived correctly', () => {
  const r = calculateUKSalaryTax({ grossSalary: 30000 });
  assert.equal(r.takeHomeMonthly, Math.round((r.takeHomeAnnual / 12) * 100) / 100);
  assert.equal(r.takeHomeWeekly,  Math.round((r.takeHomeAnnual / 52) * 100) / 100);
});

test('effective tax rate for £30,000 is about 11.6%', () => {
  const r = calculateUKSalaryTax({ grossSalary: 30000 });
  assert.equal(r.effectiveTaxRate, 11.62);
});

test('throws on negative salary', () => {
  assert.throws(() => calculateUKSalaryTax({ grossSalary: -1 }), /non-negative/);
});

test('throws on invalid student loan plan', () => {
  assert.throws(() => calculateUKSalaryTax({ grossSalary: 30000, studentLoan: 'planX' }), /invalid/);
});

test('taxYear is 2025/26', () => {
  const r = calculateUKSalaryTax({ grossSalary: 30000 });
  assert.equal(r.taxYear, '2025/26');
});

test('zero salary returns zero deductions', () => {
  const r = calculateUKSalaryTax({ grossSalary: 0 });
  assert.equal(r.totalDeductions, 0);
  assert.equal(r.takeHomeAnnual, 0);
});
