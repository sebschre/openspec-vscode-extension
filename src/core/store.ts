import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import {
  WorkspaceState,
  ChangeDetail,
  SpecDetail,
  ArchiveItem,
  SchemaDetail,
  TaskItem,
} from './types';
import { OpenSpecParser } from './parser';
import {
  DEFAULT_SCHEMA,
  SchemaLocation,
  getProjectSchemasDir,
  getUserSchemasDir,
  listSchemaDirs,
  loadSchema,
  mergeSchemaLocations,
  readDefaultSchema,
} from './schemas';

/** Resolves schemas that only the CLI knows about (e.g. built-in package schemas). */
export type SchemaDiscovery = () => Promise<SchemaLocation[]>;

export interface StoreOptions {
  /** Override the user-level schemas directory (used by tests). */
  userSchemasDir?: string;
  schemaDiscovery?: SchemaDiscovery;
}

export class OpenSpecStateStore extends EventEmitter {
  private workspaceRoot: string;
  private state: WorkspaceState;
  private userSchemasDir: string;
  private schemaDiscovery?: SchemaDiscovery;
  private discoveredSchemas?: SchemaLocation[];

  constructor(workspaceRoot: string, options: StoreOptions = {}) {
    super();
    this.workspaceRoot = workspaceRoot;
    this.userSchemasDir = options.userSchemasDir ?? getUserSchemasDir();
    this.schemaDiscovery = options.schemaDiscovery;
    this.state = this.emptyState(false);
  }

  private emptyState(hasOpenSpecRoot: boolean): WorkspaceState {
    return {
      rootPath: this.workspaceRoot,
      hasOpenSpecRoot,
      changes: [],
      specs: [],
      archive: [],
      schemas: [],
      defaultSchema: DEFAULT_SCHEMA,
    };
  }

  public getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  public getUserSchemasDir(): string {
    return this.userSchemasDir;
  }

  public getSchema(name: string): SchemaDetail | undefined {
    return this.state.schemas.find((s) => s.name === name);
  }

  /** Forces the next refresh to re-run CLI schema discovery. */
  public invalidateSchemaDiscovery(): void {
    this.discoveredSchemas = undefined;
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
      this.state = this.emptyState(false);
      this.emit('change', this.state);
      return this.state;
    }

    const changes = this.scanChanges(openspecDir);
    const specs = this.scanSpecDir(path.join(openspecDir, 'specs'));
    const archive = this.scanArchive(openspecDir);
    const defaultSchema = readDefaultSchema(this.workspaceRoot);
    const schemas = await this.scanSchemas(changes, defaultSchema);

    this.state = {
      rootPath: this.workspaceRoot,
      hasOpenSpecRoot: true,
      changes,
      specs,
      archive,
      schemas,
      defaultSchema,
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

  private scanChanges(openspecDir: string): ChangeDetail[] {
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

      let schema = readDefaultSchema(this.workspaceRoot);
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

      let tasks: TaskItem[] = [];
      if (tasksExists) {
        tasks = OpenSpecParser.parseTasks(fs.readFileSync(tasksPath, 'utf8'));
      }

      const deltaSpecs = this.scanSpecDir(specsDir);

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

  /** Recursively parses every markdown spec under `specsDir`, keyed by capability path. */
  private scanSpecDir(specsDir: string): SpecDetail[] {
    if (!fs.existsSync(specsDir)) return [];
    const specs: SpecDetail[] = [];

    const walk = (currentDir: string, relativeCapability: string = '') => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath, relativeCapability ? `${relativeCapability}/${entry.name}` : entry.name);
        } else if (entry.name.endsWith('.md')) {
          const capName = relativeCapability || entry.name.replace(/\.md$/, '');
          const content = fs.readFileSync(fullPath, 'utf8');
          specs.push(OpenSpecParser.parseSpec(content, capName, fullPath));
        }
      }
    };

    walk(specsDir);
    return specs;
  }

  private async scanSchemas(changes: ChangeDetail[], defaultSchema: string): Promise<SchemaDetail[]> {
    if (this.schemaDiscovery && this.discoveredSchemas === undefined) {
      try {
        this.discoveredSchemas = await this.schemaDiscovery();
      } catch {
        this.discoveredSchemas = [];
      }
    }

    const locations: SchemaLocation[] = [
      ...listSchemaDirs(getProjectSchemasDir(this.workspaceRoot), 'project'),
      ...listSchemaDirs(this.userSchemasDir, 'user'),
      ...(this.discoveredSchemas || []),
    ];

    const schemas = mergeSchemaLocations(locations).map((loc) => loadSchema(loc, loc.shadows));

    // The built-in schema always exists for the CLI, even when we could not locate it.
    if (!schemas.some((s) => s.name === DEFAULT_SCHEMA)) {
      schemas.push({
        name: DEFAULT_SCHEMA,
        description: 'Built-in OpenSpec workflow (install the OpenSpec CLI to inspect or fork it)',
        source: 'package',
        dirPath: '',
        schemaPath: '',
        artifacts: [],
        shadows: [],
        isDefault: false,
        usedByChanges: [],
        issues: [],
      });
    }

    for (const schema of schemas) {
      schema.isDefault = schema.name === defaultSchema;
      schema.usedByChanges = changes.filter((c) => c.schema === schema.name).map((c) => c.name);
    }
    return schemas;
  }

  private scanArchive(openspecDir: string): ArchiveItem[] {
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
        archivedSpecs = this.scanSpecDir(specsDir);
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
