# Spec Delta: visual-spec-viewer

## ADDED Requirements

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
