# Certificate Management System

A frontend-only Certificate Management System with three roles: **Admin**, **Candidate** and **Diplomate**. Admins assign certificate forms. Candidates and Diplomates fill them in, save drafts and submit them. The app tracks 3-year renewal cycles with a grace period.

> **Status:** Phase 2 (authentication and registration) is awaiting review. Pages not yet built render placeholders. See [Roadmap](#roadmap).

## Tech stack

| Concern          | Choice                                          |
| ---------------- | ----------------------------------------------- |
| Build / language | Vite, React 19, TypeScript (strict)             |
| Styling / UI     | Tailwind CSS v4, shadcn/ui (Radix, Nova preset) |
| Routing          | React Router DOM v7                             |
| Global state     | React Context API (authentication only)         |
| Forms            | React Hook Form + Zod _(from Phase 2)_          |
| Persistence      | `localStorage` (mock backend)                   |
| Tooling          | ESLint, Prettier, Vitest                        |

## Getting started

Requires Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Script              | Purpose                                     |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Start the dev server                        |
| `npm run build`     | Type-check and build for production         |
| `npm run preview`   | Serve the production build                  |
| `npm run typecheck` | Run the TypeScript compiler (no emit)       |
| `npm run lint`      | Lint with ESLint (`lint:fix` to auto-fix)   |
| `npm run format`    | Format with Prettier (`format:check` in CI) |
| `npm test`          | Run unit tests once (`test:watch` to watch) |

## Project structure

```
src/
├── app/            # App root, route tree, router
├── config/         # Route constants and per-area navigation
├── components/
│   ├── ui/         # shadcn/ui primitives (generated, extended with app variants)
│   ├── layout/     # AuthLayout, DashboardLayout, Sidebar, Topbar
│   └── common/     # Design-system composites: FormField, LoadingIndicator, PageHeader…
├── domain/         # Pure business logic, no React or storage (from later phases)
├── services/
│   ├── storage/      # localStorage client, keys, migrations, bootstrap/seeding
│   └── repositories/ # Generic collection repository over the storage client
├── features/       # Feature modules: auth, users, forms, assignments, submissions…
├── hooks/          # Shared React hooks
├── lib/            # Framework-free helpers (cn, AppError)
├── pages/          # App-level pages (403, 404, storage error, design system)
└── types/          # Shared domain types
```

Layering rule: **pages → hooks → services → repositories → storage**. Components never touch `localStorage` directly, and business rules live in services and `domain/`.

## Design system

Primitives come from shadcn/ui (`src/components/ui`). App-level composites live in `src/components/common`. Colors are theme tokens in `src/index.css`: a brand `primary` plus semantic `success`, `warning`, `info` and `destructive`, each with dark-mode values.

| Component          | Notes                                                                           |
| ------------------ | ------------------------------------------------------------------------------- |
| `Button`           | `primary`, `secondary`, `outline`, `destructive`, `ghost`, `link`, plus sizes   |
| `Input`            | shadcn input; shows its invalid state through `aria-invalid`                    |
| `FormField`        | Label, control, description and error, with `id`/`aria-*` wired via render prop |
| `Card`             | shadcn card (`default` / `sm` sizes)                                            |
| `Badge`, `Alert`   | Neutral plus `info`, `success`, `warning`, `destructive` variants               |
| `PageHeader`       | Title, description and an actions slot                                          |
| `LoadingIndicator` | Accessible `role="status"` spinner; inline, block or full-page                  |

In development, open **`/design-system`** to see every component. The route is not included in production builds.

## Persistence

All data lives in `localStorage` under the `cms:` prefix, accessed only through `src/services/storage`:

- **`storageClient`**: typed `read`/`write`/`remove`/`has`, plus `transaction` for multi-key writes with rollback. Corrupt data raises `STORAGE_CORRUPTED` and is never silently overwritten. A full disk raises `STORAGE_FULL`.
- **`migrations`**: `cms:meta` records the schema version, and versioned migrations upgrade old data on start-up.
- **`bootstrap`**: runs migrations, then seeds mock data for keys that don't exist yet (it never overwrites). If start-up fails, the app shows a recovery screen.
- **`defineCollection`** (`services/repositories`): generic CRUD over one stored array, usable inside transactions.

If `localStorage` is unavailable (for example, in some private-browsing modes), the app falls back to in-memory storage.

## Routes

| Path                                                     | Area      | Implemented in |
| -------------------------------------------------------- | --------- | -------------- |
| `/login`, `/register`                                    | Public    | Phase 2        |
| `/admin` → `/admin/dashboard`                            | Admin     | Phase 3        |
| `/admin/users`, `/admin/users/:userId`                   | Admin     | Phase 3        |
| `/admin/forms`                                           | Admin     | Phase 5        |
| `/admin/settings`                                        | Admin     | Phase 7        |
| `/admin/submissions`, `/admin/submissions/:submissionId` | Admin     | Phase 6        |
| `/candidate/dashboard`                                   | Candidate | Phase 2        |
| `/diplomate/dashboard`                                   | Diplomate | Phase 2        |
| `/profile`                                               | Member    | Phase 2        |
| `/forms/:assignmentId`                                   | Member    | Phase 6        |
| `/history`, `/history/:submissionId`                     | Member    | Phase 7        |
| `/403`, `*` (404)                                        | —         | Done           |

## Roadmap

- [x] **Phase 1:** Project Setup and Design System _(complete; includes the initial scaffold)_
- [ ] **Phase 2:** Authentication and Registration
- [ ] **Phase 3:** Admin Dashboard and User Management
- [ ] **Phase 4:** Certification Engine: lifecycle rules, date calculations, grace periods, status transitions, unit tests
- [ ] **Phase 5:** Form Assignment
- [ ] **Phase 6:** Form Submission
- [ ] **Phase 7:** Certificate Renewal Lifecycle
- [ ] **Phase 8:** Polish, Testing, and Delivery

## Business rules

_To be documented in Phase 4 (Certification Engine), covering the confirmed rules and the provisional assumptions._

## Demo credentials

| Role      | How to sign in                                                        |
| --------- | --------------------------------------------------------------------- |
| Admin     | `admin@cms.local` / `Admin@123` (preconfigured; cannot be registered) |
| Candidate | Register at `/register`, then sign in with your own credentials       |

The Admin account is defined in exactly one place: [`src/config/admin.ts`](src/config/admin.ts). The login page reads its hint from there.

## Authentication

- **One login page for all roles.** After sign-in, each role goes to its own dashboard (`/admin/dashboard`, `/candidate/dashboard`, `/diplomate/dashboard`).
- **Registration creates Candidates only.** The service rejects any extra field such as `role`, and the form has no role selector. Emails are normalized (trimmed, lower-cased) and must be unique. The admin email is reserved.
- **Roles are derived, never stored.** Until the Certification Engine (Phase 4), every registered user is a Candidate (`src/services/userRole.ts`).
- **Sessions** are stored at `cms:session` as `{ actorId, role, issuedAt }`, with no credentials. The session is re-checked on every load, and the role is re-derived. Signing in or out in one tab updates the others.
- **Passwords** are stored as a salted SHA-256 hash, never as plaintext. The confirm-password field exists only in the form.
- **Route guards:** `RequireAuth` sends signed-out visitors to `/login` and users of the wrong role to their own dashboard. `PublicOnly` sends signed-in users away from `/login` and `/register`.
- **REST-ready:** pages use `useAuth()`, which calls the `AuthService` interface (`src/features/auth/authService.ts`). A REST implementation can replace it without UI changes.

## Limitations

This is a frontend-only demo. All data lives in the browser's `localStorage`. It is **not secure** and is not meant for production use:

- The Admin password ships in the JavaScript bundle.
- Anyone with access to the browser can edit `localStorage`, including forging an Admin session. Route guards protect the user experience, not the data.
- Salted SHA-256 is a fast hash. Real systems use a server with bcrypt or argon2.
