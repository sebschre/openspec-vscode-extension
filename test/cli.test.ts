import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as path from 'path';
import { OpenSpecCliBridge } from '../src/core/cli';

describe('OpenSpecCliBridge', () => {
  const workspaceRoot = path.resolve(__dirname, '..');

  it('should locate the openspec executable and check version', async () => {
    const bridge = new OpenSpecCliBridge(workspaceRoot);
    const cliPath = await bridge.getCliPath();

    if (cliPath) {
      assert.ok(cliPath.length > 0);
      const isAvailable = await bridge.isCliAvailable();
      assert.strictEqual(isAvailable, true);

      const version = await bridge.getVersion();
      assert.ok(version && version.length > 0, `Expected version string, got ${version}`);

      const validateRes = await bridge.validate();
      assert.strictEqual(validateRes.success, true);
    } else {
      const isAvailable = await bridge.isCliAvailable();
      assert.strictEqual(isAvailable, false);
    }
  });
});
