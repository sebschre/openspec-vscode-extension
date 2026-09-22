# OpenSpec Companion for VS Code

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![VS Code](https://img.shields.io/badge/VS%20Code-^1.84.0-blue.svg)](https://marketplace.visualstudio.com)

**OpenSpec Companion** is the official visual workspace inside VS Code for developers using **[OpenSpec](https://github.com/fission-ai/openspec)** to drive AI coding agents.

Just as SpecKit Companion provides a visual companion for `spec-kit`, OpenSpec Companion brings OpenSpec's structured spec-driven development into VS Code:
- **Activity Bar & Sidebar Explorer**: Browse active changes in flight, living capability specifications, and completed archive dossiers at a glance.
- **Visual Spec & Change Viewer**: Rich interactive webview rendering lifecycle pipeline rails (`Proposal` → `Specs` → `Design` → `Tasks`), Given/When/Then scenario blocks, and structured requirement cards.
- **Live Interactive Task Checklist**: Real-time bidirectional synchronization with `tasks.md`. Watch tasks tick over live as AI agents work, or toggle them manually from the webview.
- **AI Agent Prompt Bridge**: One-click prompt generator for Copilot, Claude Code, Gemini CLI, Antigravity, and Cursor pointing directly to the next uncompleted task.
- **Zero-Latency Filesystem Synchronization**: Built-in AST/markdown parser and file watcher updating the UI in <10ms without requiring command-line lag.

---

## Features

### 1. Active Changes & Living Specs Sidebar
The OpenSpec activity bar container adds three dedicated tree views:
- **Active Changes**: Shows changes in `openspec/changes/` with status badges, schema indicators, and task progress ratios (`● 4/18 (22%)`).
- **Living Specs (Capabilities)**: Shows permanent, durable capability specifications from `openspec/specs/` with requirement and scenario hierarchies.
- **Archive**: Collapsible history of completed changes.

### 2. Visual Spec Viewer (Webview)
Click any change or capability to open the rich Visual Spec Viewer tab:
- **Pipeline Rail**: A clear lifecycle progress bar showing current artifact readiness.
- **Requirement Cards**: Clean card layouts with `[ADDED]`, `[MODIFIED]`, and `[REMOVED]` operational delta badges.
- **Acceptance Scenarios**: Structured `GIVEN / WHEN / THEN` chips with high contrast styling.
- **Live Tasks Checklist**: Toggle checkboxes directly in the webview to update `tasks.md` on disk.
- **Overview Dossier**: Motivation, scope boundaries (What Changes), architectural decisions, and risk mitigations.

### 3. Quick Actions & Commands
- `OpenSpec: New Change` — Prompts for a kebab-case name and scaffolds the change.
- `OpenSpec: Open Visual Spec Viewer` — Opens the rich interactive webview.
- `OpenSpec: Validate Change` — Runs authoritative OpenSpec validation.
- `OpenSpec: Archive Change` — Promotes delta specs to living specs and moves change to archive.
- `OpenSpec: Refresh Specs & Changes` — Triggers an immediate re-scan.

---

## Local Development & Testing

### Running in VS Code
1. Clone the repository:
   ```bash
   git clone https://github.com/sebastian/openspec-vscode-extension.git
   cd openspec-vscode-extension
   ```
2. Install dependencies and compile:
   ```bash
   npm install
   npm run build
   ```
3. Press `F5` in VS Code to launch a new Extension Development Host window.
4. Open any workspace containing an `openspec/` directory.

### Running Automated Tests
```bash
npm test
```

### Packaging for VS Code Marketplace & Open VSX
```bash
npx vsce package --no-dependencies
```

---

## License

MIT © OpenSpec
