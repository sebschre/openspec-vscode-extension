# Tasks

## 1. Package Identity

- [x] 1.1 Set `package.json` publisher to `sebschre` while retaining Sebastian Schreiber as author and `openspec-vscode` as name; verify the manifest resolves to `sebschre.openspec-vscode`.
- [x] 1.2 Add a release preflight for the packaged publisher identity and verify a dry-run package with a different publisher would fail before the publish step.

## 2. Branding Assets

- [x] 2.1 Replace `resources/icon.png` with the OpenSpec mark on transparent pixels and a dark outline; verify PNG dimensions, transparent corners, and readable rendering on light and dark backgrounds.
- [x] 2.2 Add a separate centered monochrome 24×24 Activity Bar icon and point the view container at it; verify the mark is recognizable without a filled square in light and dark VS Code themes.
- [x] 2.3 Align `resources/badge.png` with the revised mark; verify the badge visibly depicts the same mark as the Marketplace icon.

## 3. Package Validation and Release Guidance

- [x] 3.1 Update `test/marketplace-publish.test.ts` to check the actual icon paths, publisher and author, marketplace transparency and outline, distinct Activity Bar asset, and badge consistency; verify the branding tests pass.
- [x] 3.2 Build a new VSIX and inspect its embedded manifest and assets; verify the publisher is `sebschre`, the author is Sebastian Schreiber, and both icon files are included at their declared paths.
- [x] 3.3 Document the extension ID migration and the need for release credentials authorized for `sebschre`; verify the guidance names both the old and new extension IDs and does not claim automatic upgrade.
- [x] 3.4 Run the project test and package checks plus a release dry run when available; verify packaging succeeds and the dry run does not publish to the Marketplace.
