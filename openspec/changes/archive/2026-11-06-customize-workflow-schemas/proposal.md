# Proposal

## Why

OpenSpec lets projects define their own workflow schemas in `openspec/schemas/`, which set the artifacts a change produces and their dependencies. Right now the extension only shows the artifacts these schemas produce (changes, living specs, archive). Users have no way to see which schemas exist, where they resolve from, or how to adapt one, short of the experimental `openspec schema` CLI and hand-editing YAML.

## What Changes

- Add a **Schemas** view listing project, user, and built-in schemas, resolved with the CLI's precedence (project → user → package). Each schema shows its artifacts, dependencies, apply phase, default flag, the changes that use it, and any structural issues.
- Add commands to **customize** (fork) a schema into the project, **create** a schema, **validate** it, **set the project default**, **add or remove artifacts**, and **edit artifact dependencies** (rejecting cycles).
- Have the New Change form offer the available schemas, with the project default first. Changes without metadata now fall back to the project default instead of the hard-coded `spec-driven`.

## Capabilities

### New Capabilities

- `schema-customization`: discovering, inspecting, and editing OpenSpec workflow schemas from VS Code.

### Modified Capabilities

None.

## Impact

New `src/core/schemas.ts`, `src/views/tree/schemasTreeProvider.ts`, and `src/commands/schemaCommands.ts`. Changes to the store (schema state), the CLI bridge (`schema which`, `schema validate`, `schema init`), the watcher (user schema dir), and `package.json` contributions.
