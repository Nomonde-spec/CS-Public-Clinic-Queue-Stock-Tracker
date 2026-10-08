function getAvailability(stockCount) {
  const numeric = Number(stockCount);
  return numeric === 0 ? "Out of Stock" : numeric >= 250 ? "In Stock" : "Low Stock";
}

function parseStockCount(value) {
  if (value === undefined || value === null || value === "") {
    return { ok: false, message: "Stock quantity is required." };
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || !Number.isInteger(numeric) || numeric < 0) {
    return { ok: false, message: "Stock quantity must be a non-negative whole number." };
  }

  return { ok: true, value: numeric };
}

function calculateStockMovement(currentStock, quantity, operation) {
  if (!Number.isInteger(currentStock) || currentStock < 0 || !Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, status: 400, error: "Quantity must be a positive whole number." };
  }
  if (operation === "dispense" && quantity > currentStock) {
    return { ok: false, status: 409, error: "Insufficient stock for this dispense." };
  }
  const stockCount = operation === "restock" ? currentStock + quantity : currentStock - quantity;
  return { ok: true, stockCount, availability: getAvailability(stockCount) };
}

function isAllowedClinicStatus(value) {
  const allowed = ["Open", "Closed", "Open - Low Wait", "Open - Moderate Wait", "Open - Long Wait", "Open - Longer Wait", "Open - Busy", "Open - Very Busy", "Busy", "Very Busy"];
  return allowed.includes(value);
}

function normalizeStaffStatus(value) {
  const status = String(value ?? "").trim().toLowerCase();
  if (status === "approved" || status === "pending" || status === "rejected") return status;
  return "pending";
}

function isApprovedStaffStatus(value) {
  return normalizeStaffStatus(value) === "approved";
}

function parseClinicTime(value) {
  const match = String(value).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3]?.toUpperCase();
  if (minute > 59 || hour > (meridiem ? 12 : 23) || (meridiem && hour === 0)) return null;
  if (meridiem) hour = (hour % 12) + (meridiem === "PM" ? 12 : 0);
  return hour * 60 + minute;
}

function isClinicOpenNow(hours, date = new Date(), timeZone = process.env.CLINIC_TIMEZONE || "Africa/Johannesburg") {
  const value = String(hours || "").trim();
  if (/24\s*hours|open\s*24/i.test(value)) return true;
  const timeMatches = value.match(/\b\d{1,2}(?::\d{2})?\s*(?:AM|PM)?\b/gi) || [];
  if (timeMatches.length < 2) return false;
  const opening = parseClinicTime(timeMatches[0]);
  const closing = parseClinicTime(timeMatches[1]);
  if (opening === null || closing === null) return false;

  let localParts;
  try {
    localParts = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(date);
  } catch {
    localParts = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(date);
  }
  const weekday = localParts.find((part) => part.type === "weekday")?.value;
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  const dayRange = value.match(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:day)?\s*[-\u2013]\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:day)?/i);
  if (dayRange) {
    const startDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(dayRange[1].slice(0, 3).replace(/^./, (letter) => letter.toUpperCase()));
    const endDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(dayRange[2].slice(0, 3).replace(/^./, (letter) => letter.toUpperCase()));
    if (weekdayIndex < startDay || weekdayIndex > endDay) return false;
  }
  const current = Number(localParts.find((part) => part.type === "hour")?.value) * 60 + Number(localParts.find((part) => part.type === "minute")?.value);
  return closing > opening ? current >= opening && current < closing : current >= opening || current < closing;
}

module.exports = {
  getAvailability,
  isClinicOpenNow,
  parseStockCount,
  calculateStockMovement,
  isAllowedClinicStatus,
  normalizeStaffStatus,
  isApprovedStaffStatus,
};
