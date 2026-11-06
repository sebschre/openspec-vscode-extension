# Releasing

Releases are driven by [release-please](https://github.com/googleapis/release-please) and the
[Release workflow](../.github/workflows/release.yml). Nobody bumps versions or edits
`CHANGELOG.md` by hand.

## How a release happens

1. Pull requests are squash-merged into `main` with a Conventional Commit title (`feat: …`,
   `fix: …`). The **PR Title** check enforces this.
2. On every push to `main`, release-please updates a pull request titled
   `chore(main): release X.Y.Z`. That PR:
   - bumps `version` in `package.json` and `package-lock.json`
   - adds the new section to `CHANGELOG.md`, grouped into Features, Bug Fixes, Performance and Documentation
   - updates `.release-please-manifest.json`
3. Merging the release PR tags `vX.Y.Z` and creates the GitHub release with the same notes.
   The `publish` job then:
   - runs typecheck, tests and `openspec validate --all --strict`
   - packages the VSIX with a production build and the marketplace README
     ([`docs/marketplace/README.md`](marketplace/README.md))
   - verifies the package (`scripts/verify-vsix.js`)
   - attaches the `.vsix` to the GitHub release
   - publishes to the **VS Code Marketplace** and **Open VSX**

The packaged `CHANGELOG.md` is the file shown on the marketplaces' *Changelog* tab.

Versioning while below 1.0: `feat` bumps the minor version and `fix` bumps the patch version. A
breaking change (`feat!:` or a `BREAKING CHANGE:` footer) also bumps only the minor version
until 1.0.0. To force a specific version, add `Release-As: 1.0.0` to a commit body.

## One-time setup

### Repository settings

- **Settings → Actions → General → Workflow permissions**: enable *Allow GitHub Actions to create
  and approve pull requests*, so release-please can open its PR.
- **Optional:** add a `RELEASE_PLEASE_TOKEN` secret (a fine-grained PAT with *Contents* and *Pull
  requests* read/write on this repo). Pull requests opened with the default `GITHUB_TOKEN` do not
  trigger CI. With a PAT, CI runs on the release PR too.
- Use **squash merging** so the PR title becomes the commit that release-please reads.

### VS Code Marketplace: `VSCE_PAT`

1. Make sure the `sebschre` publisher exists at
   <https://marketplace.visualstudio.com/manage>.
2. In Azure DevOps, create a Personal Access Token with **Organization: All accessible
   organizations** and scope **Marketplace → Manage**.
3. Save it as the repository secret `VSCE_PAT`.

### Open VSX: `OVSX_PAT`

1. Sign in at <https://open-vsx.org> with GitHub and sign the publisher agreement.
2. Create an access token under *Settings → Access Tokens*.
3. Create the namespace once: `npx ovsx create-namespace sebschre -p <token>`.
4. Save the token as the repository secret `OVSX_PAT`.

If `OVSX_PAT` is missing, the Open VSX step is skipped with a warning. A missing `VSCE_PAT`
fails the publish job.

## Manual runs

**Actions → Release → Run workflow** packages the selected ref:

- `dry_run` (default **on**) packages and verifies only, then uploads the `.vsix` as a workflow
  artifact.
- With `dry_run` off, it publishes the current `package.json` version to the selected
  `marketplace` (`all`, `vscode` or `openvsx`). Use this to retry a publish that failed, for
  example after adding a missing token. Versions that are already published are skipped.
