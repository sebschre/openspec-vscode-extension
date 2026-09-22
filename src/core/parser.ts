import * as yaml from 'js-yaml';
import {
  TaskItem,
  SpecDetail,
  RequirementItem,
  RequirementOperation,
  ScenarioItem,
  ProposalDetail,
  DesignDetail,
  DesignDecision,
} from './types';

export class OpenSpecParser {
  /**
   * Parse tasks.md into structured TaskItems
   */
  public static parseTasks(content: string): TaskItem[] {
    const lines = content.split(/\r?\n/);
    const tasks: TaskItem[] = [];
    let currentGroup = 'General';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(/^##\s+(?:(?:\d+\.?\s*)?(.*))/);
      if (headerMatch && !line.startsWith('###')) {
        currentGroup = headerMatch[1].trim();
        continue;
      }

      const taskMatch = line.match(/^-\s*\[([ xX])\]\s*(?:(\d+(?:\.\d+)?)\s+)?(.*)/);
      if (taskMatch) {
        const isChecked = taskMatch[1].toLowerCase() === 'x';
        const taskId = taskMatch[2] ? taskMatch[2].trim() : String(tasks.length + 1);
        const description = taskMatch[3].trim();

        tasks.push({
          id: taskId,
          description,
          completed: isChecked,
          group: currentGroup,
          lineIndex: i,
        });
      }
    }

    return tasks;
  }

  /**
   * Toggle a task in markdown content by line index
   */
  public static toggleTaskInContent(content: string, lineIndex: number, completed: boolean): string {
    const lines = content.split(/\r?\n/);
    if (lineIndex < 0 || lineIndex >= lines.length) {
      return content;
    }

    const line = lines[lineIndex];
    const checkboxRegex = /(-\s*\[)([ xX])(\])/;
    if (checkboxRegex.test(line)) {
      lines[lineIndex] = line.replace(checkboxRegex, `$1${completed ? 'x' : ' '}$3`);
    }

    return lines.join('\n');
  }

  /**
   * Parse a spec.md or delta spec file
   */
  public static parseSpec(content: string, capabilityName: string, filePath: string = ''): SpecDetail {
    const lines = content.split(/\r?\n/);
    let purpose = '';
    const requirements: RequirementItem[] = [];

    // Parse purpose
    const purposeMatch = content.match(/##\s+Purpose\s*\n+([\s\S]*?)(?=\n##|$)/i);
    if (purposeMatch) {
      purpose = purposeMatch[1].trim();
    }

    // Split by level 2 headings
    let currentOperation: RequirementOperation = 'STANDARD';
    let currentReq: RequirementItem | null = null;
    let currentScenario: ScenarioItem | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('## ')) {
        const heading = line.substring(3).trim().toUpperCase();
        if (heading.includes('ADDED')) {
          currentOperation = 'ADDED';
        } else if (heading.includes('MODIFIED')) {
          currentOperation = 'MODIFIED';
        } else if (heading.includes('REMOVED')) {
          currentOperation = 'REMOVED';
        } else if (heading.includes('RENAMED')) {
          currentOperation = 'RENAMED';
        } else {
          currentOperation = 'STANDARD';
        }
        currentReq = null;
        currentScenario = null;
        continue;
      }

      if (line.startsWith('### Requirement:')) {
        const title = line.replace('### Requirement:', '').trim();
        currentReq = {
          title,
          description: '',
          operation: currentOperation,
          scenarios: [],
        };
        requirements.push(currentReq);
        currentScenario = null;
        continue;
      }

      if (line.startsWith('#### Scenario:')) {
        const scenarioName = line.replace('#### Scenario:', '').trim();
        if (currentReq) {
          currentScenario = {
            name: scenarioName,
            when: '',
            then: '',
            rawText: '',
          };
          currentReq.scenarios.push(currentScenario);
        }
        continue;
      }

      if (currentScenario) {
        currentScenario.rawText += (currentScenario.rawText ? '\n' : '') + line;
        const givenMatch = line.match(/^-\s*\*\*GIVEN\*\*\s*(.*)/i);
        if (givenMatch) {
          currentScenario.given = givenMatch[1].trim();
        }
        const whenMatch = line.match(/^-\s*\*\*WHEN\*\*\s*(.*)/i);
        if (whenMatch) {
          currentScenario.when = whenMatch[1].trim();
        }
        const thenMatch = line.match(/^-\s*\*\*THEN\*\*\s*(.*)/i);
        if (thenMatch) {
          currentScenario.then = thenMatch[1].trim();
        }
      } else if (currentReq) {
        if (line.trim() && !line.startsWith('#')) {
          currentReq.description += (currentReq.description ? '\n' : '') + line.trim();
        }
      }
    }

