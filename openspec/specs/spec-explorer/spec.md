# Spec: spec-explorer

## Purpose

Provides dedicated VS Code Activity Bar and Sidebar explorer views for discovering, navigating, and inspecting active OpenSpec changes, living capability specifications, and archived historical runs.

## Requirements

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
The extension SHALL display an "Archive" tree view in the OpenSpec Activity Bar view container listing completed changes stored in `openspec/changes/archive/`. Each archived change SHALL be represented as an expandable tree item that does not alter the workspace root when clicked and reveals its archived artifacts as child items.

#### Scenario: Viewing archived changes
- **WHEN** the user expands the Archive view
- **THEN** all archived change folders are displayed with their completion timestamps as collapsible items

#### Scenario: Expanding an archived change
- **WHEN** the user expands an archived change item
- **THEN** the child items display the archived change artifacts (such as Proposal, Design, Tasks, and delta specs) that exist within that archived folder

#### Scenario: Clicking an archived change
- **WHEN** the user clicks on the top-level archived change tree item
- **THEN** the extension toggles the expansion state of the item and SHALL NOT reload the window or change the active workspace folder

#### Scenario: Inspecting an archived artifact
- **WHEN** the user clicks on an artifact child item under an archived change
- **THEN** the extension opens the corresponding artifact file in an editor tab within the current workspace

### Requirement: Explorer Quick Actions
The extension SHALL provide inline action icons and context menu actions for change and spec items in the explorer.

#### Scenario: Creating a new change from explorer
- **WHEN** the user clicks the "New Change" action button in the Active Changes view header or triggers the `openspec.newChange` command
- **THEN** the system opens the Visual Change Creation form in the OpenSpec Webview panel instead of prompting with a single-line kebab-case input box
