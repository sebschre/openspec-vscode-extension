# Changelog

All notable changes to this extension are documented here. This file is maintained
automatically by [release-please](https://github.com/googleapis/release-please) from
[Conventional Commits](https://www.conventionalcommits.org/).

## [0.5.0](https://github.com/sebschre/openspec-vscode-extension/compare/v0.4.1...v0.5.0) (2026-11-07)


### Features

* **terminal:** agent command presets and Configure Agent Command ([#19](https://github.com/sebschre/openspec-vscode-extension/issues/19)) ([918ada7](https://github.com/sebschre/openspec-vscode-extension/commit/918ada738520e91c6ad919d01ea96a59e15899d6))

## [0.4.1](https://github.com/sebschre/openspec-vscode-extension/compare/v0.4.0...v0.4.1) (2026-11-07)


### Bug Fixes

* reuse schema names whose folder was left empty after a revert ([#17](https://github.com/sebschre/openspec-vscode-extension/issues/17)) ([9110161](https://github.com/sebschre/openspec-vscode-extension/commit/911016180781ea82c297df170bbe6ec3693ad5e5))

## [0.4.0](https://github.com/sebschre/openspec-vscode-extension/compare/v0.3.0...v0.4.0) (2026-11-07)


### Features

* **explorer:** schema-aware Active Changes and cross-linked Living Specs ([#15](https://github.com/sebschre/openspec-vscode-extension/issues/15)) ([1e0d106](https://github.com/sebschre/openspec-vscode-extension/commit/1e0d1066ea68a8c4bb1d77e420eb10bd62d1d7ce))

## [0.3.0](https://github.com/sebschre/openspec-vscode-extension/compare/v0.2.0...v0.3.0) (2026-11-07)


### Features

* **schemas:** streamline customizing forked schemas ([#13](https://github.com/sebschre/openspec-vscode-extension/issues/13)) ([ca5e585](https://github.com/sebschre/openspec-vscode-extension/commit/ca5e5850ccb09bded5f55a364a699fab6eaa86ab))

## [0.2.0](https://github.com/sebschre/openspec-vscode-extension/compare/v0.1.0...v0.2.0) (2026-11-06)


### Features

* schema customization view, automated releases and repo cleanup ([#3](https://github.com/sebschre/openspec-vscode-extension/issues/3)) ([8c5998a](https://github.com/sebschre/openspec-vscode-extension/commit/8c5998a373b4f84f9edc6b39638dc9b2273f8b27))

## 0.1.0 (2026-09-22)

Initial release.

### Features

* Activity Bar container with **Active Changes**, **Living Specs** and **Archive** views
* Visual Spec Viewer with pipeline rail, requirement cards, Given/When/Then scenarios and a dedicated Technical Design tab
* Live, bidirectional task checklist synchronized with `tasks.md`
* Archived specs highlighted in the tree and viewer
* Guided New Change form with AI-assisted naming, motivation refinement and validation feedback
* Dedicated OpenSpec terminal with a configurable agent command (`openspec.terminal.agentCommand`)
* Validate and Archive commands backed by the OpenSpec CLI
