# Spec Delta: visual-spec-viewer

## MODIFIED Requirements

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
