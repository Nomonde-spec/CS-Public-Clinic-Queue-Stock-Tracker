import test from "node:test";
import assert from "node:assert/strict";

import { dedupeStaffList } from "./staff.js";

test("dedupeStaffList removes duplicate staff records while preserving the latest values", () => {
  const records = [
    { id: "admin-seed", name: "System Administrator", email: "sys.admin@carequeue.gov", clinic: "All clinics", role: "admin" },
    { id: "admin-seed", name: "System Administrator", email: "sys.admin@carequeue.gov", clinic: "All clinics", role: "admin" },
    { id: "staff-seed", name: "Dr. Sarah Jenkins", email: "s.jenkins@metrocare.gov", clinic: "Metro Family Care Centre", role: "staff" },
  ];

  const deduped = dedupeStaffList(records);

  assert.equal(deduped.length, 2);
  assert.deepEqual(deduped.map((member) => member.id).sort(), ["admin-seed", "staff-seed"]);
});
