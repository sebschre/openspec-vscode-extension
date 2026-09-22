import * as vscode from 'vscode';

export interface InferredChangeNameResult {
  name: string;
  isAi: boolean;
}

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'can\'t', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s',
  'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself',
  'let\'s', 'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such',
  'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t',
  'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves',
  // Common intent filler words
  'please', 'want', 'need', 'like'
]);

/**
 * Sanitizes arbitrary text into a valid kebab-case slug.
 * Returns empty string if invalid.
 */
export function sanitizeKebabSlug(raw: string): string {
  if (!raw) {
    return '';
  }
  // Strip code blocks, quotes, and punctuation
  let cleaned = raw
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/```/g, '')
    .replace(/[`"']/g, '')
    .trim();

  // Pick first non-empty line
  const firstLine = cleaned.split('\n').map((l) => l.trim()).find((l) => l.length > 0) || '';
  
  cleaned = firstLine
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, ' ')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (cleaned.length < 2) {
    return '';
  }

  // Ensure it fits reasonable slug length
  if (cleaned.length > 50) {
    cleaned = cleaned.substring(0, 50).replace(/-+$/, '');
  }

  return cleaned;
}

/**
 * Offline rule-based slugifier that strips stop words and derives a 2-4 word kebab slug.
 */
export function heuristicSlugify(description: string): string {
  if (!description || !description.trim()) {
    return 'new-change';
  }

  const rawWords = description
    .toLowerCase()
    .match(/[a-z0-9]+/g);

  if (!rawWords || rawWords.length === 0) {
    return 'new-change';
  }

  // Filter out stop words
  const filteredWords = rawWords.filter((w) => !STOP_WORDS.has(w));
  const wordsToUse = filteredWords.length > 0 ? filteredWords : rawWords;

  // Take first 4 keywords
  const selected = wordsToUse.slice(0, 4);
  const slug = selected.join('-');

  return sanitizeKebabSlug(slug) || 'new-change';
}

/**
 * Infers a kebab-case change name from a user description using vscode.lm with fallback to heuristicSlugify.
 */
export async function inferChangeName(
  description: string,
  token?: vscode.CancellationToken
): Promise<InferredChangeNameResult> {
  const trimmed = description ? description.trim() : '';
  if (!trimmed) {
    return { name: 'new-change', isAi: false };
  }

  // Try vscode.lm if available
  if (vscode.lm && typeof vscode.lm.selectChatModels === 'function') {
    try {
      const models = await vscode.lm.selectChatModels();
      if (models && models.length > 0) {
        const model = models[0];
        const messages = [
          vscode.LanguageModelChatMessage.User(
            `You are an expert software developer naming an OpenSpec change based on this description:\n"${trimmed}"\n\nReturn ONLY a concise 2-4 word kebab-case slug (e.g. "add-user-auth", "fix-nav-contrast", "update-table-styling"). Do not include explanations, markdown formatting, or quotes.`
          ),
        ];

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Inference timed out')), 3500)
        );

        const requestPromise = (async () => {
          const response = await model.sendRequest(messages, {}, token);
          let fullText = '';
          for await (const chunk of response.text) {
            fullText += chunk;
          }
          return fullText;
        })();

        const rawResult = await Promise.race([requestPromise, timeoutPromise]);
        const cleaned = sanitizeKebabSlug(rawResult);
        if (cleaned && cleaned.length >= 3) {
          return { name: cleaned, isAi: true };
        }
      }
    } catch {
      // Fall through to heuristic on any LM failure or timeout
    }
  }

  return { name: heuristicSlugify(trimmed), isAi: false };
}

export interface RefinedMotivationResult {
  motivation: string;
  isAi: boolean;
}

/**
 * Offline rule-based motivation synthesizer that formats user notes into a clean, complete sentence or paragraph.
 */
export function heuristicRefineMotivation(rawDescription: string): string {
  const trimmed = (rawDescription || '').trim();
  if (!trimmed) {
    return 'This proposal introduces key improvements and features to address project requirements.';
  }

  // Clean up extra line breaks and whitespace
  const cleaned = trimmed
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Capitalize first letter
  let capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (!/[.!?]$/.test(capitalized)) {
    capitalized += '.';
  }

  return capitalized;
}

/**
 * Refines a user's initial change description into a clear, professional problem/motivation statement
 * suitable for proposal.md's ## Why section, using vscode.lm with fallback to heuristicRefineMotivation.
 */
