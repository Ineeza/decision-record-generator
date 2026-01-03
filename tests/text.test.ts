import { describe, expect, it } from 'vitest';

import { areTitleAndDecisionTooSimilar, normalizeComparable } from '../src/text.js';

describe('normalizeComparable', () => {
  it('normalizes whitespace and punctuation', () => {
    expect(normalizeComparable(' AWS を採用する ')).toBe(normalizeComparable('AWSを採用する!'));
  });
});

describe('areTitleAndDecisionTooSimilar', () => {
  it('returns true when effectively identical', () => {
    expect(areTitleAndDecisionTooSimilar('AWSを採用する', 'AWSを採用する')).toBe(true);
    expect(areTitleAndDecisionTooSimilar('AWS を採用する', 'AWSを採用する')).toBe(true);
  });

  it('returns false when decision adds meaningful detail', () => {
    expect(
      areTitleAndDecisionTooSimilar('AWSを採用する', '原則として新規本番はAWS。例外は別DRで判断する')
    ).toBe(false);
  });
});
