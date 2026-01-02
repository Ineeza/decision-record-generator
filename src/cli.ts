#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import { parseDecisionYaml } from './parser.js';
import { generateDecisionRecordFiles } from './generator.js';
import { decisionYamlTemplate } from './template.js';
import { decisionFolderName } from './naming.js';
import { promptDecisionRecord } from './interactive.js';
import { renderDecisionYaml } from './yaml.js';
import { verifyOutDir } from './verify.js';
import { areTitleAndRuleTooSimilar } from './text.js';
import { listDecisions, renderListReportMarkdown } from './list.js';
import {
  generatedOutputLines,
  missingCoreFieldsLines,
  signatureIgnoredLines,
  skippedGenerateLines,
  templateCreatedLines,
  titleRuleTooSimilarLines,
  wroteInputLines
} from './messages.js';
import type { SupportedLang } from './messages.js';

function getToolVersion(): string | undefined {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require('../package.json') as { version?: unknown };
    return typeof pkg.version === 'string' ? pkg.version : undefined;
  } catch {
    return undefined;
  }
}

function resolveLang(cliLangRaw: string | undefined): SupportedLang {
  const cliLang = (cliLangRaw ?? '').trim().toLowerCase();
  const envLang = (process.env.DR_GEN_LANG ?? '').trim().toLowerCase();

  const candidate = cliLang.length > 0 ? cliLang : envLang;
  if (candidate === 'ja' || candidate === 'jp' || candidate === 'japanese') return 'ja';
  if (candidate === 'en' || candidate === 'english') return 'en';

  const locale = `${process.env.LC_ALL ?? ''} ${process.env.LC_MESSAGES ?? ''} ${process.env.LANG ?? ''}`.toLowerCase();
  if (locale.includes('ja')) return 'ja';
  return 'en';
}

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

function warnIfTitleRuleTooSimilar(record: { title: string; rule?: string }, lang: SupportedLang): void {
  const rule = record.rule ?? '';
  if (areTitleAndRuleTooSimilar(record.title, rule)) {
    for (const line of titleRuleTooSimilarLines(lang)) {
      console.warn(line);
    }
  }
}

function parsePositiveIntOrThrow(value: string, label: string): number {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || Number.isNaN(n) || n <= 0) {
    throw new Error(`${label} must be a positive integer (got: ${value}).`);
  }
  return n;
}

async function main(argv: readonly string[]): Promise<void> {
  const program = new Command();

  const toolVersion = getToolVersion();

  program
    .name('dr-gen')
    .description('Generate lightweight Decision Records from decision.yaml')
    .version(toolVersion ?? '0.0.0');

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
      warnIfTitleRuleTooSimilar(record, resolveLang(undefined));

      const baseOutDir = options.outDir;
      const folder = decisionFolderName(record);
      const finalOutDir = await findAvailableDirPath(baseOutDir, folder);

      const command = `dr-gen generate ${input} --out-dir ${baseOutDir}`;
      await generateDecisionRecordFiles(record, {
        outDir: finalOutDir,
        meta: {
          inputPath: input,
          baseOutDir,
          outputDir: finalOutDir,
          command,
          toolName: 'dr-gen',
          toolVersion,
          nodeVersion: process.version,
          platform: process.platform
        }
      });
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
    .option('--lang <lang>', 'Language for prompts (en|ja). Also supports DR_GEN_LANG env var.', '')
    .option('--no-date', 'Do not auto-fill date')
    .option('--skip-generate', 'Only write decision.yaml and do not generate output files', false)
    .option('--force', 'Overwrite decision.yaml if it already exists', false)
    .action(async (options: { inDir: string; path: string; outDir: string; force: boolean; date: boolean; lang: string; skipGenerate: boolean }) => {
      const lang = resolveLang(options.lang);
      const record = await promptDecisionRecord({ includeDate: options.date, lang });
      warnIfTitleRuleTooSimilar(record, lang);

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

      if (options.skipGenerate) {
        for (const line of skippedGenerateLines(yamlPath, options.outDir, lang)) {
          console.log(line);
        }
        return;
      }

      const finalOutDir = path.join(options.outDir, decisionDirName);
      const command = `dr-gen new${options.date ? '' : ' --no-date'} --in-dir ${options.inDir} --out-dir ${options.outDir}`;
      await generateDecisionRecordFiles(record, {
        outDir: finalOutDir,
        meta: {
          inputPath: yamlPath,
          baseOutDir: options.outDir,
          outputDir: finalOutDir,
          command,
          toolName: 'dr-gen',
          toolVersion,
          nodeVersion: process.version,
          platform: process.platform
        }
      });
      for (const line of generatedOutputLines(finalOutDir)) {
        console.log(line);
      }
    });

  program
    .command('verify')
    .description('Verify output integrity using manifest.json (tamper detection)')
    .argument('[dir]', 'Output directory containing manifest.json', '.')
    .action(async (dir: string) => {
      const result = await verifyOutDir(dir);
      if (result.ok) {
        console.log('OK: all files match manifest.json');
        return;
      }

      console.error('FAILED: one or more files do not match manifest.json');
      for (const r of result.results) {
        if (r.ok) continue;
        if (r.error !== undefined) {
          console.error(`- ${r.filename}: ${r.error}`);
          continue;
        }
        console.error(`- ${r.filename}: hash/size mismatch`);
      }
      process.exitCode = 2;
    });

  program
    .command('list')
    .description('List generated decision records and print a copy-pasteable report')
    .option('-o, --out-dir <dir>', 'Base output directory to scan', 'out')
    .option('--from <YYYY-MM-DD>', 'Start date (inclusive) based on folder name prefix', '')
    .option('--to <YYYY-MM-DD>', 'End date (inclusive) based on folder name prefix', '')
    .option('--max-decision-len <n>', 'Max characters for the Decision line in the report (default: 80)', '80')
    .action(async (options: { outDir: string; from: string; to: string; maxDecisionLen: string }) => {
      const from = options.from.trim().length > 0 ? options.from.trim() : undefined;
      const to = options.to.trim().length > 0 ? options.to.trim() : undefined;
      const maxDecisionLen = parsePositiveIntOrThrow(options.maxDecisionLen, '--max-decision-len');

      const items = await listDecisions({ outDir: options.outDir, from, to });
      const report = renderListReportMarkdown(items, {
        outDir: options.outDir,
        from,
        to,
        generatedAtIso: new Date().toISOString(),
        maxDecisionLen
      });
      console.log(report);
    });

  await program.parseAsync(argv as string[]);
}

main(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
