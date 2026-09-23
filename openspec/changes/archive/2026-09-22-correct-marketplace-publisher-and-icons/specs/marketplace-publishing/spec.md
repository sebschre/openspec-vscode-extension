# Spec Delta

## MODIFIED Requirements

### Requirement: Automated VS Code Marketplace Publishing
The system SHALL provide an automated release workflow that packages the extension and publishes it under the `sebschre` publisher identity to the Visual Studio Code Marketplace upon tagged releases or manual dispatch.

#### Scenario: Tagged release deployment
- **WHEN** a version tag matching `v*.*.*` is pushed to the repository
- **THEN** the release workflow verifies the build, generates a `.vsix` whose publisher is `sebschre`, and publishes that package to the Visual Studio Code Marketplace using a configured credential authorized for `sebschre`.

#### Scenario: Manual dispatch dry-run
- **WHEN** the release workflow is manually triggered with the dry-run parameter enabled
- **THEN** the workflow builds and validates packaging, including the `sebschre` package identity, without transmitting or publishing the package to the live marketplace.
