# Tasks

## 1. Archive Tree Model & Provider Updates

- [x] 1.1 Update `ArchiveItemElement` in `src/views/tree/archiveTreeProvider.ts` to be collapsible (`vscode.TreeItemCollapsibleState.Collapsed`) and remove the `vscode.openFolder` command, verifying tree node state and click behavior.
- [x] 1.2 Implement `ArchiveArtifactItemElement` in `src/views/tree/archiveTreeProvider.ts` with `vscode.open` targeting each artifact file path, verifying click command properties.
- [x] 1.3 Implement child artifact resolution in `ArchiveTreeProvider.getChildren` to discover and return child artifact items (`proposal.md`, `design.md`, `tasks.md`, and delta specs under `specs/`), verifying child items for archived directories.

## 2. Command & Context Menu Registration

- [x] 2.1 Register the `openspec.revealArchiveInExplorer` command in `src/commands/index.ts` invoking `revealInExplorer` on the target archive folder, verifying command registration.
- [x] 2.2 Contribute the `openspec.revealArchiveInExplorer` command and view context menu in `package.json` for `viewItem == archiveItem`, verifying package contribution validity.

## 3. Testing & Verification

- [x] 3.1 Add automated unit tests covering `ArchiveTreeProvider` hierarchy and child item resolution, verifying all tests pass via `npm test`.
- [x] 3.2 Run `npm run typecheck` and `npm run build` to verify clean compilation and bundle creation.
