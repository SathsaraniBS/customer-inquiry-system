# Decisions

## Assumptions
- Small team; staff sign in with seeded accounts (no registration).
- A staff member mainly works the inquiries they created.

## Key design choices
1. **Ownership**: staff see only inquiries they created; admin sees all. Enforced in the API with a SQL filter on created_by. Another user's record returns 404 (not 403) so its existence is not revealed.
2. **Status rules**: New -> In Progress -> Resolved; Resolved can be reopened to In Progress. Skipping or returning to New is rejected with 409 INVALID_TRANSITION. The rules live in one backend file and are unit-tested.
3. **Stale data**: each inquiry has a `version`. The client sends the version it saw; if it differs, the API returns 409 STALE_VERSION and the UI shows a banner with a reload action.
4. **Missing/duplicate input**: Zod validation on the API (400 with field errors), mirrored by instant client-side checks. Same user + contact + subject within 10 minutes returns 409 with a link to the existing inquiry.
5. **Extra feature**: status history timeline (inquiry_events), written in the same transaction as the status change.

## Trade-off accepted
No real-time updates. A stale tab only learns about a change when the user acts. This keeps the system simple.

## Testing
- Backend: unit tests for transition rules; integration tests for 401, validation, ownership (404) and invalid transitions.
- Frontend: one test for form validation (empty form shows errors, API not called).
- Gaps: no automated tests for the stale banner, list filters or detail page; no end-to-end tests.

## What I would improve next
Pagination, login rate limiting, CSRF protection, assigning inquiries between staff, more frontend tests.

## Use of AI
I used Claude to help plan the architecture, draft starter code and debug setup problems (PostgreSQL port, npm dependency conflicts, Vitest JSX config). I ran and tested everything and can explain it.
- Accepted: version-based optimistic locking for the stale-tab case.
- Changed: (write one real change you made)
- Rejected: (write one real thing you declined, e.g. the AGENTS.md option in create-next-app)