# Spec: marketplace-publishing

## Purpose

Automates continuous integration build validation, extension packaging, and secure publishing to the Visual Studio Code Marketplace via GitHub Actions workflows.

## Requirements

### Requirement: Continuous Integration Build Validation
The system SHALL validate code formatting, TypeScript typechecking, and automated test execution across pull requests and pushes to the main branch.

#### Scenario: Pull request build check
- **WHEN** a pull request is opened or updated targeting the main branch
- **THEN** the CI workflow executes dependency installation, TypeScript typechecking, automated test suites, and extension build verification, failing the check if any step returns a non-zero exit code

#### Scenario: Regression prevention
- **WHEN** a commit introduces a compilation error or failing test
- **THEN** the workflow fails before any packaging or release step can run

### Requirement: Automated VS Code Marketplace Publishing
The system SHALL provide an automated release workflow that packages the extension and publishes it under the `sebschre` publisher identity to the Visual Studio Code Marketplace upon tagged releases or manual dispatch.

#### Scenario: Tagged release deployment
- **WHEN** a version tag matching `v*.*.*` is pushed to the repository
- **THEN** the release workflow verifies the build, generates a `.vsix` whose publisher is `sebschre`, and publishes that package to the Visual Studio Code Marketplace using a configured credential authorized for `sebschre`.

#### Scenario: Manual dispatch dry-run
- **WHEN** the release workflow is manually triggered with the dry-run parameter enabled
- **THEN** the workflow builds and validates packaging, including the `sebschre` package identity, without transmitting or publishing the package to the live marketplace.

### Requirement: Packaged VSIX Asset Retention
The system SHALL preserve generated `.vsix` packages as downloadable workflow artifacts for auditability, manual testing, and GitHub release attachments.

#### Scenario: Uploading packaged VSIX artifact
- **WHEN** a packaging step successfully produces an extension `.vsix` archive
- **THEN** the workflow uploads the `.vsix` file as a GitHub Actions workflow artifact with standard retention
