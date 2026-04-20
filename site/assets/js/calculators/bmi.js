// BMI: pure-logic helpers. The page script handles the DOM; this module is
// the thing we can actually unit-test. WHO cut-offs; see the page copy for
// the honest caveats (muscle mass, athletes, children, ethnicity).

function classifyBMI(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function assertPositive(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
}

function calculateBMI({ units, weightKg, heightM, weightLb, heightIn }) {
  let bmi;
  if (units === 'metric') {
    assertPositive(weightKg, 'weightKg');
    assertPositive(heightM, 'heightM');
    bmi = weightKg / (heightM * heightM);
  } else if (units === 'imperial') {
    assertPositive(weightLb, 'weightLb');
    assertPositive(heightIn, 'heightIn');
    // Standard NHS/NIH formula: lb * 703 / in^2
    bmi = (weightLb * 703) / (heightIn * heightIn);
  } else {
    throw new Error(`Unknown units: ${units}`);
  }
  const rounded = round1(bmi);
  return { bmi: rounded, category: classifyBMI(rounded) };
}

const exported = { calculateBMI, classifyBMI };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.BMICalc = exported;
}
