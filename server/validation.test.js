const test = require('node:test');
const assert = require('node:assert/strict');
const { getAvailability, parseStockCount, isAllowedClinicStatus } = require('./validation');
const { allocateTicket, callTicket, deriveQueue, expireTickets, getQueueSlotMinutes, getQueueStatus, markMedicationCollected, publicTicket } = require('./queue');

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

test('queue numbers and waits are isolated by clinic', () => {
  const now = new Date('2026-09-19T08:00:00.000Z');
  const first = allocateTicket([], 'Clinic A', now);
  const second = allocateTicket([first], 'Clinic A', now);
  const otherClinic = allocateTicket([first], 'Clinic B', now);
  assert.equal(first.queueNumber, 1);
  assert.equal(second.queueNumber, 2);
  assert.equal(otherClinic.queueNumber, 1);
  assert.equal(first.scheduledAt, now.toISOString());
  assert.equal(second.scheduledAt, '2026-09-19T08:05:00.000Z');
  assert.equal(deriveQueue([first, second]).patients, 2);
  assert.equal(deriveQueue([otherClinic]).patients, 1);
  assert.equal(publicTicket(first, [first, second]).peopleAhead, 0);
  assert.equal(publicTicket(first, [first, second]).queueNumber, 1);
  assert.equal(publicTicket(second, [first, second]).position, 2);
  assert.equal(publicTicket(second, [first, second]).queueNumber, 2);
  assert.equal(publicTicket(second, [first, second]).estimatedWait, 5);
  assert.equal(publicTicket(second, [first, second], now).scheduledAt, '2026-09-19T08:05:00.000Z');

  first.status = 'left';
  second.status = 'left';
  const resetTicket = allocateTicket([first, second], 'Clinic A', now);
  assert.equal(publicTicket(resetTicket, [first, second, resetTicket]).queueNumber, 1);
  assert.equal(publicTicket(resetTicket, [first, second, resetTicket]).peopleAhead, 0);

  const activeTicket = allocateTicket([resetTicket], 'Clinic A', now);
  assert.equal(publicTicket(activeTicket, [resetTicket, activeTicket]).queueNumber, 2);
  assert.equal(publicTicket(activeTicket, [resetTicket, activeTicket]).peopleAhead, 1);

  resetTicket.status = 'left';
  assert.equal(publicTicket(resetTicket, [resetTicket, activeTicket]).queueNumber, resetTicket.issuedQueueNumber);
});

test('every queue position uses five-minute waits', () => {
  const now = new Date('2026-09-19T08:00:00.000Z');
  const first = allocateTicket([], 'Clinic A', now);
  const second = allocateTicket([first], 'Clinic A', now);
  const third = allocateTicket([first, second], 'Clinic A', now);
  assert.equal(publicTicket(first, [first, second, third]).estimatedWait, 0);
  assert.equal(publicTicket(second, [first, second, third]).estimatedWait, 5);
  assert.equal(publicTicket(third, [first, second, third]).estimatedWait, 10);
});

test('clinic status controls wait duration', () => {
  assert.equal(getQueueSlotMinutes('Open - Low Wait'), 3);
  assert.equal(getQueueSlotMinutes('Open - Moderate Wait'), 5);
  assert.equal(getQueueSlotMinutes('Open - Busy'), 10);
  assert.equal(getQueueSlotMinutes('Open - Very Busy'), 15);
  assert.equal(getQueueSlotMinutes('Open - Long Wait'), 10);
  assert.equal(getQueueSlotMinutes('Open - Longer Wait'), 15);
});

test('queue status is derived from waiting patient count', () => {
  assert.equal(getQueueStatus(0), 'Open - Low Wait');
  assert.equal(getQueueStatus(49), 'Open - Low Wait');
  assert.equal(getQueueStatus(50), 'Open - Moderate Wait');
  assert.equal(getQueueStatus(99), 'Open - Moderate Wait');
  assert.equal(getQueueStatus(100), 'Open - Long Wait');
  assert.equal(getQueueStatus(149), 'Open - Long Wait');
  assert.equal(getQueueStatus(150), 'Open - Longer Wait');
});

test('medication collection state is tracked and zero stock reads as out of stock', () => {
  const now = new Date('2026-09-19T08:00:00.000Z');
  const ticket = allocateTicket([], 'Clinic A', now);
  ticket.requestedMedication = 'Paracetamol 500mg Tablets';
  const medicationList = [{ name: 'Paracetamol 500mg Tablets', stockCount: 1, availability: 'Low Stock' }];

  assert.equal(markMedicationCollected(ticket, medicationList, now), true);
  assert.equal(ticket.medicationCollected, true);
  assert.equal(medicationList[0].stockCount, 0);
  assert.equal(medicationList[0].availability, 'Out of Stock');
  assert.equal(publicTicket(ticket, [ticket]).requestedMedication, 'Paracetamol 500mg Tablets');
  assert.equal(publicTicket(ticket, [ticket]).medicationCollected, true);
});

test('called tickets expire and cannot be called twice', () => {
  const now = new Date('2026-09-19T08:00:00.000Z');
  const ticket = allocateTicket([], 'Clinic A', now);
  assert.equal(callTicket(ticket, now), true);
  assert.equal(callTicket(ticket, now), false);
  expireTickets([ticket], new Date('2026-09-19T08:06:00.000Z'));
  assert.equal(ticket.status, 'missed');
});
