# Proposal: GitHub Action Workflow for VS Code Marketplace Deployment

## Why

Currently, packaging and releasing the OpenSpec VS Code extension relies on manual local execution of `vsce package` without automated CI validation or deployment pipelines. This introduces the risk of releasing broken builds, requires maintainers to manage sensitive publisher tokens locally, and lacks an auditable trail of release artifacts.

Establishing a robust GitHub Actions workflow will automate build verification, test suites, VSIX packaging, and secure deployment to the Visual Studio Code Marketplace upon tagged releases and manual workflow dispatch.

## What Changes

- **Automated CI Verification**: Configure automated building, typechecking, and test suite execution on pull requests and pushes to ensure code quality prior to release.
- **Marketplace Release Workflow**: Add a GitHub Actions release workflow (`.github/workflows/release.yml`) triggered on version tags (`v*.*.*`) or manual `workflow_dispatch` that packages and deploys the extension to the Visual Studio Code Marketplace using `@vscode/vsce`.
- **VSIX Packaging & Artifact Upload**: Build the `.vsix` bundle and attach it as a downloadable GitHub workflow artifact / release asset for inspection, provenance, and manual installation.
- **Dry-Run & Manual Dispatch Support**: Support a `dry_run` input parameter in `workflow_dispatch` allowing maintainers to test the full build and packaging pipeline without publishing to the live marketplace.

## Capabilities

### New Capabilities
- `marketplace-publishing`: Automates continuous integration verification, VSIX packaging, and publishing to the Visual Studio Code Marketplace via GitHub Actions.

### Modified Capabilities
*(None)*

## Impact

- `.github/workflows/release.yml`: New GitHub Actions release workflow configuration.
- `package.json`: Review and align scripts (`vscode:prepublish`, `package`, `build`, `test`, `typecheck`).
- Repository Configuration: Requires configuring the `VSCE_PAT` (Visual Studio Marketplace Personal Access Token) repository secret.
