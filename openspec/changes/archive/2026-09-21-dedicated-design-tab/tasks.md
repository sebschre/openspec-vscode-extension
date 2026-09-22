# Tasks

## 1. Webview Component Implementation

- [x] 1.1 Create `DesignViewer.tsx` in `webview-ui/src/components/` rendering context, goals/non-goals, architectural decisions, and risks from `change.design`, and verify component compiles cleanly.
- [x] 1.2 Implement the empty-state placeholder in `DesignViewer.tsx` displaying guidance and a one-click copy button for `/opsx-propose` when `design.md` is missing, and verify the placeholder renders when `artifactsPresent.design` is false.
- [x] 1.3 Remove duplicate architectural decisions and risks cards from `ChangeOverview.tsx` to maintain clean separation between Proposal and Design, and verify `ChangeOverview` compiles without errors.

## 2. Navigation & Pipeline Rail Integration

- [x] 2.1 Update `activeTab` union type in `App.tsx` to `'overview' | 'specs' | 'design' | 'tasks'`, add the "Technical Design" tab button, wire it to render `DesignViewer`, and verify tab selection works as expected.
- [x] 2.2 Update step 3 in `PipelineRail.tsx` to use `id: 'design'` and `isActive: activeTab === 'design'`, and verify clicking "3. Design" in the rail activates the Design tab with active styling.

## 3. Verification & Build Validation

- [x] 3.1 Run `npm run typecheck` and `npm run build` to verify that both the extension host and webview bundle compile without errors.
- [x] 3.2 Run `openspec validate --change dedicated-design-tab` and `npm test` to verify specification validity and ensure all test suites pass.
