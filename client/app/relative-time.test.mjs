import test from "node:test";
import assert from "node:assert/strict";
import relativeTime from "./relative-time.js";

const { formatRelativeUpdate } = relativeTime;

test("recent and future timestamps display as just now", () => {
  assert.equal(formatRelativeUpdate(0), "Updated just now");
  assert.equal(formatRelativeUpdate(-15), "Updated just now");
  assert.equal(formatRelativeUpdate(0.9), "Updated just now");
});

test("elapsed time uses minutes then hours", () => {
  assert.equal(formatRelativeUpdate(1), "Updated 1 minute ago");
  assert.equal(formatRelativeUpdate(59), "Updated 59 minutes ago");
  assert.equal(formatRelativeUpdate(60), "Updated 1 hour ago");
  assert.equal(formatRelativeUpdate(120), "Updated 2 hours ago");
  assert.equal(formatRelativeUpdate(1439), "Updated 23 hours ago");
});

test("elapsed time switches to days, weeks, months, and years", () => {
  assert.equal(formatRelativeUpdate(1440), "Updated 1 day ago");
  assert.equal(formatRelativeUpdate(6 * 1440), "Updated 6 days ago");
  assert.equal(formatRelativeUpdate(7 * 1440), "Updated 1 week ago");
  assert.equal(formatRelativeUpdate(14 * 1440), "Updated 2 weeks ago");
  assert.equal(formatRelativeUpdate(30 * 1440), "Updated 1 month ago");
  assert.equal(formatRelativeUpdate(60 * 1440), "Updated 2 months ago");
  assert.equal(formatRelativeUpdate(365 * 1440), "Updated 1 year ago");
  assert.equal(formatRelativeUpdate(9220), "Updated 6 days ago");
});