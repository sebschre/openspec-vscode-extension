# Proposal

## Why

In the Visual Spec Viewer, clicking the "3. Design" step in the top lifecycle pipeline rail triggers a no-op that leaves the user on the Overview tab with no visual feedback. Users expect each pipeline step to correspond directly to a dedicated view of that specification artifact, including architectural decisions, context, and trade-offs.

## What Changes

- Add a first-class `Technical Design` tab to the Visual Spec Viewer tab bar alongside Proposal, Delta Specs, and Tasks.
- Align the top `PipelineRail` component so clicking "3. Design" directly activates the Technical Design tab and renders the active step highlight.
- Create a dedicated `DesignViewer` component in the webview to render design context, goals/non-goals, architectural decisions, and risks/mitigations.
- Add a helpful empty-state placeholder in the Technical Design view when `design.md` has not yet been authored, complete with guidance and a one-click button to copy `/opsx-propose`.
- Streamline the `ChangeOverview` component to focus cleanly on Proposal motivation, scope fence, and validation diagnostics.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `visual-spec-viewer`: Update the Change Lifecycle Pipeline Rail requirement to support direct navigation and active highlighting for Technical Design, and add a requirement for the dedicated Technical Design Viewer tab with empty-state handling.

## Impact

- Webview UI components: `PipelineRail.tsx`, `App.tsx`, `ChangeOverview.tsx`, and new `DesignViewer.tsx`.
- No breaking changes to existing data models or the OpenSpec CLI integration; consumes existing parsed `DesignDetail` structures.
