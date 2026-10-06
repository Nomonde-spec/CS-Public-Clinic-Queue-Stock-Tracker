const { allocateTicket, callTicket, canServeTicket, deriveQueue, expireTickets, getQueueSlotMinutes, getQueueStatus, hasActiveQueueTicket, publicTicket } = require('./queue');
const test = require('node:test');
const assert = require('node:assert/strict');
const { getAvailability, parseStockCount, calculateStockMovement, isAllowedClinicStatus } = require('./validation');
const { hashPassword, verifyPassword, isValidPassword } = require('./password');
const { defaultMedications, createClinicInventory, setClinicMedicationStock } = require('./medication-catalog');

test('the medication catalog seeds at least 60 unique entries for every clinic', () => {
  const clinics = Array.from({ length: 9 }, (_, index) => ({ name: `Clinic ${index + 1}` }));
  const inventory = createClinicInventory(clinics);
  assert.equal(defaultMedications.length, 60);
  assert.equal(new Set(defaultMedications.map((medication) => medication.name)).size, 60);
  for (const clinic of clinics) {
    const clinicInventory = inventory.filter((medication) => medication.clinicName === clinic.name);
    assert.ok(clinicInventory.length >= 60);
    assert.equal(new Set(clinicInventory.map((medication) => medication.name)).size, clinicInventory.length);
  }
});

test('clinic stock changes remain isolated and derive status from quantity', () => {
  const inventory = createClinicInventory([{ name: 'Clinic A' }, { name: 'Clinic B' }]);
  for (const [stockCount, expected] of [[0, 'Out of Stock'], [50, 'Low Stock'], [249, 'Low Stock'], [250, 'In Stock']]) {
    assert.equal(setClinicMedicationStock(inventory, 'Clinic A', 'Amoxicillin 500mg Capsules', stockCount).availability, expected);
  }
  assert.equal(inventory.find((item) => item.clinicName === 'Clinic A' && item.name === 'Amoxicillin 500mg Capsules').stockCount, 250);
  assert.equal(inventory.find((item) => item.clinicName === 'Clinic B' && item.name === 'Amoxicillin 500mg Capsules').stockCount, 50);
  assert.equal(setClinicMedicationStock(inventory, 'Missing Clinic', 'Amoxicillin 500mg Capsules', 20), null);
});

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

test('dispensing subtracts and restocking adds positive whole quantities', () => {
  assert.deepEqual(calculateStockMovement(20, 7, 'dispense'), { ok: true, stockCount: 13, availability: 'Low Stock' });
  assert.deepEqual(calculateStockMovement(20, 50, 'restock'), { ok: true, stockCount: 70, availability: 'Low Stock' });
  assert.deepEqual(calculateStockMovement(20, 21, 'dispense'), { ok: false, status: 409, error: 'Insufficient stock for this dispense.' });
  assert.equal(calculateStockMovement(20, 0, 'restock').ok, false);
  assert.equal(calculateStockMovement(20, 1.5, 'dispense').ok, false);
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

test('queue tickets and public payloads contain no medication data', () => {
  const ticket = allocateTicket([], 'Clinic A', new Date('2026-09-19T08:00:00.000Z'));
  const publicPayload = publicTicket(ticket, [ticket]);
  assert.equal('requestedMedication' in ticket, false);
  assert.equal('requestedMedications' in ticket, false);
  assert.equal('medicationCollected' in publicPayload, false);
  assert.equal('requestedMedication' in publicPayload, false);
});

test('service cannot settle before the scheduled server time', () => {
  const scheduled = new Date('2026-09-19T08:03:00.000Z');
  const first = allocateTicket([], 'Clinic A', new Date('2026-09-19T08:00:00.000Z'));
  const ticket = allocateTicket([first], 'Clinic A', new Date('2026-09-19T08:00:00.000Z'));
  ticket.status = 'called';
  assert.equal(canServeTicket(ticket, new Date('2026-09-19T08:02:59.000Z')), false);
  assert.equal(canServeTicket(ticket, scheduled), true);
});

test('serving a called ticket depends only on status and schedule', () => {
  const scheduled = new Date('2026-09-19T08:03:00.000Z');
  const first = allocateTicket([], 'Clinic A', new Date('2026-09-19T08:00:00.000Z'));
  const ticket = allocateTicket([first], 'Clinic A', new Date('2026-09-19T08:00:00.000Z'));
  ticket.status = 'ready';
  assert.equal(canServeTicket(ticket, new Date('2026-09-19T08:02:59.000Z')), false);
  assert.equal(canServeTicket(ticket, scheduled), true);
});

test('medication dispensing requires an active ticket in the same clinic and date', () => {
  const now = new Date('2026-09-19T08:00:00.000Z');
  const ticket = allocateTicket([], 'Clinic A', now);
  assert.equal(hasActiveQueueTicket([ticket], 'Clinic A', ticket.queueDate), true);
  assert.equal(hasActiveQueueTicket([ticket], 'Clinic B', ticket.queueDate), false);
  assert.equal(hasActiveQueueTicket([ticket], 'Clinic A', '2026-09-20'), false);
  ticket.status = 'served';
  assert.equal(hasActiveQueueTicket([ticket], 'Clinic A', ticket.queueDate), false);
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

test('password reset hashes and verifies credentials safely', () => {
  const password = 'NewSecurePass!2026';
  const hash = hashPassword(password);
  assert.notEqual(hash, password);
  assert.equal(verifyPassword(password, hash), true);
  assert.equal(verifyPassword('wrong-password', hash), false);
  assert.equal(verifyPassword('any-password', 'managed-by-portal'), false);
});

test('password policy accepts six characters and rejects shorter values', () => {
  assert.equal(isValidPassword('12345'), false);
  assert.equal(isValidPassword('123456'), true);
  assert.equal(isValidPassword('x'.repeat(257)), false);
});
