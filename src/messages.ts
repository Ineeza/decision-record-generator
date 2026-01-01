export function templateCreatedLines(inputPath: string): readonly string[] {
  return [
    `Created template: ${inputPath}`,
    'Next steps:',
    '1) Open the file and fill in at least the title',
    `2) Run: dr-gen generate ${inputPath}`
  ];
}

export function signatureIgnoredLines(): readonly string[] {
  return ['Warning: --signature is not implemented in MVP (ignored).'];
}

export function missingCoreFieldsLines(inputPath: string, missingFields: readonly string[]): readonly string[] {
  return [
    `Warning: ${inputPath} is missing: ${missingFields.join(', ')}.`,
    'Tip: Decision records are much more useful when you write the reason (why) and the rule (rule).',
    'Open the file and add, for example:',
    ...(missingFields.includes('why') ? ['  why: "<reason / goal>"'] : []),
    ...(missingFields.includes('rule') ? ['  rule: "<rule everyone should follow>"'] : [])
  ];
}

export function wroteInputLines(inputPath: string): readonly string[] {
  return [`Wrote: ${inputPath}`];
}

export function generatedOutputLines(outDir: string): readonly string[] {
  return [`Generated: ${outDir}`];
}

export function newIntroLines(options: { readonly includeDate: boolean; readonly todayIsoDate: string }): readonly string[] {
  const lines: string[] = [];
  lines.push('Answer a few questions. Short answers are OK.');
  lines.push('Tip: Focus on the reason (Why) and the rule (Rule).');
  if (options.includeDate) {
    lines.push(`Date will be set to today (${options.todayIsoDate}). Use --no-date to disable.`);
  }
  return lines;
}

export function newTitlePrompt(): string {
  return `Title (required)
What did you decide? (one sentence)
Examples: "Limit recurring meetings to 30 minutes" / "Set support reply time to within 24 hours"
> `;
}

export function newWhyPrompt(): string {
  return `Why (required)
Reason / goal behind the decision (why are we doing this?).
Examples: "Reduce security risk" / "Make billing simpler" / "Avoid long meetings"
> `;
}

export function newRulePrompt(): string {
  return `Rule (required)
What rule should everyone follow from now on?
Examples: "Recurring meetings are 30 minutes max" / "Reply within 24 hours on business days"
> `;
}

export function newContextPrompt(): string {
  return `Context (optional)
Background / constraints (you can leave this empty).
Examples: "Customers say replies are slow" / "We used to share passwords in a spreadsheet"
> `;
}
