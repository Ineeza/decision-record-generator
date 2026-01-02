import { describe, expect, it } from 'vitest';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { parseDecisionYaml } from '../src/parser.js';

describe('parseDecisionYaml', () => {
  it('parses a minimal decision.yaml', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dr-gen-test-'));
    try {
      const filePath = path.join(tmpDir, 'decision.yaml');
      await fs.writeFile(filePath, 'title: "Hello"\n', 'utf8');

      const record = await parseDecisionYaml(filePath);
      expect(record.title).toBe('Hello');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('rejects missing title', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dr-gen-test-'));
    try {
      const filePath = path.join(tmpDir, 'decision.yaml');
      await fs.writeFile(filePath, 'date: "2024-01-01"\n', 'utf8');

      await expect(parseDecisionYaml(filePath)).rejects.toThrow(/title/i);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('parses ADR-style lifecycle fields', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dr-gen-test-'));
    try {
      const filePath = path.join(tmpDir, 'decision.yaml');
      await fs.writeFile(
        filePath,
        [
          'title: "Hello"',
          'status: "accepted"',
          'supersedes: "out/2025-12-31__Old__abcd1234"',
          ''
        ].join('\n'),
        'utf8'
      );

      const record = await parseDecisionYaml(filePath);
      expect(record.status).toBe('accepted');
      expect(record.supersedes).toContain('Old');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
