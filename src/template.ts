export function decisionYamlTemplate(): string {
  return [
    'title: "TODO: Decision title"',
    'date: ""',
    'decider: ""',
    'status: ""',
    'supersedes: ""',
    'context: ""',
    'why: ""',
    'rule: ""',
    'alternatives: ""',
    'consequences: ""',
    'tags: []',
    ''
  ].join('\n');
}
