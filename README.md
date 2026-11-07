# OpenSpec for VS Code: developer guide

[![CI](https://github.com/sebschre/openspec-vscode-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/sebschre/openspec-vscode-extension/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A VS Code extension that gives [OpenSpec](https://github.com/Fission-AI/OpenSpec) a visual workspace. It covers active changes, living specs, the archive, and customizable workflow schemas.

> The user-facing README shown on the VS Code Marketplace and Open VSX is
> [`docs/marketplace/README.md`](docs/marketplace/README.md). This file is for contributors.

## Repository layout

```
src/
  extension.ts            activation: wires the store, watcher, tree views and commands
  core/                   VS Code–independent logic (unit tested)
    store.ts              scans openspec/ into a WorkspaceState and emits 'change'
    parser.ts             markdown/YAML parsing for proposals, specs, designs, tasks
    schemas.ts            workflow schema discovery, validation and editing
    cli.ts                thin bridge to the `openspec` CLI
    terminal.ts           dedicated agent terminal
    inference.ts          change-name / proposal generation helpers
  commands/               command registrations (schemaCommands.ts for the Schemas view)
  views/tree/             sidebar tree providers
  views/webview/          Visual Spec Viewer panel host
  protocol/messages.ts    extension ⇄ webview message types
webview-ui/src/           Preact webview UI
test/                     node:test suites; `vscode` is aliased to test/mockVscode.ts
openspec/                 this project's own specs and change history (we dogfood OpenSpec)
scripts/                  test runner and VSIX verification
docs/marketplace/         README packaged for the marketplaces
```

## Development

Requires Node.js 22 (see `.nvmrc`).

```bash
pnpm install
pnpm build        # dev build with source maps → dist/
pnpm watch        # rebuild on change
```

Press <kbd>F5</kbd> in VS Code to launch an Extension Development Host. Open any folder that contains an `openspec/` directory (this repository works too).

### Checks

| Command | What it does |
| --- | --- |
| `pnpm typecheck` | `tsc --noEmit` over extension, webview and tests |
| `pnpm test` | bundles `test/*.test.ts` with esbuild and runs them with `node --test` (`pnpm test schemas` runs just the matching files) |
| `pnpm validate:specs` | `openspec validate --all --strict` on this repo's own specs and changes |
| `pnpm package` | production build + `.vsix` packaged with the marketplace README |
| `pnpm verify:vsix <file>` | checks identity, version, icons, README/CHANGELOG and that no sources leaked into the package |

CI runs all of these on every pull request and uploads the `.vsix` as a workflow artifact.

## Contributing workflow

1. Larger features start as an OpenSpec change in `openspec/changes/<name>/` (proposal, delta specs, design, tasks). Archive it once it's implemented, so `openspec/specs/` stays the source of truth.
2. Use [Conventional Commits](https://www.conventionalcommits.org/) for PR titles, e.g. `feat(schemas): add dependency editor` or `fix: handle missing tasks.md`. PRs are squash-merged and a CI check enforces the title format.
3. Do **not** edit `CHANGELOG.md` or bump `version` by hand. Releases are automated, see below.

## Releases

Releases are fully automated with [release-please](https://github.com/googleapis/release-please). See [`docs/releasing.md`](docs/releasing.md) for the details and the one-time setup (marketplace tokens).

## License

[MIT](LICENSE)
