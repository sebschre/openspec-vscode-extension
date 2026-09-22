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
The Visual Spec Viewer panel SHALL provide a dedicated Direct Proposal creation form view that initiates an end-to-end specification document generation sequence and renders real-time progress feedback.

#### Scenario: Rendering the change creation form
- **WHEN** the viewer is opened in new-change mode
- **THEN** the panel renders a form focused on Direct Proposal creation containing a multi-line change description input, an inferred change name field, an optional schema selector, an agent explore guidance hint directing users to `/opsx-explore` in chat for open-ended brainstorming, and a "Create Change & Generate Specs" submission button

#### Scenario: Inferred change name generation
- **WHEN** the user inputs or modifies the change description in the creation form
- **THEN** the extension infers a kebab-case change slug using the VS Code Language Model API or an offline heuristic slugifier and populates the change name field

#### Scenario: Triggering AI proposal motivation refinement
- **WHEN** the user initiates proposal generation from the creation form
- **THEN** the extension utilizes the Language Model API (or deterministic offline generators) to synthesize the user's intent into a structured problem and motivation statement for `proposal.md` as part of the complete generation sequence

#### Scenario: Submitting the change creation form
- **WHEN** the user submits the creation form with a valid change name and description
- **THEN** the extension executes an end-to-end generation sequence that generates all required schema artifacts: `proposal.md`, delta specifications under `specs/<capability-path>/spec.md`, architectural decisions in `design.md`, and an implementation checklist in `tasks.md`

#### Scenario: Live generation progress feedback
- **WHEN** the change artifact generation sequence is running
- **THEN** the creation form renders a live multi-step progress stepper indicating the active generation stage (Scaffolding, Proposal, Delta Specs, Design, Tasks, Validation) with loading spinners and completion checkmarks

#### Scenario: Pre-apply validation and transition
- **WHEN** all specification documents have been generated
- **THEN** the extension automatically runs `openspec validate` to verify schema compliance, updates the workspace state, and transitions the webview panel into the Visual Spec Viewer for the created change with all pipeline phases marked ready

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

### Requirement: Living Specification Visual Preview
The Visual Spec Viewer SHALL provide a dedicated visual document view for living specifications displaying capability purpose, requirement cards with normative highlighting, and structured scenario representations.

#### Scenario: Opening a living specification from the tree explorer
- **WHEN** a user clicks on a living specification in the OpenSpec Living Specs tree view
- **THEN** the Visual Spec Viewer opens in living-spec mode displaying the capability header, purpose statement, and structured requirement dossier instead of raw markdown text

#### Scenario: Normative keyword highlighting
- **WHEN** living specification requirements are rendered in the viewer
- **THEN** normative keywords (SHALL, MUST, SHOULD, MAY) are highlighted with distinctive styled visual badges or tokens

#### Scenario: Requirement search and filtering
- **WHEN** a user enters text in the living specification search filter
- **THEN** the requirements list dynamically filters to display matching requirements and scenarios


