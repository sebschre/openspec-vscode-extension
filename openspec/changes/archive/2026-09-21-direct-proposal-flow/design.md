# Design: Direct Proposal Flow and Spec Generation

## Context

The OpenSpec VS Code extension features an interactive Webview panel (`SpecViewerPanel`) that renders active changes, living specs, and a creation form (`NewChangeForm.tsx`). Previously, submitting this form created an incomplete change stub containing only a partial `proposal.md` and a single dummy task, omitting delta specifications (`specs/<capability>/spec.md`) and technical design (`design.md`).

This design establishes an automated, multi-step generation pipeline within the extension that produces all four required schema artifacts, validates the change with the OpenSpec CLI, and updates the UI with real-time stepper feedback.

See `proposal.md` for motivation and `specs/visual-spec-viewer/spec.md` for requirement specifications.

## Goals / Non-Goals

**Goals:**
- Implement an automated generation engine producing complete, schema-compliant `proposal.md`, `specs/<capability>/spec.md`, `design.md`, and `tasks.md` documents upon change submission.
- Provide a responsive multi-step generation progress stepper in `NewChangeForm.tsx` (Scaffolding -> Proposal -> Delta Specs -> Design -> Tasks -> Validation).
- Support dual-mode generation: utilizing `vscode.lm` when active, with deterministic, fully compliant fallback generators when offline.
- Run `openspec validate` immediately after generation to ensure all documents satisfy schema rules before transitioning to the Change Viewer.
- Simplify the creation form by removing isolated motivation refinement and adding explicit guidance directing users to `/opsx-explore` in their AI chat for open-ended brainstorming.

**Non-Goals:**
- Implementing an interactive chat window inside the Webview panel (explore mode belongs in the user's agent interface).
- Implementing or executing tasks (the `apply` phase remains a separate, deliberate user action).

## Decisions

### Decision 1: Sequential Generation Pipeline vs. Monolithic Call
We adopt a sequential generation pipeline (Proposal -> Delta Specs -> Design -> Tasks -> Validation) rather than a single monolithic LLM prompt.
- **Rationale**: Sequential generation matches the OpenSpec schema dependency graph. Downstream documents can consume the structured outputs of upstream documents (e.g. tasks are derived directly from the generated delta requirements and architectural decisions).
- **Alternatives Considered**: Single large JSON output. Rejected because single calls frequently hit token limits, hallucinate multi-file formatting, and preclude granular progress stepper updates in the UI.

### Decision 2: Dual-Mode Generation (VS Code LM API with Heuristic Fallback)
The generation engine attempts to use `vscode.lm.selectChatModels()` with tailored system prompts for each document. If no model is returned, or if an inference call times out or errors, the pipeline falls back to intelligent, deterministic template generators.
- **Rationale**: Developers work in varied environments (offline, air-gapped, or without active Copilot/LM access). The extension must always succeed in generating valid, well-structured OpenSpec documents that pass `openspec validate`.
- **Alternatives Considered**: Disallowing change creation without an active Language Model. Rejected as an unacceptable barrier to standard OpenSpec usage.

### Decision 3: Stepper-Based Webview Protocol
We introduce new message types across the webview protocol:
- Extension to Webview: `GENERATION_PROGRESS` carrying `{ step: 'scaffolding' | 'proposal' | 'specs' | 'design' | 'tasks' | 'validating', status: 'pending' | 'active' | 'completed' | 'error', message?: string }`.
- Webview to Extension: `SUBMIT_NEW_CHANGE` carrying `{ name, description, schema }`.
- **Rationale**: Multi-artifact generation takes 2–4 seconds with an LLM. Granular progress events give the developer confidence and clarity about the exact documents being authored.
- **Alternatives Considered**: Indeterminate spinner. Rejected because it hides pipeline progress and gives no indication of what documents are being synthesized.

## Risks / Trade-offs

- **[Risk] LLM Timeout or Rate Limit during multi-step generation**
  → *Mitigation*: Each generation step is wrapped in a 5-second timeout. If a timeout or error occurs on any step, the engine immediately falls back to the deterministic generator for that step, ensuring the pipeline always finishes promptly.

- **[Risk] Malformed markdown output failing OpenSpec validation**
  → *Mitigation*: The generator enforces strict sanitization (e.g. ensuring `#### Scenario:` has exactly 4 hashes, requirement headers match `### Requirement:`, and normative SHALL keywords are present). The final validation step verifies compliance before displaying the change.
