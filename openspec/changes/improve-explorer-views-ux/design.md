# Design

## Context

`ChangesTreeProvider` builds four fixed artifact children per change. `SpecsTreeProvider` builds spec, requirement and scenario items, but only spec items have a command. Both views are registered with `registerTreeDataProvider`, so the extension has no `TreeView` handle for badges. The store loads schemas with their `artifacts` (`id`, `generates`) and changes with parsed delta specs and tasks. The parser records the line of each task but not of requirements or scenarios.

## Goals / Non-Goals

**Goals:** make each tree item either useful to click or clearly inert, show the next step of a change, and connect living specs to the changes that will modify them.

**Non-Goals:** new webview features, filter or sort settings, and a full artifact status model (that belongs to the CLI's `openspec status`).

## Decisions

- **Artifacts come from the change's schema.** The provider looks up `store.getSchema(change.schema)`. When the schema has artifacts, it uses them in order; otherwise it falls back to the built-in four (proposal, specs, design, tasks). Presence is checked against `generates`: a glob (contains `*`) counts as present when the directory before the first glob segment contains a matching file, otherwise the file must exist. The known ids `specs` and `tasks` get the expandable children; others are plain file items. This keeps custom schemas readable without parsing their templates.
- **Missing artifacts have no command.** They show a `circle-large-outline` icon, the description "missing" and a tooltip naming the file to create. Opening a missing file would create an empty unsaved editor at a path users didn't choose.
- **Delta counts use the existing parsed operations.** Each delta spec child shows `+N ~N −N` (and `→N` for renames) built from `RequirementItem.operation`, omitting zero counts.
- **Task groups come from `TaskItem.group`.** Groups keep file order. Each group item shows `done/total` and expands to its tasks, which open `tasks.md` at the task's line. The next task is the first incomplete task in file order.
- **Inline actions are switched by context value.** Change items use `change` or `change.complete`. Existing context menu entries move to a regex (`viewItem =~ /^change/`) so both values keep them; inline Archive shows for `change.complete`, inline Validate for `change`.
- **Welcome views use `viewsWelcome`.** VS Code shows them only when the provider returns no children, so the providers return `[]` for empty states instead of info items. `when` clauses use a context key `openspec.hasRoot`, set by the extension on every store change, to choose between "no openspec folder" and "no changes / no specs".
- **Badge and Collapse All need `createTreeView`.** The extension creates both views with `showCollapseAll: true` and updates `changesView.badge` on store changes (cleared when there are no changes).
- **Heading lines are recorded by the parser.** `RequirementItem.lineIndex` and `ScenarioItem.lineIndex` are optional zero-based lines, set by `parseSpec`. Clicking opens the file with `vscode.open` and a `selection` range at that line. Items without a line or file path stay inert.
- **Pending changes are computed in the store.** `SpecDetail.pendingChanges` lists the names of active changes with a delta spec of the same capability path. The tree tints the `book` icon with `charts.yellow`, adds "· N pending" to the description, and adds a "Pending changes" group whose children open the change in the viewer.
- **A new `openspec.openSpecFile` command** opens the spec file of a spec item; it is hidden from the command palette because it needs an item.

## Risks / Trade-offs

- [Custom artifacts with unusual `generates` patterns] → presence falls back to "missing" and the file is never opened, so the worst case is a wrong label, not a broken action.
- [Badge API needs VS Code 1.72+] → the extension already requires 1.84.
- [Returning `[]` for empty views hides the old info items in tests and older hosts] → `viewsWelcome` has existed since 1.40, and the welcome text covers both cases.
