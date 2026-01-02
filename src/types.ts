export interface DecisionRecord {
  readonly title: string;
  readonly date?: string;
  readonly decider?: string;
  readonly status?: string;
  readonly supersedes?: string;
  readonly context?: string;
  readonly why?: string;
  readonly rule?: string;
  readonly alternatives?: string;
  readonly consequences?: string;
  readonly tags?: readonly string[];
}

export interface GeneratedFileInfo {
  readonly sha256: string;
  readonly size_bytes: number;
}

export interface Manifest {
  readonly generated_at: string;
  readonly dr_title: string;
  readonly files: Record<string, GeneratedFileInfo>;
  readonly signature: null;
}
