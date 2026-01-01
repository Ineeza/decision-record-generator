import type { DecisionRecord } from './types.js';
import { sha256Utf8 } from './hash.js';

function sanitizeForPathSegment(value: string): string {
  // Remove characters that are commonly invalid or problematic in file names.
  // Keep Unicode letters as-is (Japanese titles remain readable).
  return value
    .normalize('NFKC')
    .trim()
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[\\/]/g, '-')
    .replace(/[:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function safeDatePrefix(date: string | undefined): string {
  if (date === undefined) return 'undated';
  const trimmed = date.trim();
  if (trimmed.length === 0) return 'undated';
  // Accept ISO-like YYYY-MM-DD; otherwise treat as undated to keep paths predictable.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return 'undated';
}

function decisionShortId(record: DecisionRecord): string {
  // Deterministic ID derived from key fields (not a cryptographic signature).
  // Changes if title/date/decider change.
  const basis = [record.title, record.date ?? '', record.decider ?? ''].join('\n');
  return sha256Utf8(basis).slice(0, 8);
}

export function decisionFolderName(record: DecisionRecord): string {
  const prefix = safeDatePrefix(record.date);
  const slug = sanitizeForPathSegment(record.title);
  const usableSlug = slug.length > 0 ? slug.slice(0, 60) : 'decision';
  const id = decisionShortId(record);
  return `${prefix}__${usableSlug}__${id}`;
}
