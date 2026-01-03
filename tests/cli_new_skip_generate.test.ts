import { describe, expect, it } from 'vitest';

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function listDirSafe(p: string): Promise<readonly string[]> {
  try {
    return await fs.readdir(p);
  } catch {
    return [];
  }
}

function runCliNewSkipGenerate(
  args: readonly string[],
  answers: readonly string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const tsxCli = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
    const cliTs = path.join(process.cwd(), 'src', 'cli.ts');

    const child = spawn(process.execPath, [tsxCli, cliTs, ...args], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (d) => {
      stdout += d;
    });
    child.stderr.on('data', (d) => {
      stderr += d;
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });

    // Feed input step-by-step to avoid losing lines when stdin is not a TTY.
    let index = 0;
    const trySend = (): void => {
      // Each prompt ends with "> ". When we see it, send one answer line.
      const promptCount = (stdout.match(/> /g) ?? []).length;
      while (index < answers.length && index < promptCount) {
        child.stdin.write(`${answers[index] ?? ''}\n`);
        index += 1;
      }
      // After last prompt answered, end stdin.
      if (index >= answers.length) {
        child.stdin.end();
      }
    };

    child.stdout.on('data', () => {
      trySend();
    });

    // Kick once in case prompts are buffered.
    setTimeout(trySend, 10);
  });
}

describe('cli new --skip-generate', () => {
  it('writes decision.yaml but does not generate out/ files', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dr-gen-cli-test-'));
    try {
      const inDir = path.join(tmpDir, 'in');
      const outDir = path.join(tmpDir, 'out');

      const { stdout, exitCode } = await runCliNewSkipGenerate(
        ['new', '--lang', 'en', '--no-date', '--skip-generate', '--in-dir', inDir, '--out-dir', outDir, '--force'],
        // Title, Why, Decision, Context
        ['Choose AWS', 'Because reliability', 'Default to AWS', '']
      );

      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/Wrote: /);
      expect(stdout).toMatch(/--skip-generate/);

      const inEntries = await listDirSafe(inDir);
      expect(inEntries.length).toBeGreaterThan(0);

      const decisionFolder = inEntries[0] ?? '';
      const yamlPath = path.join(inDir, decisionFolder, 'decision.yaml');
      expect(await pathExists(yamlPath)).toBe(true);

      // outDir should not be created at all when skipping generation.
      expect(await pathExists(outDir)).toBe(false);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
