import readline from 'node:readline/promises';
import process from 'node:process';

import type { DecisionRecord } from './types.js';
import { newContextPrompt, newIntroLines, newRulePrompt, newTitlePrompt, newWhyPrompt } from './messages.js';

function todayLocalIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function requiredNonEmpty(label: string, value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${label} is required (cannot be empty).`);
  }
  return trimmed;
}

function optionalTrimmed(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export async function promptDecisionRecord(options: { readonly includeDate: boolean }): Promise<DecisionRecord> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const todayIsoDate = todayLocalIsoDate();
    for (const line of newIntroLines({ includeDate: options.includeDate, todayIsoDate })) {
      console.log(line);
    }

    const title = requiredNonEmpty(
      'Title',
      await rl.question(newTitlePrompt())
    );

    const why = requiredNonEmpty(
      'Why',
      await rl.question(newWhyPrompt())
    );

    const rule = requiredNonEmpty(
      'Rule',
      await rl.question(newRulePrompt())
    );

    const context = optionalTrimmed(
      await rl.question(newContextPrompt())
    );

    const date = options.includeDate ? todayIsoDate : undefined;

    return { title, date, why, rule, context };
  } finally {
    rl.close();
  }
}
