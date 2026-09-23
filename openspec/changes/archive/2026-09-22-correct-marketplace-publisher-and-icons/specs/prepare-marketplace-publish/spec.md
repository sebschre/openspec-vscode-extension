# Spec Delta

## MODIFIED Requirements

### Requirement: Icon Attribution
- **The package SHALL include the correct attribution of the author, Sebastian Schreiber.**
- **The Marketplace icon SHALL retain the OpenSpec mark sourced from https://openspec.dev/ and SHALL be a non-SVG image.**
- **The Marketplace icon SHALL have a transparent background and a dark outline around the mark so it remains visible on light backgrounds.**

#### Scenario: Fetch Icon
- **WHEN** the package preparation process is initiated
- **THEN** the system SHALL use the OpenSpec mark sourced from https://openspec.dev/.

#### Scenario: Validate Icon Format
- **WHEN** the extension is packaged
- **THEN** the Marketplace icon SHALL be a non-SVG image with transparent background pixels and a dark outline around the mark.

#### Scenario: Validate Author Attribution
- **WHEN** the extension is packaged
- **THEN** its package metadata SHALL identify Sebastian Schreiber as the author.

## ADDED Requirements

### Requirement: Publisher Identity
The package SHALL identify `sebschre` as its Marketplace publisher, producing the extension ID `sebschre.openspec-vscode`.

#### Scenario: Package Identity
- **WHEN** a VSIX is created
- **THEN** its manifest SHALL declare `sebschre` as publisher and `openspec-vscode` as extension name.

### Requirement: Activity Bar Icon Legibility
The Activity Bar SHALL use an icon distinct from the Marketplace artwork that displays the OpenSpec mark clearly at Activity Bar size in light and dark themes.

#### Scenario: Render Activity Bar Icon
- **WHEN** the extension is installed and its view container is shown in a light or dark VS Code theme
- **THEN** the Activity Bar SHALL show a recognizable OpenSpec mark without a solid square background.
