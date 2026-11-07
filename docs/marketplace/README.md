# OpenSpec for VS Code

A visual workspace for **[OpenSpec](https://github.com/Fission-AI/OpenSpec)**, the spec-driven development workflow for AI coding agents. See your active changes, living specs, archived work, and workflow schemas in one place without leaving the editor.

## Features

### Sidebar explorer

The OpenSpec Activity Bar icon opens four views:

| View | What it shows |
| --- | --- |
| **Active Changes** | Every change in `openspec/changes/` with its task progress and next open task (`4/18 (22%) · next: 2.1 Add parser`). Expand a change to see the artifacts its schema defines. Missing artifacts are marked, delta specs show their `+ ~ −` requirement counts, and tasks are grouped by section. The view's badge shows how many changes are active. |
| **Living Specs** | The durable capability specs in `openspec/specs/`, expandable down to requirements and scenarios. Click a requirement or scenario to jump to it in `spec.md`. Specs that an active change is about to modify are highlighted and list those pending changes. |
| **Archive** | Completed changes, with their proposal, design, tasks, and delta specs. |
| **Schemas** | The workflow schemas available to the project (project, user, and built-in), their artifacts, and how those artifacts depend on each other. |

### Visual Spec Viewer

Click a change or spec to open a rich, interactive view of it:

- **Pipeline rail** showing the artifacts that are ready (`Proposal → Specs → Design → Tasks`).
- **Requirement cards** with `ADDED`, `MODIFIED`, `REMOVED` and `RENAMED` badges.
- **Scenario blocks** rendered as `GIVEN / WHEN / THEN`.
- **Live task checklist** that stays in sync with `tasks.md`. Watch tasks tick off while your agent works, or check them off yourself.
- **Overview and Design tabs** for the motivation, scope, decisions, and risks.

### Customize workflow schemas

A schema decides which artifacts a change produces and in what order. From the **Schemas** view you can:

- **Customize a schema**: fork the built-in `spec-driven` schema (or a user schema) into `openspec/schemas/` and make it your own. You choose right away whether new changes should use the copy, and the copy is selected in the tree when it is created.
- **Compare with Original**: a fork remembers where it came from, so you can diff any file against its source. The tree flags a fork when its source has a newer version.
- **Create a schema** from scratch with the artifacts you need.
- **Add or remove artifacts** and **edit their dependencies**. Dependency cycles are caught before anything is written.
- **Open templates** for each artifact with a single click, or jump to an artifact's definition in `schema.yaml` to edit its instruction.
- **Validate** a schema, and see structural problems in the tree and in the Problems panel.
- **Rename or delete** project schemas. The project default and active changes that use a schema are kept consistent.
- **Set the project default** that new changes will use.

### Agent-friendly actions

- **New Change** guided form: describe the change and the extension scaffolds it, using your chosen schema.
- **Run in Dedicated Terminal**: send OpenSpec slash commands to your coding agent (Claude Code, Gemini CLI, Antigravity, Codex, …) in a reusable terminal.
- **Copy AI prompt**: get a ready-to-paste prompt for the next unfinished task.
- **Validate** and **Archive** changes with the OpenSpec CLI. A change gets an inline Archive button as soon as it is complete, and an inline Validate button until then.

## Getting started

1. Install the OpenSpec CLI (needed for validation, archiving, and creating schemas):
   `npm install -g @fission-ai/openspec`
2. Open a folder that has an `openspec/` directory, or run `openspec init` in your project.
3. Click the **OpenSpec** icon in the Activity Bar.
4. To run slash commands from the extension, pick your coding agent with **OpenSpec: Configure Agent Command** (or just click a Run in Terminal action, which asks the first time).

## Settings

| Setting | Description |
| --- | --- |
| `openspec.terminal.agentCommand` | The command that runs your AI agent in the OpenSpec terminal. Use `{command}` where the slash command goes, e.g. `claude "{command}"`, `gemini -i "{command}"`, `codex "{command}"` or `agy -i "{command}"`. Run **OpenSpec: Configure Agent Command** to pick from presets; the first terminal action offers the same picker while it is unset. |

## Commands

All commands are in the Command Palette under **OpenSpec:**: *New Change*, *Open Visual Spec Viewer*, *Validate Change*, *Archive Change*, *Refresh Specs & Changes*, *Open Dedicated Terminal*, *Customize Schema*, *New Schema*, *Validate Schema*, *Set as Project Default Schema*, *Add Artifact to Schema*, *Compare with Original*, *Rename Schema*, *Delete Schema*.

## Feedback

Found a bug or have an idea? [Open an issue](https://github.com/sebschre/openspec-vscode-extension/issues).

This is an independent community extension for the open-source OpenSpec project.
