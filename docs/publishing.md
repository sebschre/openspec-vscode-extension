# Visual Studio Code Marketplace Publishing Guide

This document describes how to configure and trigger automated deployments of the OpenSpec extension for VS Code to the Visual Studio Code Marketplace using GitHub Actions.

---

## 1. Prerequisites

Before publishing releases, you need:
1. **VS Code Marketplace Publisher Account**: Ensure the publisher `openspec` (or your chosen publisher) is created at [Visual Studio Marketplace Management Portal](https://marketplace.visualstudio.com/manage).
2. **Azure DevOps Personal Access Token (PAT)**:
   - Sign in to your Azure DevOps organization associated with the Marketplace publisher.
   - Click **User Settings** (top-right avatar) > **Personal Access Tokens**.
   - Create a new token with:
     - **Organization**: All accessible organizations
     - **Scopes**: Custom defined > **Marketplace** > **Manage** (checked)
   - Copy the generated token string securely.

---

## 2. Configure GitHub Repository Secret

The release workflow requires access to the publisher PAT via GitHub Actions repository secrets:

1. Navigate to your GitHub repository: `https://github.com/openspec/openspec-vscode-extension`
2. Go to **Settings** > **Secrets and variables** > **Actions**.
3. Click **New repository secret**.
4. Set:
   - **Name**: `VSCE_PAT`
   - **Secret**: `<your-azure-devops-personal-access-token>`
5. Click **Add secret**.

---

## 3. Triggering a Release via Git Tag

The automated release workflow (`.github/workflows/release.yml`) triggers whenever a tag matching `v*.*.*` is pushed to GitHub.

### Release Steps:

1. **Update Extension Version**:
   Update `version` in `package.json` to the target release version (e.g. `0.2.0`):
   ```json
   "version": "0.2.0"
   ```

2. **Commit and Tag**:
   ```bash
   git commit -am "chore: release v0.2.0"
   git tag v0.2.0
   git push origin main --tags
   ```

3. **Automated Pipeline Execution**:
   GitHub Actions will automatically:
   - Check out code and set up Node 20.
   - Run `npm ci`, `npm run typecheck`, and `npm test`.
   - Compile the bundle via `npm run build`.
   - Package the `.vsix` file using `@vscode/vsce package`.
   - Upload the `.vsix` bundle as a GitHub Actions run artifact.
   - Publish the package to the VS Code Marketplace using `VSCE_PAT`.
   - Create a GitHub Release titled `v0.2.0` with release notes and the `.vsix` attached.

---

## 4. Manual Dry-Run / Packaging Verification

Maintainers can verify the build and packaging process without publishing to the live marketplace:

1. Go to the **Actions** tab in GitHub.
2. Select the **Release** workflow from the left sidebar.
3. Click **Run workflow**.
4. Select the target branch and check the **Dry run** option.
5. Click **Run workflow**.

When `dry_run` is enabled, the pipeline executes the full compile, test, and packaging steps and uploads the `.vsix` artifact for download and manual inspection, but bypasses the `vsce publish` step.
