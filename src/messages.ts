export type SupportedLang = 'en' | 'ja';

export function titleDecisionTooSimilarLines(lang: SupportedLang = 'en'): readonly string[] {
  if (lang === 'ja') {
    return [
      'Warning: title と decision がほぼ同じ内容に見えます。',
      'Tip: title は短い要約、decision は「決定事項（行動・条件・例外）」を書くと役立ちます。',
      'Example:',
      '  title: "クラウド基盤は AWS を採用する"',
      '  decision: "原則として新規の本番環境は AWS。例外が必要なら別DRで判断する"'
    ];
  }

  return [
    'Warning: title and decision look very similar.',
    'Tip: title should be a short summary; decision should be an actionable decision (behavior/conditions/exceptions).',
    'Example:',
    '  title: "Choose AWS as our cloud provider"',
    '  decision: "Default to AWS for new production. If an exception is needed, create a separate DR."'
  ];
}

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
    'Tip: Decision records are much more useful when you write the reason (why) and the decision (decision).',
    'Open the file and add, for example:',
    ...(missingFields.includes('why') ? ['  why: "<reason / goal>"'] : []),
    ...(missingFields.includes('decision') ? ['  decision: "<decision everyone should follow>"'] : [])
  ];
}

export function wroteInputLines(inputPath: string): readonly string[] {
  return [`Wrote: ${inputPath}`];
}

export function skippedGenerateLines(inputPath: string, baseOutDir: string, lang: SupportedLang = 'en'): readonly string[] {
  if (lang === 'ja') {
    return [
      'Note: --skip-generate が指定されているため、出力ファイルの生成はスキップしました。',
      '次に、必要なら decision.yaml を追記・編集してください。',
      `生成するには: dr-gen generate ${inputPath} --out-dir ${baseOutDir}`
    ];
  }

  return [
    'Note: outputs were not generated because --skip-generate was set.',
    'Next: edit decision.yaml if needed.',
    `To generate outputs: dr-gen generate ${inputPath} --out-dir ${baseOutDir}`
  ];
}

export function generatedOutputLines(outDir: string): readonly string[] {
  return [`Generated: ${outDir}`];
}

export function newIntroLines(
  options: { readonly includeDate: boolean; readonly todayIsoDate: string },
  lang: SupportedLang = 'en'
): readonly string[] {
  const lines: string[] = [];
  if (lang === 'ja') {
    lines.push('いくつか質問します（全4問）。短く答えればOKです。');
    lines.push('ポイント: Decision=決定事項、Why=目的/狙い、Context=現状/制約（事実）と分けると、後から読み返しやすくなります。');
  } else {
    lines.push('Answer a few questions (4 total). Short answers are fine.');
    lines.push('Tip: Separate Decision (what), Why (goal), and Context (facts/constraints) for clarity.');
  }
  if (options.includeDate) {
    if (lang === 'ja') {
      lines.push(`日付は本日（${options.todayIsoDate}）を入れます。不要なら --no-date を使ってください。`);
    } else {
      lines.push(`Date will be set to today (${options.todayIsoDate}). Use --no-date to disable.`);
    }
  }
  lines.push('');
  return lines;
}

export function newTitlePrompt(lang: SupportedLang = 'en'): string {
  if (lang === 'ja') {
    return `\n[1/4] タイトル（必須）
短い見出し（要約）を書いてください
例: 「定例会議の上限を30分にする」
> `;
  }

  return `\n[1/4] Title (required)
Short headline / summary
Example: "Limit recurring meetings to 30 minutes"
> `;
}

export function newWhyPrompt(lang: SupportedLang = 'en'): string {
  if (lang === 'ja') {
    return `\n[3/4] 理由（Why）（必須）
目的・狙い（何を達成したい？）
※ 現状や制約などの“事実”は次の Context に書くのがおすすめ
例: 「集中できる時間を増やし、長い会議による生産性低下を防ぐ」
> `;
  }

  return `\n[3/4] Why (required)
Goal / intended outcome (what are you trying to achieve?).
Tip: Put facts/constraints in Context.
Example: "Increase focused work time and reduce productivity loss from long meetings"
> `;
}

export function newDecisionPrompt(lang: SupportedLang = 'en'): string {
  if (lang === 'ja') {
    return `\n[2/4] 決定事項（Decision）（必須）
何を、どうする？（方針・ルール・当面の優先順位など。行動・条件・例外まで書けると良い）
例: 「定例会議は原則30分。延長する場合は事前に目的とアジェンダを共有する」
> `;
  }

  return `\n[2/4] Decision (required)
What did you decide? (policy/priority; actions are OK)
Example: "Default recurring meetings to 30 minutes; share agenda in advance if you need more time"
> `;
}

export function newContextPrompt(lang: SupportedLang = 'en'): string {
  if (lang === 'ja') {
    return `\n[4/4] 現状・制約（Context）（任意）
いまの状況 / 制約 / 前提などの“事実”（空欄でもOK）
※ 目的・狙いは Why に書くのがおすすめ
例: 「定例会議が長引きがちで、集中作業の時間が確保しづらい」
> `;
  }

  return `\n[4/4] Context (optional)
Current situation / constraints / assumptions (facts). You can leave this empty.
Tip: Put goals in Why.
Example: "Recurring meetings often run long and it’s hard to secure focused work time"
> `;
}
