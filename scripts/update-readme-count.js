#!/usr/bin/env node
// Keep the README's calculator count in sync with categories.json.
// Replaces the "Currently N live calculators across M categories" sentence
// with the current totals every time the pre-commit hook runs.
'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const categoriesPath = path.join(repoRoot, 'categories.json');
const readmePath = path.join(repoRoot, 'README.md');

const data = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
const cats = Array.isArray(data) ? data : (data.categories || []);
const totalCalcs = cats.reduce((sum, c) => sum + ((c.tools && c.tools.length) || 0), 0);
const totalCategories = cats.length;

const readme = fs.readFileSync(readmePath, 'utf8');
const pattern = /Currently \d+ live calculators across \d+ categories/;
const replacement = `Currently ${totalCalcs} live calculators across ${totalCategories} categories`;

if (!pattern.test(readme)) {
  console.error('update-readme-count: marker sentence not found in README.md');
  process.exit(1);
}

const next = readme.replace(pattern, replacement);
if (next !== readme) {
  fs.writeFileSync(readmePath, next);
  console.log(`update-readme-count: ${replacement}`);
} else {
  console.log(`update-readme-count: already up to date (${totalCalcs} / ${totalCategories})`);
}
