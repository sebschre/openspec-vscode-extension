# Spec Delta: agent-terminal-execution

## Purpose
Provides dedicated terminal management for AI coding agents, supporting configurable command templates, session state tracking, session reuse, and guidance when unset.

## ADDED Requirements

### Requirement: Configurable Agent Command Setting
The system SHALL provide an `openspec.terminal.agentCommand` configuration setting that defines the command template for launching an AI coding agent with an OpenSpec slash command.

#### Scenario: Agent command template substitution
- **WHEN** the `openspec.terminal.agentCommand` setting contains the `{command}` placeholder (e.g. `agy -i "{command}"` or `claude "{command}"`)
- **THEN** the system replaces `{command}` with the target OpenSpec slash command before executing in the terminal

#### Scenario: Fallback command appending
- **WHEN** the `openspec.terminal.agentCommand` setting is configured without a `{command}` placeholder
- **THEN** the system appends the target OpenSpec slash command enclosed in double quotes to the configured command string

### Requirement: Guidance Notification When Agent Command Is Unset
The system MUST NOT dispatch raw slash commands to a shell when `openspec.terminal.agentCommand` is unset, and SHALL display an interactive guidance notification explaining how to configure the setting.

#### Scenario: Terminal execution attempted with unset agent command
- **WHEN** a user initiates terminal execution and `openspec.terminal.agentCommand` is unset or empty
- **THEN** the system displays a guidance notification stating that an AI coding agent command must be configured

#### Scenario: User clicks Configure Setting action
- **WHEN** the user selects the "Configure Setting" action from the unset guidance notification
- **THEN** the system opens VS Code Settings focused on `openspec.terminal.agentCommand`

#### Scenario: User clicks Copy Command action
- **WHEN** the user selects the "Copy Command" action from the unset guidance notification
- **THEN** the system copies the canonical full slash command (e.g. `/openspec-apply-change <change-name>`) to the system clipboard and confirms with a brief message

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
