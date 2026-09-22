# Design: OpenSpec Visual Extension

## Context

See [proposal.md](proposal.md) for background and motivation. The extension targets modern VS Code (`^1.84.0`) and compatible editors (Cursor, Windsurf, VSCodium). It operates on repositories using OpenSpec, observing workspace filesystem changes in `openspec/**` and providing visual views and interactive workspace tooling.

## Goals / Non-Goals

**Goals:**
- Provide a clean, snappy developer experience with sub-second compilation and <10ms UI update latency.
- Decouple the visual presentation layer (Webview) from the Extension Host logic via a strictly-typed RPC message protocol.
- Guarantee full offline and standalone capability: the extension must parse and visualize OpenSpec projects directly from the filesystem even if the `openspec` CLI binary is not on system PATH.
- Support local F5 debugging with zero hassle and produce an optimized `.vsix` ready for the VS Code Marketplace and Open VSX.

**Non-Goals:**
- Implementing a full-blown WYSIWYG rich text editor for markdown files; text edits are made in standard VS Code editors or dispatched as tasks/prompts to AI agents.
- Introducing remote cloud services or telemetry; all operations remain 100% local to the user's machine and repository.
- Re-implementing the OpenSpec CLI core logic inside the extension; the extension reads the documented OpenSpec directory structure and executes CLI commands when needed.

## Decisions

### 1. Bundling & Build Pipeline: esbuild
- **Decision**: Use `esbuild` for extension host and webview script bundling instead of Webpack.
- **Rationale**: `esbuild` builds the entire extension in under 150ms compared to 3-5 seconds with Webpack. It requires minimal configuration, generates clean source maps, and provides instant watch-mode rebuilds for local development.
- **Alternative Considered**: Webpack 5. Rejected due to configuration verbosity, slower rebuilds, and bloated bundle sizes.

### 2. Webview UI Framework: Preact with Codicons & VS Code Design Tokens
- **Decision**: Build the webview UI using Preact (`10.x`) and `@preact/signals`, styled with VS Code CSS variables and `@vscode/codicons`.
- **Rationale**: Preact is tiny (~4KB runtime), fast, and mounts instantaneously inside VS Code webview iframes. Using standard VS Code CSS tokens (`var(--vscode-editor-background)`, `var(--vscode-foreground)`, etc.) ensures automatic, seamless integration with every VS Code light, dark, and high-contrast theme.
- **Alternative Considered**: React (heavier bundle, slower iframe initialization) and Vanilla DOM (harder to maintain reactive state when tasks and specs update in real time).

### 3. Architecture & Data Flow

```
+-------------------------------------------------------------------------+
|                              VS Code Host                               |
|                                                                         |
|  +---------------------------+       +-------------------------------+  |
|  | FileSystemWatcher         | ----> | OpenSpecStateStore            |  |
|  | (openspec/**/*)           |       | - in-memory parsed workspace  |  |
|  +---------------------------+       +---------------+---------------+  |
|                                                      |                  |
|                      +-------------------------------+                  |
|                      |                               |                  |
|                      v                               v                  |
|  +---------------------------+       +-------------------------------+  |
|  | TreeDataProviders         |       | WebviewPanelManager           |  |
|  | - ChangesTreeProvider     |       | - SpecViewerPanel (Webview)   |  |
|  | - SpecsTreeProvider       |       | - typed postMessage RPC       |  |
|  | - ArchiveTreeProvider     |       +---------------+---------------+  |
|  +---------------------------+                       |                  |
+------------------------------------------------------|------------------+
                                                       | (JSON RPC)
                                                       v
                                       +-------------------------------+
                                       |      Webview UI (Preact)      |
                                       |  - PipelineRail               |
                                       |  - RequirementCards           |
                                       |  - ScenarioBlocks             |
                                       |  - LiveTaskList               |
                                       +-------------------------------+
```

### 4. Typed Bi-directional Webview RPC
- **Decision**: Define a single TypeScript protocol file (`src/protocol/messages.ts`) containing discriminated unions for all messages exchanged between Extension Host and Webview:
  - `ExtensionToWebviewMessage`: `{ type: 'STATE_UPDATED', payload: ChangeDetail }`, `{ type: 'TASK_TOGGLED', taskId: string }`, etc.
  - `WebviewToExtensionMessage`: `{ type: 'TOGGLE_TASK', changeName: string, lineIndex: number }`, `{ type: 'TRIGGER_VALIDATE' }`, etc.
- **Rationale**: Prevents communication desynchronization bugs and provides compile-time type safety across host and webview boundaries.

### 5. Dual-Layer File & Engine Resolution
- **Decision**: 
  - *Layer 1 (Direct Parser)*: Regex/AST markdown and YAML parser running in Node extension host. Parses `proposal.md`, delta specs, `design.md`, `tasks.md`, and `.openspec.yaml` directly from disk.
  - *Layer 2 (CLI Bridge)*: Spawns the `openspec` binary with intelligent PATH discovery (checking `/opt/homebrew/bin`, `/usr/local/bin`, and `which openspec`) for commands like `validate` and `archive`. If the CLI is absent or errors, the extension operates smoothly on Layer 1.
- **Rationale**: Guarantees the extension always works immediately upon opening a workspace, without requiring the user to configure global Node paths or install CLI tooling beforehand.

## Risks / Trade-offs

- **[Risk] Rapid concurrent file updates while AI agent generates artifacts**
  - *Mitigation*: Debounce file watcher events (e.g. 75ms debounce window). Handle partial and malformed markdown defensively by caching the last valid state and showing a subtle "Syncing..." badge.
- **[Risk] Webview state disposal when tab is moved to background**
  - *Mitigation*: Enable `retainContextWhenHidden: true` on active viewer panels, while also saving light state in `vscode.setState()` so tabs can instantly rehydrate if ever disposed.
- **[Risk] Node environment variation across macOS / Linux / Windows**
  - *Mitigation*: The extension host runs inside VS Code's embedded Node runtime, eliminating client Node mismatches for parsing. Subprocess CLI executions explicitly pass sanitized environment variables and detect Homebrew/system paths.
