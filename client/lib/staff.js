export function dedupeStaffList(staffEntries = []) {
  const byKey = new Map();

  for (const member of staffEntries) {
    if (!member || typeof member !== "object") continue;

    const id = String(member.id ?? "").trim();
    const email = String(member.email ?? "").trim().toLowerCase();
    const key = id || email || `${String(member.name ?? "").trim()}|${String(member.clinic ?? "").trim()}|${String(member.role ?? "").trim()}`;

    if (!key) continue;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...member });
      continue;
    }

    byKey.set(key, {
      ...existing,
      ...member,
      name: member.name || existing.name,
      email: member.email || existing.email,
      clinic: member.clinic || existing.clinic,
      role: member.role || existing.role,
      id: member.id || existing.id,
    });
  }

  return [...byKey.values()];
}
