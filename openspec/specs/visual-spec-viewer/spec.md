# Spec: visual-spec-viewer

## Purpose

Renders OpenSpec changes and living specifications as rich, interactive visual documents inside VS Code webview panels with lifecycle pipeline rails, structured requirement cards, acceptance scenarios, and live task lists.

## Requirements

### Requirement: Change Lifecycle Pipeline Rail
The Visual Spec Viewer SHALL display a prominent pipeline progress rail for active changes depicting the progression of artifacts: Proposal, Specs, Design, and Tasks.

#### Scenario: Active change opened in viewer
- **WHEN** a user opens an active change in the Visual Spec Viewer
- **THEN** the pipeline rail renders all lifecycle phases, highlighting completed phases, in-progress phases, and remaining phases

### Requirement: Structured Requirement and Scenario Cards
The Visual Spec Viewer SHALL render requirements as distinct visual cards with normative tags and clean Given/When/Then scenario representations rather than unformatted raw markdown.

#### Scenario: Delta spec rendered in viewer
- **WHEN** the viewer displays a delta specification file
- **THEN** each requirement is rendered in a dedicated card displaying its title, normative text, operational delta badge (ADDED, MODIFIED, REMOVED), and formatted acceptance scenario blocks

#### Scenario: Given When Then formatting
- **WHEN** a requirement contains acceptance scenarios
- **THEN** each scenario is visually structured with distinct styled chips or tokens for GIVEN, WHEN, and THEN clauses

### Requirement: Interactive Tasks Checklist
The Visual Spec Viewer SHALL render the `tasks.md` task list as an interactive visual checklist reflecting real-time task progress.

#### Scenario: Real-time task status updates
- **WHEN** tasks are checked off in `tasks.md` (by an AI agent or manual edit)
- **THEN** the Visual Spec Viewer checklist immediately updates its checked states and updates the completion percentage bar without reloading the tab

#### Scenario: Toggling a task from the viewer
- **WHEN** a user clicks a checkbox directly in the Visual Spec Viewer task list
- **THEN** the viewer sends a message to the extension host to update the underlying `tasks.md` file on disk

### Requirement: Change Overview Dossier
The Visual Spec Viewer SHALL present an overview dossier summarizing the problem statement, scope boundaries, technical decisions, and affected capabilities for the change.

#### Scenario: Viewing change overview
- **WHEN** the user selects the Overview tab or views an active change
- **THEN** the viewer displays the parsed proposal motivation, scope fence (what is in and out of scope), and architectural design summary

### Requirement: Visual Change Creation Form
The Visual Spec Viewer panel SHALL provide a dedicated Change Creation form view when initiated by the user to create a new change.

#### Scenario: Rendering the change creation form
- **WHEN** the viewer is opened in new-change mode
- **THEN** the panel renders a form containing a multi-line change description input, an inferred change name field, an optional schema selector, and a submission button

#### Scenario: Inferred change name generation
- **WHEN** the user inputs or modifies the change description in the creation form
- **THEN** the extension infers a kebab-case change slug using the VS Code Language Model API or an offline heuristic slugifier and populates the change name field

#### Scenario: Submitting the change creation form
- **WHEN** the user submits the creation form with a valid change name and description
- **THEN** the extension scaffolds the new change preserving the description in the proposal, updates the workspace state, and transitions the webview into the visual spec viewer for the created change
