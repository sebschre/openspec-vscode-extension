# Proposal

## Why

Currently, clicking an item in the OpenSpec "Archive" view triggers VS Code's `vscode.openFolder` command, which abruptly reloads the entire VS Code window with the selected archive folder as the new workspace root. This causes the user to lose their current project context, open editors, and active terminal sessions. Archived changes should be inspectable within the existing project context without changing the workspace root.

## What Changes

- **Collapsible Archive Items**: Make archived change items in the Archive tree view collapsible (`vscode.TreeItemCollapsibleState.Collapsed`) instead of non-collapsible leaf nodes.
- **Remove Workspace Reset**: Eliminate the `vscode.openFolder` command on archived tree items so clicking toggles expansion rather than restarting the editor workspace.
- **Archived Artifact Children**: Provide child tree nodes for each artifact present in the archived change directory (`proposal.md`, `design.md`, `tasks.md`, and delta specs).
- **Editor Tab Inspection**: Wire clicking on an archived artifact child item to `vscode.open`, allowing developers to inspect archived specifications, designs, proposals, and task records in editor tabs side-by-side with their project code.
- **Reveal in File Explorer**: Provide a context menu action on archived change items to reveal the archive directory in the VS Code Explorer sidebar without reloading the workspace.

## Capabilities

### New Capabilities

*(None)*

### Modified Capabilities

- `spec-explorer`: Update the Archived Changes View requirement and scenarios so that clicking an archived change expands its historical artifacts in-place within the current workspace rather than opening a new project folder.

## Impact

- **Affected Code**:
  - `src/views/tree/archiveTreeProvider.ts`: update item model, child provider, and click commands.
  - `package.json`: ensure archive item context menus and commands align.
  - `test/`: add or update tests verifying archive hierarchy and file resolution.
- **Dependencies**: No external dependency changes.
- **APIs**: No breaking API changes; strictly enhances the explorer UI experience.
