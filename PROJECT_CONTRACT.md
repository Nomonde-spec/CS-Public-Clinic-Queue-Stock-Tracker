# CareQueue Project Contract

## 1. Project Definition

**Project name:** CareQueue: Public Clinic Queue and Stock Tracker

**Purpose:** Provide patients with current public-clinic waiting information and medication stock visibility before they travel, while giving clinic staff and administrators controlled tools to maintain accurate operational data.

**Primary problem:** Patients may make unnecessary trips because they cannot see current clinic queue conditions or confirm whether a required medication is available.

**Current technology baseline:**

- Client: Next.js, React, TypeScript, CSS
- Server: Node.js HTTP server
- Database: PostgreSQL
- Communication: JSON REST API
- Main client entry point: `client/app/page.tsx`
- Main server entry point: `server/index.js`

## 2. Product Scope

### Public portal

- View available clinics and their districts, addresses, hours, and contact details.
- View queue size, estimated waiting time, and clinic status.
- Search for medication availability.
- View medication quantities/statuses published by clinic staff.
- Use the portal without authentication.

### Staff portal

- Register for staff access.
- Sign in only after administrator approval.
- See the logged-in staff member's name and assigned clinic.
- Update the assigned clinic's queue status, patient count, and estimated wait time.
- Update the numeric quantity for each medication.
- Publish medication changes to the public portal.
- Use these stock thresholds:
  - `0`: Out of Stock
  - `1-249`: Low Stock
  - `250+`: In Stock

### Administrator portal

- Authenticate with administrator credentials and security token.
- View operational summaries.
- Review pending staff registrations.
- Approve or reject staff accounts.
- View approved and pending personnel in the staff directory.
- Manage clinic, staff, and medication records.
- Review queue and medication alerts.

## 3. Contract Rules

1. Public users may read published clinic and medication information without signing in.
2. Staff users may update only the operational data belonging to their assigned clinic.
3. Staff accounts remain unavailable until explicitly approved by an administrator.
4. The server is the source of truth for authentication, approvals, validation, and persistence.
5. The client must not treat a failed API write as a successful persistent update.
6. Medication status must be derived from the numeric stock quantity using the thresholds in this document.
7. Administrative and staff interfaces must show the authenticated identity and relevant clinic where applicable.
8. Credentials and secrets must be stored in environment variables and must not be committed to source control.
9. Every phase must finish with a working build and a documented verification result.
10. Existing functionality must remain working when a new phase is completed.

## 4. Delivery Phases and Sprints

### Phase 0: Inception and Baseline

#### Sprint 0.1: Requirements and repository baseline

**Objectives:** Confirm the problem, users, scope, architecture, and acceptance criteria.

**Implementation steps:**

1. Confirm public, staff, and administrator workflows.
2. Record the current client/server/database architecture.
3. Identify required environment variables and local startup commands.
4. Separate functional requirements from future enhancements.
5. Create or update this project contract.
6. Establish a baseline build and lint check.

**Exit criteria:** Scope is agreed, the repository builds, and the development environment is documented.

#### Sprint 0.2: Data and API contract

**Objectives:** Define the records exchanged between the client, server, and database.

**Implementation steps:**

1. Define clinic, medication, and staff fields.
2. Define staff statuses: `pending`, `approved`, and `rejected` where applicable.
3. Define API endpoints and HTTP methods.
4. Define validation and error response conventions.
5. Define stock quantity and availability rules.
6. Document ownership and authorization expectations for each endpoint.

**Exit criteria:** Client and server use the same field names and validation rules.

### Phase 1: Core Public Information

#### Sprint 1.1: Clinic directory

**Objectives:** Make clinic information easy to discover and compare.

**Implementation steps:**

1. Load clinic records from the API.
2. Display clinic name, district, address, hours, phone, status, wait, and queue count.
3. Add clinic search/filter behavior.
4. Add clinic detail view.
5. Display a clear last-updated indicator.
6. Handle loading, empty, and API error states.

**Exit criteria:** A public user can find a clinic and understand its current operating condition.

#### Sprint 1.2: Public queue visibility

**Objectives:** Make waiting conditions useful before a patient travels.

**Implementation steps:**

1. Display estimated wait time and patients in queue.
2. Display queue status badges consistently.
3. Refresh published queue data on a defined interval.
4. Ensure closed clinics are clearly distinguishable.
5. Verify responsive behavior on desktop and mobile widths.

