import yaml from 'js-yaml';

import type { DecisionRecord } from './types.js';

export function renderDecisionYaml(record: DecisionRecord): string {
  const schema = {
    title: record.title,
    date: record.date ?? '',
    decider: record.decider ?? '',
    status: record.status ?? '',
    supersedes: record.supersedes ?? '',
    context: record.context ?? '',
    why: record.why ?? '',
    decision: record.decision ?? record.rule ?? '',
    alternatives: record.alternatives ?? '',
    consequences: record.consequences ?? '',
    tags: record.tags ?? []
  };

  // Keep YAML stable and readable; allow empty strings.
  return yaml.dump(schema, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false
  });
}
