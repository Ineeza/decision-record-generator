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
          rule: 'rule'
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
});
