# Spec Delta

## Purpose

Provides dedicated VS Code Activity Bar and Sidebar explorer views for discovering, navigating, and inspecting active OpenSpec changes, living capability specifications, and archived historical runs.

## ADDED Requirements

### Requirement: Active Changes View
The extension SHALL display an "Active Changes" tree view in the OpenSpec Activity Bar view container listing all in-flight changes detected in the workspace `openspec/changes/` directory.

#### Scenario: Workspace with active changes
- **WHEN** the user opens a workspace containing active changes under `openspec/changes/`
- **THEN** the Active Changes tree view displays each change as a tree item displaying its name, schema status badges, and task completion counter

#### Scenario: Empty active changes
- **WHEN** there are no active changes in `openspec/changes/`
- **THEN** the Active Changes tree view displays a helpful welcome message and an action button to initialize or create a new change

### Requirement: Living Specs View
The extension SHALL display a "Living Specs" tree view in the OpenSpec Activity Bar view container listing all durable capability specifications found in `openspec/specs/`.

#### Scenario: Workspace with living capabilities
- **WHEN** the user navigates to the Living Specs tree view
- **THEN** the view lists all capability specifications, showing requirement counts and scenarios for each capability

#### Scenario: Selecting a spec item
- **WHEN** the user clicks on a capability item in the Living Specs tree
- **THEN** the system opens the corresponding `spec.md` file or visual viewer panel for that capability

### Requirement: Archived Changes View
The extension SHALL display an "Archive" tree view in the OpenSpec Activity Bar view container listing completed changes stored in `openspec/changes/archive/`.

#### Scenario: Viewing archived changes
- **WHEN** the user expands the Archive view
- **THEN** all archived change folders are displayed with their completion timestamps and quick-access inspection actions

### Requirement: Explorer Quick Actions
The extension SHALL provide inline action icons and context menu actions for change and spec items in the explorer.

#### Scenario: Creating a new change from explorer
- **WHEN** the user clicks the "New Change" action button in the Active Changes view header
- **THEN** the system prompts the user for a change name and initiates the change scaffolding command
