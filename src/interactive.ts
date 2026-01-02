import readline from 'node:readline/promises';
import process from 'node:process';

import type { DecisionRecord } from './types.js';
import type { SupportedLang } from './messages.js';
import { newContextPrompt, newIntroLines, newRulePrompt, newTitlePrompt, newWhyPrompt } from './messages.js';

function todayLocalIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function requiredNonEmpty(labelEn: string, labelJa: string, value: string, lang: SupportedLang): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    if (lang === 'ja') {
      throw new Error(`${labelJa}は必須です（空欄不可）。`);
    }
    throw new Error(`${labelEn} is required (cannot be empty).`);
  }
  return trimmed;
}

function optionalTrimmed(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export async function promptDecisionRecord(options: { readonly includeDate: boolean; readonly lang: SupportedLang }): Promise<DecisionRecord> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const todayIsoDate = todayLocalIsoDate();
    for (const line of newIntroLines({ includeDate: options.includeDate, todayIsoDate }, options.lang)) {
      console.log(line);
    }

    const title = requiredNonEmpty(
      'Title',
      'タイトル',
      await rl.question(newTitlePrompt(options.lang)),
      options.lang
    );

    const why = requiredNonEmpty(
      'Why',
      'Why',
      await rl.question(newWhyPrompt(options.lang)),
      options.lang
    );

    const rule = requiredNonEmpty(
      'Rule',
      'Rule',
      await rl.question(newRulePrompt(options.lang)),
      options.lang
    );

    const context = optionalTrimmed(
      await rl.question(newContextPrompt(options.lang))
    );

    const date = options.includeDate ? todayIsoDate : undefined;

    return { title, date, why, rule, context };
  } finally {
    rl.close();
  }
}
