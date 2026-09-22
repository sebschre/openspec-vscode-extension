# Spec Delta: visual-spec-viewer

## MODIFIED Requirements

### Requirement: Visual Change Creation Form
The Visual Spec Viewer panel SHALL provide a dedicated Change Creation form view when initiated by the user to create a new change.

#### Scenario: Rendering the change creation form
- **WHEN** the viewer is opened in new-change mode
- **THEN** the panel renders a form containing a multi-line change description input, an inferred change name field, an optional schema selector, and a submission button

#### Scenario: Inferred change name generation
- **WHEN** the user inputs or modifies the change description in the creation form
- **THEN** the extension infers a kebab-case change slug using the VS Code Language Model API or an offline heuristic slugifier and populates the change name field

#### Scenario: Triggering AI proposal motivation refinement
- **WHEN** the user has entered an initial change description and clicks the "Refine with AI" action
- **THEN** the extension synthesizes the raw description into a structured problem and motivation statement using the Language Model API (or a structured fallback heuristic) and displays it in an editable preview field

#### Scenario: Submitting the change creation form
- **WHEN** the user submits the creation form with a valid change name and description
- **THEN** the extension scaffolds the new change populating `proposal.md`'s `## Why` section with the refined motivation, updates the workspace state, and transitions the webview into the visual spec viewer for the created change

## ADDED Requirements

### Requirement: In-Webview Spec Validation Feedback
The Visual Spec Viewer SHALL provide real-time execution feedback and prominent status banners within the webview panel when running OpenSpec validation.

#### Scenario: Triggering spec validation from the webview
- **WHEN** a user clicks the "Validate" button in the change viewer
- **THEN** the button enters an active loading state displaying a spinner and becomes disabled, and the extension host asynchronously runs `openspec validate`

#### Scenario: Displaying successful validation feedback
- **WHEN** the validation command completes without errors
- **THEN** the webview returns the button to its idle state and renders a dismissible top banner indicating that all schemas, requirements, and artifacts are valid

#### Scenario: Displaying validation error diagnostics
- **WHEN** the validation command reports errors or schema discrepancies
- **THEN** the webview displays a prominent warning/error top banner with a collapsible diagnostic section containing the CLI error output and resolution guidance
