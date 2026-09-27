const test = require('node:test');
const assert = require('node:assert/strict');
const { getAvailability, parseStockCount, isAllowedClinicStatus } = require('./validation');
const { allocateTicket, callTicket, canServeTicket, deriveQueue, expireTickets, getQueueSlotMinutes, getQueueStatus, markMedicationCollected, publicTicket } = require('./queue');
const { canAcceptQueueTickets, getClinicOpenState, getEffectiveClinicStatus, parseClinicHours } = require('./hours');
const { addDemoClinicStockRows, attachClinicStock, isDemoStockDataEnabled, parseLegacyClinicStock } = require('./clinic-stock');

test('legacy clinic stock is migrated only when its clinic attribution is explicit', () => {
  assert.equal(parseLegacyClinicStock('Metro Family Care Centre: 50 in stock', 'Metro Family Care Centre'), 50);
  assert.equal(parseLegacyClinicStock('50 units in stock', 'Metro Family Care Centre'), null);
  assert.equal(parseLegacyClinicStock('All clinics', 'Metro Family Care Centre'), null);
  assert.equal(parseLegacyClinicStock('Other Clinic: 50 in stock', 'Metro Family Care Centre'), null);
});

test('Paracetamol search data lists every positive clinic quantity with its derived status', () => {
  const [medication] = attachClinicStock([{ name: 'Paracetamol 500mg Tablets', availability: 'In Stock' }], [
    { name: 'Paracetamol 500mg Tablets', clinicName: 'Clinic Zero', province: 'Gauteng', address: 'A street', stockCount: 0 },
    { name: 'Paracetamol 500mg Tablets', clinicName: 'Clinic One', province: 'Limpopo', address: 'B street', stockCount: 1 },
    { name: 'Paracetamol 500mg Tablets', clinicName: 'Clinic Low', province: 'North West', address: 'C street', stockCount: 249 },
    { name: 'Paracetamol 500mg Tablets', clinicName: 'Clinic In Stock', province: 'Western Cape', address: 'D street', stockCount: 250 },
  ]);

  assert.deepEqual(medication.availableAt.map(({ clinicName, stockCount, availability }) => ({ clinicName, stockCount, availability })), [
    { clinicName: 'Clinic One', stockCount: 1, availability: 'Low Stock' },
    { clinicName: 'Clinic Low', stockCount: 249, availability: 'Low Stock' },
    { clinicName: 'Clinic In Stock', stockCount: 250, availability: 'In Stock' },
  ]);
});

test('demo stock fills missing clinic-medication pairs without replacing reported stock', () => {
  const rows = addDemoClinicStockRows(
    [
      { name: 'Clinic A', province: 'Gauteng', address: 'A street' },
      { name: 'Clinic B', province: 'Limpopo', address: 'B street' },
    ],
    [{ name: 'Paracetamol' }, { name: 'Metformin' }],
    [{ name: 'Paracetamol', clinicName: 'Clinic A', province: 'Gauteng', address: 'A street', stockCount: 0 }],
  );

  assert.equal(rows.length, 4);
  assert.equal(rows.find((row) => row.clinicName === 'Clinic A' && row.name === 'Paracetamol').stockCount, 0);
  const generatedStatuses = rows
    .filter((row) => !(row.clinicName === 'Clinic A' && row.name === 'Paracetamol'))
    .map((row) => attachClinicStock([{ name: row.name }], [row])[0].clinicStocks[0].availability);
  assert.ok(generatedStatuses.includes('Low Stock'));
  assert.ok(generatedStatuses.includes('In Stock'));
});

test('demo stock data is opt-in and disabled in production', () => {
  assert.equal(isDemoStockDataEnabled({ DEMO_STOCK_DATA: 'true', NODE_ENV: 'development' }), true);
  assert.equal(isDemoStockDataEnabled({ DEMO_STOCK_DATA: 'true', NODE_ENV: 'production' }), false);
  assert.equal(isDemoStockDataEnabled({ NODE_ENV: 'development' }), false);
});

test('clinic hours parse supported schedule formats', () => {
  assert.deepEqual(parseClinicHours('Mon - Fri: 8:00 AM - 6:00 PM'), { days: new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']), opens: 480, closes: 1080 });
  assert.deepEqual(parseClinicHours('08:00 - 17:00'), { days: null, opens: 480, closes: 1020 });
  assert.equal(getClinicOpenState('Open 24 Hours', new Date('2026-09-27T12:00:00.000Z')), true);
  assert.equal(getClinicOpenState('hours not recognized', new Date('2026-09-27T12:00:00.000Z')), null);
});

test('weekday clinics close outside the schedule using South African local time', () => {
  const hours = 'Mon - Fri: 8:00 AM - 6:00 PM';
  assert.equal(getClinicOpenState(hours, new Date('2026-09-28T05:59:00.000Z')), false);
  assert.equal(getClinicOpenState(hours, new Date('2026-09-28T06:00:00.000Z')), true);
  assert.equal(getClinicOpenState(hours, new Date('2026-09-28T15:59:00.000Z')), true);
  assert.equal(getClinicOpenState(hours, new Date('2026-09-28T16:00:00.000Z')), false);
  assert.equal(getClinicOpenState(hours, new Date('2026-09-27T08:00:00.000Z')), false);
});

test('public status and queue acceptance follow schedule without overriding manual closure', () => {
  const weekdayHours = 'Mon - Fri: 8:00 AM - 6:00 PM';
  const beforeOpening = new Date('2026-09-28T05:59:00.000Z');
  const duringHours = new Date('2026-09-28T06:00:00.000Z');

  assert.equal(getEffectiveClinicStatus(weekdayHours, 'Open - Low Wait', beforeOpening), 'Closed');
  assert.equal(getEffectiveClinicStatus(weekdayHours, 'Open - Low Wait', duringHours), 'Open - Low Wait');
  assert.equal(getEffectiveClinicStatus(weekdayHours, 'Closed', duringHours), 'Closed');
  assert.equal(canAcceptQueueTickets(weekdayHours, 'Open', beforeOpening), false);
  assert.equal(canAcceptQueueTickets(weekdayHours, 'Open', duringHours), true);
  assert.equal(canAcceptQueueTickets('unsupported hours', 'Open', beforeOpening), true);
  assert.equal(canAcceptQueueTickets(weekdayHours, 'Closed', duringHours), false);
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

test('active queue counts exclude ready tickets and include only waiting plus called patients', () => {
  const now = new Date('2026-09-19T08:00:00.000Z');
  const first = allocateTicket([], 'Clinic A', now);
  const second = allocateTicket([first], 'Clinic A', now);
  const third = allocateTicket([first, second], 'Clinic A', now);

  first.status = 'ready';
  second.status = 'called';
  third.status = 'waiting';

  const summary = deriveQueue([first, second, third], now, 'Open');
  assert.equal(summary.patients, 2);
  assert.equal(summary.wait, 6);
  assert.deepEqual(summary.active.map((ticket) => ticket.status), ['called', 'waiting']);
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
