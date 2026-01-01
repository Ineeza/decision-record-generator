export function decisionYamlTemplate(): string {
  return [
    'title: "TODO: Decision title"',
    'date: ""',
    'decider: ""',
    'context: ""',
    'why: ""',
    'rule: ""',
    'alternatives: ""',
    'consequences: ""',
    'tags: []',
    ''
  ].join('\n');
}
