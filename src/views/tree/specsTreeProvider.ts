import * as vscode from 'vscode';
import { OpenSpecStateStore } from '../../core/store';
import { SpecDetail, RequirementItem, ScenarioItem } from '../../core/types';

type SpecTreeElement = SpecItemElement | RequirementItemElement | ScenarioItemElement;

class SpecItemElement extends vscode.TreeItem {
  constructor(public readonly spec: SpecDetail) {
    super(spec.capability, vscode.TreeItemCollapsibleState.Collapsed);

    const reqCount = spec.requirements.length;
    this.description = `${reqCount} req${reqCount === 1 ? '' : 's'}`;
    this.tooltip = `Capability: ${spec.capability}\n${spec.purpose ? `Purpose: ${spec.purpose}\n` : ''}${reqCount} requirements`;
    this.iconPath = new vscode.ThemeIcon('book');
    this.contextValue = 'spec';

    this.command = {
      command: 'openspec.openViewer',
      title: 'Open Spec',
      arguments: [this],
    };
  }
}

class RequirementItemElement extends vscode.TreeItem {
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

    this.description = `${req.scenarios.length} scenarios`;
    this.tooltip = `${req.title}\n\n${req.description}`;
    this.iconPath = new vscode.ThemeIcon('symbol-property');
    this.contextValue = 'requirement';
  }
}

class ScenarioItemElement extends vscode.TreeItem {
  constructor(public readonly scenario: ScenarioItem) {
    super(scenario.name, vscode.TreeItemCollapsibleState.None);

    let details = '';
    if (scenario.given) details += `GIVEN ${scenario.given} `;
    if (scenario.when) details += `WHEN ${scenario.when} `;
    if (scenario.then) details += `THEN ${scenario.then}`;

    this.tooltip = details || scenario.rawText;
    this.iconPath = new vscode.ThemeIcon('symbol-event');
    this.contextValue = 'scenario';
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
      const state = this.store.getState();
      if (!state.hasOpenSpecRoot) {
        const item = new vscode.TreeItem('No openspec/ folder detected');
        item.iconPath = new vscode.ThemeIcon('info');
        return [item as any];
      }

      if (state.specs.length === 0) {
        const item = new vscode.TreeItem('No living capability specs yet');
        item.description = 'Archived changes promote specs here';
        item.iconPath = new vscode.ThemeIcon('info');
        return [item as any];
      }

      return state.specs.map((s) => new SpecItemElement(s));
    }

    if (element instanceof SpecItemElement) {
      return element.spec.requirements.map(
        (req) => new RequirementItemElement(req, element.spec)
      );
    }

    if (element instanceof RequirementItemElement) {
      return element.req.scenarios.map((sc) => new ScenarioItemElement(sc));
    }

    return [];
  }
}
