# Design: AI Proposal Motivation Refinement and Validation Feedback Banner

## Context

See `proposal.md` for motivation. The OpenSpec VS Code extension uses a Preact-based webview (`webview-ui`) communicating over a typed postMessage bridge with `SpecViewerPanel` in the extension host.

Currently:
1. `NewChangeForm.tsx` debounces `INFER_CHANGE_NAME` to generate kebab-case slugs, but copies raw text directly into `proposal.md` without synthesizing a structured problem and motivation statement.
2. `ChangeOverview.tsx` sends `RUN_VALIDATE`, which triggers `vscode.commands.executeCommand('openspec.validate')`, logging to the Output Channel without updating the webview state or posting a message back.

## Goals / Non-Goals

**Goals:**
- Add an explicit "Refine with AI" action (`codicon-sparkle`) in `NewChangeForm.tsx` with an editable "Proposal Motivation (Why)" preview.
- Implement `refineProposalMotivation` in `src/core/inference.ts` using `vscode.lm` with a structured heuristic fallback and timeout guard.
- Populate `proposal.md`'s `## Why` section with the user-approved refined motivation during change creation.
- Implement an in-webview validation state machine in `ChangeOverview.tsx`: loading spinner on the button, disabled state while executing, and a dismissible top banner rendering validation status and collapsible CLI diagnostic details.

**Non-Goals:**
- Auto-refining on every keystroke (avoiding race conditions and overwriting manual user adjustments).
- In-place auto-fixing of spec validation errors directly from the webview.

## Decisions

### 1. Explicit AI Refinement Action vs. Automatic Debounced Trigger
- **Choice**: Explicit "Refine with AI" button with editable preview textarea.
- **Rationale**: Live debounced refinement can overwrite deliberate user text edits and introduces unnecessary Language Model token consumption. An explicit button gives users full control to draft rough thoughts first, synthesize when ready, and review/edit the output.
- **Alternatives Considered**: Debounced live refinement on input change (rejected: causes cursor jumps and overwrites user adjustments).

### 2. Protocol Extensions (`messages.ts`)
- **New Messages**:
  - `REFINE_MOTIVATION`: `{ type: 'REFINE_MOTIVATION', description: string }` (Webview $\rightarrow$ Extension)
  - `REFINED_MOTIVATION`: `{ type: 'REFINED_MOTIVATION', motivation: string, isAi: boolean }` (Extension $\rightarrow$ Webview)
  - `VALIDATION_RESULT`: `{ type: 'VALIDATION_RESULT', changeName: string, success: boolean, stdout: string, stderr?: string }` (Extension $\rightarrow$ Webview)
- **Rationale**: Keeps the webview decoupled from VS Code APIs and CLI dependencies, reusing the established message dispatcher pattern.

### 3. Top Banner Component in Webview
- **Choice**: Top banner placed above the Hero card in `ChangeOverview.tsx`.
- **States**:
  - *Idle / Dismissed*: Hidden.
  - *Validating*: Button disabled with spinning `codicon-loading`.
  - *Success*: Green background tint, checkmark icon, message "Spec validation passed: all artifacts and delta specs are valid", and a dismiss button.
  - *Failure*: Red/amber background tint, warning icon, failure summary, collapsible CLI output (`stdout` / `stderr`), and dismiss button.

### 4. Language Model Prompt & Heuristic Fallback
- **Prompt Strategy**: Prompt the LM to act as a technical product strategist, synthesizing raw developer notes into a concise, objective problem & motivation statement answering (1) current limitation, (2) motivation for solving it now.
- **Fallback**: If `vscode.lm` is unavailable, times out (>3.5s), or encounters an error, a heuristic synthesizes a clean, formatted motivation statement from the raw input without blocking the user.

## Risks / Trade-offs

- **[Risk]** LM response latency could make the form feel sluggish.
  - **Mitigation**: Non-blocking asynchronous message with inline "Synthesizing motivation..." spinner; users can submit with raw notes or custom text at any time without waiting.
- **[Risk]** Large validation output in complex repositories could overwhelm the webview.
  - **Mitigation**: Banner displays a single-line summary by default with a collapsible accordion (`<details>`) for raw CLI outputs, capped to a maximum height with scrollbars.
