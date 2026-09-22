# Tasks

## 1. Continuous Integration Workflow Setup

- [x] 1.1 Create `.github/workflows/ci.yml` defining CI verification for pushes and pull requests to `main` (running `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`), and verify YAML syntax validity.
- [x] 1.2 Verify local execution of the full CI verification pipeline (`npm run typecheck`, `npm test`, `npm run build`, and `npm run package`) to ensure clean execution without warnings or missing dependencies.

## 2. Release & Marketplace Deployment Workflow

- [x] 2.1 Create `.github/workflows/release.yml` with triggers for semantic version tags (`v*.*.*`) and manual `workflow_dispatch` with a `dry_run` input parameter.
- [x] 2.2 Configure the release workflow build and packaging steps for Node 20 setup, dependency caching, build verification, and VSIX generation via `npx vsce package`.
- [x] 2.3 Configure the deployment step in `release.yml` invoking `npx vsce publish -p ${{ secrets.VSCE_PAT }}` when `dry_run` is false, ensuring secret isolation and conditional execution.
- [x] 2.4 Add steps in `release.yml` to upload the generated `.vsix` archive as a workflow artifact via `actions/upload-artifact@v4` and attach it to a GitHub Release using `softprops/action-gh-release@v2`.

## 3. Package Configuration & Documentation

- [x] 3.1 Review and align `package.json` metadata (`publisher`, `repository`, `engines`, and `scripts`) and verify `.vscodeignore` properly excludes non-runtime files while retaining `dist/` and assets.
- [x] 3.2 Add a publishing setup guide in `docs/publishing.md` explaining how to create a Visual Studio Marketplace Personal Access Token (PAT), configure the `VSCE_PAT` repository secret, and trigger releases via git tags.

## 4. End-to-End Workflow Verification

- [x] 4.1 Test package generation locally using `npm run package` to ensure the generated `.vsix` contains valid manifests, expected bundle files, and excludes development sources.
- [x] 4.2 Validate the syntax and structure of `.github/workflows/ci.yml` and `.github/workflows/release.yml` to ensure schema compliance and correct action configurations.
