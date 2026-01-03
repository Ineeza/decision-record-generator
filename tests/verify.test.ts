import { describe, expect, it } from 'vitest';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { generateDecisionRecordFiles } from '../src/generator.js';
import { verifyOutDir } from '../src/verify.js';

describe('verifyOutDir', () => {
  it('returns ok=true when files match manifest', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dr-gen-verify-test-'));
    try {
      await generateDecisionRecordFiles(
        { title: 'Verify OK', why: 'why', decision: 'decision', context: 'ctx' },
        { outDir: tmpDir }
      );

      const result = await verifyOutDir(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results.every((r) => r.ok)).toBe(true);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns ok=false when a file is modified', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dr-gen-verify-test-'));
    try {
      await generateDecisionRecordFiles(
        { title: 'Verify NG', why: 'why', decision: 'decision', context: 'ctx' },
        { outDir: tmpDir }
      );

      const recordPath = path.join(tmpDir, 'decision-record.md');
      const original = await fs.readFile(recordPath, 'utf8');
      await fs.writeFile(recordPath, `${original}\nTAMPER\n`, 'utf8');

      const result = await verifyOutDir(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.results.some((r) => r.filename === 'decision-record.md' && r.ok === false)).toBe(true);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
