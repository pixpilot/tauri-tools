import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { stampTauriVersion } from '../src/stamp';

const MANIFEST = `[package]
name = "desktop"
version = "1.0.0"

[dependencies]
serde = { version = "1" }
`;

const LOCK = `[[package]]
name = "serde"
version = "1.0.0"

[[package]]
name = "desktop"
version = "0.1.0"
`;

let project: string;
let crateDir: string;

/** A Tauri app laid out the way both repos that use this lay one out. */
async function writeProject({ lock = true } = {}): Promise<void> {
  crateDir = join(project, 'apps', 'desktop', 'src-tauri');
  await mkdir(crateDir, { recursive: true });
  await writeFile(join(crateDir, 'Cargo.toml'), MANIFEST);
  await writeFile(join(crateDir, 'tauri.conf.json'), '{\n  "version": "1.0.0"\n}\n');
  await writeFile(
    join(project, 'apps', 'desktop', 'package.json'),
    '{\n  "name": "@app/desktop",\n  "version": "1.0.0"\n}\n',
  );

  if (lock) {
    await writeFile(join(crateDir, 'Cargo.lock'), LOCK);
  }
}

async function read(...path: string[]): Promise<string> {
  return readFile(join(project, ...path), 'utf8');
}

beforeEach(async () => {
  project = await mkdtemp(join(tmpdir(), 'tauri-version-'));
});

afterEach(async () => {
  await rm(project, { recursive: true, force: true });
});

describe('stampTauriVersion', () => {
  it('should set one version across every file it is given', async () => {
    await writeProject();

    const result = await stampTauriVersion({
      version: '2.3.4',
      tauriDir: 'apps/desktop/src-tauri',
      json: ['apps/desktop/package.json'],
      cwd: project,
    });

    expect(result.crate).toBe('desktop');
    expect(result.files).toHaveLength(4);

    expect(await read('apps', 'desktop', 'src-tauri', 'Cargo.toml')).toContain(
      'version = "2.3.4"',
    );
    expect(await read('apps', 'desktop', 'src-tauri', 'tauri.conf.json')).toContain(
      '"version": "2.3.4"',
    );
    expect(await read('apps', 'desktop', 'package.json')).toContain('"version": "2.3.4"');
    expect(await read('apps', 'desktop', 'src-tauri', 'Cargo.lock')).toContain(
      'name = "desktop"\nversion = "2.3.4"',
    );
  });

  /*
   * The lock is the file a release forgets: it starts out disagreeing with the
   * manifest, and nothing fails until the next `cargo` run rewrites it.
   */
  it("should bring a lock that had drifted up to the manifest's version", async () => {
    await writeProject();

    await stampTauriVersion({
      version: '2.3.4',
      tauriDir: 'apps/desktop/src-tauri',
      cwd: project,
    });

    const lock = await read('apps', 'desktop', 'src-tauri', 'Cargo.lock');

    expect(lock).toContain('name = "desktop"\nversion = "2.3.4"');
    expect(lock).toContain('name = "serde"\nversion = "1.0.0"');
  });

  it('should leave a project that does not commit a lock alone', async () => {
    await writeProject({ lock: false });

    const result = await stampTauriVersion({
      version: '2.3.4',
      tauriDir: 'apps/desktop/src-tauri',
      cwd: project,
    });

    expect(result.files.some((file) => file.endsWith('Cargo.lock'))).toBe(false);
  });

  it('should stamp a version the files already carry rather than fail', async () => {
    await writeProject();

    await expect(
      stampTauriVersion({
        version: '1.0.0',
        tauriDir: 'apps/desktop/src-tauri',
        cwd: project,
      }),
    ).resolves.toMatchObject({ crate: 'desktop' });
  });

  it('should refuse anything that is not a version', async () => {
    await writeProject();

    await expect(
      stampTauriVersion({
        version: 'v1',
        tauriDir: 'apps/desktop/src-tauri',
        cwd: project,
      }),
    ).rejects.toThrow('Expected a semantic version');
  });

  it('should name the lock when it lists no such crate', async () => {
    await writeProject();
    await writeFile(
      join(crateDir, 'Cargo.lock'),
      '[[package]]\nname = "serde"\nversion = "1.0.0"\n',
    );

    await expect(
      stampTauriVersion({
        version: '2.3.4',
        tauriDir: 'apps/desktop/src-tauri',
        cwd: project,
      }),
    ).rejects.toThrow(/Could not find the "desktop" package in .*Cargo\.lock/u);
  });

  it('should name the manifest when it declares no package', async () => {
    await writeProject();
    await writeFile(join(crateDir, 'Cargo.toml'), '[dependencies]\n');

    await expect(
      stampTauriVersion({
        version: '2.3.4',
        tauriDir: 'apps/desktop/src-tauri',
        cwd: project,
      }),
    ).rejects.toThrow(/Could not find the package name in .*Cargo\.toml/u);
  });
});
