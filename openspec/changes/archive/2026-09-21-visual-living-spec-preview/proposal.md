# Proposal: Visual Living Specification Preview

## Why

Currently, clicking on a living specification in the OpenSpec tree explorer opens the raw markdown file directly in the VS Code text editor rather than rendering an interactive visual preview. This raw text view creates unnecessary cognitive load and friction for developers attempting to quickly navigate, review, and understand project capabilities, acceptance scenarios, and normative requirements. Enhancing living specifications with a dedicated, visually appealing preview with normative syntax highlighting and structured Given/When/Then scenario cards makes system capabilities accessible and intuitive at a glance.

## What Changes

- **Living Specification Webview Mode**:
  - Extend `SpecViewerPanel` with a dedicated living specification view mode (`renderLivingSpec` / `SET_LIVING_SPEC`), rendering the capability's purpose, requirements count, and structured requirement dossier.
  - Create a dedicated `LivingSpecViewer.tsx` component in `webview-ui` that displays:
    - Hero header with capability name, purpose statement, and file path.
    - Search / filter input to instantly filter requirements and scenarios.
    - Visual requirement cards with normative badges (`SHALL`, `MUST`, `SHOULD`, `MAY`) and distinct syntax highlighting.
    - Formatted scenario blocks with color-coded `GIVEN`, `WHEN`, and `THEN` tokens.
    - Direct actions: "Open Raw Markdown File" and "Copy Capability Prompt".
- **Tree Explorer & Command Integration**:
  - Update `SpecsTreeProvider` so clicking a living spec tree element opens the Visual Spec Viewer for that capability by default instead of the raw markdown file.
  - Update `openspec.openViewer` command to detect living spec tree items and capabilities and route them to the living spec viewer.
- **Protocol Extensions**:
  - Add `SET_LIVING_SPEC` to `ExtensionToWebviewMessage`.

## Capabilities

### New Capabilities
<!-- No new standalone capabilities; modifications belong to visual-spec-viewer -->

### Modified Capabilities
- `visual-spec-viewer`: Adds requirements and acceptance scenarios for rendering living capability specifications as dedicated visual documents with purpose dossiers, requirement cards, and normative syntax highlighting.

## Impact

- **UI Components**: Adds `webview-ui/src/components/LivingSpecViewer.tsx` and updates `webview-ui/src/App.tsx`.
- **Extension & Tree Providers**: Updates `src/views/tree/specsTreeProvider.ts`, `src/commands/index.ts`, and `src/views/webview/specViewerPanel.ts`.
- **Protocol**: Extends `src/protocol/messages.ts` with living specification viewer messages.
- **Backward Compatibility**: Completely preserves existing active change and new change creation workflows in the Visual Spec Viewer.
