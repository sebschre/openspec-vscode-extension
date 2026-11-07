# Proposal

## Why

Customizing a schema works, but the steps around the fork take effort. The "make it the default" choice appears in a notification that is easy to miss. The new fork isn't selected in the tree. A fork doesn't remember which schema it came from, so you can't see what you changed or notice when the original moves on. Removing or renaming a fork means going to the file explorer and fixing references by hand. Artifact instructions in `schema.yaml` are hard to reach from the tree, and schema problems only show in the Schemas view, not where you edit.

## What Changes

- **Default choice inside the fork flow**: after naming the copy, the user picks whether new changes should use it. The "Use for new changes" option comes first when the source is the current default.
- **Reveal the new fork**: the new schema is selected and expanded in the Schemas view.
- **Fork lineage**: a fork records its source schema (name, location, version). The tree shows "forked from …", flags when the source has a newer version, and offers **Compare with Original** to diff any changed file against the source.
- **Delete and Rename** for project schemas. Delete moves the folder to the trash and repairs the project default. Rename updates the default and the active changes that name the schema.
- **Open artifact definition**: an action on artifacts and the apply phase opens `schema.yaml` at that entry, for editing instructions and descriptions.
- **Problems panel**: structural issues in project and user schemas are reported as diagnostics on `schema.yaml`, placed on the related artifact where possible.

Out of scope: forking under the source's name to override it (held back for safety), and automatic forking when editing a built-in schema.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `schema-customization`: the fork flow, fork lineage and comparison, deleting and renaming project schemas, opening artifact definitions, and reporting schema problems as diagnostics.

## Impact

`src/core/schemas.ts` (lineage file, rename, file comparison, definition lookup, issue locations), `src/core/store.ts` (resolving a fork's source), `src/commands/schemaCommands.ts`, `src/views/tree/schemasTreeProvider.ts`, a new schema diagnostics module, `src/extension.ts` (tree view handle, diagnostics), `package.json` contributions, the marketplace README, and tests.
