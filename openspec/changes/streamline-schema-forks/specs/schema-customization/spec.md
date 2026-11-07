## MODIFIED Requirements

### Requirement: Customize a Schema
The extension SHALL let the user copy any resolvable schema into `openspec/schemas/<name>/` under a new kebab-case name, so it can be edited. Within the same flow, it SHALL ask whether the copy becomes the project default. When the copy is created, it SHALL be selected and expanded in the Schemas view.

#### Scenario: Forking the built-in schema
- **WHEN** the user runs Customize Schema on `spec-driven` and enters `team-flow`
- **THEN** `openspec/schemas/team-flow/` contains the schema and its templates with `name: team-flow`

#### Scenario: Choosing the default during the fork
- **WHEN** the user has named the copy
- **THEN** they are asked whether new changes should use it, before anything is written, and cancelling the question cancels the fork
- **AND** "use it for new changes" is the first option when the source is the current project default, and "keep the current default" is first otherwise

#### Scenario: Revealing the new fork
- **WHEN** the fork is created
- **THEN** the new schema is selected and expanded in the Schemas view, and the confirmation message offers to open its `schema.yaml`

#### Scenario: Name collision
- **WHEN** a project schema with the entered name already exists
- **THEN** the fork is refused and nothing is overwritten

#### Scenario: Name of another schema
- **WHEN** the entered name is already used by a user or built-in schema
- **THEN** the name is refused with an explanation, so a copy never silently overrides another schema

## ADDED Requirements

### Requirement: Fork Lineage
A schema forked by the extension SHALL record the name, location (project, user or built-in) and version of its source. The extension SHALL use this record to show where the fork came from and to compare the fork with its source. The record SHALL NOT be stored in `schema.yaml` and SHALL NOT affect how the OpenSpec CLI resolves or validates the schema.

#### Scenario: Showing the origin
- **WHEN** the Schemas view lists a schema forked from the built-in `spec-driven` at version 1
- **THEN** its description and tooltip say it was forked from `spec-driven` (built-in)

#### Scenario: Source has moved on
- **WHEN** the source schema now declares a higher version than the one recorded
- **THEN** the fork is marked as having an updated source

#### Scenario: Comparing with the original
- **WHEN** the user runs Compare with Original on a fork
- **THEN** the files that differ between the fork and its source (`schema.yaml` and templates) are offered, each labelled as changed, added or removed, and choosing one opens a side-by-side diff
- **AND** when nothing differs, the user is told so

#### Scenario: Source no longer available
- **WHEN** the recorded source cannot be resolved any more
- **THEN** Compare with Original tells the user that the source is unavailable, and the origin is still shown

#### Scenario: Schemas without lineage
- **WHEN** a project schema was created by hand or by the CLI
- **THEN** no origin is shown and Compare with Original is not offered

### Requirement: Delete and Rename Project Schemas
The extension SHALL let the user delete and rename project schemas. User and built-in schemas SHALL NOT be deleted or renamed.

#### Scenario: Deleting a schema
- **WHEN** the user confirms deletion of a project schema
- **THEN** its folder is moved to the trash, and the confirmation names the active changes that use the schema

#### Scenario: Deleting the default schema
- **WHEN** the deleted schema was the project default
- **THEN** the default is reset to the fork's source when one is recorded and still resolves, and to `spec-driven` otherwise, and the user is told which default is now in effect

#### Scenario: Renaming a schema
- **WHEN** the user renames project schema `team-flow` to `lean-flow`
- **THEN** the folder and the `name:` field become `lean-flow`, the project default follows if it was `team-flow`, and active changes whose metadata names `team-flow` are updated to `lean-flow`
- **AND** a name already used by any project, user or built-in schema is rejected

### Requirement: Open Artifact Definition
The extension SHALL let the user open a schema's `schema.yaml` with the cursor on a given artifact's entry, or on the apply phase, for any schema whose files can be located.

#### Scenario: Opening an artifact definition
- **WHEN** the user runs Open Definition on artifact `design`
- **THEN** `schema.yaml` opens with the cursor on the line that declares `id: design`

#### Scenario: Definition cannot be located
- **WHEN** the entry's line cannot be found
- **THEN** `schema.yaml` opens at the top

### Requirement: Schema Diagnostics
The extension SHALL report the structural problems of project and user schemas in the Problems panel as diagnostics on their `schema.yaml`. Problems that concern a specific artifact SHALL be placed on that artifact's entry, and other problems on the first line. Diagnostics SHALL update whenever schemas are rescanned.

#### Scenario: Reporting a problem
- **WHEN** artifact `research` in a project schema requires an unknown artifact
- **THEN** an error diagnostic appears on the `id: research` line of that schema's `schema.yaml`

#### Scenario: Fixing a problem
- **WHEN** the user fixes the problem and saves the file
- **THEN** the diagnostic is removed

#### Scenario: Removed schemas
- **WHEN** a schema with diagnostics is deleted
- **THEN** its diagnostics are cleared
