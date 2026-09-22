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

export interface WorkspaceState {
  rootPath: string;
  hasOpenSpecRoot: boolean;
  changes: ChangeDetail[];
  specs: SpecDetail[];
  archive: ArchiveItem[];
}
