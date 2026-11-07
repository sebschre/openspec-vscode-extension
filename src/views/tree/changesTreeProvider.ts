import * as vscode from 'vscode';
import * as path from 'path';
import { OpenSpecStateStore } from '../../core/store';
import { ChangeDetail, SpecDetail, TaskItem } from '../../core/types';
import { ChangeArtifactStatus, resolveChangeArtifacts } from '../../core/artifacts';
import { openAtLine, plural, truncate } from './treeUtils';

type ChangeTreeElement =
  | ChangeItemElement
  | ArtifactItemElement
  | DeltaSpecItemElement
  | TaskGroupItemElement
  | TaskItemElement;

const NEXT_TASK_MAX = 40;

/** The first open task in file order. */
export function nextTask(change: ChangeDetail): TaskItem | undefined {
  return change.tasks.find((t) => !t.completed);
}

/** Compact counts of a delta spec's operations, e.g. `+2 ~1 −1`. */
export function deltaCounts(spec: SpecDetail): string {
  const count = (op: string) => spec.requirements.filter((r) => r.operation === op).length;
  const parts: string[] = [];
  const added = count('ADDED');
  const modified = count('MODIFIED');
  const removed = count('REMOVED');
  const renamed = count('RENAMED');
  if (added) parts.push(`+${added}`);
  if (modified) parts.push(`~${modified}`);
  if (removed) parts.push(`−${removed}`);
  if (renamed) parts.push(`→${renamed}`);
  return parts.join(' ');
}

