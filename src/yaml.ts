import yaml from 'js-yaml';

import type { DecisionRecord } from './types.js';

export function renderDecisionYaml(record: DecisionRecord): string {
  const schema = {
    title: record.title,
    date: record.date ?? '',
    decider: record.decider ?? '',
    context: record.context ?? '',
    why: record.why ?? '',
    rule: record.rule ?? '',
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
