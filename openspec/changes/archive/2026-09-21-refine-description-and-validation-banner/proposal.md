# Proposal: AI Proposal Motivation Refinement and Validation Feedback Banner

## Why

When authoring new OpenSpec changes through the Visual Spec Viewer, users currently write a raw description that is dumped verbatim into the proposal without technical synthesis or structure, requiring manual rewriting after creation. Additionally, clicking the "Validate" button inside the Visual Spec Viewer triggers the CLI in the background and logs to an external output channel, but provides zero visual state feedback (loading indicator, status banner, or diagnostic errors) within the webview panel itself, making it appear non-responsive or broken.

## What Changes

- **AI Proposal Motivation Refinement**:
  - Add an explicit "Refine with AI" action in the New Change creation form (`NewChangeForm.tsx`) using the VS Code Language Model API (`vscode.lm`) with an offline structural fallback.
  - Provide an editable "Proposal Motivation (Why)" preview field in the creation form allowing developers to inspect, tweak, or regenerate the synthesized technical problem and motivation before saving.
  - Populate the resulting `proposal.md`'s `## Why` section with the refined motivation text upon change creation.
- **In-Webview Validation Feedback Loop**:
  - Introduce an asynchronous validation feedback protocol (`RUN_VALIDATE` and `VALIDATION_RESULT`) connecting the webview and extension host.
  - Display an immediate loading spinner and disabled state on the "Validate" button while `openspec validate` executes.
  - Render an interactive, dismissible top banner in the Visual Spec Viewer displaying the validation outcome (green check for success, warning/error banner with collapsible CLI diagnostic outputs if validation errors occur).

## Capabilities

### New Capabilities
<!-- No new standalone capabilities; modifications belong to visual-spec-viewer -->

### Modified Capabilities
- `visual-spec-viewer`: Adds normative requirements and scenarios for interactive AI proposal motivation refinement in the change creation form, as well as in-webview validation execution states and diagnostic feedback banners.

## Impact

- **UI Components**: Updates `NewChangeForm.tsx` and `ChangeOverview.tsx` (or top layout) in `webview-ui/`.
- **Extension & Protocol**: Extends `messages.ts` with `REFINE_MOTIVATION`, `REFINED_MOTIVATION`, and `VALIDATION_RESULT`. Updates `specViewerPanel.ts` and `inference.ts`.
- **Backward Compatibility**: Fully backward compatible; works seamlessly offline or without language models via heuristic fallbacks.
