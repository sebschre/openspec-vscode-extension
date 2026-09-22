# Spec Delta: visual-spec-viewer

## ADDED Requirements

### Requirement: Living Specification Visual Preview
The Visual Spec Viewer SHALL provide a dedicated visual document view for living specifications displaying capability purpose, requirement cards with normative highlighting, and structured scenario representations.

#### Scenario: Opening a living specification from the tree explorer
- **WHEN** a user clicks on a living specification in the OpenSpec Living Specs tree view
- **THEN** the Visual Spec Viewer opens in living-spec mode displaying the capability header, purpose statement, and structured requirement dossier instead of raw markdown text

#### Scenario: Normative keyword highlighting
- **WHEN** living specification requirements are rendered in the viewer
- **THEN** normative keywords (SHALL, MUST, SHOULD, MAY) are highlighted with distinctive styled visual badges or tokens

#### Scenario: Requirement search and filtering
- **WHEN** a user enters text in the living specification search filter
- **THEN** the requirements list dynamically filters to display matching requirements and scenarios
