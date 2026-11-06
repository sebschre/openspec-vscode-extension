# Design

## Context

The OpenSpec CLI resolves a schema name from `openspec/schemas/<name>`, then the user data directory (`$XDG_DATA_HOME/openspec/schemas` or the platform default), then the schemas bundled with the package. A schema is `schema.yaml` (name, version, artifacts with `generates`/`template`/`requires`, and an optional `apply` phase) plus `templates/`.

## Goals / Non-Goals

**Goals:** see what the CLI would resolve, make common edits safely, and keep the files hand-editable.

**Non-Goals:** a full graphical YAML editor, and editing built-in package schemas in place.

## Decisions

- **Scan project and user directories directly; ask the CLI only for built-ins.** Filesystem scans stay live through the watcher, and only the package location requires `openspec schema which --all --json`. That result is cached until the user presses Refresh. Without the CLI, `spec-driven` is still listed by name so that New Change keeps working.
- **Fork natively by copying the directory and renaming `name:`.** This works without the CLI and produces what `openspec schema fork` does. New-from-scratch still uses `openspec schema init`, because its templates are the source of truth.
- **Structured edits use `js-yaml` load/dump with `lineWidth: -1`.** Multi-line instructions stay block scalars. Comments inside `schema.yaml` are not preserved. That is acceptable because forked and initialized schemas contain none, and users can always hand-edit instead.
- **Setting the default edits only the `schema:` line of `config.yaml`,** so the comments and other settings in that file are preserved.
- **Local structural validation mirrors the CLI rules** (required fields, unique ids, unknown `requires`, cycles, missing templates). Problems show up in the tree immediately, and `openspec schema validate` stays authoritative when it is installed.

## Risks / Trade-offs

- [The CLI's schema commands are marked experimental] → only `which`, `validate` and `init` are used, and each degrades gracefully when it fails.
- [Rewriting `schema.yaml` reformats it] → only the add, remove and dependency commands rewrite the file. Opening and editing the file by hand is always possible.
