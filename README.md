# Attendance Management System

A responsive Angular attendance-tracking application with multi-session
check-in/check-out, daily and monthly reporting, holiday/weekoff/attendance-rule
configuration, attendance status classification, a live dashboard, and
light/dark themes. Built incrementally in phases via chat, with a JSON-file
storage architecture designed to migrate cleanly to a .NET 9 Web API + SQL
Server backend later without rewriting feature/business logic.

## Status

Phases 0–8B complete. Outstanding: a dedicated formal testing/error-handling
pass (originally scoped Phase 9) beyond the Phase 8B service-level specs
already in place, and this README itself will be finalized further in a
dedicated documentation phase if one is run.

## Technology

- Angular (standalone components, no NgModules), TypeScript, SCSS
- RxJS + Angular Signals (component-level UI state uses `signal()`/`computed()`
  rather than plain class properties — see "A Note on Signals" below)
- Reactive Forms
- Node.js + Express (a minimal JSON file-reading/writing helper — not a
  business-logic API; see "Storage Architecture")
- No charting library, no UI component library, no CSS framework — bar charts
  and progress bars are hand-rolled SVG/CSS using the app's own design tokens

## Why a Node/Express Helper Exists

A browser-only Angular app cannot write files to disk. To satisfy the
requirement of separate, inspectable JSON files under `data/` (rather than
`localStorage`), a small Node/Express process does nothing but read and write
those files on Angular's behalf over HTTP. It contains **no business logic** —
no password checking, no attendance rules, no validation beyond a couple of
narrow defensive checks (see "Security" below). All business logic lives in
Angular's service layer, which is what keeps a future backend swap clean.

## Installation & Running

Two processes must run simultaneously in development.

**Terminal 1 — JSON file-server:**
```bash
cd server
npm install
npm start
```
Runs on `http://localhost:3000`.

**Terminal 2 — Angular app:**
```bash
npm install
ng serve
```
Runs on `http://localhost:4200`.

## Project Structure

```text
attendance-management/
├── server/                     Node/Express JSON file-server (file I/O + password hashing only)
│   └── routes/                 One route file per resource (users, attendance, holidays, weekoffs, attendance-rules, auth, ids)
├── data/                       All persisted JSON data
│   ├── users.json
│   ├── settings.json
│   ├── counters.json           ID-generation counters (USR-/ATD-/SES-/HOL-)
│   ├── holidays.json
│   ├── weekoffs.json
│   ├── attendance-rules.json
│   └── attendance/
│       └── YYYY-MM.json        One file per calendar month, all users' data for that month
└── src/app/
    ├── core/
    │   ├── models/              TypeScript interfaces for every data shape
    │   ├── guards/               authGuard (functional CanActivateFn)
    │   ├── services/             Feature + business/calculation + storage services
    │   └── utils/                 Pure validators, API base URL constant
    ├── shared/components/         Reusable UI (bar chart, toast)
    ├── features/                  auth/login, auth/register, dashboard, attendance,
    │                              daily-report, monthly-report, holidays, weekoff,
    │                              attendance-rules, profile
    └── layout/                    header, sidebar, footer, app-layout (the authenticated shell)
```

## Architecture

```text
Component → Feature Service → Business/Calculation Service → StorageService (interface) → JsonFileStorageService → HTTP → Node/Express → data/*.json
```

`StorageService` (`core/services/storage/storage.service.ts`) is the only
persistence seam any feature service depends on. Swapping the JSON-file
architecture for a .NET 9 Web API + SQL Server backend means writing one new
`ApiService implements StorageService` — no component, feature service, or
calculation service needs to change.

## A Note on Signals

Component-level loading/processing/error/form UI state uses Angular's
`signal()`/`computed()` rather than plain class properties, project-wide,
starting from the Daily Report phase onward (and retrofitted into
earlier-built pages). This was adopted after confirming the project's
Angular 22 + zone.js 0.16.3 combination does not reliably trigger change
detection after async work — signals sidestep this since they don't depend
on NgZone patching. Feature services (`AttendanceService`, `AuthService`)
still expose their state as RxJS Observables; components bridge to signals
via `toSignal()` where needed.

## Data Model & Storage

| File | Shape | Notes |
|---|---|---|
| `data/users.json` | `{ users: User[] }` | `id` format `USR-000001`; `passwordHash` is bcrypt, never plaintext |
| `data/settings.json` | `{ theme: 'light' \| 'dark' }` | Managed by `ThemeService` |
| `data/counters.json` | `{ nextUserId, nextAttendanceDayId, nextSessionId, nextHolidayId }` | Backs ID generation; server-owned |
| `data/attendance/YYYY-MM.json` | `{ year, month, attendance: AttendanceDay[] }` | One file per month, holds every user's days for that month; `AttendanceDay.userId` scopes ownership |
| `data/holidays.json` | `{ holidays: Holiday[] }` | `id` format `HOL-000001`; `day` auto-derived from `date`, never entered manually |
| `data/weekoffs.json` | `{ weekoffs: WeekoffDay[] }` | Always exactly 7 entries, keyed by `dayOfWeek` (0=Sunday..6=Saturday, JS `Date.getDay()` convention) |
| `data/attendance-rules.json` | `{ attendanceRules: { standardWorkingMinutes, fullDayThresholdMinutes, halfDayThresholdMinutes } }` | Stored in minutes, not decimal hours, to avoid rounding issues |

