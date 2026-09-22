# Design: GitHub Action Workflow for VS Code Marketplace Deployment

## Context

The repository is a TypeScript VS Code extension (`openspec-companion`) containing both the Node-based extension host (`src/`) and a Preact webview SPA (`webview-ui/`). Compilation and packaging are managed via `esbuild.config.js` and `@vscode/vsce` (v3.2.1).

Currently, no `.github/workflows` configurations exist. Releasing requires local developer authentication and manual packaging. See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**
- Provide automated CI validation (`ci.yml`) on every pull request and push to `main` (typecheck, tests, and build).
- Provide an automated Marketplace release workflow (`release.yml`) triggered on version tags (`v*.*.*`) or manual `workflow_dispatch`.
- Securely inject `VSCE_PAT` secret into `@vscode/vsce publish` without exposing secrets to pull request runs.
- Support `dry_run` manual workflow runs to verify VSIX bundling without publishing.
- Generate and upload the packaged `.vsix` bundle as a workflow artifact and attach it to GitHub Releases.

**Non-Goals:**
- Auto-bumping `package.json` semver versions within the GitHub Action (version bumps are handled via git tags or maintainer commits).
- Publishing to Open VSX registry at this stage (can be added as an optional step later).

## Decisions

### 1. Separate CI Workflow vs Release Workflow
- **Choice**: Implement two separate workflows:
  1. `.github/workflows/ci.yml`: Runs on `push: [main]` and `pull_request: [main]` to validate typechecks, builds, and unit tests.
  2. `.github/workflows/release.yml`: Runs on `push: tags: ['v*.*.*']` and `workflow_dispatch`.
- **Rationale**: Keeps routine PR checks fast and unprivileged (no secret access). Limits access to `VSCE_PAT` strictly to release triggers.
- **Alternatives Considered**: A single unified workflow with conditional release steps. This complicates branch protection rules and makes secret management less auditable.

### 2. Direct `@vscode/vsce` CLI vs Third-Party Marketplace Actions
- **Choice**: Invoke `@vscode/vsce` directly using `npx vsce publish` and `npx vsce package` with Node 20.
- **Rationale**: Eliminates dependency on external third-party marketplace actions (which can suffer from security vulnerabilities or maintenance drift). The repository already has `@vscode/vsce` pinned in `devDependencies`.
- **Alternatives Considered**: `HaaLeo/publish-vscode-extension` action. While popular, direct `vsce` invocation provides transparent logs and direct flag control.

### 3. Release Artifact Archival and GitHub Release Integration
- **Choice**: During the release workflow, build the `.vsix` archive via `npm run package` (which executes `vsce package`), upload it with `actions/upload-artifact@v4`, and attach it to a GitHub Release using `softprops/action-gh-release@v2`.
- **Rationale**: Maintainers and users who require offline or manual `.vsix` installation can download verified release binaries directly from GitHub Releases.

### 4. Dry-Run Configuration
- **Choice**: Add an optional `boolean` input `dry_run` to `workflow_dispatch` (defaulting to `false`). When `dry_run` is true, the workflow builds and packages the `.vsix` and uploads the artifact, but skips `vsce publish`.
- **Rationale**: Allows maintainers to verify that packaging rules (`.vscodeignore`, license, assets) succeed before deploying a real version to the marketplace.

## Risks / Trade-offs

- **[Risk] Missing or invalid `VSCE_PAT` secret in repository**
  → *Mitigation*: Fail gracefully with a clear error message in the publish step indicating that `VSCE_PAT` is required.
- **[Risk] Unbundled files bloating `.vsix` package**
  → *Mitigation*: `.vscodeignore` is already configured to exclude `node_modules`, `src/`, `test/`, and planning docs. The packaging step validates package size.
- **[Risk] Untested code released if tag pushed without passing tests**
  → *Mitigation*: The release workflow runs `npm run typecheck` and `npm test` prior to packaging and publishing. If any test fails, release halts immediately.
