# Tasks: Agent Command Presets

## 1. Preset Picker in TerminalManager

- [ ] 1.1 Add the `AGENT_PRESETS` list and `pickAgentCommand()` (presets, Custom command… with validated input box, optional Open Settings / Copy Command entries, current-value marking) to `src/core/terminal.ts`, and verify with unit tests in `test/terminal.test.ts` (extending `test/mockVscode.ts` with controllable quick pick / input box responses and `ConfigurationTarget`).
- [ ] 1.2 Replace the unset-setting notification in `handleUnsetAgentCommand` with the picker: save the chosen template to user settings, reset the session, and re-run the original command; verify with unit tests for preset, custom, open settings, copy and dismiss paths.

## 2. Configure Agent Command

- [ ] 2.1 Register `openspec.configureAgentCommand` in `src/commands/index.ts` and contribute it in `package.json` (command, view/title overflow menu entry), and verify `npm run typecheck` passes and the manifest test still passes.
- [ ] 2.2 Replace the setting's `description` with a `markdownDescription` listing examples for several agents and referencing the new command, update the settings table in `docs/marketplace/README.md`, and verify `npm test` passes.

## 3. Integration Checks

- [ ] 3.1 Run `npm run build`, `npm test` and `openspec validate agent-command-presets --strict` and verify all succeed.

## Workflow follow-up

- Archive the change with `openspec archive agent-command-presets` and verify `openspec/specs/agent-terminal-execution/spec.md` contains the updated requirements.
- Open a pull request for the branch.
