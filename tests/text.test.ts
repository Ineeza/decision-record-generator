import { describe, expect, it } from 'vitest';

import { areTitleAndRuleTooSimilar, normalizeComparable } from '../src/text.js';

describe('normalizeComparable', () => {
  it('normalizes whitespace and punctuation', () => {
    expect(normalizeComparable(' AWS を採用する ')).toBe(normalizeComparable('AWSを採用する!'));
  });
});

describe('areTitleAndRuleTooSimilar', () => {
  it('returns true when effectively identical', () => {
    expect(areTitleAndRuleTooSimilar('AWSを採用する', 'AWSを採用する')).toBe(true);
    expect(areTitleAndRuleTooSimilar('AWS を採用する', 'AWSを採用する')).toBe(true);
  });

  it('returns false when rule adds meaningful detail', () => {
    expect(
      areTitleAndRuleTooSimilar('AWSを採用する', '原則として新規本番はAWS。例外は別DRで判断する')
    ).toBe(false);
  });
});
