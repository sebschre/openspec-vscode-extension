# Tasks

## 1. Protocol & Message Types

- [x] 1.1 Add `SET_LIVING_SPEC` to `ExtensionToWebviewMessage` in `src/protocol/messages.ts` and verify compilation

## 2. Webview Living Spec Component

- [x] 2.1 Create `LivingSpecViewer.tsx` in `webview-ui/src/components/` with capability header, purpose statement, requirement cards, and raw file link
- [x] 2.2 Implement normative keyword highlighting (`SHALL`, `MUST`, `SHOULD`, `MAY`) and Given/When/Then scenario tokens in `LivingSpecViewer.tsx`
- [x] 2.3 Add real-time requirement search filter to `LivingSpecViewer.tsx`
- [x] 2.4 Update `webview-ui/src/App.tsx` to listen for `SET_LIVING_SPEC` and render `LivingSpecViewer`


## 3. Extension Host & Tree Provider Updates

- [x] 3.1 Extend `SpecViewerPanel` in `src/views/webview/specViewerPanel.ts` to support living specifications with `renderLivingSpec` and store change listeners
- [x] 3.2 Update `SpecsTreeProvider` in `src/views/tree/specsTreeProvider.ts` to trigger `openspec.openViewer` on click
- [x] 3.3 Update `openspec.openViewer` in `src/commands/index.ts` to route living spec items and capabilities to `SpecViewerPanel.renderLivingSpec`

## 4. Build, Verification & Testing

- [x] 4.1 Rebuild extension and webview bundle with `npm run build` and verify bundle builds cleanly
- [x] 4.2 Add unit tests in `test/` verifying living spec command routing and tree provider command bindings
- [x] 4.3 Run full test suite and TypeScript check (`npm test` and `npm run typecheck`) and verify 100% pass
- [x] 4.4 Validate OpenSpec change with `openspec validate visual-living-spec-preview`
