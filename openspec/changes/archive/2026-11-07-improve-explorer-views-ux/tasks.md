# Tasks

## 1. Model

- [x] 1.1 Record zero-based heading lines for requirements and scenarios in `parseSpec`; verify in `test/parser.test.ts`.
- [x] 1.2 Compute `pendingChanges` for each living spec in the store from active changes' delta specs; verify in `test/store.test.ts`.

## 2. Active Changes view

- [x] 2.1 Build change artifacts from the change's schema (falling back to the built-in four), with glob-aware presence and inert missing items, and judge completion by the schema's artifacts; verify with a custom-schema fixture.
- [x] 2.2 Expand the specs artifact into delta capabilities with `+ ~ − →` counts that open their files; verify counts and commands.
- [x] 2.3 Expand the tasks artifact into task groups and tasks that open `tasks.md` at the task line, and show the next open task on the change; verify in tests.
- [x] 2.4 Use `change` / `change.complete` context values with inline Validate or Archive, keeping the context menu for both; verify menus in `test/manifest.test.ts`.

## 3. Living Specs view

- [x] 3.1 Make requirements and scenarios open `spec.md` at their heading, fix singular/plural labels and use Markdown tooltips; verify in tests.
- [x] 3.2 Show pending changes on living specs (description, icon tint, Pending changes group opening the change viewer); verify in tests.
- [x] 3.3 Add the `openspec.openSpecFile` command with an inline action on spec items, hidden from the command palette; verify registration and menus.

## 4. Views and empty states

- [x] 4.1 Return no children for empty views and contribute `viewsWelcome` for no root, no changes and no specs, driven by an `openspec.hasRoot` context key; verify the contributions in `test/manifest.test.ts`.
- [x] 4.2 Create both views with `createTreeView` and `showCollapseAll`, and keep the Active Changes badge in sync with the number of changes.
- [x] 4.3 Document the explorer improvements in `docs/marketplace/README.md`.

## 5. Integration

- [x] 5.1 Run `pnpm typecheck`, `pnpm test`, `pnpm build` and `openspec validate improve-explorer-views-ux --strict`; all pass.
