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

  it('should format newChange arguments with schema and description', async () => {
    class TestCliBridge extends OpenSpecCliBridge {
      public capturedArgs: string[] = [];
      public override async execute(args: string[]): Promise<any> {
        this.capturedArgs = args;
        return { stdout: '', stderr: '', code: 0, success: true };
      }
    }

    const testBridge = new TestCliBridge(workspaceRoot);
    await testBridge.newChange('add-test-feature', 'spec-driven', 'A test feature description');
    assert.deepStrictEqual(testBridge.capturedArgs, [
      'new',
      'change',
      'add-test-feature',
      '--schema',
      'spec-driven',
      '--description',
      'A test feature description',
    ]);
  });
});
