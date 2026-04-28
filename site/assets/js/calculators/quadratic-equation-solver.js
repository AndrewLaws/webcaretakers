'use strict';

/**
 * Quadratic Equation Solver: pure-logic library.
 *
 * Solves ax^2 + bx + c = 0 using the quadratic formula:
 *   x = (-b +/- sqrt(b^2 - 4ac)) / (2a)
 *
 * Returns:
 *   - the discriminant (b^2 - 4ac)
 *   - one of three root cases (distinct real, repeated real, complex conjugate)
 *   - the vertex (h, k) of the parabola y = ax^2 + bx + c
 *   - the axis of symmetry (x = h)
 *   - the y-intercept (c)
 *
 * For real roots, when the integer coefficients yield a perfect-square
 * discriminant, roots are also returned as exact reduced fractions. This is
 * common in textbook problems and keeps the answer recognisable.
 *
 * Runs entirely in the user's browser. No fetch, no I/O, no server.
 */

function gcd(a, b) {
  // Euclidean algorithm. Works on absolute values; the sign of the fraction
  // is handled by the caller in simplifyFraction.
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    var t = b;
    b = a % b;
    a = t;
  }
  return a;
}

function simplifyFraction(num, den) {
  // Reduces num/den to lowest terms. Forces a positive denominator so the
  // sign always sits on the numerator (e.g. 3/-6 becomes -1/2, not 1/-2).
  if (den === 0) return { num: NaN, den: 0 };
  if (num === 0) return { num: 0, den: 1 };
  var g = gcd(num, den);
  var n = num / g;
  var d = den / g;
  if (d < 0) { n = -n; d = -d; }
  return { num: n, den: d };
}

function isPerfectSquare(n) {
  // True only for non-negative integers whose square root is an integer.
  if (typeof n !== 'number' || !Number.isFinite(n)) return false;
  if (n < 0) return false;
  if (!Number.isInteger(n)) return false;
  var r = Math.round(Math.sqrt(n));
  return r * r === n;
}

function isCleanNumber(x) {
  return typeof x === 'number' && Number.isFinite(x);
}

function solveQuadratic(a, b, c) {
  // Validate. a must be a finite non-zero number; b and c finite numbers.
  if (!isCleanNumber(a) || !isCleanNumber(b) || !isCleanNumber(c)) {
    return { kind: 'invalid', error: 'Coefficients must be finite numbers.' };
  }
  if (a === 0) {
    return { kind: 'invalid', error: 'a must be non-zero. With a = 0 the equation is linear, not quadratic.' };
  }

  var discriminant = b * b - 4 * a * c;

  // Vertex: h = -b / (2a), k = c - b^2 / (4a)
  var h = -b / (2 * a);
  var k = c - (b * b) / (4 * a);
  var axisOfSymmetry = h;
  var yIntercept = c;

  // Decide if exact-fraction output is meaningful: only when a, b, c are all
  // integers and the discriminant is a perfect square (real-distinct or
  // real-repeated). Otherwise the roots are irrational and decimals are the
  // honest answer.
  var integerCoefficients = Number.isInteger(a) && Number.isInteger(b) && Number.isInteger(c);

  if (discriminant > 0) {
    var sqrtD = Math.sqrt(discriminant);
    var x1Decimal = (-b - sqrtD) / (2 * a);
    var x2Decimal = (-b + sqrtD) / (2 * a);

    var exact1 = null;
    var exact2 = null;
    if (integerCoefficients && isPerfectSquare(discriminant)) {
      var s = Math.round(Math.sqrt(discriminant));
      // Numerator could be -b - s or -b + s; denominator 2a.
      exact1 = simplifyFraction(-b - s, 2 * a);
      exact2 = simplifyFraction(-b + s, 2 * a);
    }

    return {
      kind: 'real-distinct',
      a: a, b: b, c: c,
      discriminant: discriminant,
      sqrtDiscriminant: sqrtD,
      roots: [
        { kind: 'real', decimal: x1Decimal, exact: exact1 },
        { kind: 'real', decimal: x2Decimal, exact: exact2 },
      ],
      vertex: { h: h, k: k },
      axisOfSymmetry: axisOfSymmetry,
      yIntercept: yIntercept,
    };
  }

  if (discriminant === 0) {
    var xDecimal = -b / (2 * a);
    var exact = null;
    if (integerCoefficients) {
      exact = simplifyFraction(-b, 2 * a);
    }
    return {
      kind: 'real-repeated',
      a: a, b: b, c: c,
      discriminant: 0,
      sqrtDiscriminant: 0,
      roots: [
        { kind: 'real', decimal: xDecimal, exact: exact },
      ],
      vertex: { h: h, k: k },
      axisOfSymmetry: axisOfSymmetry,
      yIntercept: yIntercept,
    };
  }

  // discriminant < 0: complex conjugate pair.
  // x = (-b +/- i*sqrt(|D|)) / (2a)
  var imagPart = Math.sqrt(-discriminant) / (2 * a);
  var realPart = -b / (2 * a);
  // Force one root to have +imag and the other -imag, regardless of sign of a.
  var posImag = Math.abs(imagPart);
  return {
    kind: 'complex',
    a: a, b: b, c: c,
    discriminant: discriminant,
    sqrtDiscriminant: Math.sqrt(-discriminant),
    roots: [
      { kind: 'complex', real: realPart, imag: posImag },
      { kind: 'complex', real: realPart, imag: -posImag },
    ],
    vertex: { h: h, k: k },
    axisOfSymmetry: axisOfSymmetry,
    yIntercept: yIntercept,
  };
}

function formatNumber(n, places) {
  if (n === null || n === undefined) return '';
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  var p = places === undefined ? 6 : places;
  var rounded = Number(n.toFixed(p));
  return String(rounded);
}

function formatFraction(frac) {
  if (!frac) return '';
  if (frac.den === 1) return String(frac.num);
  return frac.num + '/' + frac.den;
}

function formatRoot(root) {
  // Used in tests and at runtime to print a single root concisely.
  if (!root) return '';
  if (root.kind === 'real') {
    var dec = formatNumber(root.decimal);
    if (root.exact && root.exact.den !== 1) {
      return formatFraction(root.exact) + ' (\u2248 ' + dec + ')';
    }
    if (root.exact && root.exact.den === 1) {
      return String(root.exact.num);
    }
    return dec;
  }
  if (root.kind === 'complex') {
    var realStr = formatNumber(root.real);
    var imagAbs = Math.abs(root.imag);
    var imagStr = imagAbs === 1 ? 'i' : formatNumber(imagAbs) + 'i';
    var sign = root.imag >= 0 ? ' + ' : ' - ';
    return realStr + sign + imagStr;
  }
  return '';
}

var exported = {
  gcd: gcd,
  simplifyFraction: simplifyFraction,
  isPerfectSquare: isPerfectSquare,
  solveQuadratic: solveQuadratic,
  formatNumber: formatNumber,
  formatFraction: formatFraction,
  formatRoot: formatRoot,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.QuadraticSolver = exported;
}
