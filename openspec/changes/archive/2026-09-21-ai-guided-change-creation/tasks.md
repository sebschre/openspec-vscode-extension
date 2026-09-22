# Tasks

## 1. Protocol & Core Backend

- [x] 1.1 Extend `src/protocol/messages.ts` with messages for new change mode, name inference, and change submission, and verify TypeScript compiles cleanly.
- [x] 1.2 Update `OpenSpecCliBridge.newChange` in `src/core/cli.ts` to accept an optional `description` and append `--description <text>` when provided, verifying with tests.
- [x] 1.3 Implement name inference helper in `src/core/inference.ts` leveraging `vscode.lm` (Language Model API) with an offline rule-based slugifier fallback, and verify with unit tests.

## 2. Webview Host & Command Integration

- [x] 2.1 Update `SpecViewerPanel` in `src/views/webview/specViewerPanel.ts` to support `renderNewChange` mode, handle `INFER_CHANGE_NAME` and `SUBMIT_NEW_CHANGE` messages, and transition in-place to `updateChange` upon scaffolding.
- [x] 2.2 Update the `openspec.newChange` command in `src/commands/index.ts` to launch `SpecViewerPanel.renderNewChange` rather than prompting with `vscode.window.showInputBox`.

## 3. Webview UI Form

- [x] 3.1 Create `webview-ui/src/components/NewChangeForm.tsx` with a multi-line description textarea, debounced name inference dispatch, editable kebab-case slug field, validation warnings, and submit button.
- [x] 3.2 Update `webview-ui/src/App.tsx` to handle `SET_NEW_CHANGE_MODE` state and render `NewChangeForm` when no change is active or when explicitly requested.
- [x] 3.3 Add an AI follow-up action card in `webview-ui/src/components/ChangeOverview.tsx` to allow copying the agent propose command (`/opsx-propose`) for newly created changes.

## 4. Verification & Build

- [x] 4.1 Run extension tests (`npm test`) and build scripts (`npm run build`, `npm run typecheck`) to verify full compilation and test pass.
- [x] 4.2 Verify manual end-to-end workflow: launch creation form, type natural language description, inspect inferred kebab-case name, submit change, and confirm the visual viewer opens with description preserved in proposal.md.
