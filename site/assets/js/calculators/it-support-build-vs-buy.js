'use strict';

function round2(n) { return Math.round(n * 100) / 100; }

/**
 * Compare the annual cost of hiring in-house IT support against buying a
 * managed IT service for a given headcount.
 *
 * opts:
 *   employees                  number  >= 1
 *   salary                     number  gross annual salary for in-house hire
 *   employmentLoadingPct       number  % on top of salary: NI, pension, benefits
 *   trainingBudget             number  annual training spend
 *   toolingInHouse             number  annual cost of tools the in-house tech needs
 *   equipmentAnnualised        number  amortised annual cost of their kit
 *   managedMonthlyPerUser      number  managed-service price per user per month
 *   managedSetupFee            number  one-off onboarding fee (optional)
 *   contractMonths             number  months to amortise setup over (default 12)
 */
function compare(opts) {
  var employees = opts.employees;
  var salary = opts.salary;
  var loadingPct = opts.employmentLoadingPct == null ? 0 : opts.employmentLoadingPct;
  var training = opts.trainingBudget == null ? 0 : opts.trainingBudget;
  var tooling = opts.toolingInHouse == null ? 0 : opts.toolingInHouse;
  var equipment = opts.equipmentAnnualised == null ? 0 : opts.equipmentAnnualised;
  var perUser = opts.managedMonthlyPerUser;
  var setup = opts.managedSetupFee == null ? 0 : opts.managedSetupFee;
  var contractMonths = opts.contractMonths == null ? 12 : opts.contractMonths;

  if (typeof employees !== 'number' || employees < 1) throw new Error('employees must be at least 1');
  if (typeof salary !== 'number' || salary < 0) throw new Error('salary must be zero or positive');
  if (loadingPct < 0) throw new Error('employmentLoadingPct must be zero or positive');
  if (typeof perUser !== 'number' || perUser < 0) throw new Error('managedMonthlyPerUser must be zero or positive');
  if (setup < 0) throw new Error('managedSetupFee must be zero or positive');
  if (contractMonths <= 0) throw new Error('contractMonths must be positive');

  var loadedSalary = salary * (1 + loadingPct / 100);
  var inHouseAnnual = loadedSalary + training + tooling + equipment;

  var setupAmortisedAnnual = setup * (12 / contractMonths);
  var managedVariableAnnual = perUser * 12 * employees;
  var managedAnnual = managedVariableAnnual + setupAmortisedAnnual;

  var difference = managedAnnual - inHouseAnnual;
  var verdict;
  if (Math.abs(difference) < 0.5) verdict = 'tie';
  else if (difference > 0) verdict = 'in_house';
  else verdict = 'managed';

  // Break-even employee count: the number of users at which the two options cost the same.
  // inHouseAnnual = perUser * 12 * N + setupAmortisedAnnual
  //        N      = (inHouseAnnual - setupAmortisedAnnual) / (perUser * 12)
  var breakEvenUsers = null;
  if (perUser > 0) {
    var raw = (inHouseAnnual - setupAmortisedAnnual) / (perUser * 12);
    breakEvenUsers = raw > 0 ? Math.round(raw * 10) / 10 : 0;
  }

  return {
    employees: employees,
    loadedSalary: round2(loadedSalary),
    inHouseAnnual: round2(inHouseAnnual),
    inHouseMonthly: round2(inHouseAnnual / 12),
    managedVariableAnnual: round2(managedVariableAnnual),
    setupAmortisedAnnual: round2(setupAmortisedAnnual),
    managedAnnual: round2(managedAnnual),
    managedMonthly: round2(managedAnnual / 12),
    difference: round2(difference),
    differenceAbs: round2(Math.abs(difference)),
    verdict: verdict,
    breakEvenUsers: breakEvenUsers,
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { compare: compare };
else window.ITSupportBuildVsBuy = { compare: compare };
