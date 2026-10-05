# AI Development Notes

## How AI was used

This project was developed with an AI coding assistant (Claude Code), working under the developer's direction. The developer set the requirements, constraints and scope of each phase, and reviewed and approved every phase before it was committed. The assistant planned the work, wrote the code and tests, ran the verification commands, and reported results and open questions.

This document summarizes the key prompts and decisions. It is not a full transcript.

## Development workflow

1. **Planning first.** The first request asked for a technical plan with no code: architecture, data models, routing, persistence, phases, acceptance criteria and risks. Business rules that were unclear had to be listed explicitly, not assumed.
2. **Corrections to the plan.** The developer reviewed the plan and corrected it before approving:
   - The 90-day renewal window was made a **provisional, configurable** value, not a fixed rule.
   - No minimum age was to be enforced at registration.
   - The form fields were set to Certificate Number, Course Valid From and Course Valid To, plus the professional, education and declaration fields.
   - A specific renewal test scenario became mandatory (2026 → 2029 → late 2030 → 2032 → 2035).
   - Strict phase discipline was required: each phase had to build, pass its tests and be manually verified before the next began.
3. **Phased delivery.** Phases 1–3 were delivered one at a time, each with tests, a browser check and a written report. Each was committed only after explicit approval.
4. **Combined MVP pass.** The developer then chose to deliver the remaining workflow (certification engine, assignment, submission, renewal and lapse) in one focused pass, with tests concentrated on the certification rules and the state changes between them.

## Key architectural decisions

| Decision                                                                                                 | Rationale                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **React + TypeScript + Vite** (strict TS), Tailwind CSS + shadcn/ui, React Router, React Hook Form + Zod | The required stack. No other UI frameworks were added.                                                                                                                                                                                        |
| **No backend or API**                                                                                    | The application had to be frontend-only. All persistence goes through `localStorage`.                                                                                                                                                         |
| **`localStorage` repository layer**                                                                      | A single storage client (namespaced keys, schema migrations, grouped writes) sits underneath typed collection repositories. React components never touch `localStorage` directly.                                                             |
| **Service and domain separation**                                                                        | Layering is pages → hooks → services → repositories → storage. Services are async and REST-shaped, so they could later be replaced by HTTP calls without changing the UI. Services also enforce authorization themselves, as a backend would. |
| **Certification engine outside React**                                                                   | `src/domain/certification/engine.ts` is a pure function of the user's submissions and today's date. This makes the rules fully unit-testable.                                                                                                 |
| **Role derived from certification state**                                                                | Candidate or Diplomate is calculated from submissions every time, never stored. This avoids stored roles drifting out of date and makes a lapse automatic.                                                                                    |
| **Predefined form, not a form builder**                                                                  | One versioned form definition is stored as data. Validation is generated from it, and each submission stores a copy of it.                                                                                                                    |
| **Append-only history**                                                                                  | Submissions can only be added, never changed or deleted. Users are soft-deactivated, never deleted.                                                                                                                                           |
| **Demo clock**                                                                                           | Lets examiners see renewal, grace and lapse behavior without waiting years. Only the Admin can change it.                                                                                                                                     |

## Assumptions

The plan listed these as open business questions. Each was implemented with the stated default:

- The on-time renewal window opens **90 days before the due date**. This is provisional, and changed only through `RENEWAL_WINDOW_DAYS`.
- The **Admin assigns** renewal forms manually; the system works out which cycle each assignment covers.
- A user has at most **one open assignment** at a time.
- Each submission counts for **exactly one cycle**, and outstanding renewals are completed oldest first.
- On a due date the renewal is already late; on the grace-end date the user has already lapsed.
- A Feb 29 start date falls on Feb 28 in non-leap years.
- After a lapse, a new initial application starts a **new certification period**. The old period stays in the history.
- Admin "delete" is a **soft deactivation**. A deactivated user's email remains reserved.
- Certificate Number uniqueness is not enforced. Course Valid From/To are validated as form data only and do not affect the renewal schedule.

## Limitations

- **No real security.** Credentials, sessions and data live in the browser. The demo Admin password ships in the JavaScript bundle, and anyone with access to the browser can edit `localStorage`. Route guards protect only the user interface.
- **Demo-grade password hashing.** Passwords use salted SHA-256, which is not suitable for production.
- **No server-side processing.** The role is recalculated when data is read; nothing runs in the background.
- **Two pages remain placeholders:** the Admin form-template preview (`/admin/forms`) and the member profile page (`/profile`).
- **Limited automated UI coverage.** The certification UI has no automated UI tests; the engine, form validation and service workflow do have automated tests.
- **Bundle size.** The production build warns that the main JavaScript bundle is larger than 500 kB.
- **Dependency audit.** `npm audit` reports issues in the `shadcn` CLI package. None of its code is shipped to the browser.
