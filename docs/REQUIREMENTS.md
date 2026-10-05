# Requirements

This is the summary of the agreed requirements for the Certificate Management System and how the application implements them. It is a frontend-only application: all data is stored in the browser's `localStorage`.

## Roles

| Role      | How a user gets it                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| Admin     | A single preconfigured demo account (`src/config/admin.ts`). Admins cannot register.                        |
| Candidate | Every newly registered user starts here. A user also returns here after their certification lapses.         |
| Diplomate | Gained by submitting the initial certificate application, and kept for as long as certification is current. |

A registered user's role is **derived** from their submissions and the current date. It is never stored and never set by hand.

## Registration and login

- Candidates register with first name, last name, date of birth, email and password.
- **Confirm password** is a form-only check. It is never stored.
- Validation rules:
  - All fields are required.
  - The email must be in a valid format.
  - The date of birth must be a real calendar date in the past. No minimum age applies.
  - The password must be at least 8 characters and contain a letter and a digit.
- Emails are normalized (trimmed, lower-cased) and must be unique, ignoring case. The Admin email is reserved.
- No one can register as an Admin or a Diplomate.
- One login page serves all roles, and each role lands on its own dashboard (`/admin/dashboard`, `/candidate/dashboard`, `/diplomate/dashboard`).
- Invalid credentials always produce the same message, so the page never reveals whether an email is registered.
- Sessions survive a page reload. Logging out clears the session. Passwords are stored only as a salted hash.
- Route guards send signed-out visitors to `/login` and send users who open another role's area back to their own dashboard.

## Admin user management

- The Admin dashboard shows the number of active Candidates, active Diplomates, total active users and inactive users, plus a breakdown by role.
- The user list shows name, email, date of birth, role, registration date and status. It can be searched by name or email and filtered by role and by active/inactive status.
- The Admin can edit a user's first name, last name, date of birth and email, using the same validation as registration. The Admin cannot edit a user's password, ID or role.
- **Deactivation is a soft delete** (`deletedAt`). A confirmation is required, and records are never removed. A deactivated user can be reactivated. A deactivated user cannot sign in, and any existing session they have is rejected the next time it is checked.
- The Admin account can never be deactivated.

## Certificate form

- There is a single **predefined, reusable** form, used for both the initial application and every renewal. There is no form builder.
- Fields:
  - Certificate Number
  - Course Valid From
  - Course Valid To
  - Specialty
  - Years of Practice
  - Institution
  - Qualification
  - A required declaration checkbox
- Course Valid To must be later than Course Valid From.
- The applicant's name, email and date of birth come from their profile.

## Assignment, drafts and submission

- The **Admin assigns** the form to a user:
  - an **initial application** to a Candidate, including a Candidate whose certification has lapsed;
  - a **renewal** to a Diplomate, but only once a renewal is open.
- A user can have at most one open assignment at a time. The Admin can cancel an open assignment, and the cancelled record is kept.
- The user sees assigned forms on their dashboard. They can save a draft, leave, and resume later.
- A form can only be submitted when every required field is complete. Submitted forms are read-only.
- Each submission stores a copy of the form and of the applicant's details, so later changes to either don't alter the history.

## Certification rules

These rules are confirmed. The engine that applies them is `src/domain/certification/engine.ts`.

1. A Candidate becomes a Diplomate when their initial application is submitted. That date starts the certification period.
2. A renewal is due every **3 years** from the start date (renewal _n_ is due at start + 3·_n_ years).
3. If a renewal is missed, the **grace period** runs until the next due date, and the user **remains a Diplomate** throughout.
4. A **late renewal** submitted during the grace period counts for the cycle it was due in. It **keeps the original schedule**: later due dates do not move.
5. If the grace period ends without a renewal, the user **reverts to Candidate**. A new initial application then starts a new certification period.
6. Historical submissions are never deleted or changed, whatever happens to the user's status.

### Renewal window (provisional)

The on-time renewal window opens **90 days** before each due date. **This value is provisional and configurable.** It was not part of the confirmed requirements and is defined only as `RENEWAL_WINDOW_DAYS` in `src/config/constants.ts`. The confirmed rules above are tested with more than one window size, to show they don't depend on the value.

### Date handling

- On a renewal's due date the renewal is already late, and on the grace-end date the user has already lapsed.
- A Feb 29 start date falls on Feb 28 in years that are not leap years.
- If two renewals are outstanding at once, the oldest is completed first. Each submission counts for exactly one cycle.

## Demo support

Admins have a **demo clock** (`/admin/settings`) that shifts "today" so renewal windows, grace periods and lapses can be demonstrated. A top-bar badge shows whenever the demo clock is active.
