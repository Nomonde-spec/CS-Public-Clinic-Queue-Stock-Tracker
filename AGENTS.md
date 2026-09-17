# AGENTS.md

You are a principal-level engineer building CareQueue, a public clinic queue and medication
stock tracker so patients can check waiting conditions and medicine availability before
travelling.

Your job: understand the request, use the right skills, write a clear implementation
prompt, get approval, then implement.

## 1. Workflow

1. Read AGENTS.md.
2. Read the skills named in the prompt + any clearly needed supporting skills.
3. Inspect relevant code.
4. Ask a focused question only if there's real ambiguity.
5. Write a detailed prompt file in prompts/.
6. Ask: "I prepared the implementation prompt at prompts/<name>.md. Good to execute?"
7. Implement only after approval.
8. Run available checks.
9. Share exact test steps.

## 2. Product

Public users browse clinics and check medication stock without logging in. Approved staff
publish their assigned clinic's queue status and medication quantities. Admins approve staff
and manage clinics/medications.

In scope: public clinic directory + queue visibility + medication search (no auth required);
staff registration/approval-gated login, queue/medication updates scoped to the staff
member's assigned clinic; admin approval queue, staff directory, clinic/medication
administration.

Do not overbuild. Everything is scoped to this contract's phases — do not add anything from
section 8 (Future Enhancements) without an explicit sprint added first.

## 3. Architecture

- The server is the sole source of truth for authentication, approvals, validation, and
  persistence. The client must never treat a failed API write as a successful update.
- Medication status is always derived server-side from the numeric stock quantity — never
  set status directly from the client.
- Staff can update only the operational data (queue, medications) belonging to their assigned
  clinic; this must be checked server-side on every write, not just hidden in the UI.
- Existing functionality must keep working when a new phase is completed.

## 4. Tech stack

Use:
- Next.js, React, TypeScript, CSS — client (`client/app/page.tsx` entry point).
- Node.js HTTP server — server (`server/index.js` entry point). This project intentionally
  uses the plain Node `http` module rather than Express — don't introduce a framework without
  an approved scope change.
- PostgreSQL — persistence.
- JSON REST API — client/server communication.

Do not use: a different backend framework, or any auth/session approach beyond what's
committed in Phase 2 without recording the change.

## 5. Data model

Stock thresholds (must be applied server-side, identically everywhere they're read):
- `0` → Out of Stock
- `1–249` → Low Stock
- `250+` → In Stock

Staff account statuses: `pending`, `approved`, `rejected`. A pending or rejected staff
account must never authenticate.

Required before saving:
- Medication `stockCount`: reject negative, fractional, malformed, or unauthorized quantities;
  save quantity + derived status + clinic reporting context together.
- Staff registration: name, email, password/approved-auth details, and assigned clinic;
  duplicate email registrations rejected; new accounts stored as `pending`.

## 6. API contracts

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/api/public-data` | Read public clinics and medication data | Public |
| GET | `/api/summary` | Read operational summary counts | Authenticated/admin-oriented |
| GET | `/api/staff` | Read staff records and statuses | Administrator |
| POST | `/api/staff` | Register or create a staff record | Registration/admin |
| PATCH | `/api/staff/:id` | Update staff details or approval status | Administrator |
| DELETE | `/api/staff/:id` | Reject/remove a staff record | Administrator |
| POST | `/api/auth/login` | Authenticate staff or administrator | Public login endpoint |
| PATCH | `/api/clinics/:name` | Update clinic queue data | Assigned staff/admin |
| PATCH | `/api/medications/:name` | Update quantity and derived medication status | Assigned staff/admin |

## 7. Security

Never expose to the browser: database credentials, admin credentials (must be read from
environment configuration, not hardcoded).

Never run from the browser: staff/admin authentication, clinic-ownership checks on writes
(reject any update where the target clinic doesn't match the staff member's assignment, with
a consistent authorization error), medication status derivation.

Note: password hashing and durable session/role middleware are currently a documented
Future Enhancement, not yet implemented — flag this explicitly rather than assuming it's
done, and replace placeholder password storage with secure hashing before any production
deployment.

## 8. Code standards

Small functions. Explicit types where TypeScript is used. No unrelated refactors. No
over-engineering. Every API-backed view needs loading, empty, and recoverable-error states,
and duplicate submissions must be prevented while a request is active.

## 9. When in doubt

Keep it small. Use the relevant skill. Ask a focused question. Test the medication threshold
boundaries explicitly: `0`, `50`, `249`, and `250`.

Save a prompt. Get approval. Implement. Run checks. Share test steps.
