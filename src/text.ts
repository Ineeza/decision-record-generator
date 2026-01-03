export function normalizeComparable(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    // Remove whitespace and common punctuation so minor formatting differences don't matter.
    .replace(/[\s\u3000]+/g, '')
    .replace(/["'`“”‘’.,:;!?()\[\]{}<>|\\/\-_=+*~^$#@]+/g, '');
}

export function areTitleAndDecisionTooSimilar(title: string, decision: string): boolean {
  const t = normalizeComparable(title);
  const r = normalizeComparable(decision);

  if (t.length === 0 || r.length === 0) return false;
  if (t === r) return true;

  // Heuristic: one contains the other and they're very close in length.
  const shorter = t.length <= r.length ? t : r;
  const longer = t.length <= r.length ? r : t;
  if (!longer.includes(shorter)) return false;

  const diff = longer.length - shorter.length;
  return diff <= 8;
}
