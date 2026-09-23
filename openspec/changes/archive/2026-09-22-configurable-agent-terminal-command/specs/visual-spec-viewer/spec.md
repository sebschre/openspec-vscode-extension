# Spec Delta: visual-spec-viewer

## MODIFIED Requirements

### Requirement: Visual Change Creation Form
The Visual Spec Viewer panel SHALL provide a dedicated Direct Proposal creation form view that initiates an end-to-end specification document generation sequence and renders real-time progress feedback.

#### Scenario: Rendering the change creation form
- **WHEN** the viewer is opened in new-change mode
- **THEN** the panel renders a form focused on Direct Proposal creation containing a multi-line change description input, an inferred change name field, an optional schema selector, an agent explore guidance hint directing users to `/openspec-explore` in chat for open-ended brainstorming, and a "Create Change & Generate Specs" submission button

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

### Requirement: Dedicated Technical Design Viewer
The Visual Spec Viewer SHALL provide a dedicated Technical Design tab that renders the architectural context, goals, non-goals, decisions, and risks from `design.md`, or a helpful empty state when `design.md` has not yet been authored.

#### Scenario: Navigating to Technical Design
- **WHEN** the user selects the Technical Design tab or clicks "3. Design" in the lifecycle rail
- **THEN** the viewer displays the Technical Design view with architectural context, goals/non-goals, architectural decisions, and risks

#### Scenario: Missing design artifact empty state
- **WHEN** the user opens the Technical Design tab for a change where `design.md` does not exist or has no decisions defined
- **THEN** the viewer renders an empty-state card indicating that no technical design document has been authored yet, with an action to copy the canonical `/openspec-propose` command and an action to run `/openspec-propose` in the dedicated terminal

### Requirement: Change Overview Dossier
The Visual Spec Viewer SHALL present an overview dossier summarizing the problem statement, scope boundaries, technical decisions, and affected capabilities for the change.

#### Scenario: Viewing change overview
- **WHEN** the user selects the Overview tab or views an active change
- **THEN** the viewer displays the parsed proposal motivation, scope fence (what is in and out of scope), and architectural design summary

#### Scenario: Overview action bar canonical propose execution and copy
- **WHEN** the user interacts with the action bar on the Change Overview card
- **THEN** clicking "Copy Prompt" copies the canonical `/openspec-propose` command to the clipboard and clicking "Run in Terminal" triggers execution of `/openspec-propose` via the dedicated agent terminal

### Requirement: Interactive Tasks Checklist
The Visual Spec Viewer SHALL render the `tasks.md` task list as an interactive visual checklist reflecting real-time task progress.

#### Scenario: Real-time task status updates
- **WHEN** tasks are checked off in `tasks.md` (by an AI agent or manual edit)
- **THEN** the Visual Spec Viewer checklist immediately updates its checked states and updates the completion percentage bar without reloading the tab

#### Scenario: Toggling a task from the viewer
- **WHEN** a user clicks a checkbox directly in the Visual Spec Viewer task list
- **THEN** the viewer sends a message to the extension host to update the underlying `tasks.md` file on disk

#### Scenario: Task list implementation actions
- **WHEN** the user interacts with the action buttons in the task list header
- **THEN** clicking "Copy AI Prompt" copies `/openspec-apply-change <change-name>` to the clipboard and clicking "Implement in Terminal" triggers execution of `/openspec-apply-change <change-name>` in the dedicated agent terminal
