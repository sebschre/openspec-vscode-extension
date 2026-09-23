# Proposal: Configurable Agent Terminal Command

## Why
When clicking "Run in Terminal" or "Implement in Terminal" from the OpenSpec Visual Spec Viewer, the extension currently dispatches raw abbreviated slash commands (e.g. `/opsx-propose` or `/opsx-apply`) directly to the shell prompt, which fails with shell execution errors. Users need a configurable AI coding agent command template that safely invokes their preferred AI agent CLI (such as Antigravity or Claude Code), detects and reuses running interactive sessions, provides clear configuration guidance when unset, and uses canonical full-name slash commands (`/openspec-...`).

## What Changes
- Add the `openspec.terminal.agentCommand` configuration setting (unset by default) supporting a `{command}` template placeholder for custom AI agent CLI invocations.
- Provide a helpful VS Code guidance notification when `openspec.terminal.agentCommand` is unset, offering direct actions to configure the setting or copy the slash command to the clipboard without launching raw text into the shell.
- Add session lifecycle tracking in `TerminalManager` to detect when an agent session is already active in the dedicated terminal, dispatching raw slash commands directly to the active prompt instead of re-invoking the launcher template.
- Replace all hardcoded abbreviated `/opsx-*` commands in the webview components, clipboard copy actions, and command handlers with canonical full-name OpenSpec skills: `/openspec-propose`, `/openspec-apply-change`, and `/openspec-archive-change`.
- Add an `OpenSpec: Reset Terminal Session` command to allow users to manually reset terminal session state back to fresh mode if an agent exits without closing the terminal.

## Capabilities

### New Capabilities
- `agent-terminal-execution`: Provides dedicated terminal management for AI coding agents, supporting configurable command templates (`{command}`), session state tracking, session reuse, and guidance when unset.

### Modified Capabilities
- `visual-spec-viewer`: Updates change overview, technical design viewer, and live task list actions to trigger configurable agent terminal execution and use canonical full-name `/openspec-*` slash commands for execution and clipboard copying.

## Impact
- **Settings & Configuration**: Adds `openspec.terminal.agentCommand` to VS Code `contributes.configuration`.
- **Core Extension**: Extends `TerminalManager` in `src/core/terminal.ts` with agent command resolution, session state tracking, and unset guidance notification.
- **Webview UI**: Updates `ChangeOverview.tsx`, `DesignViewer.tsx`, and `LiveTaskList.tsx` in `webview-ui/` to use canonical slash commands and labels.
- **Commands**: Adds `openspec.resetTerminalSession` in `src/commands/index.ts`.
