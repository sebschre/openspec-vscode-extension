import * as vscode from 'vscode';
import { OpenSpecStateStore } from '../../core/store';
import { SpecDetail, RequirementItem, ScenarioItem } from '../../core/types';
import { openAtLine, plural } from './treeUtils';

type SpecTreeElement =
  | SpecItemElement
  | PendingChangesItemElement
  | PendingChangeItemElement
  | RequirementItemElement
  | ScenarioItemElement;

export class SpecItemElement extends vscode.TreeItem {
  constructor(public readonly spec: SpecDetail) {
    super(spec.capability, vscode.TreeItemCollapsibleState.Collapsed);
    this.id = `spec:${spec.capability}`;

    const reqCount = spec.requirements.length;
    const pending = spec.pendingChanges?.length ?? 0;
    this.description = plural(reqCount, 'req') + (pending ? ` · ${pending} pending` : '');

    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown(`**${spec.capability}**\n\n`);
    if (spec.purpose) tooltip.appendMarkdown(`${spec.purpose}\n\n`);
    tooltip.appendMarkdown(plural(reqCount, 'requirement'));
    if (pending) {
      tooltip.appendMarkdown(`\n\nPending changes: ${spec.pendingChanges!.map((c) => `\`${c}\``).join(', ')}`);
    }
    this.tooltip = tooltip;
    this.iconPath = pending ? new vscode.ThemeIcon('book', new vscode.ThemeColor('charts.yellow')) : new vscode.ThemeIcon('book');
    this.contextValue = 'spec';

    this.command = {
      command: 'openspec.openViewer',
      title: 'Open Spec',
      arguments: [this],
    };
  }
}

export class PendingChangesItemElement extends vscode.TreeItem {
  constructor(public readonly spec: SpecDetail) {
    super('Pending changes', vscode.TreeItemCollapsibleState.Collapsed);
    this.id = `spec:${spec.capability}:pending`;
    this.description = String(spec.pendingChanges?.length ?? 0);
    this.tooltip = 'Active changes with a delta spec for this capability';
    this.iconPath = new vscode.ThemeIcon('git-pull-request', new vscode.ThemeColor('charts.yellow'));
    this.contextValue = 'pendingChanges';
  }
}

export class PendingChangeItemElement extends vscode.TreeItem {
  constructor(public readonly spec: SpecDetail, public readonly changeName: string) {
    super(changeName, vscode.TreeItemCollapsibleState.None);
    this.id = `spec:${spec.capability}:pending:${changeName}`;
    this.tooltip = `Open change ${changeName} in the Visual Spec Viewer`;
    this.iconPath = new vscode.ThemeIcon('git-pull-request');
    this.contextValue = 'pendingChange';
    this.command = {
      command: 'openspec.openViewer',
      title: 'Open Change',
      arguments: [changeName],
    };
  }
}

export class RequirementItemElement extends vscode.TreeItem {
  constructor(
    public readonly req: RequirementItem,
    public readonly spec: SpecDetail
  ) {
    super(
      req.title,
      req.scenarios.length > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );
    this.id = `spec:${spec.capability}:req:${req.lineIndex ?? req.title}`;

    this.description = plural(req.scenarios.length, 'scenario');
    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown(`**${req.title}**`);
    if (req.description) tooltip.appendMarkdown(`\n\n${req.description}`);
    this.tooltip = tooltip;
    this.iconPath = new vscode.ThemeIcon('symbol-property');
    this.contextValue = 'requirement';
    if (spec.filePath && req.lineIndex !== undefined) this.command = openAtLine(spec.filePath, req.lineIndex);
  }
}

export class ScenarioItemElement extends vscode.TreeItem {
  constructor(public readonly scenario: ScenarioItem, public readonly spec?: SpecDetail) {
    super(scenario.name, vscode.TreeItemCollapsibleState.None);
    if (spec) this.id = `spec:${spec.capability}:scenario:${scenario.lineIndex ?? scenario.name}`;

    const steps: string[] = [];
    if (scenario.given) steps.push(`**GIVEN** ${scenario.given}`);
    if (scenario.when) steps.push(`**WHEN** ${scenario.when}`);
    if (scenario.then) steps.push(`**THEN** ${scenario.then}`);

    this.tooltip = steps.length ? new vscode.MarkdownString(steps.join('\n\n')) : scenario.rawText;
    this.iconPath = new vscode.ThemeIcon('symbol-event');
    this.contextValue = 'scenario';
    if (spec?.filePath && scenario.lineIndex !== undefined) {
      this.command = openAtLine(spec.filePath, scenario.lineIndex);
    }
  }
}

export class SpecsTreeProvider implements vscode.TreeDataProvider<SpecTreeElement> {
  private _onDidChangeTreeData: vscode.EventEmitter<SpecTreeElement | undefined | void> =
    new vscode.EventEmitter<SpecTreeElement | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<SpecTreeElement | undefined | void> =
    this._onDidChangeTreeData.event;

  constructor(private store: OpenSpecStateStore) {
    this.store.on('change', () => this.refresh());
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: SpecTreeElement): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: SpecTreeElement): vscode.ProviderResult<SpecTreeElement[]> {
    if (!element) {
      // Empty results let the contributed welcome views explain what to do.
      const state = this.store.getState();
      if (!state.hasOpenSpecRoot) return [];
      return state.specs.map((s) => new SpecItemElement(s));
    }

    if (element instanceof SpecItemElement) {
      const children: SpecTreeElement[] = [];
      if (element.spec.pendingChanges?.length) children.push(new PendingChangesItemElement(element.spec));
      for (const req of element.spec.requirements) children.push(new RequirementItemElement(req, element.spec));
      return children;
    }

    if (element instanceof PendingChangesItemElement) {
      return (element.spec.pendingChanges ?? []).map((c) => new PendingChangeItemElement(element.spec, c));
    }

    if (element instanceof RequirementItemElement) {
      return element.req.scenarios.map((sc) => new ScenarioItemElement(sc, element.spec));
    }

    return [];
  }
}
