# Development History

The application was built in reviewed phases. Each phase was implemented, checked (unit tests, type checking, lint, formatting, production build and a browser walkthrough) and approved before it was committed.

The application is **frontend-only**: there is no backend, API or database. All data is stored in the browser's `localStorage` through a repository/service layer that could later be swapped for REST calls.

## Timeline

| Phase                                        | Commit    | Date       | Tests at commit |
| -------------------------------------------- | --------- | ---------- | --------------- |
| 1. Project setup and design system           | `a962a61` | 2026-10-04 | 47              |
| 2. Authentication and registration           | `3f0d441` | 2026-10-05 | 116             |
| 3. Admin dashboard and user management       | `4546f1b` | 2026-10-05 | 177             |
| MVP: Certification workflow and frontend MVP | `60f8df0` | 2026-10-05 | 213             |

The commit `c8d4cb1` (_chore: sync package lockfile name_), made between Phases 1 and 2, only updates the package name in the lockfile.

## Phase 1: Project setup and design system (`a962a61`)

- Set up Vite, React 19 and strict TypeScript, with Tailwind CSS v4, shadcn/ui (Radix), React Router, ESLint, Prettier and Vitest.
- Built design-system components (Button, Input, FormField, Card, Badge, Alert, PageHeader, LoadingIndicator) on top of shared theme colors, and added a development-only `/design-system` page that shows them.
- Created `AuthLayout` and `DashboardLayout`, and placeholder routes for every planned page.
- Built the `localStorage` foundation:
  - a storage client that groups multi-key writes and rolls them back on failure
  - schema migrations
  - start-up seeding
  - a generic collection repository

## Phase 2: Authentication and registration (`3f0d441`)

- One preconfigured Admin account, and Candidate self-registration validated with React Hook Form and Zod.
- A single login page that sends each role to its own dashboard, and gives the same generic message for any invalid credentials.
- Sessions that survive a reload and contain no credentials. Passwords are stored as a salted hash, and the role is recalculated each time the session is restored.
- Route guards (`RequireAuth`, `PublicOnly`, `RoleRedirect`) that redirect without loops.

## Phase 3: Admin dashboard and user management (`4546f1b`)

- An Admin dashboard with user counts and a breakdown by role.
- A user list with search and with role and status filters, kept in the URL.
- A user detail page where the Admin can edit the profile, with duplicate-email and reserved-email checks.
- Soft deactivation and reactivation. The Admin account is protected from deactivation.
- Admin-only checks enforced inside the services as well as in the route guards.

## Final MVP: Certification workflow and frontend MVP (`60f8df0`)

The original roadmap had separate phases for the certification engine, form assignment, form submission and the renewal lifecycle. These were delivered together in one pass:

- **Certification engine:** a pure function implementing the 3-year cycle, renewal window, grace period, late renewal on the original schedule, and lapse. The user's role is derived from it.
- **Form assignment:** the Admin assigns the predefined form, with eligibility and duplicate checks. The Admin can also cancel an assignment.
- **Draft, resume and submit:** includes validation, a confirmation before submitting, read-only submitted forms, and a copy of the form and applicant details stored with each submission.
- **Pages:**
  - Candidate and Diplomate dashboards
  - certificate history, showing renewal cycles and submissions
  - submission detail pages
  - an Admin list of all submissions
  - a certification panel on the Admin's user detail page
- **Demo clock:** an Admin-only setting that moves "today", so renewals, grace periods and lapses can be demonstrated.

## Final verification

At commit `60f8df0`:

- `npm test`: **213 / 213 tests passed**
- `npm run typecheck`: passed
- `npm run build`: passed

The tests that exercise the certification rules most directly:

- **Engine unit tests:** every rule, each boundary date, and the agreed 2026 → 2029 → late 2030 → 2032 → 2035 scenario.
- **Service-level workflow tests:** assign → draft → submit → Diplomate → on-time or late renewal → lapse → new certification period.

The full user journey was also run once in a browser as a final smoke test.
