import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { SchemaLocation } from './schemas';

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
      // Project-local install (e.g. `npm i -D @fission-ai/openspec`)
      path.join(this.workspaceRoot, 'node_modules', '.bin', 'openspec'),
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

  /** Lists every schema the CLI can resolve, with its source location. */
  public async listSchemas(): Promise<SchemaLocation[]> {
    if (!(await this.isCliAvailable())) return [];
    const res = await this.execute(['schema', 'which', '--all', '--json']);
    if (!res.success) return [];
    return OpenSpecCliBridge.parseSchemaList(res.stdout);
  }

  public static parseSchemaList(stdout: string): SchemaLocation[] {
    try {
      const parsed = JSON.parse(OpenSpecCliBridge.extractJson(stdout));
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (e: any) =>
            e &&
            typeof e.name === 'string' &&
            typeof e.path === 'string' &&
            ['project', 'user', 'package'].includes(e.source)
        )
        .map((e: any) => ({ name: e.name, source: e.source, path: e.path }));
    } catch {
      return [];
    }
  }

  /** Strips any banner text the CLI prints before its JSON payload. */
  public static extractJson(stdout: string): string {
    const start = stdout.search(/[[{]/);
    return start >= 0 ? stdout.slice(start) : stdout;
  }

  public async validateSchema(name: string): Promise<CliExecutionResult> {
    return this.execute(['schema', 'validate', name, '--json']);
  }

  public async initSchema(name: string, description: string, artifacts: string[]): Promise<CliExecutionResult> {
    const args = ['schema', 'init', name, '--json', '--no-default'];
    if (description.trim()) args.push('--description', description.trim());
    if (artifacts.length) args.push('--artifacts', artifacts.join(','));
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
          env: { ...this.getEnrichedEnv(), OPENSPEC_TELEMETRY: '0' },
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
