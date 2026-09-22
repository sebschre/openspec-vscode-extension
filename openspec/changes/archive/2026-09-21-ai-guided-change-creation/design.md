# Design: AI-Guided Change Creation Form

## Context

The OpenSpec VS Code extension provides a tree view (`changesTreeProvider.ts`) and a webview panel (`specViewerPanel.ts`) backed by a Preact single-page application (`webview-ui/`). Currently, `openspec.newChange` relies on `vscode.window.showInputBox` which accepts only a single line and rejects anything not matching `/^[a-z0-9-]+$/`. 

By extending the webview architecture and protocol messages, we can present a dedicated visual form inside `SpecViewerPanel`, derive a kebab-case name using `vscode.lm` (or an offline slugifier fallback), scaffold the change via `OpenSpecCliBridge` with `--description`, and seamlessly switch the viewer into inspection mode for the newly created change.

## Goals / Non-Goals

**Goals:**
- Provide a dedicated, responsive `<NewChangeForm />` component in the OpenSpec webview.
- Support multi-line input for describing the feature, bug fix, or capability in natural language.
- Implement automated change name inference using `vscode.lm` with an offline rule-based slugifier fallback.
- Allow users to inspect, edit, and validate the inferred kebab-case slug before creating the change.
- Pass `--description` to `cli.newChange` and initialize `proposal.md` with the user's description.
- Transition the webview in-place to the newly created change's visual spec viewer without opening extra tabs.

**Non-Goals:**
- Generating all planning artifacts (delta specs, design, tasks) directly in the webview during creation; that remains the domain of agent workflows (e.g. `/opsx-propose`).
- Requiring external API keys or cloud credentials; inference will leverage VS Code's native Language Model API (`vscode.lm`) when available, or run entirely offline.

## Decisions

### 1. In-Place Panel Transition vs Separate Webview
- **Choice**: Reuse `SpecViewerPanel` with a `'NEW_CHANGE'` state/mode instead of creating a second webview panel class.
- **Rationale**: Reusing `SpecViewerPanel` provides consistent styling, shared message routing, and avoids tab clutter. When the user submits the form, the same tab seamlessly switches to `updateChange(newChangeName)`, immediately displaying the overview and lifecycle rail.
- **Alternatives Considered**: 
  - *Separate WebviewPanel (`NewChangePanel`)*: Creates multiple tabs that must be closed or swapped, causing UI flicker.
  - *QuickInput multi-step prompt*: Confined to single-line inputs and lacks rich visual feedback.

### 2. Name Inference Strategy: `vscode.lm` with Heuristic Fallback
- **Choice**: Attempt to query `vscode.lm.selectChatModels()` first. If a model is available (e.g., GitHub Copilot or Gemini Code Assist), send a concise system prompt asking for a 2-4 word kebab-case slug starting with an action verb (`add-`, `fix-`, `update-`, etc.). If no model is registered, or if the request fails or times out, immediately fall back to an offline rule-based slugifier that strips common stop words and slugifies key terms.
- **Rationale**: Delivers high-quality AI-inferred names for users with AI tooling enabled, while guaranteeing zero breakage and 100% functionality for offline or air-gapped users.
- **Alternatives Considered**:
  - *Direct OpenAI/Anthropic API calls*: Requires users to configure and manage secret API keys in extension settings.
  - *Pure regex slugifier*: Misses semantic summarization (e.g., converting "I want to allow users to sign in with GitHub" to `add-github-auth`).

### 3. Protocol Message Extension
Extend `ExtensionToWebviewMessage` and `WebviewToExtensionMessage` in `src/protocol/messages.ts`:
- Webview -> Extension:
  - `{ type: 'INFER_CHANGE_NAME'; description: string }`
  - `{ type: 'SUBMIT_NEW_CHANGE'; name: string; description: string; schema?: string }`
- Extension -> Webview:
  - `{ type: 'SET_NEW_CHANGE_MODE' }`
  - `{ type: 'INFERRED_CHANGE_NAME'; name: string; isAi: boolean }`
  - `{ type: 'CHANGE_CREATION_ERROR'; error: string }`

### 4. CLI Bridge Enhancement
- **Choice**: Update `cli.newChange(changeName: string, schema?: string, description?: string)` in `src/core/cli.ts` to pass `--description <text>`.
- **Fallback**: In direct filesystem scaffolding mode (when CLI is not available), write the description directly into `proposal.md` under `## Why` and `## What Changes`.

## Risks / Trade-offs

- **[Risk] `vscode.lm` inference latency causing UI lag**
  → *Mitigation*: Debounce description typing by 500ms before sending `INFER_CHANGE_NAME`. Show an immediate heuristic slug and a subtle spinner while AI inference runs asynchronously.
- **[Risk] User enters a name that conflicts with an existing change**
  → *Mitigation*: Extension checks `store.getChange(name)` on submission and returns a `CHANGE_CREATION_ERROR` or warns the user in real-time.
