# Certificate Management System

A frontend-only Certificate Management System with three roles: **Admin**, **Candidate** and **Diplomate**. Admins assign certificate forms. Candidates and Diplomates fill them in, save drafts and submit them. The app tracks 3-year renewal cycles with a grace period.

> **Status:** Phase 1 (project setup and design system). Routes render placeholders, and features are added phase by phase. See [Roadmap](#roadmap).

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

_To be added in Phase 2._

## Limitations

This is a frontend-only demo. All data, including credentials, lives in the browser's `localStorage`. It is **not secure** and is not meant for production use.