    return {
      capability: capabilityName,
      filePath,
      purpose,
      requirements,
    };
  }

  /**
   * Parse proposal.md
   */
  public static parseProposal(content: string): ProposalDetail {
    const whyMatch = content.match(/##\s+Why\s*\n+([\s\S]*?)(?=\n##|$)/i);
    const whatMatch = content.match(/##\s+What Changes\s*\n+([\s\S]*?)(?=\n##|$)/i);
    const impactMatch = content.match(/##\s+Impact\s*\n+([\s\S]*?)(?=\n##|$)/i);

    const whatChanges: string[] = [];
    if (whatMatch) {
      const bulletLines = whatMatch[1].split(/\r?\n/).filter((l) => l.trim().startsWith('-'));
      for (const line of bulletLines) {
        whatChanges.push(line.replace(/^[-\s*]+/, '').trim());
      }
    }

    const newCaps: string[] = [];
    const newCapMatch = content.match(/###\s+New Capabilities\s*\n+([\s\S]*?)(?=\n###|\n##|$)/i);
    if (newCapMatch) {
      const lines = newCapMatch[1].split(/\r?\n/).filter((l) => l.trim().startsWith('-'));
      for (const line of lines) {
        newCaps.push(line.replace(/^[-\s*]+/, '').trim());
      }
    }

    const modCaps: string[] = [];
    const modCapMatch = content.match(/###\s+Modified Capabilities\s*\n+([\s\S]*?)(?=\n###|\n##|$)/i);
    if (modCapMatch) {
      const lines = modCapMatch[1].split(/\r?\n/).filter((l) => l.trim().startsWith('-'));
      for (const line of lines) {
        modCaps.push(line.replace(/^[-\s*]+/, '').trim());
      }
    }

    return {
      why: whyMatch ? whyMatch[1].trim() : '',
      whatChanges,
      newCapabilities: newCaps,
      modifiedCapabilities: modCaps,
      impact: impactMatch ? impactMatch[1].trim() : '',
    };
  }

  /**
   * Parse design.md
   */
  public static parseDesign(content: string): DesignDetail {
    const contextMatch = content.match(/##\s+Context\s*\n+([\s\S]*?)(?=\n##|$)/i);
    const goalsMatch = content.match(/\*\*Goals:\*\*\s*\n+([\s\S]*?)(?=\n\*\*Non-Goals:\*\*|\n##|$)/i);
    const nonGoalsMatch = content.match(/\*\*Non-Goals:\*\*\s*\n+([\s\S]*?)(?=\n##|$)/i);
    const decisionsMatch = content.match(/##\s+Decisions\s*\n+([\s\S]*?)(?=\n##|$)/i);
    const risksMatch = content.match(/##\s+Risks\s*(?:\/\s*Trade-offs)?\s*\n+([\s\S]*?)(?=\n##|$)/i);

    const goals: string[] = [];
    if (goalsMatch) {
      const lines = goalsMatch[1].split(/\r?\n/).filter((l) => l.trim().startsWith('-'));
      for (const line of lines) {
        goals.push(line.replace(/^[-\s*]+/, '').trim());
      }
    }

    const nonGoals: string[] = [];
    if (nonGoalsMatch) {
      const lines = nonGoalsMatch[1].split(/\r?\n/).filter((l) => l.trim().startsWith('-'));
      for (const line of lines) {
        nonGoals.push(line.replace(/^[-\s*]+/, '').trim());
      }
    }

    const decisions: DesignDecision[] = [];
    if (decisionsMatch) {
      const decisionBlocks = decisionsMatch[1].split(/\n###\s+/);
      for (const block of decisionBlocks) {
        if (!block.trim()) continue;
        const blockLines = block.split(/\r?\n/);
        const title = blockLines[0].replace(/^###\s*/, '').trim();
        decisions.push({
          title,
          rationale: blockLines.slice(1).join('\n').trim(),
        });
      }
    }

    const risks: string[] = [];
    if (risksMatch) {
      const lines = risksMatch[1].split(/\r?\n/).filter((l) => l.trim().startsWith('-'));
      for (const line of lines) {
        risks.push(line.replace(/^[-\s*]+/, '').trim());
      }
    }

    return {
      context: contextMatch ? contextMatch[1].trim() : '',
      goals,
      nonGoals,
      decisions,
      risks,
    };
  }

  /**
   * Parse .openspec.yaml
   */
  public static parseMetadata(content: string): { schema?: string } {
    try {
      const parsed = yaml.load(content) as Record<string, any>;
      return {
        schema: parsed?.schema || 'spec-driven',
      };
    } catch {
      return { schema: 'spec-driven' };
    }
  }
}
