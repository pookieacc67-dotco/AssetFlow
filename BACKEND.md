# AssetFlow — Backend, Database, Auth & AI Agents Prompt (Prompt 2 of 3)

*Hand this to a backend developer, or paste it into a code-generation tool alongside Prompt 1. This is a real, multi-tenant SaaS backend meant to run in production for real companies — not a demo. There is no seeded fake data, no shortcut login, and no endpoint that lets anyone switch their own role. Everything here should be built with that in mind.*

---

## 1. Stack

FastAPI (Python) with Pydantic schemas on the backend. Identity lives in Firebase Auth — email/password, Google OAuth, GitHub OAuth, and Phone OTP — bridged into Supabase through Supabase's native Third-Party Auth support, so Supabase trusts Firebase-issued tokens directly without any custom token-signing bridge. The database, file storage, and Row Level Security all live in Supabase Postgres, and it's multi-tenant: every table is scoped by `organization_id` so one company's data is never reachable by another's. The three AI agents run on the Gemini API and nothing else — no AI feature exists in this product outside those three.

**On the public marketing site (Home/About):** purely static frontend content, no backend involvement at all. Don't build a CMS or a contact-form endpoint for it unless it's explicitly asked for later.

---

## 2. The identity model, and why it works this way

Every account — however it was created — ends up as a real Firebase email/password credential underneath, because Firebase's password authentication is inherently email-based; there's no such thing as a native "phone number plus password" login.

| Signup / Login path | What Firebase actually stores | What the person sees |
|---|---|---|
| Email + password | Their real email and password | Their real email and password |
| Phone + password | A synthetic "shadow" email (something like `{digits}@assetflow.internal`, generated server-side) carrying the password credential, with the real phone number stored separately | Just their phone number and password — the shadow email is never shown to them anywhere |
| Google OAuth (One-Click) | Whatever email Google returns, no password at all | A single click from landing or login pages, nothing else |
| GitHub OAuth (One-Click) | Whatever email GitHub returns, if any (see the edge case below) | A single click from landing or login pages, nothing else |

Login uses one unified field that accepts either an email or a phone number, as well as **Google and GitHub One-Click OAuth integration** right on both the Landing Page and the Login Page itself. If what's typed looks like a phone number, the backend has to resolve it to that account's real Firebase login email — real or shadow — before the frontend can call Firebase's sign-in method, because Firebase itself has no concept of a phone number in a password-login context. That resolution happens through a dedicated endpoint described in section 7.

**GitHub edge case worth knowing about ahead of time:** GitHub only hands back an email if the person has a public or verified email on their account and grants the `user:email` scope during the OAuth flow. When it doesn't come back, prompt for one right after authentication rather than letting account creation fail silently.

---

## 3. Database schema — 16 tables, built in this order

1. **`organizations`** — id (formatted uniquely like `ORG_XXXXXX`), organization_name, organization_code (unique, auto-generated), company_email, company_domain (derived from company_email at creation; null if the organization was created through the phone signup path), logo (nullable), industry (nullable), company_size (nullable), address (nullable), created_by (FK to users.id, nullable at first insert — see the circular-reference note below), subscription_plan (default `'free'`), status, created_at
2. `users` — id, `organization_id` (FK, not null), `firebase_uid` (unique, not null), name, email, phone (nullable), `auth_provider` (email/phone/google/github), role (admin/asset_manager/dept_head/employee), department_id (FK, nullable), **status** (`pending_verification` / `pending_approval` / `active` / `inactive` — three distinct waiting states, not one generic "pending"), joined_at
3. `departments` — id, `organization_id` (FK, not null), name, head_user_id (FK, nullable), parent_department_id (self-FK, nullable), status
4. `asset_categories` — id, `organization_id` (FK, not null), name, custom_fields (jsonb)
5. `assets` — id, `organization_id` (FK, not null), asset_tag (unique within the organization, not globally — two different companies can each have their own `AF-0001`), name, category_id (FK), serial_number, acquisition_date, acquisition_cost, condition, location, status, is_bookable, photo_url
6. `allocations` — id, asset_id (FK), employee_id (FK, nullable), department_id (FK, nullable), allocated_date, expected_return_date, status
7. `transfers` — id, asset_id (FK), from_user_id (FK), to_user_id (FK), reason, status, requested_by (FK)
8. `returns` — id, allocation_id (FK), returned_date, condition_notes, approved_by (FK)
9. `resources` — id, `organization_id` (FK, not null), name, type, location, is_bookable, `requires_approval` (boolean, per-resource)
10. `bookings` — id, resource_id (FK), booked_by (FK), start_time, end_time, status (pending_approval/upcoming/ongoing/completed/cancelled)
11. `maintenance_requests` — id, asset_id (FK), raised_by (FK), issue_description, priority, status, technician_id (nullable), attachments
12. `audits` — id, `organization_id` (FK, not null), scope, date_range_start, date_range_end, status
13. `audit_items` — id, audit_id (FK), asset_id (FK), verification_status (verified/missing/damaged), notes
14. `audit_logs` — id, user_id (FK), action, entity_type, entity_id, timestamp
15. `notifications` — id, user_id (FK), type, message, read, created_at
16. `activity_logs` — id, user_id (FK), action, details, timestamp

