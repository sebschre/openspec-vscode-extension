# Proposal: OpenSpec Visual Companion Extension for VS Code

## Why

OpenSpec enables spec-driven development for AI coding agents and developers. However, developers currently interact with OpenSpec primarily via terminal CLI commands (`openspec status`, `openspec list`, `openspec validate`) or by manually viewing raw markdown files.

Following the proven paradigm established by extensions like `speckit-companion` for GitHub's spec-kit, developers need an interactive, visual IDE companion. This extension surfaces OpenSpec's core artifacts (proposals, delta specs, designs, tasks, and durable living specs) directly in VS Code's sidebar and rich webview tabs, providing real-time visibility, live task tracking during AI implementation runs, and seamless spec steering without leaving the editor.

## What Changes

- Create a production-ready VS Code extension codebase (`openspec-vscode-extension`) packaged with TypeScript and bundled via `esbuild`.
- Add an OpenSpec Activity Bar view container with three dedicated sidebar views:
  - **Active Changes**: Tree view displaying in-flight changes (`openspec/changes/`), artifact readiness status (`proposal`, `specs`, `design`, `tasks`), and real-time task completion ratios (`X/Y done`).
  - **Living Specs (Capabilities)**: Tree view displaying durable system specs (`openspec/specs/`), requirement counts, and scenarios.
  - **Archived Changes**: Collapsible view of completed and archived changes.
- Add an interactive **Visual Spec & Change Viewer** (Webview panel built with Preact and VS Code styling):
  - Change Overview dossier: proposal summary, design decisions, and scope boundaries.
  - Interactive lifecycle pipeline rail (`Proposal` -> `Specs` -> `Design` -> `Tasks` -> `Apply`).
  - Structured requirement cards with badges (`ADDED`, `MODIFIED`, `REMOVED`).
  - Formatted Given/When/Then acceptance scenario blocks.
  - Live interactive tasks checklist synchronized with `tasks.md`.
- Add a zero-latency **Workspace Synchronization Engine**:
  - `vscode.FileSystemWatcher` tracking changes in `openspec/**` to trigger reactive UI updates in <10ms.
  - OpenSpec parser parsing markdown artifacts and `.openspec.yaml` metadata.
  - Integration with the local `openspec` CLI for authoritative validation and command execution.
- Add VS Code commands and keyboard shortcuts for core OpenSpec workflows: `New Change`, `Open Visual Viewer`, `Validate`, `Sync Specs`, `Archive Change`.
- Configure complete local test harnesses (`.vscode/launch.json`, automated parser unit tests) and VS Code Marketplace packaging configs (`package.json` contributes, `.vscodeignore`, `vsce`).

## Capabilities

### New Capabilities
- `companion-explorer`: OpenSpec Activity Bar view container and sidebar tree providers for Active Changes, Durable Specs, and Archive, featuring status badges and quick actions.
- `visual-spec-viewer`: Rich webview panel rendering changes and capabilities as structured visual documents with pipeline rails, requirement cards, scenario cards, and live task lists.
- `workspace-synchronization`: Direct filesystem watching, AST/markdown parsing, and OpenSpec CLI bridge providing real-time reactive state updates and command dispatch.

### Modified Capabilities
<!-- None. Greenfield capabilities for the extension. -->

## Impact

- **Codebase**: Creates the VS Code extension codebase under standard VS Code extension structure (`src/`, `webview-ui/`, `package.json`, build tooling).
- **Dependencies**: Introduces VS Code extension dependencies (`@types/vscode`, `esbuild`, `preact`, `@vscode/codicons`).
- **Compatibility**: Requires VS Code version `^1.84.0` or newer; integrates cleanly with OpenSpec CLI 1.x projects while operating gracefully even if the CLI is not globally installed.
