# Spec Delta: companion-explorer

## MODIFIED Requirements

### Requirement: Explorer Quick Actions
The extension SHALL provide inline action icons and context menu actions for change and spec items in the explorer.

#### Scenario: Creating a new change from explorer
- **WHEN** the user clicks the "New Change" action button in the Active Changes view header or triggers the `openspec.newChange` command
- **THEN** the system opens the Visual Change Creation form in the Companion Webview panel instead of prompting with a single-line kebab-case input box