export async function refineProposalMotivation(
  description: string,
  token?: vscode.CancellationToken
): Promise<RefinedMotivationResult> {
  const trimmed = description ? description.trim() : '';
  if (!trimmed) {
    return {
      motivation: heuristicRefineMotivation(''),
      isAi: false,
    };
  }

  // Try vscode.lm if available
  if (vscode.lm && typeof vscode.lm.selectChatModels === 'function') {
    try {
      const models = await vscode.lm.selectChatModels();
      if (models && models.length > 0) {
        const model = models[0];
        const messages = [
          vscode.LanguageModelChatMessage.User(
            `You are a software architect and technical product strategist drafting the 'Why' (Problem & Motivation) section for an OpenSpec change proposal based on the developer's notes:\n"${trimmed}"\n\nSynthesize this into a clear, professional 1-2 paragraph problem and motivation statement. Address:\n1. The current limitation, pain point, or problem.\n2. Why this change is needed and the expected outcome or value.\n\nDo not include headers (such as "## Why"), bullet points, or markdown code fences. Return ONLY the synthesized prose.`
          ),
        ];

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Inference timed out')), 4000)
        );

        const requestPromise = (async () => {
          const response = await model.sendRequest(messages, {}, token);
          let fullText = '';
          for await (const chunk of response.text) {
            fullText += chunk;
          }
          return fullText;
        })();

        const rawResult = await Promise.race([requestPromise, timeoutPromise]);
        const cleaned = (rawResult || '')
          .replace(/```[a-z]*\n?/gi, '')
          .replace(/```/g, '')
          .replace(/^#+\s*why\s*\n*/i, '')
          .trim();

        if (cleaned.length >= 10) {
          return { motivation: cleaned, isAi: true };
        }
      }
    } catch {
      // Fall through to heuristic
    }
  }

  return {
    motivation: heuristicRefineMotivation(trimmed),
    isAi: false,
  };
}

export interface GeneratedDocumentResult {
  content: string;
  isAi: boolean;
}

export function heuristicGenerateProposal(
  changeName: string,
  description: string,
  capabilityName?: string
): string {
  const cap = capabilityName || changeName;
  const whyText = heuristicRefineMotivation(description);
  const desc = description.trim() || changeName;

  return `# Proposal: ${changeName}

## Why

${whyText}

## What Changes

- Implement ${desc} to satisfy required system capabilities.
- Introduce structured interfaces, configurations, and verification routines.

## Capabilities

### New Capabilities
- \`${cap}\`: Provides ${desc} capability for the workspace.

### Modified Capabilities

## Impact

- Enhances functionality with zero breaking changes to existing public APIs or interfaces.
`;
}

export function heuristicGenerateDeltaSpec(
  capabilityName: string,
  description: string
): string {
  const cap = capabilityName || 'core-feature';
  const desc = description.trim() || 'core functionality';
  const title = cap
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return `# Spec Delta: ${cap}

## Purpose

Provides comprehensive ${desc} capabilities and guarantees observable behavior within the system.

## ADDED Requirements

### Requirement: ${title} Execution
The system SHALL support and execute ${desc} in accordance with project standards.

#### Scenario: Primary operational execution
- **WHEN** the user invokes or triggers ${desc}
- **THEN** the system executes the requested operation successfully and returns expected results
`;
}

export function heuristicGenerateDesign(
  changeName: string,
  description: string,
  capabilityName?: string
): string {
  const cap = capabilityName || changeName;
  const desc = description.trim() || changeName;

  return `# Design: ${changeName}

## Context

See proposal.md - Why. This design describes the architectural structure and technical approach for implementing ${desc}.

## Goals / Non-Goals

**Goals:**
- Provide a reliable, testable implementation for \`${cap}\`.
- Ensure schema compliance and robust error handling.

**Non-Goals:**
- Unrelated structural refactoring outside the scope of \`${cap}\`.

## Decisions

### Decision 1: Modular Implementation Strategy
Implement ${desc} using modular components and pure function interfaces where possible to facilitate unit testing and observability.
- **Rationale**: Keeps execution paths isolated and testable.
- **Alternatives Considered**: In-line monolithic handlers.

## Risks / Trade-offs

- **[Risk] Unexpected edge case inputs** → *Mitigation*: Comprehensive scenario validation and defensive parameter checking.
`;
}

export function heuristicGenerateTasks(
  changeName: string,
  description: string,
  capabilityName?: string
): string {
  const cap = capabilityName || changeName;
  const desc = description.trim() || changeName;

  return `# Tasks: ${changeName}

## 1. Setup & Scaffolding

- [ ] 1.1 Scaffold module structure and dependencies for \`${cap}\`, verifying directory setup succeeds

## 2. Core Implementation

- [ ] 2.1 Implement primary functionality for ${desc}, verifying core logic execution

## 3. Verification & Testing

- [ ] 3.1 Write automated unit and integration tests for \`${cap}\`, verifying all test assertions pass
`;
}

async function runLmPrompt(
  systemPrompt: string,
  timeoutMs: number = 4000,
  token?: vscode.CancellationToken
): Promise<string | null> {
  if (!vscode.lm || typeof vscode.lm.selectChatModels !== 'function') {
    return null;
  }
  try {
    const models = await vscode.lm.selectChatModels();
    if (!models || models.length === 0) return null;

    const model = models[0];
    const messages = [vscode.LanguageModelChatMessage.User(systemPrompt)];

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('LM timed out')), timeoutMs)
    );

    const requestPromise = (async () => {
      const response = await model.sendRequest(messages, {}, token);
      let text = '';
      for await (const chunk of response.text) {
        text += chunk;
      }
      return text;
    })();

    const raw = await Promise.race([requestPromise, timeoutPromise]);
    return (raw || '').replace(/^```[a-z]*\n?/gi, '').replace(/\n?```$/gi, '').trim();
  } catch {
    return null;
  }
}

