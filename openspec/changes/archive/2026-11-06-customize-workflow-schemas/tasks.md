# Tasks

## 1. Schema model

- [x] 1.1 Add schema types and `src/core/schemas.ts` (discovery, precedence merge, loading, structural validation, cycle detection); verify with `test/schemas.test.ts`.
- [x] 1.2 Add fork, add/remove artifact, dependency editing, and default-schema read/write; verify round-trips and cycle rejection in tests, and verify that the CLI accepts a forked and edited schema (`openspec schema validate`).

## 2. Store and CLI

- [x] 2.1 Load schemas into `WorkspaceState` with default and usage flags, and use the project default for changes without metadata; verify with store tests.
- [x] 2.2 Add `listSchemas`, `validateSchema` and `initSchema` to the CLI bridge; verify argument building and JSON parsing in tests.

## 3. Schemas view and commands

- [x] 3.1 Add the Schemas tree view with schema, artifact, apply and issue items; verify labels, context values and open commands in tests.
- [x] 3.2 Register the schema commands and menus; verify that every declared command is registered and every menu references a declared command (`test/manifest.test.ts`).
- [x] 3.3 Offer the available schemas in the New Change form, default first; verify with `SpecViewerPanel.schemaChoices` tests.
