export interface TaskItem {
  id: string;
  description: string;
  completed: boolean;
  group: string;
  lineIndex: number;
}

export interface ScenarioItem {
  name: string;
  given?: string;
  when: string;
  then: string;
  rawText: string;
}

export type RequirementOperation = 'ADDED' | 'MODIFIED' | 'REMOVED' | 'RENAMED' | 'STANDARD';

export interface RequirementItem {
  title: string;
  description: string;
  operation: RequirementOperation;
  scenarios: ScenarioItem[];
}

export interface SpecDetail {
  capability: string;
  filePath: string;
  purpose: string;
  requirements: RequirementItem[];
  isArchived?: boolean;
  archiveName?: string;
}

export interface ProposalDetail {
  why: string;
  whatChanges: string[];
  newCapabilities: string[];
  modifiedCapabilities: string[];
  impact: string;
}

export interface DesignDecision {
  title: string;
  rationale: string;
  alternative?: string;
}

export interface DesignDetail {
  context: string;
  goals: string[];
  nonGoals: string[];
  decisions: DesignDecision[];
  risks: string[];
}

export interface ChangeDetail {
  name: string;
  changeDir: string;
  schema: string;
  artifactsPresent: {
    proposal: boolean;
    specs: boolean;
    design: boolean;
    tasks: boolean;
  };
  taskProgress: {
    total: number;
    completed: number;
    percentage: number;
  };
  proposal?: ProposalDetail;
  design?: DesignDetail;
  specs: SpecDetail[];
  tasks: TaskItem[];
  isComplete: boolean;
}

export interface ArchiveItem {
  name: string;
  path: string;
  timestamp?: string;
  specs?: SpecDetail[];
}

/** Where a workflow schema was resolved from, in OpenSpec's precedence order. */
export type SchemaSource = 'project' | 'user' | 'package';

export interface SchemaArtifact {
  id: string;
  generates: string;
  description: string;
  template: string;
  instruction?: string;
  requires: string[];
  /** Absolute path of the template file, when the schema lives on disk. */
  templatePath?: string;
  templateExists: boolean;
}

export interface SchemaApplyPhase {
  requires: string[];
  tracks?: string | null;
  instruction?: string;
}

export interface SchemaIssue {
  level: 'error' | 'warning';
  message: string;
}

export interface SchemaDetail {
  name: string;
  version?: number;
  description?: string;
  source: SchemaSource;
  /** Schema directory; empty when the schema is known by name only (e.g. CLI not installed). */
  dirPath: string;
  schemaPath: string;
  artifacts: SchemaArtifact[];
  apply?: SchemaApplyPhase;
  /** Lower-precedence locations that define a schema with the same name. */
  shadows: SchemaSource[];
  /** True when this schema is the project default from `openspec/config.yaml`. */
  isDefault: boolean;
  /** Names of active changes whose `.openspec.yaml` selects this schema. */
  usedByChanges: string[];
  /** Structural problems found while loading the schema. */
  issues: SchemaIssue[];
}

export interface WorkspaceState {
  rootPath: string;
  hasOpenSpecRoot: boolean;
  changes: ChangeDetail[];
  specs: SpecDetail[];
  archive: ArchiveItem[];
  schemas: SchemaDetail[];
  defaultSchema: string;
}
