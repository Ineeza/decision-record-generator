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

function renderRecordMarkdown(record: DecisionRecord): string {
  const lines: string[] = [];

  lines.push(`# ${record.title}`);
  lines.push('');

  const meta: string[] = [];
  if (record.date !== undefined && record.date.length > 0) meta.push(`**Date**: ${record.date}`);
  if (record.decider !== undefined && record.decider.length > 0) meta.push(`**Decider**: ${record.decider}`);

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

  lines.push('## Rule');
  lines.push(record.rule ?? '');
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

function renderReproMarkdown(record: DecisionRecord): string {
  const lines: string[] = [];
  lines.push('# Reproducibility Notes');
  lines.push('');
  lines.push('## Decision');
  lines.push(record.title);
  lines.push('');

  lines.push('## Context');
  lines.push(record.context ?? '');
  lines.push('');

  lines.push('## How to Reproduce This Decision');
  lines.push('1. Review the context and constraints');
  if ((record.alternatives ?? '').trim().length > 0) {
    lines.push(`2. Evaluate alternatives: ${record.alternatives}`);
  } else {
    lines.push('2. Evaluate alternatives');
  }
  if ((record.consequences ?? '').trim().length > 0) {
    lines.push(`3. Consider consequences: ${record.consequences}`);
  } else {
    lines.push('3. Consider consequences');
  }
  if ((record.rule ?? '').trim().length > 0) {
    lines.push(`4. Apply the rule: ${record.rule}`);
  } else {
    lines.push('4. Apply the rule');
  }
  lines.push('');

  lines.push('## Verification');
  lines.push('- Check manifest.json for file integrity');
  lines.push('- Compare SHA256 hashes to detect tampering');
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

  const reproMd = renderReproMarkdown(record);

  const generatedAt = new Date().toISOString();
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
