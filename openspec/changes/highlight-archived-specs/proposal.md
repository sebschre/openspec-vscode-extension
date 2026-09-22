# Proposal: highlight-archived-specs

## Why
Currently, archived specifications are displayed without any visual distinction, making it difficult for users to identify them quickly. This lack of highlighting can lead to confusion, especially in projects with numerous specifications where both living and archived specs coexist. By implementing visual highlighting for archived specs, we can enhance user experience and improve the clarity of the specification management process.

The motivation behind this change is to ensure that all types of specifications are easily identifiable at a glance. Just as living specs are highlighted for immediate attention, archived specs should also be formatted in a way that reflects their status, allowing users to navigate through specifications more efficiently.

## What Changes
- Implement visual highlighting for archived specifications in the UI.
- Apply consistent formatting to archived specs to differentiate them from living specs.

## Capabilities

### New Capabilities
- `highlight-archived-specs`: This capability covers the visual enhancement of archived specifications, ensuring they are easily distinguishable from living specs through highlighting and formatting.

### Modified Capabilities

## Impact
This change will affect the UI components responsible for rendering specifications, as well as any related APIs that retrieve and display archived specs. Dependencies may include styling libraries and components that handle the formatting of specifications.