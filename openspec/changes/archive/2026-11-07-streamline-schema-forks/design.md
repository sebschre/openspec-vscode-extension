# Design

## Context

Forking copies a schema directory and rewrites `name:` (`forkSchema` in `src/core/schemas.ts`). Structured edits use `js-yaml` load/dump, which drops comments in `schema.yaml`. The store merges project, user and built-in locations by name and keeps only the winner's details. Shadowed sources are kept as labels only. The Schemas tree is registered with `registerTreeDataProvider`, so the extension has no handle to reveal items. Schema issues are plain messages with no location.

## Goals / Non-Goals

**Goals:** keep every step of the fork flow in one place, make forks traceable to their source, and keep all new metadata invisible to the OpenSpec CLI.

**Non-Goals:** three-way merging of upstream changes into a fork, deleting or renaming user schemas, and overriding a schema under its own name.

## Decisions

- **Lineage lives in a sidecar file, `<schema>/.forked-from.yaml`** (`schema`, `source`, `version`, `forkedAt`). An extra key in `schema.yaml` would be lost or reordered by the structured edits, would be copied into every CLI fork, and could start failing if the CLI ever validates strictly. The CLI ignores extra files today: `openspec schema validate` passes with the sidecar present. Forking a fork overwrites the copied sidecar with the new source, so lineage always points one level up.
- **The source is resolved by (name, location), not by name alone.** If the fork's name matched its source, the merged list would return the fork itself. The store keeps every scanned location and exposes `resolveSchemaLocation(name, source)`. The "source updated" flag compares the source's current `version` with the recorded one.
- **Compare with Original diffs against the source as it is now.** There is no snapshot of the source at fork time, so after an upstream update the diff mixes the user's edits with upstream changes. That is acceptable for spotting drift and avoids copying a second tree into every project. Files are compared byte for byte. `schema.yaml` always differs by its `name:` line, so for that file only, the comparison ignores the `name:` line when deciding "changed". The diff itself uses `vscode.diff` on the two files, or on an empty untitled document for added or removed files.
- **The fork flow asks about the default with a quick pick after the name.** The option order depends on whether the source is the current default. Escaping the pick cancels the whole fork, so nothing is written half-way. The follow-up notification keeps only "Open schema.yaml".
- **The Schemas view switches to `createTreeView`** and `SchemaItem` gets a stable `id` (`schema:<name>`). `reveal` then works on freshly built items, and the provider's `getParent` returns `undefined` for root items. Commands get the tree view through a small `revealSchema(name)` callback, so the command module doesn't depend on the view.
- **Delete uses `vscode.workspace.fs.delete` with `useTrash: true`**, so a mistaken delete can be recovered. When the deleted schema was the default, `config.yaml` is pointed at the recorded source if it still resolves, otherwise at `spec-driven`. Without this the CLI would fail on the next new change. Active changes that name the schema are listed in the confirmation and left alone, because they are the user's records.
- **Rename is a directory rename plus targeted line edits.** The `name:` line of `schema.yaml`, the `schema:` line of `config.yaml`, and the `schema:` line of each active change's `.openspec.yaml` are edited the same way `writeDefaultSchema` edits `config.yaml`. Only changes whose metadata explicitly names the schema are touched, since changes without metadata follow the default. Archived changes are never rewritten. Sidecars of other project forks whose source is the renamed project schema are updated too.
- **Issue locations are found by text search, not a YAML AST.** `SchemaIssue` gets an optional `artifactId`. A shared `findArtifactLine(text, id)` locates `- id: <id>` (with optional quotes), and `findApplyLine` locates `apply:`. Open Definition and the diagnostics both use these helpers. Unmatched issues go on line 0. Diagnostics are computed from store state on every `change` event, only for `project` and `user` schemas, so built-ins never clutter the Problems panel.

## Risks / Trade-offs

- [The sidecar is a hidden file users may not notice] → it starts with a comment explaining what wrote it. Deleting it only removes the lineage features.
- [Text search can miss unusual YAML layouts, such as flow mappings] → diagnostics fall back to line 0, and Open Definition opens the file at the top.
- [Renaming while a change is being edited elsewhere] → only the single `schema:` line is rewritten, and the store refreshes from disk afterwards.
