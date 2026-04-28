'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  gcd,
  isPerfectSquare,
  simplifyFraction,
  solveQuadratic,
  formatRoot,
} = require('./quadratic-equation-solver.js');

// --- gcd / fraction simplification ---------------------------------------

test('gcd: handles zero and positives', () => {
  assert.equal(gcd(0, 5), 5);
  assert.equal(gcd(12, 18), 6);
  assert.equal(gcd(-12, 18), 6);
  assert.equal(gcd(7, 13), 1);
});

test('simplifyFraction: reduces to lowest terms', () => {
  assert.deepEqual(simplifyFraction(4, 8), { num: 1, den: 2 });
  assert.deepEqual(simplifyFraction(-6, 9), { num: -2, den: 3 });
  // Negative denominator gets flipped onto numerator.
  assert.deepEqual(simplifyFraction(3, -6), { num: -1, den: 2 });
  assert.deepEqual(simplifyFraction(0, 5), { num: 0, den: 1 });
});

test('isPerfectSquare: integers only', () => {
  assert.equal(isPerfectSquare(0), true);
  assert.equal(isPerfectSquare(1), true);
  assert.equal(isPerfectSquare(9), true);
  assert.equal(isPerfectSquare(16), true);
  assert.equal(isPerfectSquare(2), false);
  assert.equal(isPerfectSquare(-4), false);
  assert.equal(isPerfectSquare(2.5), false);
});

// --- solveQuadratic: distinct real roots ---------------------------------

test('solveQuadratic: x^2 - 3x + 2 = 0 gives x = 1 and x = 2', () => {
  const r = solveQuadratic(1, -3, 2);
  assert.equal(r.kind, 'real-distinct');
  assert.equal(r.discriminant, 1);
  // Roots in ascending order.
  const roots = r.roots.map(rt => rt.decimal).sort((a, b) => a - b);
  assert.ok(Math.abs(roots[0] - 1) < 1e-12);
  assert.ok(Math.abs(roots[1] - 2) < 1e-12);
  // Vertex h = -b/2a = 3/2; k = c - b^2/(4a) = 2 - 9/4 = -1/4
  assert.ok(Math.abs(r.vertex.h - 1.5) < 1e-12);
  assert.ok(Math.abs(r.vertex.k - (-0.25)) < 1e-12);
  assert.equal(r.yIntercept, 2);
  assert.ok(Math.abs(r.axisOfSymmetry - 1.5) < 1e-12);
});

test('solveQuadratic: integer roots come out as exact fractions with denominator 1', () => {
  const r = solveQuadratic(1, -3, 2);
  // Both roots should be expressible exactly: 1/1 and 2/1.
  const exactDecimals = r.roots.map(rt => rt.exact && rt.exact.den === 1 ? rt.exact.num : null);
  assert.ok(exactDecimals.includes(1));
  assert.ok(exactDecimals.includes(2));
});

// --- solveQuadratic: repeated root ---------------------------------------

test('solveQuadratic: x^2 - 2x + 1 = 0 gives repeated root x = 1', () => {
  const r = solveQuadratic(1, -2, 1);
  assert.equal(r.kind, 'real-repeated');
  assert.equal(r.discriminant, 0);
  assert.equal(r.roots.length, 1);
  assert.ok(Math.abs(r.roots[0].decimal - 1) < 1e-12);
  // Vertex on the x-axis: k = 0.
  assert.ok(Math.abs(r.vertex.k) < 1e-12);
});

// --- solveQuadratic: complex roots ---------------------------------------

test('solveQuadratic: x^2 + 2x + 5 = 0 gives -1 +/- 2i', () => {
  const r = solveQuadratic(1, 2, 5);
  assert.equal(r.kind, 'complex');
  assert.equal(r.discriminant, -16);
  assert.equal(r.roots.length, 2);
  // Real parts both -1, imaginary parts +2 and -2.
  assert.ok(Math.abs(r.roots[0].real - (-1)) < 1e-12);
  assert.ok(Math.abs(r.roots[1].real - (-1)) < 1e-12);
  const imags = [r.roots[0].imag, r.roots[1].imag].sort((a, b) => a - b);
  assert.ok(Math.abs(imags[0] - (-2)) < 1e-12);
  assert.ok(Math.abs(imags[1] - 2) < 1e-12);
});

// --- solveQuadratic: validation ------------------------------------------

test('solveQuadratic: a = 0 is invalid (not quadratic)', () => {
  const r = solveQuadratic(0, 2, 3);
  assert.equal(r.kind, 'invalid');
  assert.match(r.error, /a must be non-zero/i);
});

test('solveQuadratic: non-finite or non-numeric inputs are invalid', () => {
  assert.equal(solveQuadratic(NaN, 1, 1).kind, 'invalid');
  assert.equal(solveQuadratic(1, Infinity, 1).kind, 'invalid');
  assert.equal(solveQuadratic('x', 1, 1).kind, 'invalid');
});

// --- fraction simplification on roots ------------------------------------

test('solveQuadratic: 2x^2 - 4x + 2 = 0 simplifies the repeated root to 1/1', () => {
  // Discriminant = 16 - 16 = 0. Repeated root = -b/(2a) = 4/4 = 1.
  const r = solveQuadratic(2, -4, 2);
  assert.equal(r.kind, 'real-repeated');
  assert.equal(r.roots[0].exact.num, 1);
  assert.equal(r.roots[0].exact.den, 1);
});

test('solveQuadratic: 4x^2 - 1 = 0 gives exact fractions 1/2 and -1/2', () => {
  // Discriminant = 0 - 4*4*(-1) = 16, sqrt = 4 (perfect square).
  // Roots = (0 +/- 4) / 8 = +/- 1/2.
  const r = solveQuadratic(4, 0, -1);
  assert.equal(r.kind, 'real-distinct');
  const exacts = r.roots.map(rt => rt.exact);
  // Find +1/2 and -1/2 among the exact fractions.
  const has = (n, d) => exacts.some(e => e && e.num === n && e.den === d);
  assert.ok(has(1, 2));
  assert.ok(has(-1, 2));
});

// --- vertex maths --------------------------------------------------------

test('solveQuadratic: vertex of 2x^2 - 8x + 6 sits at (2, -2)', () => {
  // h = -b/2a = 8/4 = 2. k = c - b^2/(4a) = 6 - 64/8 = 6 - 8 = -2.
  const r = solveQuadratic(2, -8, 6);
  assert.ok(Math.abs(r.vertex.h - 2) < 1e-12);
  assert.ok(Math.abs(r.vertex.k - (-2)) < 1e-12);
  assert.ok(Math.abs(r.axisOfSymmetry - 2) < 1e-12);
  assert.equal(r.yIntercept, 6);
});

// --- formatRoot ----------------------------------------------------------

test('formatRoot: real exact fraction prints as fraction and decimal', () => {
  const out = formatRoot({ kind: 'real', decimal: 0.5, exact: { num: 1, den: 2 } });
  assert.match(out, /1\/2/);
  assert.match(out, /0\.5/);
});

test('formatRoot: complex root prints as p + qi', () => {
  const plus = formatRoot({ kind: 'complex', real: -1, imag: 2 });
  const minus = formatRoot({ kind: 'complex', real: -1, imag: -2 });
  assert.match(plus, /-1 \+ 2i/);
  assert.match(minus, /-1 - 2i/);
});
