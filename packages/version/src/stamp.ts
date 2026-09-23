import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import process from 'node:process';
import {
  readCargoCrateName,
  setCargoLockVersion,
  setCargoManifestVersion,
} from './cargo';
import { setJsonVersion } from './json';
import { assertSemanticVersion } from './semantic-version';

export interface StampTauriVersionOptions {
  /** The version every file below is set to. */
  readonly version: string;
  /**
   * The crate directory: the one holding `Cargo.toml`, `tauri.conf.json` and,
   * when it is committed, `Cargo.lock`.
   */
  readonly tauriDir: string;
  /**
   * Other JSON manifests whose top-level `version` should agree, such as the
   * app's `package.json`.
   */
  readonly json?: readonly string[];
  /** What relative paths resolve against. Defaults to the working directory. */
  readonly cwd?: string;
}

export interface StampTauriVersionResult {
  /** The crate the manifest names, which is the entry stamped in the lock. */
  readonly crate: string;
  /** Absolute paths of the files written, in the order they were written. */
  readonly files: readonly string[];
}

/**
 * Sets one version across the files a Tauri release has to keep in step.
 *
 * The lock file is the one most easily forgotten: it carries the workspace
 * crate's own version beside every dependency's, so stamping the manifest
 * alone leaves the two disagreeing, and the next `cargo` run rewrites the lock
 * to settle it — as a dirty tree in the middle of a build, or as drift in the
 * next person's checkout. It is patched rather than regenerated so this needs
 * no Rust toolchain, which a release job running on Node does not have.
 *
 * Stamping a version a file already carries is a no-op rather than a failure,
 * so a build asked to package what is already in the tree packages it.
 */
export async function stampTauriVersion(
  options: StampTauriVersionOptions,
): Promise<StampTauriVersionResult> {
  const { version, tauriDir, json = [], cwd = process.cwd() } = options;

  assertSemanticVersion(version);

  const crateDir = resolve(cwd, tauriDir);
  const manifestPath = join(crateDir, 'Cargo.toml');
  const lockPath = join(crateDir, 'Cargo.lock');

  const manifest = await readFile(manifestPath, 'utf8');
  const crate = readCargoCrateName(manifest);

  if (crate === null) {
    throw new Error(`Could not find the package name in ${manifestPath}.`);
  }

  const stampedManifest = setCargoManifestVersion(manifest, version);

  if (stampedManifest === null) {
    throw new Error(`Could not find the package version in ${manifestPath}.`);
  }

  const jsonPaths = [
    join(crateDir, 'tauri.conf.json'),
    ...json.map((path) => resolve(cwd, path)),
  ];
  const files = [manifestPath];

  await writeFile(manifestPath, stampedManifest);

  for (const path of jsonPaths) {
    // eslint-disable-next-line no-await-in-loop -- the files are few, and a failure should name the one that failed rather than race the rest.
    await writeFile(path, setJsonVersion(await readFile(path, 'utf8'), version));
    files.push(path);
  }

  const lock = await readOptionalFile(lockPath);

  if (lock !== null) {
    const stampedLock = setCargoLockVersion(lock, crate, version);

    if (stampedLock === null) {
      throw new Error(`Could not find the "${crate}" package in ${lockPath}.`);
    }

    await writeFile(lockPath, stampedLock);
    files.push(lockPath);
  }

  return { crate, files };
}

/** A lock file is generated, and a project that does not commit one is fine. */
async function readOptionalFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}
