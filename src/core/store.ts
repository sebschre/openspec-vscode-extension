import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import {
  WorkspaceState,
  ChangeDetail,
  SpecDetail,
  ArchiveItem,
} from './types';
import { OpenSpecParser } from './parser';

export class OpenSpecStateStore extends EventEmitter {
  private workspaceRoot: string;
  private state: WorkspaceState;

  constructor(workspaceRoot: string) {
    super();
    this.workspaceRoot = workspaceRoot;
    this.state = {
      rootPath: workspaceRoot,
      hasOpenSpecRoot: false,
      changes: [],
      specs: [],
      archive: [],
    };
  }

  public getState(): WorkspaceState {
    return this.state;
  }

  public getChange(name: string): ChangeDetail | undefined {
    return this.state.changes.find((c) => c.name === name);
  }

  public getArchivedSpec(capabilityOrPath: string): SpecDetail | undefined {
    for (const archive of this.state.archive) {
      if (archive.specs) {
        const found = archive.specs.find(
          (s) => s.capability === capabilityOrPath || s.filePath === capabilityOrPath
        );
        if (found) return found;
      }
    }
    return undefined;
  }

  public async refresh(): Promise<WorkspaceState> {
    const openspecDir = path.join(this.workspaceRoot, 'openspec');
    const hasOpenSpecRoot = fs.existsSync(openspecDir) && fs.statSync(openspecDir).isDirectory();

    if (!hasOpenSpecRoot) {
      this.state = {
        rootPath: this.workspaceRoot,
        hasOpenSpecRoot: false,
        changes: [],
        specs: [],
        archive: [],
      };
      this.emit('change', this.state);
      return this.state;
    }

    const changes = await this.scanChanges(openspecDir);
    const specs = await this.scanSpecs(openspecDir);
    const archive = await this.scanArchive(openspecDir);

    this.state = {
      rootPath: this.workspaceRoot,
      hasOpenSpecRoot: true,
      changes,
      specs,
      archive,
    };

    this.emit('change', this.state);
    return this.state;
  }

  public async toggleTask(changeName: string, lineIndex: number, completed: boolean): Promise<void> {
    const tasksPath = path.join(this.workspaceRoot, 'openspec', 'changes', changeName, 'tasks.md');
    if (!fs.existsSync(tasksPath)) {
      return;
    }

    const content = fs.readFileSync(tasksPath, 'utf8');
    const updated = OpenSpecParser.toggleTaskInContent(content, lineIndex, completed);
    fs.writeFileSync(tasksPath, updated, 'utf8');
    await this.refresh();
  }

  private async scanChanges(openspecDir: string): Promise<ChangeDetail[]> {
    const changesDir = path.join(openspecDir, 'changes');
    if (!fs.existsSync(changesDir)) {
      return [];
    }

    const entries = fs.readdirSync(changesDir, { withFileTypes: true });
    const changes: ChangeDetail[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === 'archive' || entry.name.startsWith('.')) {
        continue;
      }

      const changeDir = path.join(changesDir, entry.name);
      const proposalPath = path.join(changeDir, 'proposal.md');
      const designPath = path.join(changeDir, 'design.md');
      const tasksPath = path.join(changeDir, 'tasks.md');
      const metadataPath = path.join(changeDir, '.openspec.yaml');
      const specsDir = path.join(changeDir, 'specs');

      const proposalExists = fs.existsSync(proposalPath);
      const designExists = fs.existsSync(designPath);
      const tasksExists = fs.existsSync(tasksPath);
      const specsExist = fs.existsSync(specsDir) && this.hasSpecFiles(specsDir);

      let schema = 'spec-driven';
      if (fs.existsSync(metadataPath)) {
        try {
          const meta = OpenSpecParser.parseMetadata(fs.readFileSync(metadataPath, 'utf8'));
          if (meta.schema) schema = meta.schema;
        } catch {
          // fallback default
        }
      }

      let proposal;
      if (proposalExists) {
        proposal = OpenSpecParser.parseProposal(fs.readFileSync(proposalPath, 'utf8'));
      }

      let design;
      if (designExists) {
        design = OpenSpecParser.parseDesign(fs.readFileSync(designPath, 'utf8'));
      }

      let tasks: any[] = [];
      if (tasksExists) {
        tasks = OpenSpecParser.parseTasks(fs.readFileSync(tasksPath, 'utf8'));
      }

      const deltaSpecs = this.scanDeltaSpecs(specsDir);

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => t.completed).length;
      const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const isComplete =
        proposalExists &&
        specsExist &&
        designExists &&
        tasksExists &&
        totalTasks > 0 &&
        completedTasks === totalTasks;

