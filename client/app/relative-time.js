const units = [
  { label: "year", minutes: 365 * 24 * 60 },
  { label: "month", minutes: 30 * 24 * 60 },
  { label: "week", minutes: 7 * 24 * 60 },
  { label: "day", minutes: 24 * 60 },
  { label: "hour", minutes: 60 },
  { label: "minute", minutes: 1 },
];

function formatRelativeUpdate(elapsedMinutes) {
  const minutes = Math.max(0, Math.floor(elapsedMinutes));
  if (minutes === 0) return "Updated just now";

  const unit = units.find((candidate) => minutes >= candidate.minutes);
  const count = Math.floor(minutes / unit.minutes);
  return `Updated ${count} ${unit.label}${count === 1 ? "" : "s"} ago`;
}

module.exports = { formatRelativeUpdate };