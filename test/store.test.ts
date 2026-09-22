import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as path from 'path';
import { OpenSpecStateStore } from '../src/core/store';

describe('OpenSpecStateStore', () => {
  const workspaceRoot = path.resolve(__dirname, '..');

  it('should scan workspace and detect OpenSpec root, living specs, and archive', async () => {
    const store = new OpenSpecStateStore(workspaceRoot);
    let eventFired = false;
    store.on('change', (state) => {
      eventFired = true;
      assert.ok(state.hasOpenSpecRoot);
    });

    const state = await store.refresh();
    assert.strictEqual(eventFired, true);
    assert.strictEqual(state.hasOpenSpecRoot, true);
    assert.ok(state.specs.length >= 3, 'Should detect at least 3 living capability specs');

    const explorerSpec = state.specs.find((s) => s.capability === 'spec-explorer');
    assert.ok(explorerSpec, 'Should detect spec-explorer spec');
    assert.ok(explorerSpec?.requirements.length >= 1);

    assert.ok(state.archive.length >= 1, 'Should detect at least 1 archived change');
  });
});
