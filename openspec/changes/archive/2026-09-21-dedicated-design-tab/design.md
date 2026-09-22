# Design: dedicated-design-tab

## Context

See `proposal.md` for motivation. Currently, in `PipelineRail.tsx`, step 3 ("3. Design") sets `id: 'overview'` and `isActive: false`, so clicking it leaves the user on the Overview tab. The `activeTab` state in `App.tsx` only supports `'overview' | 'specs' | 'tasks'`. Architectural decisions and risks are appended at the bottom of `ChangeOverview.tsx`, but are omitted if `change.design.decisions` is empty.

## Goals / Non-Goals

**Goals:**
- Provide a dedicated, first-class `Technical Design` tab in the Visual Spec Viewer.
- Align `PipelineRail` so clicking "3. Design" selects `'design'` and properly shows active step styling.
- Create a `DesignViewer` component that cleanly presents context, goals, non-goals, architectural decisions, and risks from `design.md`.
- Provide an informative empty-state view with an action button to copy `/opsx-propose` when `design.md` is absent or unparsed.
- Streamline `ChangeOverview` to focus exclusively on Proposal motivation, scope fence, and validation.

**Non-Goals:**
- Modifying the parser regexes or schema validation rules in the core library.
- Changing the behavior or layout of Living Spec preview.

## Decisions

### Decision 1: Dedicated Tab vs Scroll-to-Anchor (Option A.1)
We will introduce a dedicated `'design'` tab and view rather than anchoring within the Overview tab.
- **Rationale**: The lifecycle rail visually promises 4 distinct phases (Proposal, Delta Specs, Design, Tasks). Aligning the sub-navigation tabs 1:1 with the pipeline steps creates an intuitive, predictable interface. Moving decisions out of `ChangeOverview` keeps the proposal dossier focused purely on problem definition and scope fencing.
- **Alternatives Considered**: Scrolling to an anchor card in Overview (rejected: confusing to users expecting a separate phase view, leaves `isActive` hardcoded to false).

### Decision 2: Dedicated Component `DesignViewer.tsx`
We will implement a standalone Preact component `DesignViewer` in `webview-ui/src/components/DesignViewer.tsx`.
- **Rationale**: Encapsulates design presentation (context, goals, decisions, risks) and the missing-document empty state cleanly without bloating `App.tsx` or `ChangeOverview.tsx`.
- **Alternatives Considered**: Inlining the JSX inside `App.tsx` (rejected: worsens maintainability).

### Decision 3: Missing Document Empty State
When `change.artifactsPresent.design` is false or `change.design` has no decisions, `DesignViewer` will render a guided empty state.
- **Rationale**: In early change stages, `design.md` may not exist yet. An empty state card with guidance and a one-click copy button for `/opsx-propose` guides the user toward generating or authoring the design.
- **Alternatives Considered**: Disabling the button in the pipeline rail (rejected: confusing when users click or want to inspect design readiness).

## Risks / Trade-offs

- **Risk**: Narrow sidebar/webview widths causing tab header wrapping or crowding.
  - **Mitigation**: Use a flexible, scrollable tab container matching the style in `PipelineRail`.
- **Risk**: Changes authored with non-standard design formatting lacking `### Decisions`.
  - **Mitigation**: Display the raw context or a graceful fallback card if specific parsed sections are empty.
