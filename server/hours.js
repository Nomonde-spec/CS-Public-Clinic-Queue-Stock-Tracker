const TIME_ZONE = "Africa/Johannesburg";
const WEEKDAYS = new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]);

function parseTime(value) {
	const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
	if (!match) return null;

	let hour = Number(match[1]);
	const minute = Number(match[2]);
	const meridiem = match[3]?.toUpperCase();
	if (minute > 59) return null;
	if (meridiem) {
		if (hour < 1 || hour > 12) return null;
		hour = hour % 12 + (meridiem === "PM" ? 12 : 0);
	} else if (hour > 23) {
		return null;
	}
	return hour * 60 + minute;
}

function parseClinicHours(hours) {
	if (typeof hours !== "string" || !hours.trim()) return null;
	if (/^open\s+24\s+hours$/i.test(hours.trim())) return { days: null, opens: 0, closes: 1440 };

	const match = hours.trim().match(/^(?:(.*?)\s*:\s*)?(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*[-–]\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)$/i);
	if (!match) return null;

	const dayLabel = match[1]?.trim();
	let days = null;
	if (dayLabel) {
		if (/^(?:Mon|Monday)\s*[-–]\s*(?:Fri|Friday)$/i.test(dayLabel)) {
			days = WEEKDAYS;
		} else {
			return null;
		}
	}

	const opens = parseTime(match[2]);
	const closes = parseTime(match[3]);
	if (opens === null || closes === null || closes <= opens) return null;
	return { days, opens, closes };
}

function getClinicOpenState(hours, date = new Date()) {
	const schedule = parseClinicHours(hours);
	if (!schedule) return null;
	if (schedule.days === null && schedule.opens === 0 && schedule.closes === 1440) return true;

	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: TIME_ZONE,
		weekday: "short",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).formatToParts(date);
	const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
	if (schedule.days && !schedule.days.has(values.weekday)) return false;

	const minutes = Number(values.hour) * 60 + Number(values.minute);
	return minutes >= schedule.opens && minutes < schedule.closes;
}

function getEffectiveClinicStatus(hours, operationalStatus, date = new Date()) {
	if (operationalStatus === "Closed" || getClinicOpenState(hours, date) === false) return "Closed";
	return operationalStatus;
}

function canAcceptQueueTickets(hours, storedStatus, date = new Date()) {
	return storedStatus !== "Closed" && getClinicOpenState(hours, date) !== false;
}

module.exports = { canAcceptQueueTickets, getClinicOpenState, getEffectiveClinicStatus, parseClinicHours };