IDs are never array indexes — every entity gets a generated, prefixed ID
(`USR-`, `ATD-`, `SES-`, `HOL-`) via `IdGeneratorService` → a shared counter
file on the server.

## Authentication

- Registration: Full Name, Email, Username, Password, Confirm Password.
  Both username and email must be unique (case-insensitive).
- Passwords are hashed with `bcryptjs` **on the Node/Express server**, never
  in the browser — genuine salted hashing, not client-side obfuscation.
- Login errors are intentionally generic ("Invalid username or password")
  for both a wrong password and a nonexistent username, to avoid username
  enumeration.
- Session state (which user is logged in) is kept in `localStorage` as a
  client-side convenience — this is a session marker, not a replacement for
  the JSON-file data architecture, which is unrelated.
- `authGuard` (functional, `CanActivateFn`) is applied once to the shared
  authenticated layout route, protecting all child routes (Dashboard,
  Attendance, Daily Report, Monthly Report, Holiday, Weekoff, Attendance
  Rules, Profile) without per-route duplication.

## Attendance

- Check-in/check-out always use the current real browser date/time — a
  date being *viewed* in a report never controls what gets recorded.
- State machine (Check In → Check Out → Check In → Check Out...) is
  enforced in `AttendanceService`, using freshly-fetched data on every call,
  not cached UI state. Invalid transitions (double check-in, check-out
  without an active check-in) are rejected with clear errors.
  The state machine is scoped to **today only** — an unclosed session from
  a previous day never blocks today's check-in; that prior day's open
  session simply stays visible as unresolved (attendance is immutable for
  normal users, so it can't be retroactively closed in V1).
- Multiple sessions per day are supported. Total working time is **always**
  the sum of each completed session's own duration — never
  `lastCheckOut - firstCheckIn`. This rule is implemented in exactly one
  place, `AttendanceCalculationService`, and reused everywhere (Attendance
  page, Daily Report, Monthly Report, Dashboard, charts).
- An open session (`checkOut: null`) displays as "In Progress" with a live,
  ticking duration; it's excluded from finalized totals until completed.
- Attendance is immutable for normal users — no edit/delete. The
  architecture (separate calculation/storage layers) leaves room for a
  future admin-correction feature without restructuring.
- Every attendance read/write is scoped by the current user's `userId`,
  enforced at the service layer — a user can never see another user's data,
  even though a monthly file holds every user's entries together.

## Reports

- **Daily Report:** date picker + Prev/Next (view-only; never affects
  check-in/out), showing first check-in, last check-out, total sessions,
  total working hours, a per-session table, and (since Phase 8B) an
  Attendance Status badge — hidden on days with zero sessions, to avoid a
  misleading "Absent" label on an empty day. Future dates are disabled
  (attendance can't exist ahead of today).
- **Monthly Report:** month/year selectors + Prev/Next, per-day rows (date,
  first in, last out, sessions, hours), a monthly summary (working days,
  total sessions, total hours, average/day), and a bar chart of working
  hours by day. Month/year boundaries (Dec↔Jan, year rollover) are handled
  by `DateTimeService`.

## Holiday, Weekoff & Attendance Rules (Phase 8B)

- **Holidays** (`/holidays`): full CRUD, `Day` auto-derived from `Date`
  (never entered manually), duplicate dates on the same day rejected,
  filterable by year (required) plus optional type/name search.
- **Weekoff** (`/weekoff`): a single global (not per-user) day-of-week
  configuration — default Monday–Friday working, Saturday/Sunday weekoff —
  toggled per day and saved as one unit.
- **Attendance Rules** (`/attendance-rules`): configurable Standard Working
  Minutes (the *target*, default 8h), Full Day Threshold (default 6h), and
  Half Day Threshold (default 4h). Validated (client-side for immediate
  feedback, server-side as a defensive backstop) to require
  `Standard > Full Day > Half Day > 0`.
- **Attendance Status:** `>= Full Day Threshold` → Full Day;
  `>= Half Day Threshold and < Full Day Threshold` → Half Day; otherwise →
  Absent. Computed live from current rules everywhere it's shown (Dashboard,
  Daily Report) — a later change to the thresholds is **not** retroactively
  stamped onto stored attendance records (the raw session data never
  changes), but a past day's *displayed* status will reflect whichever
  rules are active when you view it, since status isn't stored, only
  computed. Leave Planner, Leave Balance, and any Admin/Role system are
  explicitly out of scope for this phase.

## Dashboard

Live current date/time, a prominent Check In/Check Out button driven by
actual attendance state, today's session timeline, KPI cards (today's
hours/sessions/first check-in/status), a "Today's Progress" widget (bar
capped visually at 100% even if the actual worked time exceeds the target,
remaining-time-or-"Target Completed", status badge, threshold markers), an
informational Holiday/Weekoff indicator (never treated as an absence), and
a monthly summary + chart.