export async function generateProposalDoc(
  changeName: string,
  description: string,
  capabilityName?: string,
  token?: vscode.CancellationToken
): Promise<GeneratedDocumentResult> {
  const cap = capabilityName || changeName;
  const prompt = `You are a software architect drafting an OpenSpec proposal.md for a change named "${changeName}".
Developer description: "${description}"
Capability slug: "${cap}"

Output ONLY a valid markdown document conforming to this exact template:
# Proposal: ${changeName}

## Why
[1-2 paragraphs on problem and motivation]

## What Changes
- [bullet point of change]
- [bullet point of change]

## Capabilities

### New Capabilities
- \`${cap}\`: [brief description of what capability covers]

### Modified Capabilities

## Impact
[Affected code, APIs, dependencies]`;

  const lmResult = await runLmPrompt(prompt, 4000, token);
  if (
    lmResult &&
    lmResult.includes('## Why') &&
    lmResult.includes('## What Changes') &&
    lmResult.includes('## Capabilities') &&
    lmResult.includes('## Impact')
  ) {
    return { content: lmResult, isAi: true };
  }

  return {
    content: heuristicGenerateProposal(changeName, description, cap),
    isAi: false,
  };
}

export async function generateDeltaSpecDoc(
  capabilityName: string,
  description: string,
  token?: vscode.CancellationToken
): Promise<GeneratedDocumentResult> {
  const prompt = `You are a software specifications engineer writing an OpenSpec delta spec (spec.md) for capability "${capabilityName}".
Description: "${description}"

Rules:
1. The first section MUST be "## Purpose" containing 1-2 complete sentences (at least 50 characters).
2. Follow with "## ADDED Requirements".
3. Each requirement MUST start with "### Requirement: <Name>" and use normative SHALL or MUST language.
4. Each scenario MUST use exactly 4 hashtags "#### Scenario: <Name>".
5. Each scenario MUST contain bullet points: "- **WHEN** <condition>" and "- **THEN** <expected result>".

Output ONLY the markdown spec document.`;

  const lmResult = await runLmPrompt(prompt, 4000, token);
  if (
    lmResult &&
    lmResult.includes('## Purpose') &&
    lmResult.includes('## ADDED Requirements') &&
    lmResult.includes('### Requirement:') &&
    lmResult.includes('#### Scenario:') &&
    lmResult.includes('**WHEN**') &&
    lmResult.includes('**THEN**')
  ) {
    return { content: lmResult, isAi: true };
  }

  return {
    content: heuristicGenerateDeltaSpec(capabilityName, description),
    isAi: false,
  };
}

export async function generateDesignDoc(
  changeName: string,
  description: string,
  capabilityName?: string,
  token?: vscode.CancellationToken
): Promise<GeneratedDocumentResult> {
  const cap = capabilityName || changeName;
  const prompt = `You are a software architect drafting an OpenSpec design.md document for change "${changeName}".
Description: "${description}"
Capability: "${cap}"

Must include:
# Design: ${changeName}

## Context
See proposal.md - Why. [Brief technical context]

## Goals / Non-Goals
**Goals:**
- [Goal 1]

**Non-Goals:**
- [Non-goal 1]

## Decisions
### Decision 1: [Title]
[Rationale and alternatives considered]

## Risks / Trade-offs
- **[Risk]** [description] → *Mitigation*: [mitigation]

Output ONLY the markdown design document.`;

  const lmResult = await runLmPrompt(prompt, 4000, token);
  if (
    lmResult &&
    lmResult.includes('## Context') &&
    lmResult.includes('## Goals / Non-Goals') &&
    lmResult.includes('## Decisions') &&
    lmResult.includes('## Risks / Trade-offs')
  ) {
    return { content: lmResult, isAi: true };
  }

  return {
    content: heuristicGenerateDesign(changeName, description, cap),
    isAi: false,
  };
}

export async function generateTasksDoc(
  changeName: string,
  description: string,
  capabilityName?: string,
  token?: vscode.CancellationToken
): Promise<GeneratedDocumentResult> {
  const cap = capabilityName || changeName;
  const prompt = `You are a technical project lead breaking down an OpenSpec change into tasks.md for "${changeName}".
Description: "${description}"
Capability: "${cap}"

Format Rules:
1. Header "# Tasks: ${changeName}"
2. Numbered groups: "## 1. Setup & Scaffolding", "## 2. Implementation", "## 3. Verification"
3. Checkboxes MUST follow "- [ ] X.Y <description with verification criterion>"

Output ONLY the markdown tasks document.`;

  const lmResult = await runLmPrompt(prompt, 4000, token);
  if (
    lmResult &&
    lmResult.includes('## 1.') &&
    lmResult.includes('- [ ] 1.1')
  ) {
    return { content: lmResult, isAi: true };
  }

  return {
    content: heuristicGenerateTasks(changeName, description, cap),
    isAi: false,
  };
}


