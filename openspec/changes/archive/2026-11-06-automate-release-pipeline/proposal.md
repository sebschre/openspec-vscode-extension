# Proposal

## Why

Releases currently need a manual version bump, a hand-pushed tag, and a hand-written changelog. As a result `CHANGELOG.md` does not exist and the Marketplace *Changelog* tab is empty. The Marketplace also shows the contributor README (clone, `npm install`, F5), which tells users nothing about what the extension does. On top of that, the release preflight checks for an extension name the package no longer uses, so a tagged release would fail.

## What Changes

- Use release-please to keep a release PR up to date that bumps the version and writes `CHANGELOG.md` from Conventional Commits. Merging it tags `vX.Y.Z`, creates the GitHub release, and publishes.
- Enforce Conventional Commit PR titles, because squash-merged titles drive the changelog.
- Package the VSIX with a dedicated user-facing README (`docs/marketplace/README.md`) and the generated `CHANGELOG.md`. The repository `README.md` stays the developer guide.
- Publish to Open VSX in addition to the VS Code Marketplace.
- Run `openspec validate --all --strict` and the full package and verify steps in CI, and upload the VSIX for every PR.
- Derive the expected package identity in the VSIX preflight from `package.json` rather than hard-coding it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `marketplace-publishing`: release-please-driven releases, generated changelog, marketplace-specific README, Open VSX publishing, and stricter CI.

## Impact

`.github/workflows/*`, `release-please-config.json`, `.release-please-manifest.json`, `CHANGELOG.md`, `docs/marketplace/README.md`, `docs/releasing.md`, `scripts/verify-vsix.js`, and `package.json` scripts. Maintainers must enable "Allow GitHub Actions to create and approve pull requests". `OVSX_PAT` is a new, optional secret.
