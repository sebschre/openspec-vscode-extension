# Spec Delta: companion-explorer

## MODIFIED Requirements

### Requirement: Archived Changes View
The extension SHALL display an "Archive" tree view in the OpenSpec Activity Bar view container listing completed changes stored in `openspec/changes/archive/`. Each archived change SHALL be represented as an expandable tree item that does not alter the workspace root when clicked and reveals its archived artifacts as child items.

#### Scenario: Viewing archived changes
- **WHEN** the user expands the Archive view
- **THEN** all archived change folders are displayed with their completion timestamps as collapsible items

#### Scenario: Expanding an archived change
- **WHEN** the user expands an archived change item
- **THEN** the child items display the archived change artifacts (such as Proposal, Design, Tasks, and delta specs) that exist within that archived folder

#### Scenario: Clicking an archived change
- **WHEN** the user clicks on the top-level archived change tree item
- **THEN** the extension toggles the expansion state of the item and SHALL NOT reload the window or change the active workspace folder

#### Scenario: Inspecting an archived artifact
- **WHEN** the user clicks on an artifact child item under an archived change
- **THEN** the extension opens the corresponding artifact file in an editor tab within the current workspace
