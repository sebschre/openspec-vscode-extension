# Spec: spec-explorer

## Purpose

Provides dedicated VS Code Activity Bar and Sidebar explorer views for discovering, navigating, and inspecting active OpenSpec changes, living capability specifications, and archived historical runs.

## Requirements

### Requirement: Active Changes View
The extension SHALL display an "Active Changes" tree view in the OpenSpec Activity Bar view container listing all in-flight changes detected in the workspace `openspec/changes/` directory. The view SHALL show a badge with the number of active changes.

#### Scenario: Workspace with active changes
- **WHEN** the user opens a workspace containing active changes under `openspec/changes/`
- **THEN** the Active Changes tree view displays each change as a tree item displaying its name and task completion counter
- **AND** the view shows a badge with the number of active changes

#### Scenario: Next task hint
- **WHEN** a change has at least one open task
- **THEN** the change's description and tooltip name the first open task in `tasks.md`

#### Scenario: Empty active changes
- **WHEN** there are no active changes in `openspec/changes/`
- **THEN** the Active Changes tree view displays a welcome message with a button that creates a new change, and no badge

#### Scenario: No OpenSpec folder
- **WHEN** the workspace has no `openspec/` folder
- **THEN** the Active Changes and Living Specs views display a welcome message explaining that OpenSpec is not initialized

### Requirement: Living Specs View
The extension SHALL display a "Living Specs" tree view in the OpenSpec Activity Bar view container listing all durable capability specifications found in `openspec/specs/`.

#### Scenario: Workspace with living capabilities
- **WHEN** the user navigates to the Living Specs tree view
- **THEN** the view lists all capability specifications, showing requirement counts and scenarios for each capability, with correct singular and plural labels

#### Scenario: Selecting a spec item
- **WHEN** the user clicks on a capability item in the Living Specs tree
- **THEN** the system opens the visual viewer panel for that capability

#### Scenario: Empty living specs
- **WHEN** the workspace has an `openspec/` folder but no living specs
- **THEN** the Living Specs view displays a welcome message explaining that archiving a change promotes its specs, with a button that creates a new change

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
The extension SHALL provide inline action icons and context menu actions for change and spec items in the explorer. Inline change actions SHALL depend on whether the change is complete. Both views SHALL offer Collapse All.

#### Scenario: Creating a new change from explorer
- **WHEN** the user clicks the "New Change" action button in the Active Changes view header or triggers the `openspec.newChange` command
- **THEN** the system opens the Visual Change Creation form in the OpenSpec Webview panel instead of prompting with a single-line kebab-case input box

#### Scenario: Complete change
- **WHEN** a change is complete
- **THEN** its item shows an inline Archive action

#### Scenario: Incomplete change
- **WHEN** a change is not complete
- **THEN** its item shows an inline Validate action and no inline Archive action
- **AND** Validate, Archive and Sync Specs remain in the context menu of every change

#### Scenario: Opening the spec file
- **WHEN** the user runs the inline "Open spec.md" action on a living spec
- **THEN** the spec's `spec.md` opens in an editor

### Requirement: Schema-Aware Change Artifacts
Expanding an active change SHALL list the artifacts defined by the change's workflow schema, in schema order, falling back to proposal, specs, design and tasks when the schema's artifacts are unknown. A present artifact SHALL open when clicked. A missing artifact SHALL be labelled as missing and SHALL NOT open anything.

#### Scenario: Custom schema
- **WHEN** a change uses a schema whose artifacts are `brief` and `tasks`
- **THEN** expanding the change lists Brief and Tasks, and no Proposal, Specs or Design items

#### Scenario: Missing artifact
- **WHEN** a change has no `design.md`
- **THEN** the Design item is labelled as missing, its tooltip names the file to create, and clicking it opens nothing

#### Scenario: Completion on a custom schema
- **WHEN** a change on a custom schema has every artifact the schema defines and all of its tasks are done
- **THEN** the change is shown as complete, even if it has no proposal, design or delta specs

### Requirement: Delta Spec Breakdown
The specs artifact of an active change SHALL be expandable into one item per delta capability, each showing the number of added, modified, removed and renamed requirements, and opening its delta spec file when clicked.

#### Scenario: Delta spec counts
- **WHEN** a change's delta spec for `spec-explorer` adds two requirements and modifies one
- **THEN** the specs artifact lists `spec-explorer` with the counts `+2 ~1`

### Requirement: Task Group Breakdown
The tasks artifact of an active change SHALL be expandable into its task groups, each showing its completed and total tasks and expanding to its tasks. Clicking a task SHALL open `tasks.md` at that task's line.

#### Scenario: Browsing task groups
- **WHEN** the user expands the tasks artifact of a change whose `tasks.md` has two groups
- **THEN** both groups are listed in file order with their progress, and each expands to its tasks with completed tasks marked

### Requirement: Requirement and Scenario Navigation
Clicking a requirement or scenario in the Living Specs view SHALL open the spec file with the cursor at that requirement's or scenario's heading.

#### Scenario: Jumping to a scenario
- **WHEN** the user clicks a scenario under a requirement in the Living Specs view
- **THEN** the spec's `spec.md` opens with the scenario's heading line selected

### Requirement: Pending Changes on Living Specs
A living spec that is modified by the delta specs of one or more active changes SHALL be marked with the number of pending changes and SHALL list those changes as children. Clicking a pending change SHALL open it in the visual viewer.

#### Scenario: Spec with a pending change
- **WHEN** the active change `add-filters` has a delta spec for the living capability `spec-explorer`
- **THEN** the `spec-explorer` item shows "1 pending" in its description, and expanding it lists `add-filters` under Pending changes

#### Scenario: Spec without pending changes
- **WHEN** no active change has a delta spec for a living capability
- **THEN** its item shows no pending marker and no Pending changes group
