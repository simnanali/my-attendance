# Attendance Management System

A responsive Angular attendance-tracking application with multi-session
check-in/check-out, daily and monthly reporting, and light/dark themes.
Built in normal-chat phases; full documentation (setup, architecture,
storage design, security limitations, and the future .NET 9 + SQL Server
migration path) is written in Phase 10.

## Status
Phase 1 of 10 — Project Structure. No functional features exist yet.

## Project Structure

```text
attendance-management/
├── server/          Node/Express JSON file-server (built in Phase 2)
├── data/            JSON data files: users, settings, attendance/*.json
└── src/app/
    ├── core/        Models, services, guards — app-wide, framework-agnostic logic
    ├── shared/      Reusable components/directives/pipes (added as needed)
    ├── features/    One folder per feature area (auth, dashboard, attendance, reports, profile)
    └── layout/      Header, sidebar, and the overall app shell
```

## Architecture

```text
Component → Feature Service → Business/Calculation Service → StorageService → JSON Storage Implementation
```

`StorageService` is an interface (see `core/services/storage/storage.service.ts`).
Feature services never touch files or HTTP directly — this is the seam that
lets V1's JSON-file storage be replaced later by a .NET 9 Web API + SQL
Server backend without rewriting feature/business logic.


## Development server ---------------------------------------------------------------------

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
