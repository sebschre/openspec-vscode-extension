import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface CliExecutionResult {
  stdout: string;
  stderr: string;
  code: number;
  success: boolean;
}

export class OpenSpecCliBridge {
  private workspaceRoot: string;
  private cliPathCache: string | null | undefined = undefined;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Resolve path to the openspec binary, checking known system paths
   */
  public async getCliPath(): Promise<string | null> {
    if (this.cliPathCache !== undefined) {
      return this.cliPathCache;
    }

    const candidatePaths = [
      '/opt/homebrew/bin/openspec',
      '/usr/local/bin/openspec',
      path.join(process.env.HOME || '', '.npm-global', 'bin', 'openspec'),
    ];

    for (const candidate of candidatePaths) {
      if (fs.existsSync(candidate)) {
        this.cliPathCache = candidate;
        return candidate;
      }
    }

    // Try `which openspec`
    try {
      const whichResult = cp.execSync('which openspec 2>/dev/null', {
        encoding: 'utf8',
        env: this.getEnrichedEnv(),
      }).trim();
      if (whichResult && fs.existsSync(whichResult)) {
        this.cliPathCache = whichResult;
        return whichResult;
      }
    } catch {
      // not found via which
    }

    this.cliPathCache = null;
    return null;
  }

  public async isCliAvailable(): Promise<boolean> {
    const cliPath = await this.getCliPath();
    return cliPath !== null;
  }

  public async getVersion(): Promise<string | null> {
    const cliPath = await this.getCliPath();
    if (!cliPath) return null;

    const res = await this.execute(['--version']);
    if (res.success) {
      return res.stdout.trim();
    }
    return null;
  }

  public async validate(changeName?: string): Promise<CliExecutionResult> {
    const args = ['validate'];
    if (changeName) {
      args.push(changeName);
    } else {
      args.push('--all');
    }
    return this.execute(args);
  }

  public async archive(changeName: string): Promise<CliExecutionResult> {
    return this.execute(['archive', changeName]);
  }

  public async newChange(changeName: string, schema?: string, description?: string): Promise<CliExecutionResult> {
    const args = ['new', 'change', changeName];
    if (schema) {
      args.push('--schema', schema);
    }
    if (description && description.trim()) {
      args.push('--description', description.trim());
    }
    return this.execute(args);
  }

  public async init(): Promise<CliExecutionResult> {
    return this.execute(['init']);
  }

  public async execute(args: string[], cwd?: string): Promise<CliExecutionResult> {
    const cliPath = (await this.getCliPath()) || 'openspec';
    const execCwd = cwd || this.workspaceRoot;

    return new Promise((resolve) => {
      cp.execFile(
        cliPath,
        args,
        {
          cwd: execCwd,
          env: this.getEnrichedEnv(),
          timeout: 30000,
        },
        (error, stdout, stderr) => {
          const code = error && typeof error.code === 'number' ? error.code : error ? 1 : 0;
          resolve({
            stdout: stdout || '',
            stderr: stderr || (error ? error.message : ''),
            code,
            success: code === 0,
          });
        }
      );
    });
  }

  private getEnrichedEnv(): NodeJS.ProcessEnv {
    const env = { ...process.env };
    const extraPaths = ['/opt/homebrew/bin', '/usr/local/bin'];
    const currentPath = env.PATH || '';
    env.PATH = `${extraPaths.join(':')}:${currentPath}`;
    return env;
  }
}
