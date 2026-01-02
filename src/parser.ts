import fs from 'node:fs/promises';
import yaml from 'js-yaml';

import type { DecisionRecord } from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  return undefined;
}

function asOptionalStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const strings: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') return undefined;
    strings.push(item);
  }
  return strings;
}

export async function parseDecisionYaml(filePath: string): Promise<DecisionRecord> {
  const raw = await fs.readFile(filePath, 'utf8');
  const loaded: unknown = yaml.load(raw);

  if (!isRecord(loaded)) {
    throw new Error('decision.yaml must be a YAML mapping (object).');
  }

  const title = asOptionalString(loaded.title);
  if (title === undefined || title.trim().length === 0) {
    throw new Error('`title` is required and must be a non-empty string.');
  }

  return {
    title,
    date: asOptionalString(loaded.date),
    decider: asOptionalString(loaded.decider),
    status: asOptionalString(loaded.status),
    supersedes: asOptionalString(loaded.supersedes),
    context: asOptionalString(loaded.context),
    why: asOptionalString(loaded.why),
    rule: asOptionalString(loaded.rule),
    alternatives: asOptionalString(loaded.alternatives),
    consequences: asOptionalString(loaded.consequences),
    tags: asOptionalStringArray(loaded.tags)
  };
}
