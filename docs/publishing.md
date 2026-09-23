# Publishing OpenSpec for VS Code

The package identity is `sebschre.openspec-vscode-extension`. Releases originate from `main` and use semantic-release, `@vscode/vsce` 4, and Node 24. GitHub Releases and the VS Code Marketplace receive the same verified VSIX. Nothing is published to npm.

## One-time repository setup

Protect `main` with a ruleset requiring a pull request, resolved review threads, and the `Build, Lint & Test` check from GitHub Actions. Require the branch to be up to date and block deletion and force pushes. Use squash merges with the PR title as the commit title. The initial solo-maintainer setup requires no second-person approval; collaborators can add review requirements later.

Create the GitHub environment `marketplace` and allow deployment only from the branch `main`. No deployment reviewer is required, so successful releases run automatically after merge. Keep the repository's default workflow token read-only; the release job alone requests `contents: write` and `id-token: write`. PR workflows never publish. The workflow actions are pinned to commit SHAs and release runs are serialized without cancelling a running publish.

## Marketplace authentication — required before the first release

1. Sign in to the [Marketplace publisher management portal](https://marketplace.visualstudio.com/manage) as an owner of `sebschre`.
2. Configure a GitHub trusted publishing policy for owner `sebschre`, repository `openspec-vscode-extension`, and workflow `.github/workflows/release.yml` (use `release.yml` if the portal requests only the filename). If the policy supports an environment condition, bind it to `marketplace`.
3. Confirm that this trust grants publication under the `sebschre` publisher. GitHub branch protection and its environment do not create Marketplace authorization.
4. After a successful OIDC publication, remove and revoke any superseded publishing PAT. Do not add `VSCE_PAT`, an Azure client secret, or an npm token to this workflow.

The CLI requests a GitHub OIDC token with audience `marketplace.visualstudio.com` and exchanges it for a short-lived Marketplace credential. It fails if token exchange fails and does not fall back to a PAT. See [the official vsce trusted publishing documentation](https://github.com/microsoft/vscode-vsce#trusted-publishing). This policy is configured in Marketplace, outside the GitHub API; `gh` cannot create it. If trusted publishing is unavailable for the publisher, establish Microsoft Entra workload identity federation and use `--azure-credential` in a reviewed follow-up change before enabling live publication.

## Release behavior

Use meaningful squash-commit titles: `fix: ...` and `perf: ...` produce patches, `feat: ...` produces a minor release, and a `BREAKING CHANGE:` footer produces a major release. Documentation and routine chore commits do not publish by default. Each update of `main` runs the workflow, but only release-triggering commits create a version.

Tests and typechecking must succeed before semantic-release runs. It analyzes commits since the last version tag, generates notes, updates the runner's package version, builds and verifies `artifacts/extension.vsix`, creates the version tag, publishes to Marketplace, and creates a GitHub Release with that exact VSIX attached. A workflow artifact retains the VSIX for 30 days, including after publication failures. The GitHub Release asset is retained independently.

Version changes are not committed back to `main`. The VSIX contains the calculated release version; the manifest in the source tree can retain its development version. This avoids a bot needing to bypass PR protection. Git tags and GitHub Releases identify published versions.

With no existing version tags, semantic-release starts at `1.0.0`; the source manifest's `0.1.0` does not establish release history. If migrating an actual existing release, ensure its corresponding `vX.Y.Z` tag points to its original source commit before enabling this workflow. Never create a fictitious release tag simply to suppress a release.

The old tag-triggered workflow is replaced. Do not chain publishing from a tag created using `GITHUB_TOKEN`: those tag events do not start another workflow.

## Verification before enabling publication

On the implementation PR, CI builds the VSIX and verifies its identity, version, author, and icon assets without requesting Marketplace credentials. Configure Marketplace trust before merging a release-triggering PR.

After the workflow is on `main`, Actions → Release → Run workflow defaults to `dry_run: true`. It packages the source version for inspection and separately previews the calculated version and release notes. Semantic-release dry runs skip prepare and publish, so this preview package is not necessarily stamped with the upcoming version and does not prove Marketplace authentication works. A live run is the final authentication test.

## Recovering a partial release

GitHub and Marketplace publication is not atomic. Semantic-release creates a tag before its publish plugins run, so a failure may leave a tag without a Marketplace version or GitHub Release. Re-running semantic-release alone may treat that version as already released.

1. Inspect the failed run, its commit SHA, the version tag, and both destinations before retrying anything. Pause further release merges during reconciliation.
2. Download `vsix-<commit SHA>` from that run's artifacts. Verify the embedded publisher, extension name, and version; retain this exact VSIX. Do not build a replacement with the same published version.
3. If Marketplace is missing the version, an authorized publisher maintainer can upload the retained VSIX through the Marketplace management portal. If it already exists, do not overwrite it or blindly ignore duplicate errors.
4. If the GitHub Release is missing, use `gh release create vX.Y.Z extension.vsix --repo sebschre/openspec-vscode-extension --verify-tag --generate-notes`. If only its asset is missing, use `gh release upload vX.Y.Z extension.vsix --repo sebschre/openspec-vscode-extension`. Confirm the tag's source SHA matches the failed run first.
5. Verify both destinations, resolve the original failure, and resume merges. Do not delete a published version tag to force a retry. Fix faulty published code with a new release.
