# Tasks: Configurable Agent Terminal Command

## 1. Configuration & Command Registration

- [x] 1.1 Add `openspec.terminal.agentCommand` configuration property and `openspec.resetTerminalSession` command to `package.json`, and verify `package.json` conforms to VS Code extension schema.
- [x] 1.2 Register `openspec.resetTerminalSession` in `src/commands/index.ts`, and verify command execution invokes session reset on `TerminalManager`.

## 2. Core Terminal Manager & Command Resolution

- [x] 2.1 Implement command template resolution in `src/core/terminal.ts` supporting `{command}` placeholder replacement and fallback quote-wrapped appending, and verify with unit tests.
- [x] 2.2 Implement unset agent command check in `TerminalManager` to abort terminal dispatch and display an informative notification with "Configure Setting" and "Copy Command" actions, and verify execution is safely prevented when unset.
- [x] 2.3 Implement session lifecycle tracking (`_hasSessionLaunched`) in `TerminalManager` to send raw slash commands to active agent sessions and full template invocations to fresh terminals, and verify session reset on terminal closure.

## 3. Webview UI Canonical Command Standardization

- [x] 3.1 Update `webview-ui/src/components/ChangeOverview.tsx` to execute and copy canonical `/openspec-propose` commands, and verify button labels and event payloads.
- [x] 3.2 Update `webview-ui/src/components/DesignViewer.tsx` to execute and copy canonical `/openspec-propose` commands, and verify empty-state actions.
- [x] 3.3 Update `webview-ui/src/components/LiveTaskList.tsx` to execute and copy canonical `/openspec-apply-change <change-name>` commands, and verify task action triggers.
- [x] 3.4 Update `webview-ui/src/components/NewChangeForm.tsx` guidance to reference `/openspec-explore`, and verify the webview bundle builds cleanly with `npm run build`.

## 4. Verification & Testing

- [x] 4.1 Update and add unit tests in `test/terminal.test.ts` covering template resolution, unset notification trigger, session reuse, and session reset, and verify `npm test` passes.
- [x] 4.2 Run full project typechecking (`npm run typecheck`) and OpenSpec change validation (`openspec validate --change configurable-agent-terminal-command`) to confirm schema compliance.
