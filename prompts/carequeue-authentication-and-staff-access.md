# Implement Authentication, Approval Gates, and Staff Context

## Objective

Complete the Phase 2 work for CareQueue: staff registration, approval-gated authentication, admin and staff login, and dynamic clinic context so protected operations are enforced server-side and the client reflects the authenticated identity accurately.

## Product context

CareQueue is a public clinic queue and medication stock tracker. Public users can browse clinics and medication availability without logging in. Approved clinic staff can update queue and stock information for their assigned clinic. Administrators approve staff and maintain records.

This work should keep the public portal working while adding the protected staff/admin flows and server validation required for operational correctness.

## Existing behavior to preserve

- The public homepage and clinic listing should continue to load without authentication.
- Existing clinic and medication data structures should remain usable.
- The server is the source of truth for persistence and authorization.
- The client must not assume a write succeeded just because the request returned without a thrown exception.
- Medication status is derived from server-side stock quantity, never set directly by the client.

## Requirements

### 1. Staff registration

- Add a staff registration workflow in the client.
- Require: full name, email, password or approved authentication details, and assigned clinic.
- Reject duplicate email registrations.
- Save new staff accounts as `pending`.
- Return a clear confirmation state for successful registration.
- Validate required fields on the server before persisting.

### 2. Authentication and approval

- Implement `POST /api/auth/login` for staff and administrator access.
- Allow only approved staff and valid administrators to authenticate.
- Reject pending or rejected staff accounts with a clear authorization error.
- Use environment-based admin credentials, not hardcoded values.
- Keep password storage secure by hashing before persistence; if the project currently stores placeholders, replace them with correct hashing logic before production use.
- Do not claim password hashing/session middleware is complete if it is still a documented future enhancement; call out only what is actually implemented.

### 3. Dynamic identity and clinic context

- Store the authenticated staff identity in client state.
- Show the logged-in staff member's name in the staff header and relevant screens.
- Show the assigned clinic in staff context.
- Use the assigned clinic when submitting queue and stock updates.
- Support more than one staff account and more than one clinic without hardcoded assumptions.

### 4. Server-side authorization rules

- Staff can update only operational data for their assigned clinic.
- Every protected write must verify ownership on the server.
- Reject updates when the requested clinic does not match the authenticated staff assignment.
- Use a consistent authorization error for denied writes.
- Keep clinic ownership checks on the server, not hidden in the UI.

### 5. Medication stock validation

- Medication stock quantities must be numeric and valid.
- Reject negative, fractional, malformed, or unauthorized quantities.
- Save quantity, derived status, and clinic reporting context together.
- Use the required threshold rules exactly:
  - `0` → Out of Stock
  - `1–249` → Low Stock
  - `250+` → In Stock
- Test the critical boundaries explicitly: `0`, `50`, `249`, and `250`.

### 6. API and data contract consistency

- Keep field names consistent between client and server.
- Respect the API contracts in the project contract and AGENTS.md.
- If a response indicates failure, do not update the client state as though the underlying write succeeded.
- Handle loading, empty, and error states for any API-backed view touched by this work.
- Prevent duplicate submissions while a request is in flight.

## Implementation constraints

- Keep the change focused on the authentication and staff-access flows.
- Do not add unrelated features or future enhancements without explicit scope approval.
- Use the existing Node HTTP server pattern and plain Node.js server code; do not introduce a framework without approval.
- Keep the implementation small and scoped to the contract-defined phase.
- Preserve all existing public functionality and ensure the new code does not break current clinic and medication reads.

## Files likely involved

- `server/index.js`
- `server/validation.js`
- `server/password.js`
- `client/app/page.tsx`
- Any related client API helper or server endpoint handler code already in the repo.

## Verification

Run the smallest available checks that validate the change:

```bash
cd server
node --test validation.test.js

cd ../client
npm run lint
npm run build
```

Additionally, verify the following behavior manually in the app:

1. Staff registration creates a `pending` account and prevents duplicates.
2. A pending or rejected staff member cannot log in.
3. An approved staff member can log in and sees their assigned clinic context.
4. A staff member cannot update a different clinic from the one assigned to them.
5. Medication stock thresholds work for `0`, `50`, `249`, and `250`.
6. The public portal still loads normally without authentication.

## Expected deliverable

A working implementation that matches the contract for Phase 2, with clear validation and server-enforced authorization, while preserving the public portal and current app behavior.