**Exit criteria:** Public queue information is readable, current, and consistent across dashboard and clinic detail views.

#### Sprint 1.3: Public medication search

**Objectives:** Let patients check medication stock before visiting.

**Implementation steps:**

1. Load medication records from the API.
2. Display medication name, category, availability, quantity, and reporting clinic information.
3. Add medication search/filter behavior.
4. Use the server-published quantity/status data.
5. Add empty and unavailable-result states.

**Exit criteria:** A patient can search for a medication and understand its current stock status.

### Phase 2: Authentication and Staff Access

#### Sprint 2.1: Staff registration

**Objectives:** Allow clinical personnel to request access.

**Implementation steps:**

1. Create the staff registration form.
2. Require name, email, password or approved authentication details, and assigned clinic.
3. Validate required fields on the server.
4. Store new accounts as `pending`.
5. Prevent duplicate email registrations.
6. Show a clear pending-approval confirmation.

**Exit criteria:** A valid registration is persisted and appears in the administrator approval workflow.

#### Sprint 2.2: Staff and administrator login

**Objectives:** Protect operational and administrative actions.

**Implementation steps:**

1. Implement staff authentication against approved accounts.
2. Implement administrator authentication using environment configuration.
3. Return the authenticated user's name, role, email, and assigned clinic as appropriate.
4. Reject pending or rejected staff accounts.
5. Show useful but non-sensitive authentication errors.
6. Ensure logout returns the user to the public portal.

**Exit criteria:** Only approved staff and valid administrators can access protected views.

#### Sprint 2.3: Dynamic identity and clinic context

**Objectives:** Prevent misleading hard-coded staff identity information.

**Implementation steps:**

1. Store authenticated staff identity in client session state.
2. Display the logged-in name in the staff header.
3. Display the assigned clinic in the staff header and clinic context.
4. Use the assigned clinic when submitting queue and stock updates.
5. Test with more than one staff account and clinic.

**Exit criteria:** The staff interface always identifies the current user and relevant clinic correctly.

### Phase 3: Administrator Operations

#### Sprint 3.1: Approval queue

**Objectives:** Give administrators control over staff activation.

**Implementation steps:**

1. Load pending registrations from the server.
2. Display applicant name, email, and assigned clinic.
3. Add approve action.
4. Add reject action.
5. Persist status changes on the server.
6. Refresh pending and approved counts after each action.
7. Handle failed approval/rejection requests without falsely changing the UI.

**Exit criteria:** Administrators can reliably approve or reject registrations.

#### Sprint 3.2: Staff directory

**Objectives:** Give administrators a complete personnel view.

**Implementation steps:**

1. Display approved and pending staff records.
2. Display role, clinic, email, and credential status.
3. Add search and filtering behavior.
4. Connect directory approval actions to the same approval API.
5. Keep approved and pending counts consistent.

**Exit criteria:** A newly registered user is visible in the directory and approval queue.

#### Sprint 3.3: Clinic and medication administration

**Objectives:** Support controlled administrative maintenance.

**Implementation steps:**

1. Display clinic records in the administrator interface.
2. Display medication records and current stock status.
3. Add validation before administrative writes.
4. Add clear success and failure feedback.
5. Record the acting administrator for future audit support.

**Exit criteria:** Administrators can review and maintain core records without bypassing server validation.

### Phase 4: Staff Operations

#### Sprint 4.1: Queue management

**Objectives:** Allow clinic staff to publish current queue conditions.

**Implementation steps:**

1. Load the staff member's assigned clinic.
2. Display current wait time, patient count, and status.
3. Add controls for queue status.
4. Add patient-count controls with non-negative validation.
5. Add wait-time controls with reasonable upper limits.
6. Save changes through the API.
7. Refresh the public view after a successful update.

**Exit criteria:** Staff can publish accurate queue conditions for their own clinic.

#### Sprint 4.2: Numeric medication stock management

**Objectives:** Replace vague stock updates with measurable quantities.

**Implementation steps:**

1. Add a numeric `stockCount` field to medication records.
2. Add the database column and migration/backfill behavior.
3. Display a numeric quantity input for each medication.
4. Reject negative, fractional, malformed, or unauthorized quantities.
5. Derive availability using the contract thresholds:
   - `0` = Out of Stock
   - `1-249` = Low Stock
   - `250+` = In Stock
6. Save quantity, derived status, and clinic reporting context together.
7. Display the resulting quantity and status in the staff and public views.