Six tables carry `organization_id` directly — the ones queried standalone most often. The rest derive their organization through a foreign-key chain (a booking's `organization_id` comes from its resource, for instance). This is a deliberate tradeoff: full denormalization everywhere would make every Row Level Security policy a little simpler at the cost of more columns to keep in sync. If RLS performance ever becomes a real bottleneck, denormalizing the rest is the first lever to pull.

**Circular reference, and how to handle it cleanly:** an organization can't reference a `created_by` user that doesn't exist yet, and a user can't reference an organization that doesn't exist yet either. Handle this inside one transaction: insert the organization with `created_by` left null, insert the user with the new `organization_id`, then update the organization's `created_by` to point at that user.

**Seeding asset categories at organization creation:** when a new organization is created (the Create Organization path, or the OAuth-signup equivalent), automatically insert a small starter set of categories for it — Electronics, Furniture, Vehicles, IT Equipment, Office Supplies. These aren't locked defaults; they're just a sensible starting point so a new Admin isn't looking at a completely empty list on their first visit to Organization Setup. Nothing else in the product gets seeded data — assets, departments beyond none, resources, and everything else genuinely start empty.

**Domain-matching safety:** `company_domain` lets an employee joining by email get auto-matched to their company's organization. Never allow this matching to succeed against a free or generic email provider — gmail.com, outlook.com, yahoo.com, icloud.com, and similar. Keep a small denylist and reject a domain match against it, falling back to requiring an explicit Organization Code instead. Without this guard, the first person to create an organization using a personal Gmail address would end up silently absorbing every other Gmail user who ever tries to join by domain.

---

## 4. Permission matrix — build every RLS policy and endpoint check directly off this table

| Feature | Admin | Asset Manager | Dept Head | Employee |
|---|---|---|---|---|
| Manage Users | Full | — | — | — |
| Manage Departments | Full | — | — | — |
| Manage Asset Categories | Full | — | — | — |
| Register Assets | — | Full | — | — |
| Allocate Assets | — | Full | — | — |
| Transfer Assets | — | Full | Approve | Request |
| Return Assets | — | Full | View | Request |
| Manage Resources | — | Full | View | Book |
| Approve Bookings | — | Full | Conditional, per-resource | Request |
| Raise Maintenance | — | Manage | Approve | Request |
| Conduct Audits | Full | Full | View | No access |
| View Reports | Org-wide | Org-wide | Department only | Personal only |
| Receive Notifications | Yes | Yes | Yes | Yes |
| Approve Employee Join Requests | Full | — | — | — |

The verbs genuinely differ row by row — Department Head can Approve a transfer but only View a return, and their booking approval is conditional on a per-resource flag rather than a blanket rule. Build each row as its own policy rather than collapsing them into one generic "department-scoped" rule.

---

## 5. Row Level Security — organization membership first, role second

Every policy now has two dimensions where it used to have one. The recommended pattern is a small Postgres helper function — something like `current_org_id()` — that looks up the caller's organization by matching `firebase_uid` against `auth.uid()`, so every policy calls that one function instead of repeating the lookup inline everywhere.

- `organizations`: a person can only read their own organization's row; only that organization's Admin can update it
- `users`: reads their own row plus rows where `organization_id = current_org_id()`; only `admin` can update `role` or `status`; anyone in `pending_approval` or `pending_verification` is blocked from reading or writing anything beyond their own row
- `departments`, `asset_categories`, `assets`, `resources`, `audits`: filtered to `organization_id = current_org_id()` first, then the existing role rules from the permission matrix apply on top
- Everything that derives its organization through a foreign key (`allocations`, `transfers`, `returns`, `bookings`, `maintenance_requests`, `audit_items`, `notifications`, `activity_logs`, `audit_logs`): filtered by joining up to the parent record's organization, then the role rules apply

**Test this properly before building anything on top of it.** Seed two separate organizations, log in as an Admin of one, and confirm every single endpoint — not just the obvious ones — returns nothing from the other. A policy that correctly checked role and department before this update can still leak across companies if the organization filter wasn't added to it.

---

## 6. Business-rule services

### Authentication — build this first, everything else depends on it

Register the Firebase project inside Supabase's dashboard under Authentication → Third-Party Auth. Every Firebase user needs the custom claim `role: 'authenticated'` set on their token, or Supabase won't trust it — this claim name is a Supabase convention and has nothing to do with your own `users.role` enum, don't conflate the two.

**The Firebase Cloud Function, triggered on every new Firebase user regardless of signup method, does exactly one thing:** it sets that `role: 'authenticated'` claim. It does not create a `users` row. That decision moved to two explicit FastAPI endpoints instead, because at the moment Firebase creates an account, nobody yet knows whether this is going to be an organization creation, an organization join, or — for OAuth — which of the two it'll turn out to be. Business logic that depends on frontend state belongs in FastAPI, not in a Cloud Function that can't see it.

**Create Organization path:** frontend calls Firebase's `createUserWithEmailAndPassword` with the real email (or, for the phone toggle, runs the native SMS OTP flow and then links a password credential to a generated shadow email). After OTP verification succeeds, the frontend calls `POST /auth/complete-org-signup`, which performs the three-step transaction from section 3 and seeds the starter asset categories.

**Join Organization path:** same account-creation mechanics, but after OTP verification the frontend calls `POST /auth/complete-employee-signup`, which resolves the organization by code or by domain match, creates the `users` row as `pending_approval` (not `active`), and notifies that organization's Admins.

**OAuth path:** frontend calls `signInWithPopup` for Google or GitHub, then immediately calls `POST /auth/oauth-check`. An existing `users` row means this is a login — return their organization and role so the frontend can route straight to the dashboard. No existing row means this is a signup — return that fact, the frontend shows the lightweight org-selection step, and calls the same two completion endpoints above (no OTP step needed here, since the provider already verified identity).

**Login, through the unified field:** the frontend sends the raw identifier and password to `POST /auth/resolve-identifier`, a public, rate-limited endpoint that detects whether it's an email or a phone number server-side, looks up the matching account, and returns only the Firebase login email needed — never anything else, and never a hint about whether an identifier exists or not on a non-match, to avoid turning this into a way to enumerate registered users. The frontend then calls Firebase's normal sign-in with that resolved email and the typed password. FastAPI never sees a password directly at any point — only the resulting Firebase token, on every subsequent request.

**Session handling, and why role changes apply automatically:** a shared FastAPI dependency verifies the Firebase token on every request, pulls the `sub` claim, and looks up that person's current role and department fresh from the `users` table each time — never from anything cached in the token itself. This is exactly what makes role promotion work the way it should: when an Admin changes someone from Employee to Department Head, nothing needs to happen on that person's device. Their next request — the next page load, the next API call — reads the new role straight from the database and the UI simply reflects it. There is no "log out and back in" requirement, and there is absolutely no endpoint anywhere that lets a person change their own role.

**Role promotion:** `PATCH /users/{id}/role`, Admin-only, enforced both in the API and again at the RLS layer, so a crafted request from a non-admin account is rejected twice over.

**Forgot password:** Firebase's native `sendPasswordResetEmail` handles this for both email-path and phone-path accounts, since both have a genuine Firebase password credential underneath — a phone-path person resetting their password goes through the same identifier-resolution step as login first, to find their shadow email before triggering the reset.

### Allocation conflict service
Checks that an asset is currently `available` before allocating it. If it's already allocated, the direct request is rejected and the current holder is surfaced along with a transfer-request option instead. Approving a transfer closes the old allocation and opens a new one.

### Booking overlap and conditional approval service
Rejects any requested time slot that overlaps an existing booking on the same resource, while allowing adjacent slots to sit back to back. After the overlap check passes, the service branches on that resource's `requires_approval` flag — true sends the booking into `pending_approval` and notifies the relevant Department Head; false confirms it immediately as `upcoming`.

### Maintenance workflow service
Moves a request through pending, approved or rejected, technician assigned, in progress, and resolved, automatically flipping the underlying asset's status to `under_maintenance` on approval and back to `available` on resolution. An asset currently under maintenance can't be allocated or booked.

### Audit cycle service
Handles scoped verification through the `audit_items` table; closing a cycle flips any confirmed-missing asset to `lost` and routes damaged items into the maintenance workflow, then locks the cycle from further edits.

### Employee approval service
An Admin approving a `pending_approval` user flips their status to `active` and notifies them; rejecting flips it to `inactive` rather than deleting the record, so there's still an audit trail of who applied and what happened. Both actions are scoped so an Admin can only approve or reject people within their own organization.

### Activity logging
Every state-changing action across the whole system writes to `activity_logs`, or to `audit_logs` specifically for audit-cycle events, through one shared logging function called from every mutation endpoint rather than duplicated inline in each one.

---

## 7. Authentication endpoints, listed together for reference

`POST /auth/complete-org-signup` — body: organization name plus optional industry and company size. Requires a valid Firebase token even though no `users` row exists yet for that token — this is the one endpoint that has to tolerate that state.

`POST /auth/complete-employee-signup` — body: an optional organization code. Resolves the organization by code or by denylist-guarded domain match, creates the pending user, fires the Admin notification.

`POST /auth/oauth-check` — called right after a Firebase OAuth popup succeeds, tells the frontend whether this is a returning account (with its org/role) or a new one needing the org-selection step. Supports Google and GitHub providers directly.

`POST /auth/resolve-organization-domain` — a small helper for the live "we found your company" hint on the Join Organization form; returns just the matching organization's display name if a safe match exists, nothing more.

`POST /auth/resolve-identifier` — resolves a phone number to its login email for the unified login field, rate-limited, deliberately vague on non-matches.

`PATCH /users/{id}/approve`, `PATCH /users/{id}/reject` — Admin-only, scoped to their own organization.

`PATCH /users/{id}/role` — Admin-only, the single place a role ever changes after signup.

---

## 8. The rest of the API, following the same list/detail/create/update/action pattern throughout

`assets.py`: `GET /assets` (filterable by category, status, department, location, search), `GET /assets/{id}` (with full history), `POST /assets` (Asset Manager only), `PATCH /assets/{id}`, `POST /assets/{id}/allocate` (runs the conflict service).

`bookings.py`: `POST /bookings` (overlap check, then branches on the resource's approval flag), `PATCH /bookings/{id}/approve` (Department Head only, only valid on their own department's pending bookings), `PATCH /resources/{id}` (Asset Manager only, including toggling `requires_approval`).

`maintenance.py` and `audit.py` follow the same shape.

`users.py`: `GET /users/me`, `PATCH /users/me` (name and avatar only — never role or department, those go through the dedicated endpoints above), notification-preference endpoints.

Every single endpoint, without exception, validates the caller's role, department, and organization against the permission matrix before doing anything — the frontend hiding a button is a courtesy to the user, not a security boundary.

---

## 9. AI agents — exactly three, Gemini API, all grounded in real data

**Asset Recommendation Assistant:** takes a plain-language requirement, queries the caller's own organization's actually-available assets first, and only then sends that real candidate list to Gemini for ranking and explanation. It never invents an asset that doesn't exist.

**Smart Resource Booking Assistant:** takes a plain-language booking request, reuses the exact same overlap-and-approval service described above rather than reimplementing conflict logic inside the agent, and only confirms a booking once that real check has passed.

**AI Report Generator:** pulls real aggregated numbers from the database first, then asks Gemini to turn them into a readable narrative with insights — Gemini's job is the writing, never the arithmetic.

Because every underlying query already goes through Row Level Security, all three agents are organization-scoped automatically as long as they run under the caller's own authenticated connection. The one thing to watch: if any agent is ever given a service-role key that bypasses RLS for performance reasons, the organization filter has to be added back into that specific query by hand, since nothing is protecting it implicitly anymore at that point.

Each agent lives in its own module under `app/ai/`, with a defined Pydantic input and output schema, and every invocation gets logged to `activity_logs`.

---

## 10. What this build explicitly does not include

No purchasing, invoicing, or accounting functionality. No AI feature beyond the three named agents. No customizable role names — the four roles are fixed platform-wide. No global booking-approval toggle — it's set per resource. No domain-matching against free email providers. No cross-organization account membership. No shadow email ever exposed anywhere a person could see it. And, worth stating plainly one more time since it shapes everything above: **no seeded demo data, no sample organization, and no way for anyone to change their own role.** This is meant to go live and be used by real companies from the first account created onward.
