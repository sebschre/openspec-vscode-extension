## Purpose

Lets users discover, inspect, and customize OpenSpec workflow schemas, which define the artifacts a change produces and their order, directly from VS Code.

## ADDED Requirements

### Requirement: Schemas View
The extension SHALL display a "Schemas" tree view in the OpenSpec view container listing every workflow schema available to the workspace, resolved with OpenSpec's precedence (project, then user, then built-in).

#### Scenario: Listing schemas
- **WHEN** the workspace has project schemas in `openspec/schemas/`, user schemas, and the built-in schema
- **THEN** each schema name appears once, showing its source, whether it is the project default, and its artifact count, and a project schema that shadows another of the same name is labelled as overriding it

#### Scenario: Inspecting a schema
- **WHEN** the user expands a schema
- **THEN** its artifacts are listed in order with the file each generates and the artifacts it requires, followed by the apply phase, and selecting an artifact opens its template file

#### Scenario: Structural problems
- **WHEN** a schema has a missing template, an unknown dependency, a dependency cycle, or unparsable YAML
- **THEN** the schema is marked with an error count and the problems are listed as child items, without the view failing

#### Scenario: CLI not installed
- **WHEN** the OpenSpec CLI cannot be found
- **THEN** project and user schemas are still listed and the built-in `spec-driven` schema is listed by name

### Requirement: Customize a Schema
The extension SHALL let the user copy any resolvable schema into `openspec/schemas/<name>/` under a new kebab-case name, so it can be edited.

#### Scenario: Forking the built-in schema
- **WHEN** the user runs Customize Schema on `spec-driven` and enters `team-flow`
- **THEN** `openspec/schemas/team-flow/` contains the schema and its templates with `name: team-flow`, and the user is offered to make it the project default

#### Scenario: Name collision
- **WHEN** a project schema with the entered name already exists
- **THEN** the fork is refused and nothing is overwritten

### Requirement: Edit Schema Artifacts
The extension SHALL let the user add an artifact, remove an artifact, and change an artifact's dependencies in project and user schemas, while keeping the schema acyclic and internally consistent. Built-in schemas SHALL be read-only.

#### Scenario: Adding an artifact
- **WHEN** the user adds artifact `research` that requires `proposal`
- **THEN** the artifact is appended to `schema.yaml`, a `templates/research.md` stub is created and opened, and existing instructions are preserved

#### Scenario: Rejecting a cycle
- **WHEN** a dependency edit would make an artifact depend on itself directly or indirectly
- **THEN** the edit is rejected with the cycle path and `schema.yaml` is unchanged

#### Scenario: Removing an artifact
- **WHEN** the user confirms removal of an artifact
- **THEN** it is removed together with every `requires` reference to it, and if the apply phase no longer requires anything, the apply phase is removed and the user is told

### Requirement: Project Default Schema
The extension SHALL let the user choose the project default schema, stored as the `schema` key in `openspec/config.yaml`, and use it for new changes and for changes without schema metadata.

#### Scenario: Setting the default
- **WHEN** the user sets `team-flow` as the default
- **THEN** only the `schema:` line of `openspec/config.yaml` changes and the Schemas view marks `team-flow` as default

#### Scenario: New change form
- **WHEN** the New Change form opens
- **THEN** it offers every schema without errors, with the project default preselected

### Requirement: Validate and Create Schemas
The extension SHALL validate schemas, using the OpenSpec CLI when available and built-in structural checks otherwise, and SHALL create new schemas through `openspec schema init`.

#### Scenario: Validating a schema
- **WHEN** the user runs Validate Schema
- **THEN** the issues are written to the OpenSpec output channel and the user is told whether the schema is valid

#### Scenario: Creating a schema
- **WHEN** the user creates a schema with a name, description, and selected artifacts while the CLI is installed
- **THEN** the schema is created without changing the project default and its `schema.yaml` is opened
