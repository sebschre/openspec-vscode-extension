# Proposal

## Why

The Active Changes and Living Specs views show what exists but help little with what to do next. Change items always list Proposal, Specs, Design and Tasks, even when the change's schema defines other artifacts. Clicking a missing artifact opens a file that doesn't exist, and "Specs (Delta)" tries to open a folder. Task progress is only a number. Validate and Archive are hidden in the context menu, and the empty states are plain items with no action. In Living Specs, clicking a requirement or scenario does nothing, and nothing shows that an active change is about to modify a spec.

## What Changes

- **Schema-aware artifacts**: a change's children follow the artifacts of its schema, in schema order. A missing artifact is labelled as missing and is not opened.
- **Expandable delta specs**: the specs artifact lists each delta capability with counts of added, modified and removed requirements, and each one opens its file.
- **Expandable tasks**: the tasks artifact lists task groups with their progress, and a change's description and tooltip name the next open task.
- **Context-aware inline actions**: a complete change shows an inline Archive action; an incomplete one shows inline Validate.
- **Welcome views and a badge**: empty Active Changes and Living Specs views show a welcome message with action buttons, and the Active Changes view shows a badge with the number of active changes.
- **Jump to requirement and scenario**: clicking a requirement or scenario in Living Specs opens `spec.md` at its heading.
- **Pending changes on living specs**: a living spec that an active change touches is marked with the number of pending changes, and lists those changes as children that open them.
- **Polish**: correct singular and plural labels, Markdown tooltips, Collapse All in both views, and an inline "Open spec.md" action on living specs.

Out of scope: filtering or sorting options, editing specs from the tree, and changes to the Archive and Schemas views.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `spec-explorer`: Active Changes and Living Specs views, their items, actions and empty states.

## Impact

`src/core/types.ts` and `src/core/parser.ts` (heading line numbers), `src/core/store.ts` (pending changes per spec), `src/views/tree/changesTreeProvider.ts`, `src/views/tree/specsTreeProvider.ts`, `src/extension.ts` (tree views with badge and collapse all), `src/commands/index.ts` (open spec file command), `package.json` contributions (`viewsWelcome`, menus), the marketplace README, and tests.
