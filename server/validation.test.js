const test = require('node:test');
const assert = require('node:assert/strict');
const { getAvailability, parseStockCount, isAllowedClinicStatus } = require('./validation');

test('stock thresholds match the contract', () => {
  assert.equal(getAvailability(0), 'Out of Stock');
  assert.equal(getAvailability(50), 'Low Stock');
  assert.equal(getAvailability(249), 'Low Stock');
  assert.equal(getAvailability(250), 'In Stock');
});

test('stock counts reject fractions and negative values', () => {
  assert.deepEqual(parseStockCount(249.5), { ok: false, message: 'Stock quantity must be a non-negative whole number.' });
  assert.deepEqual(parseStockCount(-1), { ok: false, message: 'Stock quantity must be a non-negative whole number.' });
  assert.deepEqual(parseStockCount('250'), { ok: true, value: 250 });
  assert.deepEqual(parseStockCount('249'), { ok: true, value: 249 });
});

test('allowed queue statuses are enforced', () => {
  assert.equal(isAllowedClinicStatus('Open - Busy'), true);
  assert.equal(isAllowedClinicStatus('Unknown'), false);
});
