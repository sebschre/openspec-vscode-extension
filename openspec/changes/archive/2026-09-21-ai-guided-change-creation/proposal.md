# Proposal: AI-Guided Change Creation Form

## Why

Creating a new OpenSpec change from the VS Code Companion currently prompts the user with a single-line input box asking strictly for a kebab-case name (e.g. `add-user-auth`). If the user attempts to describe their desired change in natural language, input validation fails with a regex error. This inverts the spec-driven development workflow: users are forced to invent a slug before they can describe what they want to build, and any context or problem description they had in mind is lost. 

Introducing a dedicated visual change creation form in the Companion Webview allows users to describe their intended feature or fix in natural language. The extension can then infer an appropriate kebab-case change name using the VS Code Language Model API (`vscode.lm`) with a reliable offline fallback, scaffold the change while preserving the description in `proposal.md`, and immediately open the Visual Spec Viewer for review and follow-up.

## What Changes

- **Dedicated Visual Creation Form**: Replace the single `showInputBox` prompt for `openspec.newChange` with a dedicated form inside the Companion Webview featuring a multi-line description input, schema selector, and inferred change name field.
- **AI Name Inference with Heuristic Fallback**: Implement automatic name inference that takes the user's description and generates a concise kebab-case slug (e.g. `add-github-oauth`) using the VS Code Language Model API (`vscode.lm`), falling back to an offline rule-based slugifier when no LM extension is present.
- **Editable Inferred Name**: Display the inferred name in an editable text field so users can inspect, accept, or customize the slug before scaffolding.
- **Description Persistence in Scaffolding**: Pass the description to `openspec new change <name> --description <text>` and ensure the description is seeded into the newly created `proposal.md` under `## Why` and `## What Changes`.
- **Seamless Webview Transition**: Upon form submission, transition the webview directly into the Visual Spec Viewer for the newly created change without opening extra tabs or losing context.

## Capabilities

### New Capabilities

*(None)*

### Modified Capabilities

- `companion-explorer`: Update the "Creating a new change from explorer" scenario so that clicking the "New Change" action launches the visual creation form instead of a single kebab-case input box prompt.
- `visual-spec-viewer`: Add requirements and scenarios for rendering the dedicated "New Change Creation Form", supporting live AI/heuristic name inference, and transitioning smoothly to the change overview upon creation.

## Impact

- `src/commands/index.ts`: Update `openspec.newChange` command handler to open the visual creation form in the webview instead of `vscode.window.showInputBox`.
- `src/core/cli.ts`: Update `cli.newChange` to support `--description` parameter.
- `src/protocol/messages.ts`: Add protocol messages for opening the new change form, requesting/returning inferred change names, and submitting the new change.
- `src/views/webview/specViewerPanel.ts`: Support rendering the new change form and handling AI name inference (`vscode.lm` with fallback) and creation transitions.
- `webview-ui/src/App.tsx` & `webview-ui/src/components/NewChangeForm.tsx`: Add the form component with styled description textarea, inferred name badge, validation, and submit actions.