      changes.push({
        name: entry.name,
        changeDir,
        schema,
        artifactsPresent: {
          proposal: proposalExists,
          specs: specsExist,
          design: designExists,
          tasks: tasksExists,
        },
        taskProgress: {
          total: totalTasks,
          completed: completedTasks,
          percentage,
        },
        proposal,
        design,
        specs: deltaSpecs,
        tasks,
        isComplete,
      });
    }

    return changes;
  }

  private hasSpecFiles(dir: string): boolean {
    if (!fs.existsSync(dir)) return false;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (this.hasSpecFiles(path.join(dir, entry.name))) return true;
      } else if (entry.name.endsWith('.md')) {
        return true;
      }
    }
    return false;
  }

  private scanDeltaSpecs(specsDir: string): SpecDetail[] {
    if (!fs.existsSync(specsDir)) return [];
    const specs: SpecDetail[] = [];

    const walk = (currentDir: string, relativeCapability: string = '') => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath, relativeCapability ? `${relativeCapability}/${entry.name}` : entry.name);
        } else if (entry.name === 'spec.md' || entry.name.endsWith('.md')) {
          const capName = relativeCapability || entry.name.replace(/\.md$/, '');
          const content = fs.readFileSync(fullPath, 'utf8');
          specs.push(OpenSpecParser.parseSpec(content, capName, fullPath));
        }
      }
    };

    walk(specsDir);
    return specs;
  }

  private async scanSpecs(openspecDir: string): Promise<SpecDetail[]> {
    const specsDir = path.join(openspecDir, 'specs');
    if (!fs.existsSync(specsDir)) return [];
    const specs: SpecDetail[] = [];

    const walk = (currentDir: string, relativeCapability: string = '') => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath, relativeCapability ? `${relativeCapability}/${entry.name}` : entry.name);
        } else if (entry.name === 'spec.md' || entry.name.endsWith('.md')) {
          const capName = relativeCapability || entry.name.replace(/\.md$/, '');
          const content = fs.readFileSync(fullPath, 'utf8');
          specs.push(OpenSpecParser.parseSpec(content, capName, fullPath));
        }
      }
    };

    walk(specsDir);
    return specs;
  }

  private async scanArchive(openspecDir: string): Promise<ArchiveItem[]> {
    const archiveDir = path.join(openspecDir, 'changes', 'archive');
    if (!fs.existsSync(archiveDir)) return [];

    const entries = fs.readdirSync(archiveDir, { withFileTypes: true });
    const items: ArchiveItem[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = path.join(archiveDir, entry.name);
      const specsDir = path.join(fullPath, 'specs');
      let archivedSpecs: SpecDetail[] | undefined;

      if (fs.existsSync(specsDir)) {
        archivedSpecs = this.scanDeltaSpecs(specsDir);
        for (const spec of archivedSpecs) {
          spec.isArchived = true;
          spec.archiveName = entry.name;
        }
      }

      try {
        const stat = fs.statSync(fullPath);
        items.push({
          name: entry.name,
          path: fullPath,
          timestamp: stat.mtime.toISOString(),
          specs: archivedSpecs,
        });
      } catch {
        items.push({
          name: entry.name,
          path: fullPath,
          specs: archivedSpecs,
        });
      }
    }

    return items;
  }
}
