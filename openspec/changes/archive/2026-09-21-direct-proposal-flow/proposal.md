# Proposal: Direct Proposal Flow with Full Spec Generation

## Why

Currently, clicking the `+` icon in the Active Changes view opens a creation form that only collects a change description and optionally refines its motivation. When submitted, the extension creates an incomplete change containing only a barebones `proposal.md` and a single dummy task, producing no delta specifications (`specs/<capability>/spec.md`) and no technical design (`design.md`).

This forces developers out of the intended OpenSpec workflow, where planning requires a complete set of schema artifacts—proposal, delta specs, design, and implementation tasks—validated before moving to implementation (`openspec-apply`). Furthermore, exploration is inherently an interactive dialogue best served by the user's AI coding assistant chat interface (`/opsx-explore`). The VS Code UI should provide the direct proposal flow experienced in the CLI: taking the change description and generating all specification documents and tasks in one step.

## What Changes

- **Direct Proposal Experience**: Refocus the New Change webview panel on the Direct Proposal flow, removing isolated motivation refinement and clarifying that open-ended brainstorming is handled by the AI agent chat (`/opsx-explore`).
- **Comprehensive Spec Document Generation**: When a user submits the creation form, automatically generate all required schema artifacts:
  - `proposal.md` with complete Why, What Changes, Capabilities, and Impact sections.
  - `specs/<capability-path>/spec.md` with capability purpose, normative requirements (SHALL/MUST), and structured GIVEN/WHEN/THEN acceptance scenarios.
  - `design.md` with context, goals, non-goals, architectural decisions, and trade-offs.
  - `tasks.md` with phased, grouped checklist items ready for execution.
- **Generation Stepper & Progress Feedback**: Render a live, multi-step progress stepper in the webview during generation (Scaffolding -> Proposal -> Delta Specs -> Design -> Tasks -> Validation) so the user receives clear real-time feedback.
- **Pre-Apply Validation**: Automatically run OpenSpec schema validation (`openspec validate`) upon completing document generation before transitioning the panel to the Change Viewer.
- **Dual-Mode Generation Support**: Implement generation using `vscode.lm` (Language Model API) when available, paired with robust, fully compliant offline heuristic templates to guarantee schema validation passes under any environment.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `visual-spec-viewer`: Update the Visual Change Creation Form requirement to generate the complete suite of specification documents (Proposal, Delta Specs, Design, Tasks), render multi-step generation progress, and validate the change before transitioning to the change viewer.

## Impact

- **UI Components**: `webview-ui/src/components/NewChangeForm.tsx` gains multi-step generation progress states, streamlined inputs, and guidance for agent explore mode.
- **Extension Protocol**: `src/protocol/messages.ts` updated with progress notification events (`GENERATION_PROGRESS`, `GENERATION_STEP`).
- **Webview Controller**: `src/views/webview/specViewerPanel.ts` orchestrates the multi-document generation pipeline and pre-apply validation pass.
- **Inference Engine**: `src/core/inference.ts` adds generators for proposal, delta specs, design, and tasks with both LM-backed and deterministic template fallback logic.
- **Tests**: `test/e2e-workflow.test.ts` and `test/inference.test.ts` updated to verify all 4 specification documents are scaffolded, populated, and valid.
