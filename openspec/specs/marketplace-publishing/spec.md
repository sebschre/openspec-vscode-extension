# Spec: marketplace-publishing

## Purpose

Automates continuous integration build validation, changelog and version generation, extension packaging, and secure publishing to the Visual Studio Code Marketplace and Open VSX via GitHub Actions workflows.

## Requirements

### Requirement: Continuous Integration Build Validation
The system SHALL validate TypeScript typechecking, automated tests, strict OpenSpec validation of the repository's own specs and changes, and extension packaging on every pull request and push to the main branch.

#### Scenario: Pull request build check
- **WHEN** a pull request is opened or updated
- **THEN** the CI workflow installs dependencies, typechecks, runs the automated test suites, runs `openspec validate --all --strict`, packages and verifies the `.vsix`, and fails the check if any step returns a non-zero exit code

#### Scenario: Regression prevention
- **WHEN** a commit introduces a compilation error, a failing test, or an invalid spec
- **THEN** the workflow fails before any packaging or release step can run

### Requirement: Automated VS Code Marketplace Publishing
The system SHALL publish the extension under the `sebschre` publisher identity to the Visual Studio Code Marketplace when a release created by the automated release process is merged, and on manual dispatch.

#### Scenario: Tagged release deployment
- **WHEN** the automated release pull request is merged and the `vX.Y.Z` release is created
- **THEN** the release workflow verifies the build, generates a `.vsix` whose identity and version match `package.json`, attaches it to the GitHub release, and publishes it to the Visual Studio Code Marketplace with a credential authorized for `sebschre`

#### Scenario: Manual dispatch dry-run
- **WHEN** the release workflow is triggered manually with the dry-run parameter enabled
- **THEN** the workflow builds and validates the package, including the `sebschre` identity, without publishing it to any marketplace

### Requirement: Packaged VSIX Asset Retention
The system SHALL preserve generated `.vsix` packages as downloadable workflow artifacts for auditability, manual testing, and GitHub release attachments.

#### Scenario: Uploading packaged VSIX artifact
- **WHEN** a packaging step successfully produces an extension `.vsix` archive
- **THEN** the workflow uploads the `.vsix` file as a GitHub Actions workflow artifact with standard retention

### Requirement: Generated Changelog and Versioning
The system SHALL derive the next version and the `CHANGELOG.md` entries from Conventional Commit messages on the main branch, and propose them as a reviewable release pull request.

#### Scenario: Release pull request
- **WHEN** commits with `feat` or `fix` types are merged into the main branch
- **THEN** a release pull request bumps the version in `package.json` and adds a `CHANGELOG.md` section listing those changes

#### Scenario: Non-conventional pull request title
- **WHEN** a pull request title does not follow the Conventional Commits format
- **THEN** a required check fails so the squash-merged commit cannot omit itself from the changelog

### Requirement: Marketplace-Specific README
The packaged extension SHALL present a user-facing README and the generated changelog on the marketplaces, separate from the repository's developer README.

#### Scenario: Packaging the README
- **WHEN** the `.vsix` is packaged
- **THEN** it contains `docs/marketplace/README.md` as its README and `CHANGELOG.md` as its changelog, and verification fails if the developer README was packaged instead

### Requirement: Open VSX Publishing
The release workflow SHALL also publish the verified `.vsix` to the Open VSX Registry when an Open VSX credential is configured.

#### Scenario: Credential configured
- **WHEN** a release is published and the `OVSX_PAT` secret is set
- **THEN** the same `.vsix` that was published to the VS Code Marketplace is published to Open VSX

#### Scenario: Credential missing
- **WHEN** a release is published and the `OVSX_PAT` secret is not set
- **THEN** the Open VSX step is skipped with a warning and the VS Code Marketplace release is unaffected
