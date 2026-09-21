const test = require('node:test');
const assert = require('node:assert/strict');
const { getAvailability, parseStockCount, isAllowedClinicStatus } = require('./validation');
const { allocateTicket, callTicket, canServeTicket, deriveQueue, expireTickets, getQueueSlotMinutes, getQueueStatus, markMedicationCollected, publicTicket } = require('./queue');

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
  assert.equal(second.scheduledAt, '2026-09-19T08:03:00.000Z');
  assert.equal(deriveQueue([first, second]).patients, 2);
  assert.equal(deriveQueue([otherClinic]).patients, 1);
  assert.equal(publicTicket(first, [first, second]).peopleAhead, 0);
  assert.equal(publicTicket(first, [first, second]).queueNumber, 1);
  assert.equal(publicTicket(second, [first, second]).position, 2);
  assert.equal(publicTicket(second, [first, second]).queueNumber, 2);
  assert.equal(publicTicket(second, [first, second]).estimatedWait, 3);
  assert.equal(publicTicket(second, [first, second], now).scheduledAt, '2026-09-19T08:03:00.000Z');

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

test('every queue position uses three-minute waits', () => {
  const now = new Date('2026-09-19T08:00:00.000Z');
  const first = allocateTicket([], 'Clinic A', now);
  const second = allocateTicket([first], 'Clinic A', now);
  const third = allocateTicket([first, second], 'Clinic A', now);
  assert.equal(publicTicket(first, [first, second, third]).estimatedWait, 0);
  assert.equal(publicTicket(second, [first, second, third]).estimatedWait, 3);
  assert.equal(publicTicket(third, [first, second, third]).estimatedWait, 6);
});

test('clinic status does not change the fixed service duration', () => {
  assert.equal(getQueueSlotMinutes('Open - Low Wait'), 3);
  assert.equal(getQueueSlotMinutes('Open - Moderate Wait'), 3);
  assert.equal(getQueueSlotMinutes('Open - Busy'), 3);
  assert.equal(getQueueSlotMinutes('Open - Very Busy'), 3);
  assert.equal(getQueueSlotMinutes('Open - Long Wait'), 3);
  assert.equal(getQueueSlotMinutes('Open - Longer Wait'), 3);
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

  assert.equal(markMedicationCollected(ticket, medicationList, now), false);
  ticket.status = 'called';
  assert.equal(markMedicationCollected(ticket, medicationList, now), true);
  assert.equal(ticket.medicationCollected, true);
  assert.equal(medicationList[0].stockCount, 0);
  assert.equal(medicationList[0].availability, 'Out of Stock');
  assert.equal(publicTicket(ticket, [ticket]).requestedMedication, 'Paracetamol 500mg Tablets');
  assert.equal(publicTicket(ticket, [ticket]).medicationCollected, true);
});

test('service cannot settle before the scheduled server time', () => {
  const scheduled = new Date('2026-09-19T08:03:00.000Z');
  const first = allocateTicket([], 'Clinic A', new Date('2026-09-19T08:00:00.000Z'));
  const ticket = allocateTicket([first], 'Clinic A', new Date('2026-09-19T08:00:00.000Z'));
  ticket.status = 'called';
  assert.equal(canServeTicket(ticket, new Date('2026-09-19T08:02:59.000Z')), false);
  assert.equal(canServeTicket(ticket, scheduled), true);
});

test('served medication cannot be collected twice', () => {
  const now = new Date('2026-09-19T08:03:00.000Z');
  const ticket = allocateTicket([], 'Clinic A', new Date('2026-09-19T08:00:00.000Z'));
  ticket.status = 'called';
  ticket.requestedMedication = 'Paracetamol 500mg Tablets';
  const medicationList = [{ name: 'Paracetamol 500mg Tablets', stockCount: 2, availability: 'Low Stock' }];
  assert.equal(markMedicationCollected(ticket, medicationList, now), true);
  assert.equal(markMedicationCollected(ticket, medicationList, now), false);
  assert.equal(medicationList[0].stockCount, 1);
});

test('one ticket can collect multiple medications exactly once', () => {
  const now = new Date('2026-09-19T08:00:00.000Z');
  const ticket = allocateTicket([], 'Clinic A', now);
  ticket.status = 'ready';
  ticket.requestedMedications = ['Paracetamol 500mg Tablets', 'Metformin 850mg Tablets'];
  const medicationList = [
    { name: 'Paracetamol 500mg Tablets', stockCount: 1, availability: 'Low Stock' },
    { name: 'Metformin 850mg Tablets', stockCount: 2, availability: 'Low Stock' },
  ];

  assert.equal(markMedicationCollected(ticket, medicationList, now), true);
  assert.equal(medicationList[0].stockCount, 0);
  assert.equal(medicationList[1].stockCount, 1);
  assert.deepEqual(publicTicket(ticket, [ticket]).requestedMedications, ['Paracetamol 500mg Tablets', 'Metformin 850mg Tablets']);
  assert.equal(markMedicationCollected(ticket, medicationList, now), false);
});

test('called tickets expire and cannot be called twice', () => {
  const now = new Date('2026-09-19T08:00:00.000Z');
  const ticket = allocateTicket([], 'Clinic A', now);
  assert.equal(callTicket(ticket, now), true);
  assert.equal(callTicket(ticket, now), false);
  assert.equal(ticket.status, 'ready');
  expireTickets([ticket], new Date('2026-09-19T08:06:00.000Z'));
  assert.equal(ticket.status, 'missed');
});
