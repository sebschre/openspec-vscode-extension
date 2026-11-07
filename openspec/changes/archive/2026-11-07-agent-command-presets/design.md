# Design: Agent Command Presets

## Context
`TerminalManager.executeCommand` reads `openspec.terminal.agentCommand`. When it is empty, the method calls `handleUnsetAgentCommand`, which shows an information message and returns `false`. Callers do not wait for the result, so the original action is lost even after the user configures the setting.

## Goals / Non-Goals
- **Goals**: get to a working agent in one step; let the user change agents later without editing JSON; keep the template mechanism (`{command}` and append fallback) unchanged.
- **Non-Goals**: detecting which agents are installed; changing the slash-command names the extension sends (`/openspec-*`); per-agent command prefixes.

## Decisions

### Presets are a static list in `terminal.ts`
Each preset has an id, a label, the CLI binary name (shown as detail) and a template:

| Agent | Template |
|---|---|
| Claude Code | `claude "{command}"` |
| Antigravity | `agy -i "{command}"` |
| Gemini CLI | `gemini -i "{command}"` |
| Codex CLI | `codex "{command}"` |
| opencode | `opencode --prompt "{command}"` |

All of these start an interactive session with the prompt already sent. That is what session reuse relies on: later commands go to the running REPL. *Alternative*: probing `PATH` for installed binaries. Rejected because it is slow, differs by platform, and is wrong for remote terminals and shells with a different `PATH`.

### One picker, used in two places
`pickAgentCommand()` shows the quick pick and returns the chosen template, or `undefined` if cancelled. Both the unset flow and `openspec.configureAgentCommand` call it. "Custom command…" opens an input box pre-filled with the current value and rejects empty input. When called from the unset flow, the picker also offers "Open Settings" and "Copy Command", so the earlier notification's actions are still available.

### Saved to user (global) settings
Which agent someone uses is a personal choice, not a project choice, so the value goes to `ConfigurationTarget.Global`. A workspace value, if present, still takes precedence through normal VS Code resolution. The confirmation message says where the value was saved. *Alternative*: asking for the scope every time. Rejected as an extra step for little gain.

### Continue the original action
In the unset flow, after a template is saved, `executeCommand` is called again with the original command and options. `executeCommand` stays synchronous and returns `false` for the unset case, as it does today. The follow-up happens asynchronously.

### Session reset on change
If the agent is changed while a session is active, the terminal session flag is reset. Otherwise the next command would be typed into the old agent's REPL (or a bare shell).

## Risks / Trade-offs
- [Preset CLIs change their flags] → Templates are plain strings that are easy to update. Users can always pick "Custom command…".
- [Workspace setting shadows the saved global value] → After saving, if a workspace value is set and differs, the picker warns the user.
