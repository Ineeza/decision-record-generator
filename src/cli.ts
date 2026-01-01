#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'node:fs/promises';
import path from 'node:path';

import { parseDecisionYaml } from './parser.js';
import { generateDecisionRecordFiles } from './generator.js';
import { decisionYamlTemplate } from './template.js';
import { decisionFolderName } from './naming.js';
import { promptDecisionRecord } from './interactive.js';
import { renderDecisionYaml } from './yaml.js';
import {
  generatedOutputLines,
  missingCoreFieldsLines,
  signatureIgnoredLines,
  templateCreatedLines,
  wroteInputLines
} from './messages.js';

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureParentDirExists(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function ensureFileDoesNotExist(filePath: string): Promise<void> {
  if (await fileExists(filePath)) {
    throw new Error(`File already exists: ${filePath}`);
  }
}

async function findAvailableDirPath(baseDir: string, desiredName: string): Promise<string> {
  // Prefer a stable, human-readable name and only append a numeric suffix on collision.
  const candidate0 = path.join(baseDir, desiredName);
  if (!(await fileExists(candidate0))) return candidate0;

  for (let i = 2; i < 10_000; i += 1) {
    const candidate = path.join(baseDir, `${desiredName}__${i}`);
    if (!(await fileExists(candidate))) return candidate;
  }

  throw new Error('Unable to find available output directory name.');
}

async function findAvailableDecisionDirName(baseInDir: string, baseOutDir: string, desiredName: string): Promise<string> {
  const inCandidate0 = path.join(baseInDir, desiredName);
  const outCandidate0 = path.join(baseOutDir, desiredName);
  if (!(await fileExists(inCandidate0)) && !(await fileExists(outCandidate0))) return desiredName;

  for (let i = 2; i < 10_000; i += 1) {
    const name = `${desiredName}__${i}`;
    const inCandidate = path.join(baseInDir, name);
    const outCandidate = path.join(baseOutDir, name);
    if (!(await fileExists(inCandidate)) && !(await fileExists(outCandidate))) return name;
  }

  throw new Error('Unable to find available decision directory name.');
}

function warnIfMissingCoreFields(record: { why?: string; rule?: string }, inputPath: string): void {
  const missing: string[] = [];
  if ((record.why ?? '').trim().length === 0) missing.push('why');
  if ((record.rule ?? '').trim().length === 0) missing.push('rule');

  if (missing.length > 0) {
    for (const line of missingCoreFieldsLines(inputPath, missing)) {
      console.warn(line);
    }
  }
}

async function main(argv: readonly string[]): Promise<void> {
  const program = new Command();

  program
    .name('dr-gen')
    .description('Generate lightweight Decision Records from decision.yaml')
    .version('0.1.0');

  program
    .command('generate')
    .description('Generate decision record outputs from a decision.yaml file')
    .argument('<input>', 'Path to decision.yaml')
    .option('-o, --out-dir <dir>', 'Output directory (created if missing)', 'out')
    .option('--signature', 'Reserved for future cryptographic signatures (no-op in MVP)', false)
    .action(async (input: string, options: { signature: boolean; outDir: string }) => {
      if (!(await fileExists(input))) {
        await ensureParentDirExists(input);
        await fs.writeFile(input, decisionYamlTemplate(), 'utf8');
        for (const line of templateCreatedLines(input)) {
          console.log(line);
        }
        return;
      }

      if (options.signature) {
        // Keep CLI stable while making it clear this is not shipped in MVP.
        for (const line of signatureIgnoredLines()) {
          console.warn(line);
        }
      }

      const record = await parseDecisionYaml(input);
      warnIfMissingCoreFields(record, input);

      const baseOutDir = options.outDir;
      const folder = decisionFolderName(record);
      const finalOutDir = await findAvailableDirPath(baseOutDir, folder);

      await generateDecisionRecordFiles(record, { outDir: finalOutDir });
      for (const line of generatedOutputLines(finalOutDir)) {
        console.log(line);
      }
    });

  program
    .command('new')
    .description('Create decision.yaml by answering questions (no YAML knowledge required)')
    .option('--in-dir <dir>', 'Base directory for inputs', 'in')
    .option('-p, --path <file>', 'Where to write decision.yaml (overrides --in-dir)', '')
    .option('-o, --out-dir <dir>', 'Output directory (created if missing)', 'out')
    .option('--no-date', 'Do not auto-fill date')
    .option('--force', 'Overwrite decision.yaml if it already exists', false)
    .action(async (options: { inDir: string; path: string; outDir: string; force: boolean; date: boolean }) => {
      const record = await promptDecisionRecord({ includeDate: options.date });

      const desiredFolder = decisionFolderName(record);
      const decisionDirName = await findAvailableDecisionDirName(options.inDir, options.outDir, desiredFolder);

      const yamlPath = options.path.trim().length > 0 ? options.path : path.join(options.inDir, decisionDirName, 'decision.yaml');

      if (!options.force) {
        await ensureFileDoesNotExist(yamlPath);
      }

      await ensureParentDirExists(yamlPath);
      await fs.writeFile(yamlPath, renderDecisionYaml(record), 'utf8');
      for (const line of wroteInputLines(yamlPath)) {
        console.log(line);
      }

      const finalOutDir = path.join(options.outDir, decisionDirName);
      await generateDecisionRecordFiles(record, { outDir: finalOutDir });
      for (const line of generatedOutputLines(finalOutDir)) {
        console.log(line);
      }
    });

  await program.parseAsync(argv as string[]);
}

main(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
