const crypto = require("node:crypto");

const QUEUE_SLOT_MINUTES = 5;
const CALL_WINDOW_MINUTES = Math.max(1, Number(process.env.CALL_WINDOW_MINUTES) || 5);
const STATUS_SLOT_MINUTES = {
	"Open - Low Wait": 3,
	"Open - Moderate Wait": 5,
	"Open - Long Wait": 10,
	"Open - Longer Wait": 15,
	"Open - Busy": 10,
	"Open - Very Busy": 15,
	Busy: 10,
	"Very Busy": 15,
};

function getQueueSlotMinutes(status = "Open") {
	return STATUS_SLOT_MINUTES[status] || QUEUE_SLOT_MINUTES;
}

function getQueueStatus(patientCount) {
	if (patientCount >= 150) return "Open - Longer Wait";
	if (patientCount >= 100) return "Open - Long Wait";
	if (patientCount >= 50) return "Open - Moderate Wait";
	return "Open - Low Wait";
}

function queueDate(date = new Date()) {
	return date.toISOString().slice(0, 10);
}

function addMinutes(date, minutes) {
	return new Date(new Date(date).getTime() + minutes * 60000);
}

function createCapability() {
	const raw = crypto.randomBytes(32).toString("hex");
	return { raw, hash: crypto.createHash("sha256").update(raw).digest("hex") };
}

function deriveQueue(tickets, now = new Date(), clinicStatus = "Open") {
	const current = new Date(now);
	const active = tickets.filter((ticket) => ["waiting", "called"].includes(ticket.status));
	const waiting = active.filter((ticket) => ticket.status === "waiting").sort((a, b) => a.queueNumber - b.queueNumber);
	const called = active.filter((ticket) => ticket.status === "called").sort((a, b) => a.queueNumber - b.queueNumber);
	const status = clinicStatus === "Closed" ? "Closed" : getQueueStatus(waiting.length);
	const slotMinutes = getQueueSlotMinutes(status);
	return { patients: waiting.length, wait: waiting.length * slotMinutes, status, nextQueueNumber: Math.max(0, ...tickets.map((ticket) => ticket.queueNumber || 0)) + 1, current: called[0] || waiting[0] || null, waiting, active, updatedAt: current.toISOString() };
}

function allocateTicket(tickets, clinicName, now = new Date(), clinicStatus = "Open") {
	const current = new Date(now);
	const slotMinutes = getQueueSlotMinutes(clinicStatus);
	const date = queueDate(current);
	const today = tickets.filter((ticket) => ticket.clinicName === clinicName && ticket.queueDate === date);
	const queue = deriveQueue(today, current, clinicStatus);
	const lastScheduled = today.filter((ticket) => ["waiting", "called"].includes(ticket.status)).map((ticket) => new Date(ticket.scheduledAt).getTime()).reduce((latest, value) => Math.max(latest, value), current.getTime() - slotMinutes * 60000);
	const capability = createCapability();
	return { id: crypto.randomUUID(), clinicName, clinicStatus, queueDate: date, queueNumber: queue.nextQueueNumber, issuedQueueNumber: queue.waiting.length + 1, status: "waiting", scheduledAt: addMinutes(new Date(lastScheduled), slotMinutes).toISOString(), calledAt: null, callExpiresAt: null, capabilityHash: capability.hash, createdAt: current.toISOString(), requestedMedication: null, medicationCollected: false, collectedAt: null, ...capability };
}

function markMedicationCollected(ticket, medicationList, now = new Date()) {
	if (!ticket || !ticket.requestedMedication || ticket.medicationCollected) return false;
	const found = medicationList.find((item) => item.name === ticket.requestedMedication);
	if (!found || Number(found.stockCount) <= 0) return false;
	found.stockCount = Math.max(0, Number(found.stockCount) - 1);
	found.availability = found.stockCount === 0 ? "Out of Stock" : found.stockCount >= 250 ? "In Stock" : "Low Stock";
	ticket.medicationCollected = true;
	ticket.collectedAt = new Date(now).toISOString();
	return true;
}

function publicTicket(ticket, tickets, now = new Date(), clinicStatus = ticket.clinicStatus || "Open") {
	const slotMinutes = getQueueSlotMinutes(clinicStatus);
	const sameClinic = tickets.filter((item) => item.clinicName === ticket.clinicName && item.queueDate === ticket.queueDate);
	const queue = deriveQueue(sameClinic, now, clinicStatus);
	const position = ticket.status === "waiting" ? queue.waiting.findIndex((item) => item.id === ticket.id) + 1 : null;
	const displayQueueNumber = position > 0 ? position : ticket.issuedQueueNumber || ticket.queueNumber;
	const peopleAhead = position > 0 ? position - 1 : 0;
	const displayScheduledAt = position > 0 ? addMinutes(new Date(now), peopleAhead * slotMinutes).toISOString() : ticket.scheduledAt;
	return { id: ticket.id, clinicName: ticket.clinicName, queueNumber: displayQueueNumber, status: ticket.status, scheduledAt: displayScheduledAt, calledAt: ticket.calledAt, callExpiresAt: ticket.callExpiresAt, position: position > 0 ? position : null, peopleAhead, estimatedWait: position > 0 ? peopleAhead * slotMinutes : 0, patients: queue.patients, wait: queue.wait, requestedMedication: ticket.requestedMedication || null, medicationCollected: Boolean(ticket.medicationCollected), collectedAt: ticket.collectedAt || null };
}

function callTicket(ticket, now = new Date()) {
	if (ticket.status !== "waiting") return false;
	const current = new Date(now);
	ticket.status = "called";
	ticket.calledAt = current.toISOString();
	ticket.callExpiresAt = addMinutes(current, CALL_WINDOW_MINUTES).toISOString();
	return true;
}

function expireTickets(tickets, now = new Date()) {
	const current = new Date(now).getTime();
	for (const ticket of tickets) if (ticket.status === "called" && ticket.callExpiresAt && new Date(ticket.callExpiresAt).getTime() <= current) ticket.status = "missed";
}

module.exports = { CALL_WINDOW_MINUTES, QUEUE_SLOT_MINUTES, STATUS_SLOT_MINUTES, addMinutes, allocateTicket, callTicket, createCapability, deriveQueue, expireTickets, getQueueSlotMinutes, getQueueStatus, markMedicationCollected, publicTicket, queueDate };
