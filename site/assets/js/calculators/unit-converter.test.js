'use strict';

var test = require('node:test');
var assert = require('node:assert');
var { convert, listUnits, listCategories, CATEGORIES } = require('./unit-converter');

function close(a, b, eps) { return Math.abs(a - b) < (eps || 1e-6); }

test('length: 1 kilometre = 1000 metres', function () {
  assert.ok(close(convert({ category: 'length', from: 'kilometre', to: 'metre', value: 1 }), 1000));
});

test('length: 1 mile ≈ 1609.344 metres', function () {
  assert.ok(close(convert({ category: 'length', from: 'mile', to: 'metre', value: 1 }), 1609.344));
});

test('length: round trip in <> km', function () {
  var out = convert({ category: 'length', from: 'metre', to: 'mile', value: 1609.344 });
  assert.ok(close(out, 1));
});

test('mass: 1 pound ≈ 0.45359237 kg', function () {
  assert.ok(close(convert({ category: 'mass', from: 'pound', to: 'kilogram', value: 1 }), 0.45359237));
});

test('mass: 1 stone = 14 pounds', function () {
  var out = convert({ category: 'mass', from: 'stone', to: 'pound', value: 1 });
  assert.ok(close(out, 14, 1e-4));
});

test('volume: 1 US gallon ≈ 3.785 litres', function () {
  assert.ok(close(convert({ category: 'volume', from: 'gallon-us', to: 'litre', value: 1 }), 3.785411784));
});

test('temperature: 0°C = 32°F', function () {
  assert.ok(close(convert({ category: 'temperature', from: 'celsius', to: 'fahrenheit', value: 0 }), 32));
});

test('temperature: 100°C = 212°F', function () {
  assert.ok(close(convert({ category: 'temperature', from: 'celsius', to: 'fahrenheit', value: 100 }), 212));
});

test('temperature: 0°C = 273.15 K', function () {
  assert.ok(close(convert({ category: 'temperature', from: 'celsius', to: 'kelvin', value: 0 }), 273.15));
});

test('temperature: -40°C = -40°F', function () {
  assert.ok(close(convert({ category: 'temperature', from: 'celsius', to: 'fahrenheit', value: -40 }), -40));
});

test('speed: 60 mph ≈ 96.5606 km/h', function () {
  var out = convert({ category: 'speed', from: 'mile-per-hour', to: 'kilometre-per-hour', value: 60 });
  assert.ok(close(out, 96.56064, 1e-3));
});

test('area: 1 acre ≈ 4046.856 m²', function () {
  assert.ok(close(convert({ category: 'area', from: 'acre', to: 'square-metre', value: 1 }), 4046.8564224));
});

test('unknown category throws', function () {
  assert.throws(() => convert({ category: 'colour', from: 'red', to: 'blue', value: 1 }));
});

test('listUnits returns array of {key,label}', function () {
  var units = listUnits('length');
  assert.ok(units.length > 3);
  assert.ok(units[0].key && units[0].label);
});

test('listCategories includes core six', function () {
  var cats = listCategories();
  ['length','mass','volume','temperature','speed','area'].forEach(function (c) {
    assert.ok(cats.indexOf(c) !== -1, 'missing ' + c);
  });
});
