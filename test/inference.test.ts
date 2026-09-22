import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as vscode from 'vscode';
import {
  heuristicSlugify,
  sanitizeKebabSlug,
  inferChangeName,
  heuristicRefineMotivation,
  refineProposalMotivation,
  heuristicGenerateProposal,
  heuristicGenerateDeltaSpec,
  heuristicGenerateDesign,
  heuristicGenerateTasks,
  generateProposalDoc,
  generateDeltaSpecDoc,
  generateDesignDoc,
  generateTasksDoc,
} from '../src/core/inference';


describe('Inference & Slugification', () => {
  describe('sanitizeKebabSlug', () => {
    it('should sanitize raw text into valid kebab-case', () => {
      assert.strictEqual(sanitizeKebabSlug('Add User Auth'), 'add-user-auth');
      assert.strictEqual(sanitizeKebabSlug('`fix-nav-bar`'), 'fix-nav-bar');
      assert.strictEqual(sanitizeKebabSlug('"update_settings"'), 'update-settings');
      assert.strictEqual(sanitizeKebabSlug('```\nadd-search-filter\n```'), 'add-search-filter');
      assert.strictEqual(sanitizeKebabSlug('---special---characters---'), 'special-characters');
    });

    it('should return empty string for empty or invalid input', () => {
      assert.strictEqual(sanitizeKebabSlug(''), '');
      assert.strictEqual(sanitizeKebabSlug('   '), '');
      assert.strictEqual(sanitizeKebabSlug('!@#$%'), '');
      assert.strictEqual(sanitizeKebabSlug('a'), ''); // less than 2 chars
    });
  });

  describe('heuristicSlugify', () => {
    it('should derive kebab slug stripping stop words and taking first 4 keywords', () => {
      assert.strictEqual(
        heuristicSlugify('I want to add GitHub OAuth login support'),
        'add-github-oauth-login'
      );
      assert.strictEqual(
        heuristicSlugify('Fix the broken navbar layout on mobile screens'),
        'fix-broken-navbar-layout'
      );
      assert.strictEqual(
        heuristicSlugify('Support dark mode in settings'),
        'support-dark-mode-settings'
      );
    });

    it('should fallback to words if all words are stop words', () => {
      const slug = heuristicSlugify('this that it');
      assert.strictEqual(slug, 'this-that-it');
    });

    it('should return new-change for empty input', () => {
      assert.strictEqual(heuristicSlugify(''), 'new-change');
      assert.strictEqual(heuristicSlugify('   '), 'new-change');
      assert.strictEqual(heuristicSlugify('!@#$%'), 'new-change');
    });
  });

  describe('inferChangeName', () => {
    it('should fallback to heuristic when no LM model is available', async () => {
      (vscode.lm as any).selectChatModels = async () => [];
      const result = await inferChangeName('Add user authentication with GitHub');
      assert.strictEqual(result.isAi, false);
      assert.strictEqual(result.name, 'add-user-authentication-github');
    });

    it('should use LM model when available', async () => {
      (vscode.lm as any).selectChatModels = async () => [
        {
          id: 'test-model',
          sendRequest: async () => ({
            text: (async function* () {
              yield 'add-';
              yield 'github-';
              yield 'auth';
            })(),
          }),
        },
      ];

      const result = await inferChangeName('Add user authentication with GitHub');
      assert.strictEqual(result.isAi, true);
      assert.strictEqual(result.name, 'add-github-auth');
    });

    it('should fallback gracefully to heuristic if LM model throws an error', async () => {
      (vscode.lm as any).selectChatModels = async () => [
        {
          id: 'failing-model',
          sendRequest: async () => {
            throw new Error('LM connection failed');
          },
        },
      ];

      const result = await inferChangeName('Fix table alignment bug');
      assert.strictEqual(result.isAi, false);
      assert.strictEqual(result.name, 'fix-table-alignment-bug');
    });

    it('should return new-change for empty description', async () => {
      const result = await inferChangeName('');
      assert.strictEqual(result.isAi, false);
      assert.strictEqual(result.name, 'new-change');
    });
  });

  describe('heuristicRefineMotivation', () => {
    it('should format clean prose and ensure terminal punctuation', () => {
      const res = heuristicRefineMotivation('add github oauth authentication');
      assert.strictEqual(res, 'Add github oauth authentication.');
    });

    it('should preserve existing terminal punctuation', () => {
      const res = heuristicRefineMotivation('Add GitHub OAuth authentication!');
      assert.strictEqual(res, 'Add GitHub OAuth authentication!');
    });

    it('should provide default motivation for empty input', () => {
      const res = heuristicRefineMotivation('');
      assert.ok(res.includes('This proposal introduces'));
    });
  });

  describe('refineProposalMotivation', () => {
    it('should fallback to heuristic when no LM model is available', async () => {
      (vscode.lm as any).selectChatModels = async () => [];
      const result = await refineProposalMotivation('add github oauth for faster login');
      assert.strictEqual(result.isAi, false);
      assert.strictEqual(result.motivation, 'Add github oauth for faster login.');
    });

    it('should use LM model when available', async () => {
      (vscode.lm as any).selectChatModels = async () => [
        {
          id: 'test-model',
          sendRequest: async () => ({
            text: (async function* () {
              yield 'Users currently face authentication friction.\n';
              yield 'Adding GitHub OAuth streamlines login and improves security.';
            })(),
          }),
        },
      ];

      const result = await refineProposalMotivation('add github oauth');
      assert.strictEqual(result.isAi, true);
      assert.ok(result.motivation.includes('authentication friction'));
    });

    it('should fallback gracefully if LM throws error', async () => {
      (vscode.lm as any).selectChatModels = async () => [
        {
          id: 'failing-model',
          sendRequest: async () => {
            throw new Error('LM connection lost');
          },
        },
      ];

      const result = await refineProposalMotivation('need dark mode toggle');
      assert.strictEqual(result.isAi, false);
      assert.strictEqual(result.motivation, 'Need dark mode toggle.');
    });
  });

  describe('Document Generators', () => {
    describe('Proposal Generator', () => {
      it('should generate valid proposal markdown via heuristic', () => {
        const content = heuristicGenerateProposal('add-auth', 'Add GitHub OAuth login', 'auth-spec');
        assert.ok(content.includes('# Proposal: add-auth'));
        assert.ok(content.includes('## Why'));
        assert.ok(content.includes('## What Changes'));
        assert.ok(content.includes('## Capabilities'));
        assert.ok(content.includes('`auth-spec`'));
        assert.ok(content.includes('## Impact'));
      });

      it('should generate proposal via generateProposalDoc fallback', async () => {
        (vscode.lm as any).selectChatModels = async () => [];
        const result = await generateProposalDoc('add-auth', 'Add GitHub OAuth login', 'auth-spec');
        assert.strictEqual(result.isAi, false);
        assert.ok(result.content.includes('# Proposal: add-auth'));
      });
    });

    describe('Delta Spec Generator', () => {
      it('should generate valid spec delta markdown with 50+ char purpose and scenario keywords', () => {
        const content = heuristicGenerateDeltaSpec('auth-spec', 'GitHub OAuth authentication and token verification');
        assert.ok(content.includes('# Spec Delta: auth-spec'));
        assert.ok(content.includes('## Purpose'));
        const purposeMatch = content.match(/## Purpose\s*\n+([\s\S]*?)(?=\n##)/);
        assert.ok(purposeMatch && purposeMatch[1].trim().length >= 50, 'Purpose must be at least 50 chars');
        assert.ok(content.includes('## ADDED Requirements'));
        assert.ok(content.includes('### Requirement:'));
        assert.ok(content.includes('The system SHALL'));
        assert.ok(content.includes('#### Scenario:'));
        assert.ok(content.includes('- **WHEN**'));
        assert.ok(content.includes('- **THEN**'));
      });

      it('should generate delta spec via generateDeltaSpecDoc fallback', async () => {
        (vscode.lm as any).selectChatModels = async () => [];
        const result = await generateDeltaSpecDoc('auth-spec', 'OAuth authentication');
        assert.strictEqual(result.isAi, false);
        assert.ok(result.content.includes('# Spec Delta: auth-spec'));
        assert.ok(result.content.includes('#### Scenario:'));
      });
    });

    describe('Design Generator', () => {
      it('should generate valid design markdown with required sections', () => {
        const content = heuristicGenerateDesign('add-auth', 'GitHub OAuth authentication', 'auth-spec');
        assert.ok(content.includes('# Design: add-auth'));
        assert.ok(content.includes('## Context'));
        assert.ok(content.includes('## Goals / Non-Goals'));
        assert.ok(content.includes('## Decisions'));
        assert.ok(content.includes('## Risks / Trade-offs'));
      });

      it('should generate design via generateDesignDoc fallback', async () => {
        (vscode.lm as any).selectChatModels = async () => [];
        const result = await generateDesignDoc('add-auth', 'GitHub OAuth', 'auth-spec');
        assert.strictEqual(result.isAi, false);
        assert.ok(result.content.includes('# Design: add-auth'));
      });
    });

    describe('Tasks Generator', () => {
      it('should generate valid tasks markdown with numbered groups and checkboxes', () => {
        const content = heuristicGenerateTasks('add-auth', 'GitHub OAuth authentication', 'auth-spec');
        assert.ok(content.includes('# Tasks: add-auth'));
        assert.ok(content.includes('## 1.'));
        assert.ok(content.includes('- [ ] 1.1'));
      });

      it('should generate tasks via generateTasksDoc fallback', async () => {
        (vscode.lm as any).selectChatModels = async () => [];
        const result = await generateTasksDoc('add-auth', 'GitHub OAuth', 'auth-spec');
        assert.strictEqual(result.isAi, false);
        assert.ok(result.content.includes('# Tasks: add-auth'));
        assert.ok(result.content.includes('- [ ] 1.1'));
      });
    });
  });
});

