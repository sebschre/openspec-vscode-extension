# Tasks

## 1. Protocol & Core AI Refinement

- [x] 1.1 Extend `src/protocol/messages.ts` with `REFINE_MOTIVATION`, `REFINED_MOTIVATION`, and `VALIDATION_RESULT` message definitions and verify compilation
- [x] 1.2 Implement `refineProposalMotivation` in `src/core/inference.ts` with `vscode.lm` integration and structural heuristic fallback
- [x] 1.3 Add unit tests in `src/test/inference.test.ts` covering `refineProposalMotivation` and verify tests pass with `npm test`

## 2. Extension Host Message & Scaffolding Updates

- [x] 2.1 Update `SpecViewerPanel` message dispatcher in `src/views/webview/specViewerPanel.ts` to handle `REFINE_MOTIVATION` and post back `REFINED_MOTIVATION`
- [x] 2.2 Update `SpecViewerPanel` handling of `RUN_VALIDATE` to invoke `cli.validate` and post `VALIDATION_RESULT` back to the webview
- [x] 2.3 Update `SUBMIT_NEW_CHANGE` in `src/views/webview/specViewerPanel.ts` to populate `proposal.md`'s `## Why` section with the refined motivation


## 3. Webview UI Enhancements

- [x] 3.1 Update `webview-ui/src/components/NewChangeForm.tsx` to include the "Refine with AI" button, refinement loading state, and editable motivation textarea
- [x] 3.2 Update `webview-ui/src/components/ChangeOverview.tsx` to track `isValidating` loading state on the Validate button
- [x] 3.3 Add dismissible top banner to `webview-ui/src/components/ChangeOverview.tsx` displaying validation success status or collapsible diagnostic errors
- [x] 3.4 Rebuild webview bundle with `npm run build:webview` and verify build completes without warnings or errors


## 4. End-to-End Verification

- [x] 4.1 Run full test suite and TypeScript checks (`npm test` and `npm run typecheck`) and verify 100% pass
- [x] 4.2 Validate OpenSpec artifacts with `openspec validate refine-description-and-validation-banner`


