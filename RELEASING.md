# Releasing `dr-gen`

This repo publishes `dr-gen` to npm and optionally attaches release artifacts to GitHub Releases.

## Why GitHub Releases?

Even if the tool is free to download, some organizations need a "release evidence" bundle:
- where the artifact came from (official release page)
- what changed (release notes)
- integrity evidence (SHA256 hashes, optional signatures)

## Minimal release flow (manual)

1. Bump version
- Update `package.json` version.

2. Build + test
- `npm run build && npm test`

3. Create a git tag and push
- `git tag vX.Y.Z`
- `git push origin vX.Y.Z`

4. Create a GitHub Release for that tag
- GitHub → Releases → Draft a new release
- Choose the tag `vX.Y.Z`
- Write release notes

5. Publish to npm
- `npm publish`

## Attach "evidence" artifacts

Generate the exact npm tarball (`npm pack`) + SHA256 sums:
- `npm run release:artifacts`

This writes:
- `release/<tarball>.tgz` (the exact npm package tarball)
- `release/SHA256SUMS.txt`

Attach both files to the GitHub Release.

## Optional: signatures

Two common approaches:
- Signed tags/commits (GPG): proves the git history is authored by you.
- Signed SHA256SUMS (GPG or another signing tool): proves the attached artifacts are official.

You can start with SHA256 only, and add signatures later.

## Verifying (what customers can do)

1) Download `release/<tarball>.tgz` and `SHA256SUMS.txt` from GitHub Release.

2) Verify the hash:
- `shasum -a 256 <tarball>.tgz`
- Compare with the line in `SHA256SUMS.txt`.
