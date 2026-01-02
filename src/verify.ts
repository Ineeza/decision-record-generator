import fs from 'node:fs/promises';
import path from 'node:path';

import { sha256Utf8, utf8SizeBytes } from './hash.js';
import type { GeneratedFileInfo, Manifest } from './types.js';

export interface FileVerificationResult {
  readonly filename: string;
  readonly ok: boolean;
  readonly expectedSha256?: string;
  readonly actualSha256?: string;
  readonly expectedSizeBytes?: number;
  readonly actualSizeBytes?: number;
  readonly error?: string;
}

export interface VerifyResult {
  readonly ok: boolean;
  readonly manifestPath: string;
  readonly results: readonly FileVerificationResult[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseManifest(raw: string): Manifest {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) {
    throw new Error('manifest.json must be a JSON object.');
  }

  const generated_at = parsed.generated_at;
  const dr_title = parsed.dr_title;
  const files = parsed.files;
  const signature = parsed.signature;

  if (typeof generated_at !== 'string' || typeof dr_title !== 'string') {
    throw new Error('manifest.json is missing required fields (generated_at, dr_title).');
  }
  if (!isRecord(files)) {
    throw new Error('manifest.json is missing required field: files.');
  }
  if (signature !== null) {
    // MVP: signatures not implemented; accept null only.
    throw new Error('manifest.json signature field must be null (signatures not supported in MVP).');
  }

  const typedFiles: Record<string, GeneratedFileInfo> = {};

  // Minimal structural validation for file entries.
  for (const [filename, info] of Object.entries(files)) {
    if (!isRecord(info)) {
      throw new Error(`manifest.json files.${filename} must be an object.`);
    }
    const sha256 = info.sha256;
    const size_bytes = info.size_bytes;
    if (typeof sha256 !== 'string' || typeof size_bytes !== 'number') {
      throw new Error(`manifest.json files.${filename} must contain sha256 (string) and size_bytes (number).`);
    }
    typedFiles[filename] = { sha256, size_bytes };
  }

  return {
    generated_at,
    dr_title,
    files: typedFiles,
    signature: null
  };
}

export async function verifyOutDir(outDir: string): Promise<VerifyResult> {
  const resolvedDir = outDir.trim().length > 0 ? outDir : '.';
  const manifestPath = path.join(resolvedDir, 'manifest.json');

  const manifestRaw = await fs.readFile(manifestPath, 'utf8');
  const manifest = parseManifest(manifestRaw);

  const results: FileVerificationResult[] = [];
  for (const [filename, info] of Object.entries(manifest.files)) {
    const filePath = path.join(resolvedDir, filename);

    try {
      const content = await fs.readFile(filePath, 'utf8');
      const actualSha = sha256Utf8(content);
      const actualSize = utf8SizeBytes(content);
      const expectedSha = info.sha256;
      const expectedSize = info.size_bytes;

      const ok = actualSha === expectedSha && actualSize === expectedSize;
      results.push({
        filename,
        ok,
        expectedSha256: expectedSha,
        actualSha256: actualSha,
        expectedSizeBytes: expectedSize,
        actualSizeBytes: actualSize
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        filename,
        ok: false,
        expectedSha256: info.sha256,
        expectedSizeBytes: info.size_bytes,
        error: message
      });
    }
  }

  const ok = results.every((r) => r.ok);
  return { ok, manifestPath, results };
}
