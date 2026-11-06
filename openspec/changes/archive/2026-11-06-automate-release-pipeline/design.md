# Design

## Context

See proposal.md, section Why. All extension code is bundled by esbuild, so the VSIX needs no `node_modules`.

## Goals / Non-Goals

**Goals:** the changelog and version come from commit history, the marketplaces show user-facing docs, and one workflow publishes everywhere.

**Non-Goals:** pre-release channels, and signing VSIX packages.

## Decisions

- **release-please over semantic-release.** It produces a reviewable release PR (version and changelog diff) before anything ships, and needs no npm publish step. The alternative, semantic-release, publishes straight from `main` with no review point.
- **Publish in the same workflow as release-please.** Tags created with `GITHUB_TOKEN` do not trigger other workflows, so a separate tag-triggered workflow would never run. The alternative is a PAT just to trigger workflows, which is extra secret management.
- **`vsce --readme-path`.** It lets the marketplace README live next to the developer README without copying files during the build. The alternative was moving the contributor docs into `CONTRIBUTING.md`, but the user asked for separate READMEs.
- **Open VSX is optional.** It is skipped with a warning when `OVSX_PAT` is absent, so the VS Code Marketplace release is never blocked by it.

## Risks / Trade-offs

- [The release PR opened with `GITHUB_TOKEN` does not trigger CI] → document the optional `RELEASE_PLEASE_TOKEN` PAT. The publish job re-runs all checks anyway.
- [Non-conventional PR titles would drop entries from the changelog] → the PR title check blocks them.
