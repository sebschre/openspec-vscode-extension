# Tasks

## 1. Packaging

- [x] 1.1 Add `docs/marketplace/README.md` and package with `--readme-path`; verify the packaged `readme.md` is the marketplace README.
- [x] 1.2 Make `scripts/verify-vsix.js` read the identity from `package.json` and check the README, CHANGELOG, bundles and leaked sources; verify it rejects a package built with the developer README.
- [x] 1.3 Use a production build for packaging and an allow-list `.vscodeignore`; verify the VSIX contains only `dist/`, `resources/`, the manifest, LICENSE, README and CHANGELOG.

## 2. Release automation

- [x] 2.1 Add release-please config and manifest, plus an initial `CHANGELOG.md`; verify that tests assert the manifest version matches `package.json`.
- [x] 2.2 Rewrite `release.yml` to run release-please and publish to the VS Code Marketplace and Open VSX, with a manual dry-run path; document it in `docs/releasing.md`.
- [x] 2.3 Add the Conventional Commit PR title check.

## 3. CI

- [x] 3.1 Run typecheck, tests, `openspec validate --all --strict`, package and verify in CI, and upload the VSIX; verify locally with the same npm scripts.