export class ChangeItemElement extends vscode.TreeItem {
  constructor(public readonly change: ChangeDetail) {
    super(change.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.id = `change:${change.name}`;

    const { total, completed, percentage } = change.taskProgress;
    const next = nextTask(change);
    const progress = total > 0 ? `${completed}/${total} (${percentage}%)` : change.isComplete ? 'Done' : 'Draft';
    this.description = next ? `${progress} · next: ${truncate(`${next.id} ${next.description}`, NEXT_TASK_MAX)}` : progress;

    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown(`**${change.name}**\n\n`);
    tooltip.appendMarkdown(`Schema: \`${change.schema}\`\n\n`);
    tooltip.appendMarkdown(`Tasks: ${completed}/${total} (${percentage}%)\n\n`);
    if (next) tooltip.appendMarkdown(`Next: ${next.id} ${next.description}\n\n`);
    tooltip.appendMarkdown(change.isComplete ? 'Ready to archive.' : 'Click to open in Visual Spec Viewer.');
    this.tooltip = tooltip;
    this.contextValue = change.isComplete ? 'change.complete' : 'change';

    if (change.isComplete) {
      this.iconPath = new vscode.ThemeIcon('pass-filled', new vscode.ThemeColor('testing.iconPassed'));
    } else if (total > 0 && completed > 0) {
      this.iconPath = new vscode.ThemeIcon('pie-chart', new vscode.ThemeColor('charts.blue'));
    } else {
      this.iconPath = new vscode.ThemeIcon('circle-large-outline');
    }

    this.command = {
      command: 'openspec.openViewer',
      title: 'Open in Visual Spec Viewer',
      arguments: [change.name],
    };
  }
}

export class ArtifactItemElement extends vscode.TreeItem {
  constructor(
    public readonly change: ChangeDetail,
    public readonly artifact: ChangeArtifactStatus
  ) {
    const expandable =
      artifact.present &&
      ((artifact.id === 'specs' && change.specs.length > 0) || (artifact.id === 'tasks' && change.tasks.length > 0));
    super(
      artifact.label,
      expandable ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
    );
    this.id = `change:${change.name}:artifact:${artifact.id}`;
    this.contextValue = artifact.present ? 'changeArtifact' : 'changeArtifact.missing';

    if (!artifact.present) {
      this.description = 'missing';
      this.iconPath = new vscode.ThemeIcon('circle-large-outline', new vscode.ThemeColor('disabledForeground'));
      this.tooltip = `${artifact.label} has not been created yet.\nExpected: ${artifact.generates}${artifact.description ? `\n\n${artifact.description}` : ''}`;
      return;
    }

    this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
    this.tooltip = artifact.description ? `${artifact.label}\n\n${artifact.description}` : artifact.label;

    if (artifact.id === 'specs') {
      this.description = change.specs.length ? plural(change.specs.length, 'capability', 'capabilities') : undefined;
    } else if (artifact.id === 'tasks') {
      this.description = `${change.taskProgress.completed}/${change.taskProgress.total} completed`;
    } else if (artifact.id === 'proposal' && change.proposal?.whatChanges.length) {
      this.description = plural(change.proposal.whatChanges.length, 'change');
    } else if (artifact.id === 'design' && change.design?.decisions.length) {
      this.description = plural(change.design.decisions.length, 'decision');
    }

    // Glob artifacts point at a directory; they expand instead of opening.
    if (artifact.id !== 'specs' && path.extname(artifact.path)) {
      this.command = openAtLine(artifact.path);
    }
  }
}

export class DeltaSpecItemElement extends vscode.TreeItem {
  constructor(public readonly change: ChangeDetail, public readonly spec: SpecDetail) {
    super(spec.capability, vscode.TreeItemCollapsibleState.None);
    this.id = `change:${change.name}:delta:${spec.capability}`;
    this.description = deltaCounts(spec) || plural(spec.requirements.length, 'req');
    this.tooltip = `Delta spec for ${spec.capability}\n${plural(spec.requirements.length, 'requirement')}`;
    this.iconPath = new vscode.ThemeIcon('diff');
    this.contextValue = 'deltaSpec';
    if (spec.filePath) this.command = openAtLine(spec.filePath);
  }
}

export class TaskGroupItemElement extends vscode.TreeItem {
  constructor(
    public readonly change: ChangeDetail,
    public readonly group: string,
    public readonly tasks: TaskItem[]
  ) {
    super(group, vscode.TreeItemCollapsibleState.Collapsed);
    this.id = `change:${change.name}:group:${group}`;
    const done = tasks.filter((t) => t.completed).length;
    this.description = `${done}/${tasks.length}`;
    this.iconPath =
      done === tasks.length
        ? new vscode.ThemeIcon('pass', new vscode.ThemeColor('testing.iconPassed'))
        : new vscode.ThemeIcon('list-unordered');
    this.contextValue = 'taskGroup';
  }
}

export class TaskItemElement extends vscode.TreeItem {
  constructor(public readonly change: ChangeDetail, public readonly task: TaskItem) {
    super(`${task.id} ${task.description}`, vscode.TreeItemCollapsibleState.None);
    this.id = `change:${change.name}:task:${task.lineIndex}`;
    this.tooltip = task.description;
    this.iconPath = task.completed
      ? new vscode.ThemeIcon('pass-filled', new vscode.ThemeColor('testing.iconPassed'))
      : new vscode.ThemeIcon('circle-large-outline');
    this.contextValue = task.completed ? 'task.completed' : 'task';
    this.command = openAtLine(path.join(change.changeDir, 'tasks.md'), task.lineIndex);
  }
}

/** Groups tasks by their `##` heading, keeping file order. */
export function groupTasks(tasks: TaskItem[]): Array<{ group: string; tasks: TaskItem[] }> {
  const groups: Array<{ group: string; tasks: TaskItem[] }> = [];
  for (const task of tasks) {
    let entry = groups.find((g) => g.group === task.group);
    if (!entry) {
      entry = { group: task.group, tasks: [] };
      groups.push(entry);
    }
    entry.tasks.push(task);
  }
  return groups;
}

export class ChangesTreeProvider implements vscode.TreeDataProvider<ChangeTreeElement> {
  private _onDidChangeTreeData: vscode.EventEmitter<ChangeTreeElement | undefined | void> =
    new vscode.EventEmitter<ChangeTreeElement | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<ChangeTreeElement | undefined | void> =
    this._onDidChangeTreeData.event;

  constructor(private store: OpenSpecStateStore) {
    this.store.on('change', () => this.refresh());
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: ChangeTreeElement): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: ChangeTreeElement): vscode.ProviderResult<ChangeTreeElement[]> {
    if (!element) {
      // Empty results let the contributed welcome views explain what to do.
      const state = this.store.getState();
      if (!state.hasOpenSpecRoot) return [];
      return state.changes.map((c) => new ChangeItemElement(c));
    }

    if (element instanceof ChangeItemElement) {
      const change = element.change;
      return resolveChangeArtifacts(change, this.store.getSchema(change.schema)).map(
        (a) => new ArtifactItemElement(change, a)
      );
    }

    if (element instanceof ArtifactItemElement) {
      if (element.artifact.id === 'specs') {
        return element.change.specs.map((s) => new DeltaSpecItemElement(element.change, s));
      }
      if (element.artifact.id === 'tasks') {
        return groupTasks(element.change.tasks).map((g) => new TaskGroupItemElement(element.change, g.group, g.tasks));
      }
    }

    if (element instanceof TaskGroupItemElement) {
      return element.tasks.map((t) => new TaskItemElement(element.change, t));
    }

    return [];
  }
}
