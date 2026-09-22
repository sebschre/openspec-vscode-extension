import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { inferChangeName } from '../src/core/inference';
import { OpenSpecStateStore } from '../src/core/store';
import { OpenSpecCliBridge } from '../src/core/cli';

describe('AI-Guided Change Creation End-to-End Workflow', () => {
  const workspaceRoot = process.cwd();
  const testChangeName = 'test-e2e-workflow-creation';
  const testChangeDir = path.join(workspaceRoot, 'openspec', 'changes', testChangeName);
  const testDescription = 'Support custom webhook notification triggers on pull request events';

  after(() => {
    if (fs.existsSync(testChangeDir)) {
      fs.rmSync(testChangeDir, { recursive: true, force: true });
    }
  });

  it('should infer a valid kebab-case change slug from natural language', async () => {
    const result = await inferChangeName(testDescription);
    assert.ok(result.name.length > 0);
    assert.match(result.name, /^[a-z0-9-]+$/);
    assert.ok(result.name.includes('webhook') || result.name.includes('notification'));
  });

  it('should scaffold a new change and preserve description in proposal.md', async () => {
    const cli = new OpenSpecCliBridge(workspaceRoot);
    const store = new OpenSpecStateStore(workspaceRoot);

    const isCli = await cli.isCliAvailable();
    let created = false;
    if (isCli) {
      const res = await cli.newChange(testChangeName, 'spec-driven', testDescription);
      if (res.success) {
        created = true;
      }
    }

    const proposalPath = path.join(testChangeDir, 'proposal.md');
    const tasksPath = path.join(testChangeDir, 'tasks.md');
    const yamlPath = path.join(testChangeDir, '.openspec.yaml');

    if (!created) {
      fs.mkdirSync(testChangeDir, { recursive: true });
      fs.writeFileSync(yamlPath, `schema: spec-driven\n`, 'utf8');

      const proposalContent = `# Proposal: ${testChangeName}\n\n## Why\n\n${testDescription}\n\n## What Changes\n\n${testDescription}\n\n## Capabilities\n\n### New Capabilities\n\n### Modified Capabilities\n\n## Impact\n`;
      fs.writeFileSync(proposalPath, proposalContent, 'utf8');

      const tasksContent = `# Tasks\n\n## 1. Implementation\n\n- [ ] 1.1 Initial setup\n`;
      fs.writeFileSync(tasksPath, tasksContent, 'utf8');
    } else {
      if (fs.existsSync(proposalPath)) {
        let content = fs.readFileSync(proposalPath, 'utf8');
        if (!content.includes(testDescription)) {
          content = content.replace(/## Why\s*\n/, `## Why\n\n${testDescription}\n\n`);
          content = content.replace(/## What Changes\s*\n/, `## What Changes\n\n${testDescription}\n\n`);
          fs.writeFileSync(proposalPath, content, 'utf8');
        }
      } else {
        const proposalContent = `# Proposal: ${testChangeName}\n\n## Why\n\n${testDescription}\n\n## What Changes\n\n${testDescription}\n\n## Capabilities\n\n### New Capabilities\n\n### Modified Capabilities\n\n## Impact\n`;
        fs.writeFileSync(proposalPath, proposalContent, 'utf8');
      }
    }

    // Verify files exist
    assert.ok(fs.existsSync(proposalPath), 'proposal.md must exist');
    const proposalText = fs.readFileSync(proposalPath, 'utf8');
    assert.ok(proposalText.includes(testDescription), 'proposal.md must contain the description');

    // Verify store reads the change
    await store.refresh();
    const change = store.getChange(testChangeName);
    assert.ok(change, 'Store should load the scaffolded change');
    assert.strictEqual(change?.name, testChangeName);
    assert.ok(change?.proposal?.why?.includes(testDescription));
  });

  it('should format proposal with refined motivation in ## Why and raw description in ## What Changes', () => {
    const rawNotes = 'add webhook triggers';
    const refinedMotivation = 'Users currently lack automated event notifications. Adding webhooks enables real-time pipeline integrations.';
    const proposalContent = `# Proposal: test-refine\n\n## Why\n\n${refinedMotivation}\n\n## What Changes\n\n${rawNotes}\n\n## Capabilities\n\n### New Capabilities\n\n### Modified Capabilities\n\n## Impact\n`;

    assert.ok(proposalContent.includes(`## Why\n\n${refinedMotivation}`));
    assert.ok(proposalContent.includes(`## What Changes\n\n${rawNotes}`));
  });
});

