import fs from 'node:fs/promises';
import path from 'node:path';

import type { DecisionRecord, Manifest } from './types.js';
import { sha256Utf8, utf8SizeBytes } from './hash.js';

const OUTPUT_FILES = {
  record: 'decision-record.md',
  summary: 'summary.json',
  repro: 'repro.md',
  manifest: 'manifest.json'
} as const;

interface ReproMeta {
  readonly generatedAtIso: string;
  readonly inputPath?: string;
  readonly outputDir?: string;
  readonly baseOutDir?: string;
  readonly command?: string;
  readonly toolName?: string;
  readonly toolVersion?: string;
  readonly nodeVersion?: string;
  readonly platform?: string;
}

function renderRecordMarkdown(record: DecisionRecord): string {
  const lines: string[] = [];

  lines.push(`# ${record.title}`);
  lines.push('');

  const meta: string[] = [];
  if (record.date !== undefined && record.date.length > 0) meta.push(`**Date**: ${record.date}`);
  if (record.decider !== undefined && record.decider.length > 0) meta.push(`**Decider**: ${record.decider}`);
  if (record.status !== undefined && record.status.length > 0) meta.push(`**Status**: ${record.status}`);
  if (record.supersedes !== undefined && record.supersedes.length > 0) meta.push(`**Supersedes**: ${record.supersedes}`);

  if (meta.length > 0) {
    lines.push(meta.join('  \n'));
    lines.push('');
  }

  lines.push('## Context');
  lines.push(record.context ?? '');
  lines.push('');

  lines.push('## Why');
  lines.push(record.why ?? '');
  lines.push('');

  lines.push('## Decision');
  lines.push(record.decision ?? record.rule ?? '');
  lines.push('');

  lines.push('## Alternatives Considered');
  lines.push(record.alternatives ?? '');
  lines.push('');

  lines.push('## Consequences');
  lines.push(record.consequences ?? '');
  lines.push('');

  if (record.tags !== undefined && record.tags.length > 0) {
    lines.push(`**Tags**: ${record.tags.join(', ')}`);
    lines.push('');
  }

  return lines.join('\n');
}

function renderReproMarkdown(record: DecisionRecord, meta: ReproMeta): string {
  const lines: string[] = [];
  lines.push('# Reproducibility Notes');
  lines.push('');

  lines.push('This file is meant to be operational: how to regenerate outputs and how to verify integrity.');
  lines.push('The human-readable decision is in `decision-record.md`.');
  lines.push('');

  lines.push('## Summary');
  lines.push(`- Decision: ${record.title}`);
  lines.push(`- Generated at: ${meta.generatedAtIso}`);
  if (meta.toolName !== undefined) {
    const versionPart = meta.toolVersion !== undefined ? ` ${meta.toolVersion}` : '';
    lines.push(`- Generator: ${meta.toolName}${versionPart}`);
  }
  if (meta.nodeVersion !== undefined) {
    lines.push(`- Node.js: ${meta.nodeVersion}`);
  }
  if (meta.platform !== undefined) {
    lines.push(`- Platform: ${meta.platform}`);
  }
  if (meta.inputPath !== undefined && meta.inputPath.trim().length > 0) {
    lines.push(`- Input: ${meta.inputPath}`);
  }
  if (meta.outputDir !== undefined && meta.outputDir.trim().length > 0) {
    lines.push(`- Output dir: ${meta.outputDir}`);
  }
  lines.push('');

  lines.push('## Regenerate');
  lines.push('Re-run the generator from the same repo/project with the same `decision.yaml`.');
  lines.push('');
  if (meta.command !== undefined && meta.command.trim().length > 0) {
    lines.push('Command used:');
    lines.push('```bash');
    lines.push(meta.command);
    lines.push('```');
  } else {
    const baseOutDir = meta.baseOutDir?.trim().length ? meta.baseOutDir : 'out';
    lines.push('Example:');
    lines.push('```bash');
    lines.push(`dr-gen generate <path/to/decision.yaml> --out-dir ${baseOutDir}`);
    lines.push('```');
  }
  lines.push('');
  lines.push('Notes:');
  lines.push('- By design, `dr-gen` avoids overwriting existing output folders. If you run it twice, it may create a suffixed folder like `__2`.');
  lines.push('- If you need a byte-for-byte identical result, regenerate into an empty folder and compare hashes.');
  lines.push('');

  lines.push('## Verify integrity (tamper detection)');
  lines.push('The source of truth is `manifest.json` (SHA256 per file).');
  lines.push('');
  lines.push('1) Open `manifest.json` and find the expected hashes under `files`.');
  lines.push('');
  lines.push('2) Compute hashes locally and compare:');
  lines.push('```bash');
  lines.push('shasum -a 256 decision-record.md');
  lines.push('shasum -a 256 summary.json');
  lines.push('shasum -a 256 repro.md');
  lines.push('```');
  lines.push('');
  lines.push('If any hash differs, at least one file was modified after generation (or a different generator version produced different output).');
  lines.push('');

  lines.push('## Quick review checklist (optional)');
  lines.push('- Does the decision still match reality? If not, write a new DR (do not edit history).');
  lines.push('- Are `why` and `decision` still the best short explanation?');
  lines.push('- If an exception happened, create a separate DR for the exception.');
  lines.push('');

  return lines.join('\n');
}

