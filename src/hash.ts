import crypto from 'node:crypto';

export function sha256Utf8(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export function utf8SizeBytes(content: string): number {
  return Buffer.byteLength(content, 'utf8');
}
