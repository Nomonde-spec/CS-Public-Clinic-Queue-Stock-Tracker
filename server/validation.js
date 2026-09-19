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

function isAllowedClinicStatus(value) {
  const allowed = ["Open", "Closed", "Open - Low Wait", "Open - Moderate Wait", "Open - Long Wait", "Open - Longer Wait", "Open - Busy", "Open - Very Busy", "Busy", "Very Busy"];
  return allowed.includes(value);
}

module.exports = {
  getAvailability,
  parseStockCount,
  isAllowedClinicStatus,
};
