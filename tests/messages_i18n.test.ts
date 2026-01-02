import { describe, expect, it } from 'vitest';

import { newTitlePrompt, newIntroLines } from '../src/messages.js';

describe('messages i18n', () => {
  it('renders Japanese prompts when lang=ja', () => {
    const prompt = newTitlePrompt('ja');
    expect(prompt).toMatch(/タイトル/);
  });

  it('renders Japanese intro when lang=ja', () => {
    const lines = newIntroLines({ includeDate: true, todayIsoDate: '2026-01-02' }, 'ja');
    expect(lines.join('\n')).toMatch(/日付/);
  });
});
