import { describe, expect, it } from 'vitest';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { listDecisions, renderListReportMarkdown } from '../src/list.js';

async function mkdirp(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}

function findDecisionValue(report: string): string | undefined {
  const line = report
    .split(/\r?\n/)
    .find((l) =>
      l.trimStart().startsWith('- Decision: ') ||
      l.trimStart().startsWith('- 決定事項: ')
    );
  if (line === undefined) return undefined;
  return line.includes('- Decision: ')
    ? (line.split('- Decision: ')[1] ?? '')
    : (line.split('- 決定事項: ')[1] ?? '');
}

describe('listDecisions', () => {
  it('filters by date range using folder prefix and sorts newest first', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dr-gen-list-test-'));
    try {
      const outDir = path.join(tmpDir, 'out');
      await mkdirp(outDir);

      const a = path.join(outDir, '2026-01-01__A__aaaa');
      const b = path.join(outDir, '2026-01-02__B__bbbb');
      const c = path.join(outDir, '2026-01-03__C__cccc');
      await mkdirp(a);
      await mkdirp(b);
      await mkdirp(c);

      await fs.writeFile(path.join(a, 'summary.json'), JSON.stringify({ title: 'A', date: '2026-01-01' }), 'utf8');
      await fs.writeFile(path.join(b, 'summary.json'), JSON.stringify({ title: 'B', date: '2026-01-02' }), 'utf8');
      await fs.writeFile(path.join(c, 'summary.json'), JSON.stringify({ title: 'C', date: '2026-01-03' }), 'utf8');

      const recordMd = [
        '# Any',
        '',
        '## Why',
        'because',
        '',
        '## Rule',
        'Default to AWS for new production. '.repeat(10).trim(),
        '',
        '## Consequences',
        'none',
        ''
      ].join('\n');
      await fs.writeFile(path.join(a, 'decision-record.md'), recordMd, 'utf8');
      await fs.writeFile(path.join(b, 'decision-record.md'), recordMd, 'utf8');
      await fs.writeFile(path.join(c, 'decision-record.md'), recordMd, 'utf8');

      const items = await listDecisions({ outDir, from: '2026-01-02', to: '2026-01-03' });
      expect(items.map((i) => i.folderName)).toEqual(['2026-01-03__C__cccc', '2026-01-02__B__bbbb']);

      const report = renderListReportMarkdown(items, {
        outDir,
        from: '2026-01-02',
        to: '2026-01-03',
        generatedAtIso: '2026-01-02T00:00:00.000Z'
      });

      expect(report).toContain('## Decisions');
      expect(report).toContain('2026-01-03');
      expect(report).toContain('2026-01-02');
      expect(report).not.toContain('2026-01-01');

      // Decision is clipped to keep one-line output.
      expect(report).toMatch(/Decision: .*…/);
      expect(report).not.toContain('Folder:');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('respects maxDecisionLen when rendering the report', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dr-gen-list-test-'));
    try {
      const outDir = path.join(tmpDir, 'out');
      await mkdirp(outDir);

      const a = path.join(outDir, '2026-01-02__A__aaaa');
      await mkdirp(a);

      await fs.writeFile(path.join(a, 'summary.json'), JSON.stringify({ title: 'A', date: '2026-01-02' }), 'utf8');
      const longDecision = 'Default to AWS for new production. '.repeat(10).trim();
      const recordMd = ['# Any', '', '## Decision', longDecision, ''].join('\n');
      await fs.writeFile(path.join(a, 'decision-record.md'), recordMd, 'utf8');

      const items = await listDecisions({ outDir, from: '2026-01-02', to: '2026-01-02' });
      const report = renderListReportMarkdown(items, {
        outDir,
        from: '2026-01-02',
        to: '2026-01-02',
        generatedAtIso: '2026-01-02T00:00:00.000Z',
        maxDecisionLen: 10
      });

      const value = findDecisionValue(report);
      expect(value).toBeDefined();
      const v = value ?? '';

      expect(v.endsWith('…')).toBe(true);
      expect([...v].length).toBeLessThanOrEqual(10);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('renders Japanese report labels when lang=ja', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dr-gen-list-test-'));
    try {
      const outDir = path.join(tmpDir, 'out');
      await mkdirp(outDir);

      const a = path.join(outDir, '2026-01-02__A__aaaa');
      await mkdirp(a);
      await fs.writeFile(path.join(a, 'summary.json'), JSON.stringify({ title: 'A', date: '2026-01-02' }), 'utf8');
      await fs.writeFile(path.join(a, 'decision-record.md'), ['# Any', '', '## Decision', '短い決定', ''].join('\n'), 'utf8');

      const items = await listDecisions({ outDir, from: '2026-01-02', to: '2026-01-02' });
      const report = renderListReportMarkdown(items, {
        outDir,
        from: '2026-01-02',
        to: '2026-01-02',
        generatedAtIso: '2026-01-02T00:00:00.000Z',
        lang: 'ja'
      });

      expect(report).toContain('# 意思決定レポート');
      expect(report).toContain('## 一覧');
      expect(report).toContain('- 決定事項:');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('throws on invalid date format', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dr-gen-list-test-'));
    try {
      await expect(listDecisions({ outDir: tmpDir, from: '2026/01/01' })).rejects.toThrow(/YYYY-MM-DD/);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
