import { describe, expect, it } from 'vitest';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { generateDecisionRecordFiles } from '../src/generator.js';

describe('generateDecisionRecordFiles', () => {
  it('writes the four output files', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dr-gen-test-'));
    try {
      await generateDecisionRecordFiles(
        {
          title: 'Test Decision',
          context: 'ctx',
          why: 'why',
          decision: 'decision'
        },
        { outDir: tmpDir }
      );

      const expected = ['decision-record.md', 'summary.json', 'repro.md', 'manifest.json'] as const;
      for (const filename of expected) {
        const fullPath = path.join(tmpDir, filename);
        const stat = await fs.stat(fullPath);
        expect(stat.isFile()).toBe(true);
      }

      const manifestRaw = await fs.readFile(path.join(tmpDir, 'manifest.json'), 'utf8');
      const manifest = JSON.parse(manifestRaw) as { files?: Record<string, unknown> };
      expect(manifest.files).toBeDefined();
      expect(Object.keys(manifest.files ?? {})).toEqual(
        expect.arrayContaining(['decision-record.md', 'summary.json', 'repro.md'])
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('renders ADR-style lifecycle fields in outputs when provided', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dr-gen-test-'));
    try {
      await generateDecisionRecordFiles(
        {
          title: 'Test Decision',
          status: 'accepted',
          supersedes: 'out/2025-12-31__Old__abcd1234',
          why: 'why',
          decision: 'decision'
        },
        { outDir: tmpDir }
      );

      const md = await fs.readFile(path.join(tmpDir, 'decision-record.md'), 'utf8');
      expect(md).toMatch(/Status/i);
      expect(md).toMatch(/accepted/i);
      expect(md).toContain('Old');

      const summaryRaw = await fs.readFile(path.join(tmpDir, 'summary.json'), 'utf8');
      const summary = JSON.parse(summaryRaw) as Record<string, unknown>;
      expect(summary.status).toBe('accepted');
      expect(summary.supersedes).toBe('out/2025-12-31__Old__abcd1234');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
