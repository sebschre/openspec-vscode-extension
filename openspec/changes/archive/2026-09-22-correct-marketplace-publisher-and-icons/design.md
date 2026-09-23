# Design

## Context

See proposal.md for the motivation. The current `package.json` already contains Sebastian Schreiber in `author`, but `publisher` is `openspec`. Both the top-level Marketplace `icon` and the Activity Bar view container point to `resources/icon.png`, a 512×512 PNG whose alpha channel is fully opaque and whose corners are black. The VSIX includes this manifest and asset. The release workflow packages and publishes that VSIX with `VSCE_PAT`; its dry run stops before publishing. The existing branding test expects a nonexistent root `icon.png`, so it does not validate the actual package path.

VS Code requires a PNG for the Marketplace extension icon and recommends a centered, single-color 24×24 image for Activity Bar view containers; SVG is suitable for the latter. The existing `prepare-marketplace-publish` spec also requires the badge to depict the same mark.

## Goals / Non-Goals

**Goals:**

- Keep one recognizable OpenSpec mark across Marketplace icon, Activity Bar icon, and badge while giving each surface artwork suited to its size and theme behavior.
- Make local packaging and release dry runs verify the publisher and assets actually placed in the VSIX.

**Non-Goals:**

- Change the extension's `name`, view container ID, command IDs, or runtime behavior.
- Move existing Marketplace installs or manage the publisher account or credential outside the repository.

## Decisions

### 1. Use `sebschre` as the manifest publisher

Change only the publisher ID in `package.json`; retain `name: openspec-vscode` and the current author attribution. This produces the intended Marketplace identity without changing internal command and view IDs. The release job should assert the packaged publisher before its publish step. Renaming the extension itself was considered but would add an unrelated identity change.

### 2. Separate Marketplace and Activity Bar artwork

Keep `resources/icon.png` as the top-level marketplace icon: a transparent, at least 128×128 PNG preserving the existing OpenSpec geometry, with a dark outline around the light mark for contrast on light surfaces. Remove the opaque black square. Add a dedicated 24×24 monochrome SVG for `contributes.viewsContainers.activitybar`, with transparent surroundings and a shape that remains recognizable at that size. Reusing the PNG was considered, but its raster scale and black pixels caused the observed block. A separate white-only PNG was considered, but it would be hard to see in light themes.

Update the badge artwork to use the same mark and visual treatment as the Marketplace icon, as required by the existing spec. The badge may have its own layout, but its mark should visibly match.

### 3. Verify the package, not only source files

Update branding tests to assert the actual manifest paths, transparent pixels and visible outline of the Marketplace PNG, and a distinct valid Activity Bar SVG. Replace the stale root-icon assertion. Package a VSIX during verification and inspect its embedded `package.json`, icon, and Activity Bar asset. Add a release preflight or equivalent check that fails a dry run when the packaged publisher differs from `sebschre`. A source-only manifest check was considered, but the existing VSIX demonstrates that package content is the final user-visible artifact.

## Risks / Trade-offs

- **[New extension ID]** Existing `openspec.openspec-vscode` installs do not automatically update to `sebschre.openspec-vscode` → Document the ID change in release notes or installation guidance and verify a fresh install of the new VSIX.
- **[Publisher credential mismatch]** The repository's `VSCE_PAT` may lack `sebschre` access → Check account access before the first live publish; keep dry runs free of live publication.
- **[Small-icon detail loss]** The mark may collapse at Activity Bar scale → Review the SVG in light and dark themes at 24×24 before release.
- **[Outlined icon appearance]** The dark outline may be too heavy or thin at Marketplace tile size → Review the transparent PNG on both light and dark backgrounds.

## Migration Plan

1. Update the package identity and artwork, then regenerate and inspect a local VSIX.
2. Run tests and a release dry run to validate package contents without publishing.
3. Confirm the release credential is authorized for `sebschre`, then publish a new version under that identity through the existing workflow.
4. Tell users of the old ID to install `sebschre.openspec-vscode`; retain the previous listing until its handling is decided separately. If the new release must be rolled back, unpublish or replace it under `sebschre` without changing the old listing.