function buildManifest(recordTitle: string, generatedAtIso: string, fileContents: Record<string, string>): Manifest {
  const files: Record<string, { sha256: string; size_bytes: number }> = {};
  for (const [filename, content] of Object.entries(fileContents)) {
    files[filename] = {
      sha256: sha256Utf8(content),
      size_bytes: utf8SizeBytes(content)
    };
  }

  return {
    generated_at: generatedAtIso,
    dr_title: recordTitle,
    files,
    signature: null
  };
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDirectoryExists(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
  const stat = await fs.stat(dirPath);
  if (!stat.isDirectory()) {
    throw new Error(`Output path is not a directory: ${dirPath}`);
  }
}

export interface GenerateOptions {
  readonly outDir?: string;
  readonly meta?: {
    readonly inputPath?: string;
    readonly outputDir?: string;
    readonly baseOutDir?: string;
    readonly command?: string;
    readonly toolName?: string;
    readonly toolVersion?: string;
    readonly nodeVersion?: string;
    readonly platform?: string;
  };
}

export async function generateDecisionRecordFiles(
  record: DecisionRecord,
  options: GenerateOptions = {}
): Promise<void> {
  const outDir = options.outDir ?? process.cwd();

  const recordMd = renderRecordMarkdown(record);
  const summaryJson = JSON.stringify(
    {
      title: record.title,
      date: record.date,
      decider: record.decider,
      status: record.status,
      supersedes: record.supersedes,
      tags: record.tags,
      files: {
        record: OUTPUT_FILES.record,
        summary: OUTPUT_FILES.summary,
        repro: OUTPUT_FILES.repro,
        manifest: OUTPUT_FILES.manifest
      }
    },
    null,
    2
  );

  const generatedAt = new Date().toISOString();
  const reproMd = renderReproMarkdown(record, {
    generatedAtIso: generatedAt,
    inputPath: options.meta?.inputPath,
    outputDir: options.meta?.outputDir,
    baseOutDir: options.meta?.baseOutDir,
    command: options.meta?.command,
    toolName: options.meta?.toolName,
    toolVersion: options.meta?.toolVersion,
    nodeVersion: options.meta?.nodeVersion,
    platform: options.meta?.platform
  });

  const manifest = buildManifest(record.title, generatedAt, {
    [OUTPUT_FILES.record]: recordMd,
    [OUTPUT_FILES.summary]: summaryJson,
    [OUTPUT_FILES.repro]: reproMd
  });
  const manifestJson = JSON.stringify(manifest, null, 2);

  const outputs: Record<string, string> = {
    [OUTPUT_FILES.record]: recordMd,
    [OUTPUT_FILES.summary]: summaryJson,
    [OUTPUT_FILES.repro]: reproMd,
    [OUTPUT_FILES.manifest]: manifestJson
  };

  await writeOutputsAtomic(outDir, outputs);
}

export async function writeOutputsAtomic(outDir: string, outputs: Readonly<Record<string, string>>): Promise<void> {
  await ensureDirectoryExists(outDir);
  const tempDir = await fs.mkdtemp(path.join(outDir, '.dr-gen-tmp-'));

  const targetPaths = Object.keys(outputs).map((name) => ({
    name,
    targetPath: path.join(outDir, name),
    tempPath: path.join(tempDir, name)
  }));

  const backups: Array<{ targetPath: string; backupPath: string }> = [];
  const movedTargets: string[] = [];

  try {
    for (const { tempPath, name } of targetPaths) {
      await fs.writeFile(tempPath, outputs[name] ?? '', 'utf8');
    }

    for (const { targetPath, name } of targetPaths) {
      if (await pathExists(targetPath)) {
        const backupPath = path.join(
          outDir,
          `${name}.bak-${Date.now()}-${Math.random().toString(16).slice(2)}`
        );
        await fs.rename(targetPath, backupPath);
        backups.push({ targetPath, backupPath });
      }
    }

    for (const { tempPath, targetPath } of targetPaths) {
      await fs.rename(tempPath, targetPath);
      movedTargets.push(targetPath);
    }

    for (const { backupPath } of backups) {
      await fs.rm(backupPath, { force: true });
    }
  } catch (error) {
    // Best-effort rollback.
    for (const targetPath of movedTargets) {
      await fs.rm(targetPath, { force: true }).catch(() => undefined);
    }
    for (const { targetPath, backupPath } of backups) {
      await fs.rename(backupPath, targetPath).catch(() => undefined);
    }
    throw error;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
