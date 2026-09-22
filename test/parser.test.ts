import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { OpenSpecParser } from '../src/core/parser';

describe('OpenSpecParser', () => {
  it('should parse tasks with groups and completion states', () => {
    const markdown = `# Tasks

## 1. First Group
- [x] 1.1 First task
- [ ] 1.2 Second task

## 2. Second Group
- [ ] 2.1 Third task
`;

    const tasks = OpenSpecParser.parseTasks(markdown);
    assert.strictEqual(tasks.length, 3);
    assert.strictEqual(tasks[0].id, '1.1');
    assert.strictEqual(tasks[0].completed, true);
    assert.strictEqual(tasks[0].group, 'First Group');

    assert.strictEqual(tasks[1].id, '1.2');
    assert.strictEqual(tasks[1].completed, false);

    assert.strictEqual(tasks[2].id, '2.1');
    assert.strictEqual(tasks[2].completed, false);
    assert.strictEqual(tasks[2].group, 'Second Group');
  });

  it('should toggle task state at specific line index', () => {
    const markdown = `# Tasks
- [ ] 1.1 Sample task
`;
    const toggled = OpenSpecParser.toggleTaskInContent(markdown, 1, true);
    assert.ok(toggled.includes('- [x] 1.1 Sample task'));

    const untoggled = OpenSpecParser.toggleTaskInContent(toggled, 1, false);
    assert.ok(untoggled.includes('- [ ] 1.1 Sample task'));
  });

  it('should parse spec file with requirements and scenarios', () => {
    const specMd = `# Spec Delta

## Purpose
A test capability for verifying the parser.

## ADDED Requirements

### Requirement: User can login
The system SHALL authenticate the user.

#### Scenario: Valid credentials
- **WHEN** user provides valid credentials
- **THEN** user is authenticated successfully
`;

    const spec = OpenSpecParser.parseSpec(specMd, 'auth-spec', '/path/to/spec.md');
    assert.strictEqual(spec.capability, 'auth-spec');
    assert.strictEqual(spec.purpose, 'A test capability for verifying the parser.');
    assert.strictEqual(spec.requirements.length, 1);

    const req = spec.requirements[0];
    assert.strictEqual(req.title, 'User can login');
    assert.strictEqual(req.operation, 'ADDED');
    assert.strictEqual(req.scenarios.length, 1);
    assert.strictEqual(req.scenarios[0].name, 'Valid credentials');
    assert.strictEqual(req.scenarios[0].when, 'user provides valid credentials');
    assert.strictEqual(req.scenarios[0].then, 'user is authenticated successfully');
  });

  it('should parse proposal.md motivation and capabilities', () => {
    const proposalMd = `# Proposal

## Why
Need better tooling for developers.

## What Changes
- Add sidebar view
- Add visual webview

## Capabilities

### New Capabilities
- companion-explorer: Tree views for specs

## Impact
Zero breaking changes.
`;

    const proposal = OpenSpecParser.parseProposal(proposalMd);
    assert.strictEqual(proposal.why, 'Need better tooling for developers.');
    assert.strictEqual(proposal.whatChanges.length, 2);
    assert.strictEqual(proposal.newCapabilities.length, 1);
    assert.ok(proposal.newCapabilities[0].includes('companion-explorer'));
  });
});