**Exit criteria:** A staff member can enter a quantity, save it, refresh the page, and see the same quantity and derived status.

#### Sprint 4.3: Staff authorization boundaries

**Objectives:** Prevent cross-clinic data changes.

**Implementation steps:**

1. Validate the authenticated staff identity on every protected write.
2. Check that the target clinic matches the staff member's assignment.
3. Reject unauthorized clinic or medication updates.
4. Return a consistent authorization error.
5. Test with two staff users assigned to different clinics.

**Exit criteria:** A staff member cannot update another clinic's queue or inventory.

### Phase 5: Quality, Security, and Release

#### Sprint 5.1: Error handling and resilience

**Implementation steps:**

1. Add loading states to all API-backed views.
2. Add empty states for no records and no pending approvals.
3. Add recoverable API error messages.
4. Prevent duplicate submissions while a request is active.
5. Confirm failed writes do not mutate local state as if they succeeded.
6. Verify behavior after server restart and browser refresh.

**Exit criteria:** Common network and validation failures are understandable and do not corrupt the displayed state.

#### Sprint 5.2: Security and privacy review

**Implementation steps:**

1. Remove committed credentials and secrets from documentation and source.
2. Verify `.env` files are ignored.
3. Validate all request bodies server-side.
4. Restrict protected endpoints by role and clinic ownership.
5. Review CORS configuration.
6. Add audit logging for approvals and data changes.
7. Review password handling and replace placeholder password storage with secure hashing before production.

**Exit criteria:** No known critical authentication, authorization, or secret-management issue remains for the release scope.

#### Sprint 5.3: Test and release readiness

**Implementation steps:**

1. Run lint and TypeScript/build checks.
2. Run API tests for registration, login, approval, queue updates, and stock updates.
3. Run end-to-end tests for public, staff, and administrator workflows.
4. Test desktop and mobile layouts.
5. Verify database initialization and migration behavior.
6. Document environment setup and deployment commands.
7. Create a release checklist and record known limitations.

**Exit criteria:** The release candidate passes the agreed acceptance tests and can be started from documented instructions.

## 5. API Contract

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `GET` | `/api/public-data` | Read public clinics and medication data | Public |
| `GET` | `/api/summary` | Read operational summary counts | Authenticated/admin-oriented |
| `GET` | `/api/staff` | Read staff records and statuses | Administrator |
| `POST` | `/api/staff` | Register or create a staff record | Registration/admin |
| `PATCH` | `/api/staff/:id` | Update staff details or approval status | Administrator |
| `DELETE` | `/api/staff/:id` | Reject/remove a staff record | Administrator |
| `POST` | `/api/auth/login` | Authenticate staff or administrator | Public login endpoint |
| `PATCH` | `/api/clinics/:name` | Update clinic queue data | Assigned staff/admin |
| `PATCH` | `/api/medications/:name` | Update quantity and derived medication status | Assigned staff/admin |

## 6. Definition of Done

A feature is complete only when:

- The user workflow works from the UI.
- The server validates the request.
- Data is persisted in PostgreSQL where persistence is required.
- Success and failure states are visible to the user.
- Existing public, staff, and admin workflows still work.
- Responsive layout has been checked.
- Lint, typecheck/build, and relevant tests pass.
- Documentation is updated when setup or behavior changes.
- No credentials or secrets are added to committed files.

## 7. Release Checklist

- [ ] Environment variables configured for the target environment.
- [ ] Database connection verified.
- [ ] Database initialization/migrations completed.
- [ ] Administrator credentials supplied securely through environment variables.
- [ ] Staff registration and approval tested.
- [ ] Staff identity and clinic display tested.
- [ ] Queue update tested and visible publicly.
- [ ] Medication quantity update tested with `0`, `50`, `249`, and `250`.
- [ ] Public medication status verified for each threshold.
- [ ] Unauthorized cross-clinic update rejected.
- [ ] Client build passes.
- [ ] Server syntax/tests pass.
- [ ] Known limitations documented.

## 8. Future Enhancements

These items are outside the current delivery contract unless explicitly added to a sprint:

- Password hashing and secure session/token management.
- Role-based middleware and server-side session persistence.
- Full audit-log browsing for administrators.
- Per-clinic medication quantities instead of one shared medication quantity.
- Notifications when stock falls below threshold.
- Historical queue and inventory charts.
- Automated deployment and database migration pipeline.
- Accessibility audit and localization.
