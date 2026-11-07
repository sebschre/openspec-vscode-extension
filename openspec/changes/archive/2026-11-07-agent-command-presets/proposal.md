# Proposal: Agent Command Presets

## Why
The extension already works with any AI coding agent through the `openspec.terminal.agentCommand` template, but it is hard to set up. Users first learn the setting exists when Run in Terminal fails. They then have to write the launch template by hand, and every example names Antigravity (`agy`) first, which makes the feature look tied to one agent.

## What Changes
- When `openspec.terminal.agentCommand` is unset and a terminal action is triggered, show a quick pick of agent presets (Claude Code, Antigravity, Gemini CLI, Codex, opencode) plus "Custom command…", "Open Settings" and "Copy Command". This replaces the guidance notification. Picking a preset or entering a custom command saves the setting and runs the original command right away.
- Add an `OpenSpec: Configure Agent Command` command (`openspec.configureAgentCommand`). It opens the same picker at any time, marks the current value, and is offered in the OpenSpec views' title-bar overflow menu.
- After the agent command changes, reset the terminal session so the next action launches the new agent.
- Turn the setting description into Markdown that lists examples for several agents and points to the new command.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `agent-terminal-execution`: The unset-setting guidance becomes an agent preset picker that saves the setting and continues the action. A new requirement adds a command to choose or change the agent at any time.

## Impact
- **Core**: `src/core/terminal.ts` gains the preset list and the picker flow, replacing `handleUnsetAgentCommand`'s notification.
- **Commands**: `src/commands/index.ts` registers `openspec.configureAgentCommand`.
- **Manifest**: `package.json` adds the command, a view/title menu entry and a `markdownDescription` for the setting.
- **Tests & docs**: `test/terminal.test.ts`, `test/mockVscode.ts`, `docs/marketplace/README.md`.
