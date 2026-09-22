# Design

## Context

In the OpenSpec VS Code extension, `ArchiveTreeProvider` ([`src/views/tree/archiveTreeProvider.ts`](file:///Users/sebastian/dev/openspec-vscode-extension/src/views/tree/archiveTreeProvider.ts)) renders archived change records found in `openspec/changes/archive/`. Currently, `ArchiveItemElement` is configured with `collapsibleState = vscode.TreeItemCollapsibleState.None` and assigns `this.command` to `vscode.openFolder`. In VS Code, executing `vscode.openFolder` closes the active project and reloads the window rooted at the target folder.

Meanwhile, `ChangesTreeProvider` ([`src/views/tree/changesTreeProvider.ts`](file:///Users/sebastian/dev/openspec-vscode-extension/src/views/tree/changesTreeProvider.ts)) already demonstrates the ideal pattern: top-level change nodes are collapsible, and child artifact items (`ArtifactItemElement`) represent specific documents (`proposal.md`, `design.md`, `tasks.md`, `specs/`) and open safely via `vscode.open`.

## Goals / Non-Goals

**Goals:**
- Make `ArchiveItemElement` collapsible without altering the workspace root on click.
- Provide child artifact elements under each archived change for all discovered artifacts (`proposal.md`, `design.md`, `tasks.md`, and delta specs in `specs/`).
- Enable users to click on any archived artifact to view it in an editor tab via `vscode.open`.
- Add an optional context menu action to reveal the folder in the standard VS Code File Explorer (`revealInExplorer`) for users who explicitly want to inspect the filesystem.

**Non-Goals:**
- Allowing modification of archived files through the extension UI (archived changes are read-only historical records).
- Opening archived changes in the interactive Visual Spec Viewer webview in this change.

## Decisions

### 1. Element Hierarchy in `ArchiveTreeProvider`
- Define tree element union: `type ArchiveTreeElement = ArchiveItemElement | ArchiveArtifactItemElement`.
- `ArchiveItemElement`:
  - `collapsibleState = vscode.TreeItemCollapsibleState.Collapsed`.
  - `command = undefined` so clicking the item toggles expansion in the tree.
  - `contextValue = 'archiveItem'`.
- `ArchiveArtifactItemElement`:
  - Represents a single document file within the archived change directory.
  - `collapsibleState = vscode.TreeItemCollapsibleState.None`.
  - `command = { command: 'vscode.open', title: 'Open File', arguments: [vscode.Uri.file(filePath)] }`.
  - Uses standard thematic icons (`ThemeIcon('file-text')` or `ThemeIcon('check')`).

*Alternatives considered*:
- Keeping `ArchiveItemElement` non-collapsible and changing `command` to `vscode.open` targeting `proposal.md`: Rejected because it obscures the design, specs, and tasks of the archived change.
- Using `revealInExplorer` as the click action: Rejected because it does not open the documents for viewing, merely shifting focus to the sidebar file tree.

### 2. Scanning Archived Artifacts
- When `getChildren(element)` is called with an `ArchiveItemElement`, inspect the filesystem at `element.archive.path`:
  - Check for `proposal.md`
  - Check for `design.md`
  - Check for `tasks.md`
  - Check for `specs/` directory and enumerate `.md` capability spec files (e.g. `specs/<capability>/spec.md`)
- If none of the standard artifacts exist, show an informational leaf node `No artifacts found`.

*Alternatives considered*:
- Scanning full archive details inside `OpenSpecStateStore`: Unnecessary coupling since archived runs are static and reading child items lazily in `getChildren` is fast and lightweight.

### 3. Context Menu Action for Filesystem Reveal
- Contribute command `openspec.revealArchiveInExplorer` in `package.json` with title "Reveal in File Explorer".
- Execute built-in command `revealInExplorer` targeting `vscode.Uri.file(archive.path)`.
- Available via context menu when `viewItem == archiveItem`.

## Risks / Trade-offs

- **[Risk]** An archived change folder might not contain all four artifacts (e.g. changes created with alternative schemas or partial runs).  
  **→ Mitigation**: Dynamically check file existence with `fs.existsSync` before creating each child element so only present artifacts are rendered.

- **[Risk]** Deeply nested spec files within `specs/`.  
  **→ Mitigation**: Recursively find all `.md` files under `specs/` and label them clearly with their capability name or relative path.
