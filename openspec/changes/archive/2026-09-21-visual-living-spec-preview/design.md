# Design: Visual Living Specification Preview

## Context

See `proposal.md` for motivation. Currently, `SpecsTreeProvider` attaches `vscode.open` to `SpecItemElement`, opening raw markdown directly in the editor. `SpecViewerPanel` only renders active changes (`ChangeDetail`) and the new change creation form.

## Goals / Non-Goals

**Goals:**
- Extend `SpecViewerPanel` with `SpecViewerPanel.renderLivingSpec(extensionUri, store, capability)` to support rendering living specifications.
- Introduce `SET_LIVING_SPEC` message in `src/protocol/messages.ts` passing `SpecDetail`.
- Build `LivingSpecViewer.tsx` in `webview-ui` with:
  - Capability header with purpose summary, requirement count, and file link.
  - Real-time search filter for requirements and scenarios.
  - Normative keyword highlighting (`SHALL`, `MUST`, `SHOULD`, `MAY`).
  - Given/When/Then scenario tokens and formatting.
  - Action button to open raw markdown in the editor.
- Update `SpecsTreeProvider` to dispatch `openspec.openViewer` with the living specification item instead of `vscode.open`.
- Update `openspec.openViewer` in `src/commands/index.ts` to detect living specs and invoke `SpecViewerPanel.renderLivingSpec`.

**Non-Goals:**
- Direct in-webview editing of living specifications (living specs are modified through OpenSpec changes).

## Decisions

### 1. Unified Webview Panel Architecture
- **Choice**: Extend `SpecViewerPanel` rather than introducing a separate webview panel class.
- **Rationale**: Reuses existing Preact bundle, CSS theme styling, dispose lifecycle, and state store listeners. The panel manages panel tracking by capability key (`spec:<capability>`).
- **Alternatives Considered**: Creating a distinct `LivingSpecPanel` class (rejected: creates code duplication in webview bootstrapping, HTML template, and disposable cleanup).

### 2. Protocol Integration
- **Extension $\rightarrow$ Webview**:
  - `SET_LIVING_SPEC`: `{ type: 'SET_LIVING_SPEC', spec: SpecDetail }`
- **Webview $\rightarrow$ Extension**:
  - `OPEN_FILE`: `{ type: 'OPEN_FILE', filePath: string }` (already supported by `SpecViewerPanel`)
- **Rationale**: Keeps the webview lightweight and driven by parsed `SpecDetail` from `OpenSpecStateStore`.

### 3. Normative Highlighting & Given/When/Then Parsing
- **Choice**: Visual badges and inline token styling for normative language (`SHALL`, `MUST` $\rightarrow$ accent/amber badges; `SHOULD` $\rightarrow$ info badge; `MAY` $\rightarrow$ subtle badge) and Given/When/Then clause breakdown.
- **Rationale**: Directly solves developer cognitive fatigue by surfacing behavioral contracts at a glance.

## Risks / Trade-offs

- **[Risk]** Developers who want to edit the raw markdown quickly might feel impeded by the visual viewer opening first.
  - **Mitigation**: Add a prominent "Open Raw Markdown" button in the header of the living spec viewer, and retain context menu options in the explorer.
