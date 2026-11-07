## MODIFIED Requirements

### Requirement: Guidance Notification When Agent Command Is Unset
The system MUST NOT dispatch raw slash commands to a shell when `openspec.terminal.agentCommand` is unset. Instead, it SHALL offer a picker of known AI coding agent presets so the user can configure the setting in one step and continue the action they started.

#### Scenario: Terminal execution attempted with unset agent command
- **WHEN** a user initiates terminal execution and `openspec.terminal.agentCommand` is unset or empty
- **THEN** nothing is sent to the terminal, and the system shows a picker listing presets for Claude Code, Antigravity, Gemini CLI, Codex CLI and opencode, together with "Custom command…", "Open Settings" and "Copy Command" entries

#### Scenario: User picks a preset
- **WHEN** the user selects an agent preset from the picker
- **THEN** the system saves the preset's template (e.g. `claude "{command}"`) to `openspec.terminal.agentCommand` in user settings
- **AND** runs the originally requested slash command with that template in the dedicated terminal

#### Scenario: User enters a custom command
- **WHEN** the user selects "Custom command…" and enters a non-empty template
- **THEN** the system saves that template and runs the originally requested slash command with it
- **AND** an empty entry is rejected with a validation message

#### Scenario: User clicks Configure Setting action
- **WHEN** the user selects "Open Settings" from the picker
- **THEN** the system opens VS Code Settings focused on `openspec.terminal.agentCommand` and does not run the command

#### Scenario: User clicks Copy Command action
- **WHEN** the user selects "Copy Command" from the picker
- **THEN** the system copies the canonical full slash command (e.g. `/openspec-apply-change <change-name>`) to the system clipboard and confirms with a brief message

#### Scenario: User dismisses the picker
- **WHEN** the user dismisses the picker without choosing
- **THEN** no setting is changed and nothing is sent to the terminal

## ADDED Requirements

### Requirement: Configure Agent Command
The system SHALL provide an `openspec.configureAgentCommand` command, available from the Command Palette and the OpenSpec views' title-bar menu, that lets the user choose or change the AI coding agent at any time using the same presets and custom entry.

#### Scenario: Changing the agent
- **WHEN** the user runs `OpenSpec: Configure Agent Command` and picks a preset
- **THEN** the system saves the preset's template to `openspec.terminal.agentCommand` and confirms which agent was configured

#### Scenario: Current value is indicated
- **WHEN** the picker opens and the configured template matches a preset
- **THEN** that preset is marked as current
- **AND** "Custom command…" opens pre-filled with the configured template

#### Scenario: Agent changed during an active session
- **WHEN** the agent command is changed while the dedicated terminal has an active agent session
- **THEN** the session flag is reset so the next execution launches the newly configured agent with its template
