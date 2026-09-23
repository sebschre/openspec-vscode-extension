# Proposal

## Why

The packaged extension identifies `openspec` as its publisher, even though Sebastian Schreiber owns and intends to publish through `sebschre`. Its opaque black marketplace icon and reuse of that large raster image in the Activity Bar also produce the unwanted black tile and white block shown in VS Code.

## What Changes

- **BREAKING**: Set the extension publisher ID to `sebschre`, changing the extension ID from `openspec.openspec-vscode` to `sebschre.openspec-vscode`.
- Retain Sebastian Schreiber as the package author and ensure the packaged manifest contains the intended author and publisher values.
- Give the marketplace icon a transparent background and a dark outline around the existing mark so it remains visible on light backgrounds.
- Use a separate, centered, single-color Activity Bar icon that renders clearly in VS Code themes, while keeping the marketplace icon as a PNG.
- Keep the existing badge visually aligned with the revised marketplace mark.
- Align packaging tests and release verification with the intended assets and publisher ID.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `prepare-marketplace-publish`: Specify the publisher and author metadata, transparent marketplace artwork, and a distinct, legible Activity Bar icon.
- `marketplace-publishing`: Ensure automated releases package and publish under the `sebschre` publisher identity.

## Impact

The package manifest, icon assets, branding tests, and release workflow checks are affected. The Marketplace account credential used by the release workflow must have permission to publish under `sebschre`. Existing installs under `openspec.openspec-vscode` will have a different extension ID and will not update automatically to the new listing.
