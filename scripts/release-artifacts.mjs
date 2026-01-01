import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function sha256Hex(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, '..');

  const releaseDir = path.join(repoRoot, 'release');
  const tmpDir = path.join(releaseDir, '.tmp');

  await mkdir(tmpDir, { recursive: true });

  try {
    // Create the exact tarball npm would publish.
    const { stdout } = await execFileAsync('npm', ['pack', '--silent', '--pack-destination', tmpDir], {
      cwd: repoRoot,
      env: process.env,
    });

    const tarballName = stdout.trim().split(/\s+/).pop();
    if (!tarballName) {
      throw new Error('npm pack did not output a tarball name');
    }

    const tarballPath = path.join(tmpDir, tarballName);
    const tarballBytes = await readFile(tarballPath);
    const tarballSha = sha256Hex(tarballBytes);

    const outTarballPath = path.join(releaseDir, tarballName);
    await rm(outTarballPath, { force: true });

    await mkdir(releaseDir, { recursive: true });
    await copyFile(tarballPath, outTarballPath);

    const sumsPath = path.join(releaseDir, 'SHA256SUMS.txt');
    const sumsLine = `${tarballSha}  ${tarballName}\n`;
    await writeFile(sumsPath, sumsLine, 'utf8');

    // eslint-disable-next-line no-console
    console.log(`Wrote: ${path.relative(repoRoot, outTarballPath)}`);
    // eslint-disable-next-line no-console
    console.log(`Wrote: ${path.relative(repoRoot, sumsPath)}`);
    // eslint-disable-next-line no-console
    console.log('Next: attach these two files to your GitHub Release.');
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
