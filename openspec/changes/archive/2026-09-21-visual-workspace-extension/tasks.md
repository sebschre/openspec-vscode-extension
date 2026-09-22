# Tasks

## 1. Project Initialization & Tooling Setup

- [x] 1.1 Initialize `package.json`, `tsconfig.json`, `esbuild.config.js`, and `.vscodeignore` with standard VS Code extension metadata, contributes definitions, and build scripts. Verify by running `npm run build` to confirm clean compilation.
- [x] 1.2 Configure VS Code Extension Development Host launching by creating `.vscode/launch.json` and `.vscode/tasks.json`. Verify launcher configuration schema and task targets.

## 2. Core OpenSpec Parser & Workspace State Engine

- [x] 2.1 Implement `OpenSpecParser` in `src/core/parser.ts` to parse `.openspec.yaml`, `proposal.md`, delta specs, `design.md`, and `tasks.md` checkbox states. Verify by running unit tests covering requirement, scenario, and task extraction on test fixtures.
- [x] 2.2 Implement `OpenSpecStateStore` and `WorkspaceWatcher` in `src/core/watcher.ts` to monitor `openspec/**` using `vscode.workspace.createFileSystemWatcher` with debouncing. Verify via automated event emission tests when fixture files are modified.
- [x] 2.3 Implement `OpenSpecCliBridge` in `src/core/cli.ts` to locate the local `openspec` CLI executable (checking Homebrew and system PATHs) and execute commands (`validate`, `archive`, `list`). Verify via mock CLI execution tests.

## 3. Activity Bar & Explorer Sidebar Views

- [x] 3.1 Implement `ChangesTreeProvider` in `src/views/tree/changesTreeProvider.ts` for the "Active Changes" view container with status badges and task progress counts. Verify tree item rendering with sample change data.
- [x] 3.2 Implement `SpecsTreeProvider` in `src/views/tree/specsTreeProvider.ts` for the "Living Specs" view container displaying capability specs, requirement counts, and scenarios. Verify tree item hierarchy matches disk specs.
- [x] 3.3 Implement `ArchiveTreeProvider` in `src/views/tree/archiveTreeProvider.ts` for the "Archive" view container displaying historical archived changes. Verify rendering with mock archive directories.
- [x] 3.4 Register Explorer commands and quick actions (`openspec.newChange`, `openspec.refresh`, `openspec.openViewer`, `openspec.validate`) in `src/commands/index.ts`. Verify command execution and tree view context actions.

## 4. Visual Spec Viewer (Webview Panel)

- [x] 4.1 Define typed RPC protocol in `src/protocol/messages.ts` with discriminated unions for all Host-to-Webview and Webview-to-Host messages. Verify TypeScript typecheck compiles cleanly.
- [x] 4.2 Build Preact Webview application scaffold in `webview-ui/` styled with VS Code CSS tokens and `@vscode/codicons`. Verify webview builds and bundles into `dist/webview/`.
- [x] 4.3 Implement `PipelineRail` component rendering lifecycle stages (`Proposal` -> `Specs` -> `Design` -> `Tasks`). Verify component rendering in webview test harness.
- [x] 4.4 Implement `RequirementCard` and `ScenarioBlock` components rendering normative requirements with Given/When/Then blocks. Verify rendering of sample delta spec cards.
- [x] 4.5 Implement `LiveTaskList` component with interactive checkboxes and bidirectional sync with `tasks.md`. Verify checking a task in the UI updates the underlying markdown file.
- [x] 4.6 Implement `ChangeOverview` dossier component rendering proposal motivation, scope fence, and architectural design summary. Verify rendering with mock change details.
- [x] 4.7 Integrate `SpecViewerPanel` webview controller in `src/views/webview/specViewerPanel.ts`, handling panel lifecycle, tab state persistence, and reactive file watcher notifications. Verify opening a change launches the webview.

## 5. End-to-End Verification & Marketplace Packaging

- [x] 5.1 Run full unit and integration test suite and verify all test assertions pass.
- [x] 5.2 Validate `.vsix` packaging using `@vscode/vsce package` and verify package contents, size (<2MB), and manifest compliance for VS Code Marketplace release.
