# Spec: agent-terminal-execution

## Purpose
Provides dedicated terminal management for AI coding agents, supporting configurable command templates, session state tracking, session reuse, and guidance when unset.

## Requirements

### Requirement: Configurable Agent Command Setting
The system SHALL provide an `openspec.terminal.agentCommand` configuration setting that defines the command template for launching an AI coding agent with an OpenSpec slash command.

#### Scenario: Agent command template substitution
- **WHEN** the `openspec.terminal.agentCommand` setting contains the `{command}` placeholder (e.g. `agy -i "{command}"` or `claude "{command}"`)
- **THEN** the system replaces `{command}` with the target OpenSpec slash command before executing in the terminal

#### Scenario: Fallback command appending
- **WHEN** the `openspec.terminal.agentCommand` setting is configured without a `{command}` placeholder
- **THEN** the system appends the target OpenSpec slash command enclosed in double quotes to the configured command string

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

### Requirement: Terminal Session State Tracking and Reuse
The system SHALL track whether an AI coding agent session is active in the dedicated OpenSpec terminal to avoid redundant launcher invocations.

#### Scenario: Initial launch in fresh terminal
- **WHEN** a command is executed in a freshly opened dedicated terminal without an active session
- **THEN** the system executes the command using the resolved `openspec.terminal.agentCommand` template and marks the session as active

#### Scenario: Reusing active agent session
- **WHEN** a command is executed while the dedicated terminal has an active agent session
- **THEN** the system sends the raw canonical slash command directly to the terminal input prompt without wrapping it in the agent launch template

#### Scenario: Dedicated terminal closed
- **WHEN** the dedicated terminal is closed by the user or system
- **THEN** the system clears the active session flag and terminal reference

### Requirement: Manual Session Reset
The system SHALL provide an `openspec.resetTerminalSession` command allowing users to reset the active session state back to fresh without closing the terminal window.

#### Scenario: User triggers reset terminal session
- **WHEN** the user runs the `openspec.resetTerminalSession` command from the Command Palette
- **THEN** the system resets the active session flag so subsequent executions use the full launcher template

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
