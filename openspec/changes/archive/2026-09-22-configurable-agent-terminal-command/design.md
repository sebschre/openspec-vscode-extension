# Design: Configurable Agent Terminal Command

## Context
See `proposal.md` for motivation. Currently, the Visual Spec Viewer dispatches raw slash commands (like `/opsx-propose` and `/opsx-apply`) directly to the shell terminal via `TerminalManager.executeCommand`. This fails because terminal shells (zsh, bash) do not understand slash commands without an active AI coding agent CLI wrapper.

## Goals / Non-Goals

**Goals:**
- Provide a clear, flexible configuration mechanism (`openspec.terminal.agentCommand`) supporting any AI coding assistant CLI via a `{command}` placeholder.
- Prevent terminal execution failures when the configuration is unset by displaying actionable guidance and copying the command as an immediate fallback.
- Support session reuse so that subsequent executions into an already-running agent REPL send the raw slash command rather than attempting to re-launch the agent CLI.
- Standardize all terminal execution and copy actions to canonical full-name OpenSpec skills (`/openspec-apply-change`, `/openspec-propose`, `/openspec-archive-change`, `/openspec-explore`).

**Non-Goals:**
- Auto-detecting agent binaries or silently guessing the user's preferred AI assistant.
- Managing multi-agent process multiplexing or embedding a custom terminal emulator inside webview panels.
- Supporting legacy `/opsx` aliases as the default.

## Decisions

### Decision 1: Template-Based Agent Command Configuration
We will introduce `openspec.terminal.agentCommand` as a user/workspace configuration string (default: `""`).
- **Template Substitution**: When executing a command, the extension inspects `openspec.terminal.agentCommand`. If it contains `{command}`, `{command}` is substituted with the target slash command. If the setting contains text without `{command}`, the target slash command enclosed in double quotes is appended (e.g. `claude` becomes `claude "/openspec-apply-change <name>"`).
- **Rationale**: CLI flags for passing prompts differ wildly across AI tools (e.g. `agy -i "{command}"`, `claude "{command}"`, `aider --message "{command}"`). A flexible template gives users full control over custom arguments, flags, and wrappers.
- **Alternatives Considered**:
  - *Hardcoded agent presets enum*: Too restrictive; cannot anticipate custom binaries, conda/virtualenvs, or new agent tools.
  - *Magic path auto-detection*: Fragile across diverse developer setups, remote SSH, and containerized dev environments.

### Decision 2: Guarding Unset Execution with Interactive Fallback
If `openspec.terminal.agentCommand` is unset or empty:
- The extension aborts terminal dispatch (avoiding shell command errors).
- Displays a `vscode.window.showInformationMessage`:
  `"OpenSpec terminal execution requires an AI coding agent command. Please set 'openspec.terminal.agentCommand' in settings (e.g. 'agy -i \"{command}\"' or 'claude \"{command}\"')."`
- Offers two explicit actions:
  1. `Configure Setting`: Invokes `workbench.action.openSettings` with `@id:openspec.terminal.agentCommand`.
  2. `Copy Command`: Writes the canonical slash command to the system clipboard and displays a brief toast confirmation.
- **Rationale**: Provides immediate education on how to enable the feature while ensuring the user's workflow is not blocked (they can paste the copied command wherever desired).

### Decision 3: Session Tracking and Command Dispatch Modes
`TerminalManager` will track session state via `_hasSessionLaunched: boolean`:
- **Initial Launch (`!this._hasSessionLaunched`)**: Dispatches the command wrapped in the resolved `openspec.terminal.agentCommand` template, then marks `_hasSessionLaunched = true`.
- **Reused Session (`this._hasSessionLaunched === true`)**: Dispatches the raw slash command (`/openspec-...`) directly with a newline, allowing the running agent REPL to receive the command directly without re-spawning the CLI.
- **Session Cleanup**: `vscode.window.onDidCloseTerminal` resets both `_terminal` and `_hasSessionLaunched = false`.
- **Manual Reset**: Exposes command `openspec.resetTerminalSession` to manually reset `_hasSessionLaunched = false` if the agent CLI exited inside the terminal.

### Decision 4: Canonical Full-Name Command Standard
Standardize all UI interactions and clipboard copy actions to use canonical OpenSpec skill names:
- Change Overview: `/openspec-propose`
- Technical Design Viewer: `/openspec-propose`
- Live Task List: `/openspec-apply-change <change-name>`
- Form Guidance: `/openspec-explore`
- Archive Actions: `/openspec-archive-change <change-name>`

## Risks / Trade-offs

- **[Agent Exits Without Terminal Closing]**: The user might terminate the agent CLI (e.g. with `Ctrl+C`) while keeping the terminal window open. In this case, `_hasSessionLaunched` would still be `true` and the next dispatch would send raw text to the shell.
  → *Mitigation*: Register the `openspec.resetTerminalSession` command in the Command Palette so users can easily reset state. Also explore checking VS Code's `terminal.shellIntegration` where available to detect shell prompt returns.
- **[Quoting and Escaping in Templates]**: Complex arguments in custom templates could cause escaping issues in different shells (cmd, powershell, bash).
  → *Mitigation*: Sanitize slash command strings (ensuring change names are strictly validated kebab-case) and document standard quote usage in the configuration description.
