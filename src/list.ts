import fs from 'node:fs/promises';
import path from 'node:path';

interface DecisionSummary {
  readonly title?: string;
  readonly date?: string;
  readonly decider?: string;
  readonly status?: string;
  readonly supersedes?: string;
}

export interface ListOptions {
  readonly outDir: string;
  readonly from?: string;
  readonly to?: string;
}

export interface ListedDecision {
  readonly folderName: string;
  readonly outDir: string;
  readonly dateFromFolder?: string;
  readonly summary?: DecisionSummary;
  readonly ruleExcerpt?: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function assertIsoDateOrThrow(value: string, label: string): void {
  if (!ISO_DATE_RE.test(value)) {
    throw new Error(`${label} must be YYYY-MM-DD (got: ${value})`);
  }
}

function extractFolderDate(folderName: string): string | undefined {
  // Folder naming is expected to start with YYYY-MM-DD__
  if (folderName.length < 12) return undefined;
  const candidate = folderName.slice(0, 10);
  if (!ISO_DATE_RE.test(candidate)) return undefined;
  if (folderName.slice(10, 12) !== '__') return undefined;
  return candidate;
}

async function readSummaryJson(outDir: string): Promise<DecisionSummary | undefined> {
  try {
    const raw = await fs.readFile(path.join(outDir, 'summary.json'), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined;

    const obj = parsed as Record<string, unknown>;
    const asOptionalString = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

    return {
      title: asOptionalString(obj.title),
      date: asOptionalString(obj.date),
      decider: asOptionalString(obj.decider),
      status: asOptionalString(obj.status),
      supersedes: asOptionalString(obj.supersedes)
    };
  } catch {
    return undefined;
  }
}

function extractSectionFirstLine(markdown: string, header: string): string | undefined {
  const lines = markdown.split(/\r?\n/);
  let inRule = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';

    if (!inRule) {
      if (line.trim() === header) {
        inRule = true;
      }
      continue;
    }

    // Stop if next section starts.
    if (line.startsWith('## ')) return undefined;
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    // Keep the excerpt single-line.
    return trimmed.replace(/\s+/g, ' ');
  }
  return undefined;
}

function extractDecisionExcerptFromRecordMarkdown(markdown: string): string | undefined {
  // Prefer the newer heading, but remain backward compatible.
  return (
    extractSectionFirstLine(markdown, '## Decision') ??
    extractSectionFirstLine(markdown, '## Rule')
  );
}

async function readRuleExcerpt(outDir: string): Promise<string | undefined> {
  try {
    const md = await fs.readFile(path.join(outDir, 'decision-record.md'), 'utf8');
    return extractDecisionExcerptFromRecordMarkdown(md);
  } catch {
    return undefined;
  }
}

function withinRange(date: string, from?: string, to?: string): boolean {
  // ISO date strings compare lexicographically.
  if (from !== undefined && date < from) return false;
  if (to !== undefined && date > to) return false;
  return true;
}

export async function listDecisions(options: ListOptions): Promise<readonly ListedDecision[]> {
  const from = options.from?.trim();
  const to = options.to?.trim();

  if (from !== undefined && from.length > 0) assertIsoDateOrThrow(from, '--from');
  if (to !== undefined && to.length > 0) assertIsoDateOrThrow(to, '--to');

  const entries = await fs.readdir(options.outDir, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const results: ListedDecision[] = [];

  for (const folderName of dirs) {
    const dateFromFolder = extractFolderDate(folderName);
    if (dateFromFolder !== undefined) {
      if (!withinRange(dateFromFolder, from && from.length > 0 ? from : undefined, to && to.length > 0 ? to : undefined)) {
        continue;
      }
    } else {
      // If the folder doesn't follow naming, skip it for date-range listing.
      if ((from !== undefined && from.length > 0) || (to !== undefined && to.length > 0)) {
        continue;
      }
    }

    const fullOutDir = path.join(options.outDir, folderName);
    const summary = await readSummaryJson(fullOutDir);
    const ruleExcerpt = await readRuleExcerpt(fullOutDir);

    results.push({
      folderName,
      outDir: fullOutDir,
      dateFromFolder,
      summary,
      ruleExcerpt
    });
  }

  // Sort newest first. If date is missing, sort last.
  results.sort((a, b) => {
    const ad = a.dateFromFolder ?? '';
    const bd = b.dateFromFolder ?? '';
    if (ad !== bd) return bd.localeCompare(ad);
    const at = a.summary?.title ?? '';
    const bt = b.summary?.title ?? '';
    return at.localeCompare(bt);
  });

  return results;
}

function mdEscape(value: string): string {
  // Keep it simple for copy/paste: escape pipes and newlines.
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function truncateOneLine(value: string, maxChars: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  const chars = [...normalized];
  if (chars.length <= maxChars) return normalized;
  if (maxChars <= 1) return '…';
  return `${chars.slice(0, maxChars - 1).join('')}…`;
}

function extractFolderId(folderName: string): string {
  // Folder naming is expected to end with __<id>. If it doesn't, return the full name.
  const parts = folderName.split('__');
  const last = parts.at(-1) ?? folderName;
  return /^[0-9a-f]{8}$/i.test(last) ? last : folderName;
}

export function renderListReportMarkdown(
  items: readonly ListedDecision[],
  options: {
    readonly from?: string;
    readonly to?: string;
    readonly outDir: string;
    readonly generatedAtIso: string;
    readonly maxDecisionLen?: number;
  }
): string {
  const lines: string[] = [];

  const maxDecisionLen = options.maxDecisionLen ?? 80;

  lines.push('# Decision Record Report');
  lines.push('');

  const periodParts: string[] = [];
  if (options.from !== undefined && options.from.trim().length > 0) periodParts.push(`from ${options.from}`);
  if (options.to !== undefined && options.to.trim().length > 0) periodParts.push(`to ${options.to}`);
  const period = periodParts.length > 0 ? periodParts.join(' ') : 'all';

  lines.push(`- Out dir: ${options.outDir}`);
  lines.push(`- Period: ${period}`);
  lines.push(`- Generated at: ${options.generatedAtIso}`);
  lines.push('');

  lines.push('## Decisions');
  lines.push('');

  for (const item of items) {
    const id = extractFolderId(item.folderName);
    const date = item.summary?.date ?? item.dateFromFolder ?? '';
    const title = item.summary?.title ?? '';
    const status = item.summary?.status ?? '';
    const decider = item.summary?.decider ?? '';
    const rule = item.ruleExcerpt ?? '';

    lines.push(`- ID: ${mdEscape(id)}`);
    if (date.length > 0) lines.push(`  - Date: ${mdEscape(date)}`);
    if (title.length > 0) lines.push(`  - Title: ${mdEscape(title)}`);
    if (status.length > 0) lines.push(`  - Status: ${mdEscape(status)}`);
    if (decider.length > 0) lines.push(`  - Decider: ${mdEscape(decider)}`);
    if (rule.length > 0) {
      const clipped = truncateOneLine(rule, maxDecisionLen);
      lines.push(`  - Decision: ${mdEscape(clipped)}`);
    }

    // Add a blank line between entries for readability and safer copy/paste.
    lines.push('');
  }

  return lines.join('\n');
}
