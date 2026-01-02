export type SupportedLang = 'en' | 'ja';

export function titleRuleTooSimilarLines(lang: SupportedLang = 'en'): readonly string[] {
  if (lang === 'ja') {
    return [
      'Warning: title と rule がほぼ同じ内容に見えます。',
      'Tip: title は短い要約、rule は「全員が守るべきルール（行動・条件・例外）」を書くと役立ちます。',
      'Example:',
      '  title: "クラウド基盤は AWS を採用する"',
      '  rule: "原則として新規の本番環境は AWS。例外が必要なら別DRで判断する"'
    ];
  }

  return [
    'Warning: title and rule look very similar.',
    'Tip: title should be a short summary; rule should be an actionable rule (behavior/conditions/exceptions).',
    'Example:',
    '  title: "Choose AWS as our cloud provider"',
    '  rule: "Default to AWS for new production. If an exception is needed, create a separate DR."'
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
    'Tip: Decision records are much more useful when you write the reason (why) and the rule (rule).',
    'Open the file and add, for example:',
    ...(missingFields.includes('why') ? ['  why: "<reason / goal>"'] : []),
    ...(missingFields.includes('rule') ? ['  rule: "<rule everyone should follow>"'] : [])
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
    lines.push('いくつか質問します。短い回答でOKです。');
    lines.push('コツ: 理由（Why）とルール（Rule）に集中してください。');
  } else {
    lines.push('Answer a few questions. Short answers are OK.');
    lines.push('Tip: Focus on the reason (Why) and the rule (Rule).');
  }
  if (options.includeDate) {
    if (lang === 'ja') {
      lines.push(`日付は本日（${options.todayIsoDate}）に設定します。無効にするには --no-date を使ってください。`);
    } else {
      lines.push(`Date will be set to today (${options.todayIsoDate}). Use --no-date to disable.`);
    }
  }
  return lines;
}

export function newTitlePrompt(lang: SupportedLang = 'en'): string {
  if (lang === 'ja') {
    return `タイトル（必須）
何を決めましたか？（短い見出し・名詞句でもOK）
例: 「定例会議の上限を30分にする」 / 「初動返信SLAを24時間以内にする」
> `;
  }

  return `Title (required)
What did you decide? (one sentence)
Examples: "Limit recurring meetings to 30 minutes" / "Set support reply time to within 24 hours"
> `;
}

export function newWhyPrompt(lang: SupportedLang = 'en'): string {
  if (lang === 'ja') {
    return `Why（必須）
この決定をした理由・目的（なぜやるのか？）
例: 「セキュリティ事故を防ぐ」 / 「請求をシンプルにする」 / 「長い会議を減らす」
> `;
  }

  return `Why (required)
Reason / goal behind the decision (why are we doing this?).
Examples: "Reduce security risk" / "Make billing simpler" / "Avoid long meetings"
> `;
}

export function newRulePrompt(lang: SupportedLang = 'en'): string {
  if (lang === 'ja') {
    return `Decision / Rule（必須）
今回の決定は何ですか？（方針・ルール・当面の優先順位など。行動・条件・例外まで書けると良い）
例: 「優先開発は list と new --skip-generate。他は後回しにする」
> `;
  }

  return `Decision / Rule (required)
What did you decide? (policy/rule/priority; actions are OK)
Examples: "Prioritize list + --skip-generate first; defer others" / "Default to AWS for new production"
> `;
}

export function newContextPrompt(lang: SupportedLang = 'en'): string {
  if (lang === 'ja') {
    return `Context（任意）
背景・制約（空欄でもOK）
例: 「返信が遅いという声が増えた」 / 「スプレッドシートでパスワード共有していた」
> `;
  }

  return `Context (optional)
Background / constraints (you can leave this empty).
Examples: "Customers say replies are slow" / "We used to share passwords in a spreadsheet"
> `;
}
