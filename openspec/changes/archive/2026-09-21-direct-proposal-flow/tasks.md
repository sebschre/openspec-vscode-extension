# Tasks: Direct Proposal Flow and Spec Generation

## 1. Protocol & Message Types

- [x] 1.1 Update `src/protocol/messages.ts` with `GENERATION_PROGRESS` event types and streamlined `SUBMIT_NEW_CHANGE` payload, and verify types compile with `npm run typecheck`

## 2. Spec Document Generation Engine

- [x] 2.1 Implement `generateProposalDoc`, `generateDeltaSpecDoc`, `generateDesignDoc`, and `generateTasksDoc` in `src/core/inference.ts` with `vscode.lm` prompts and schema-compliant deterministic fallbacks, and verify unit tests in `test/inference.test.ts` pass
- [x] 2.2 Wire the multi-step generation pipeline into `src/views/webview/specViewerPanel.ts` to author `proposal.md`, `specs/`, `design.md`, and `tasks.md` sequentially and execute `cli.validate()`, and verify end-to-end test execution in `test/e2e-workflow.test.ts`

## 3. Webview UI Direct Proposal Experience

- [x] 3.1 Refactor `webview-ui/src/components/NewChangeForm.tsx` to streamline the direct proposal form and display agent explore guidance pointing to `/opsx-explore`, and verify webview bundle builds with `npm run build`
- [x] 3.2 Implement live multi-step generation progress stepper in `webview-ui/src/components/NewChangeForm.tsx` reflecting Scaffolding, Proposal, Specs, Design, Tasks, and Validation states, and verify state transitions upon form submission

## 4. End-to-End Verification & Validation

- [x] 4.1 Update test suites to verify that submitting a change creates all four specification documents passing OpenSpec validation, and verify `npm test` passes
- [x] 4.2 Run full extension and webview build (`npm run build`) and type check (`npm run typecheck`), verifying zero build or lint warnings
