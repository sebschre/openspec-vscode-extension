# Spec Delta

## Purpose

Provides reactive filesystem watchers, markdown and metadata parsers, and command execution bridges to keep the VS Code extension state synchronized with OpenSpec files in real time.

## ADDED Requirements

### Requirement: Reactive Filesystem Watching
The extension SHALL establish active `FileSystemWatcher` subscriptions on the workspace `openspec/**` directory hierarchy to observe all file creations, modifications, and deletions.

#### Scenario: AI agent updates an artifact
- **WHEN** an AI coding agent creates or edits an artifact inside `openspec/changes/` or `openspec/specs/`
- **THEN** the extension detects the file event within 100 milliseconds and dispatches state updates to all active tree views and open webview panels

#### Scenario: File deletion or external discard
- **WHEN** an active change directory or spec file is deleted on disk
- **THEN** the extension removes the corresponding item from the tree view and notifies any open viewer tab that the artifact has been removed

### Requirement: OpenSpec Artifact and Metadata Parsing
The extension SHALL provide a fast in-memory parser for OpenSpec `.openspec.yaml` metadata, `config.yaml`, and markdown planning artifacts without requiring external processes.

#### Scenario: Parsing change artifacts
- **WHEN** a change directory is scanned or modified
- **THEN** the parser extracts task checkbox states (`[ ]` vs `[x]`), requirement headers, scenario clauses, and metadata properties directly from the source text

#### Scenario: Parsing error resilience
- **WHEN** an artifact contains malformed markdown or partial edits from an in-flight AI agent write
- **THEN** the parser handles the syntax gracefully without throwing unhandled exceptions and displays the best-effort partial state with a subtle warning indicator

### Requirement: OpenSpec CLI Bridge
The extension SHALL provide seamless integration with the installed `openspec` CLI for executing authoritative commands when available.

#### Scenario: Invoking OpenSpec validation
- **WHEN** the user triggers the "OpenSpec: Validate" command
- **THEN** the extension executes `openspec validate` in the workspace root and displays structured diagnostic results or status notifications

#### Scenario: CLI absence fallback
- **WHEN** the `openspec` CLI executable is not found on system PATH
- **THEN** the extension continues normal operation via its built-in filesystem parser and presents a non-blocking informational notice offering CLI installation instructions