## Dark Mode

`ThemeService` owns theme state end-to-end: toggle, persistence (via the
same JSON-file `StorageService` used for everything else — `data/settings.json`,
not `localStorage`), applying a `data-theme` attribute to `<html>`, and
initialization before the app renders (via `provideAppInitializer`, to avoid
a light-then-dark flash). All colors are CSS custom properties in
`src/styles/_tokens.scss`, including dark-mode-adjusted status colors
(success/warning/danger) for adequate contrast against dark surfaces. A
global `color-scheme` CSS property ensures native browser controls
(date pickers, `<select>` dropdowns, number spinners) also render with a
dark palette — a real limitation remains that a native `<select>`'s open
dropdown *popup* is rendered by the OS on some platforms and can't be fully
re-skinned via CSS.

## Accessibility

Semantic HTML, visible `:focus-visible` keyboard focus rings app-wide,
44px-minimum touch targets, `aria-invalid`/`aria-describedby` linking form
errors to their inputs, `role="alert"` on error messages, `role="status"`/
`aria-live="polite"` on loading states, `aria-current="page"` on the active
sidebar link, `aria-expanded`/`aria-controls` on the mobile hamburger, and
`prefers-reduced-motion` handling for all transitions/animations.

## Testing

Service/logic-level unit tests exist (Jasmine/Karma, via `ng test`) for:
Holiday CRUD and duplicate-date rejection, Weekoff default configuration
and date-based lookup, Attendance Rule validation, and Attendance Status/
Progress calculation across all documented worked examples (including the
100%-cap-when-exceeding-target case). Full-app regression coverage
(authentication flows, the attendance state machine, report navigation)
has not yet been written as formal specs — the app has been manually
verified phase-by-phase throughout development instead.

## Known Limitations

- **Client-side-only security.** `authGuard` and all user-isolation logic
  run in the browser. There is no server-side session validation or
  authorization in V1 — anyone who can reach `http://localhost:3000`
  directly can read/write any JSON file, bypassing the Angular app
  entirely. This is a fundamental limitation of a client-only architecture,
  closed only by the future .NET Web API migration.
- **Password hashing is real but not a complete security story.** Bcrypt
  hashing happens server-side (not client-side obfuscation), but there's no
  session token validation, no rate limiting, and no account lockout on
  repeated failed logins.
- **No concurrency control.** JSON-file writes have no locking or
  transactions; simultaneous writes to the same monthly attendance file
  (e.g. two browser tabs) can race. Fine for single-operator development
  use, not for real multi-user production traffic.
- **No historical rule-versioning.** Attendance Rule changes apply
  immediately to all live calculations, including when you look back at a
  past day's status — the underlying session data is never rewritten, but
  the *displayed* status for a past day isn't frozen at the time it was
  earned. A future "rule-effective-dates" feature would be needed to change
  this.
- **Native `<select>` dropdown popups** can't be fully re-skinned via CSS on
  every browser/OS combination, even with `color-scheme` applied.
- **No Leave Planner, Leave Balance, or Admin/Role system** yet — explicitly
  out of scope through Phase 8B, though the architecture (separate
  services, separate JSON files, pure calculation methods) is intended to
  accommodate them later without a rewrite.

## Future Migration to .NET 9 Web API + SQL Server

```text
Today:    Angular → StorageService → JsonFileStorageService → Node/Express → JSON files
Future:   Angular → StorageService → ApiService              → .NET 9 Web API → SQL Server
```

A new `ApiService implements StorageService` is the only piece that needs
to be written — every component, feature service, and calculation service
is unaffected. The future API would additionally absorb: server-side
password hashing (BCrypt.Net), real session/token validation, real
server-enforced authorization (a user can only ever query their own data,
verified server-side rather than trusted from the client), transactional
writes, and relational integrity (`Users.Id` as a real foreign key from
`AttendanceDays`, `Holidays`, etc., rather than a loose string match in a
JSON file). SQL tables would mirror the current TypeScript models closely:
`Users`, `AttendanceDays`, `AttendanceSessions`, `Holidays`, `Weekoffs`,
`AttendanceRules`.
