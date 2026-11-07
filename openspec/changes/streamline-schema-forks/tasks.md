# Tasks

## 1. Schema model

- [x] 1.1 Write the `.forked-from.yaml` sidecar in `forkSchema` (overwriting a copied one) and read it into `SchemaDetail.forkedFrom` in `loadSchema`; verify in `test/schemaForks.test.ts`, and verify that `openspec schema validate` accepts a fork that has the sidecar.
- [x] 1.2 Add `findArtifactLine`/`findApplyLine` and attach `artifactId` to artifact-specific issues; verify line lookup (quoted, unquoted, missing) and issue tagging in tests.
- [x] 1.3 Add `compareSchemaDirs` (changed/added/removed files, ignoring the `name:` line of `schema.yaml`); verify in tests.
- [x] 1.4 Add `renameSchema` (directory, `name:`, `config.yaml` default, explicit change metadata, sibling sidecars) and the shared `setSchemaLine` helper; verify in tests that archived changes and changes without metadata are untouched.

## 2. Store

- [x] 2.1 Keep every scanned schema location and add `resolveSchemaLocation(name, source)`, then set `forkedFrom.updated` when the source has a higher version; verify with store tests, including a fork named like its source.

## 3. Commands, view and diagnostics

- [x] 3.1 Rework the fork flow: default quick pick (ordered by whether the source is the default, Escape cancels), reveal through `createTreeView` with stable ids, and an "Open schema.yaml" follow-up; verify the option ordering and item ids in tests.
- [x] 3.2 Show "forked from" and "source updated" on schema items and add Compare with Original; verify descriptions, context values and the command's registration in tests.
- [x] 3.3 Add Delete (to trash, default repair) and Rename commands for project schemas; verify the default-repair choice in tests and the menus in `test/manifest.test.ts`.
- [x] 3.4 Add Open Definition for artifacts and the apply phase; verify its registration and menu placement in `test/manifest.test.ts`.
- [x] 3.5 Publish schema diagnostics for project and user schemas on every store change; verify ranges, filtering and clearing with a mock diagnostic collection.
- [x] 3.6 Document the new schema actions in `docs/marketplace/README.md` and check that every documented command exists in `package.json`.

## 4. Integration

- [x] 4.1 Run `pnpm typecheck`, `pnpm test`, `pnpm build` and `openspec validate streamline-schema-forks --strict`; all pass.

## Workflow follow-up

- Archive the change with `openspec archive streamline-schema-forks` once it has been reviewed and merged.
