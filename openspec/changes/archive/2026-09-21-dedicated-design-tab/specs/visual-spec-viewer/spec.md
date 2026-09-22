# Spec Delta: visual-spec-viewer

## MODIFIED Requirements

### Requirement: Change Lifecycle Pipeline Rail
The Visual Spec Viewer SHALL display a prominent pipeline progress rail for active changes depicting the progression of artifacts: Proposal, Specs, Design, and Tasks, allowing users to navigate directly to each artifact's dedicated view.

#### Scenario: Active change opened in viewer
- **WHEN** a user opens an active change in the Visual Spec Viewer
- **THEN** the pipeline rail renders all lifecycle phases, highlighting completed phases, in-progress phases, and remaining phases

#### Scenario: Clicking Design in the pipeline rail
- **WHEN** a user clicks the "3. Design" step in the pipeline rail
- **THEN** the viewer switches the active tab to Technical Design and applies active step styling to the Design rail step

## ADDED Requirements

### Requirement: Dedicated Technical Design Viewer
The Visual Spec Viewer SHALL provide a dedicated Technical Design tab that renders the architectural context, goals, non-goals, decisions, and risks from `design.md`, or a helpful empty state when `design.md` has not yet been authored.

#### Scenario: Navigating to Technical Design
- **WHEN** the user selects the Technical Design tab or clicks "3. Design" in the lifecycle rail
- **THEN** the viewer displays the Technical Design view with architectural context, goals/non-goals, architectural decisions, and risks

#### Scenario: Missing design artifact empty state
- **WHEN** the user opens the Technical Design tab for a change where `design.md` does not exist or has no decisions defined
- **THEN** the viewer renders an empty-state card indicating that no technical design document has been authored yet, with an action to copy the `/opsx-propose` command
