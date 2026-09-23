import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { run, USAGE } from '../src/cli';

let project: string;

beforeEach(async () => {
  project = await mkdtemp(join(tmpdir(), 'tauri-version-cli-'));

  const crateDir = join(project, 'src-tauri');

  await mkdir(crateDir, { recursive: true });
  await writeFile(
    join(crateDir, 'Cargo.toml'),
    '[package]\nname = "app"\nversion = "1.0.0"\n',
  );
  await writeFile(
    join(crateDir, 'Cargo.lock'),
    '[[package]]\nname = "app"\nversion = "1.0.0"\n',
  );
  await writeFile(join(crateDir, 'tauri.conf.json'), '{\n  "version": "1.0.0"\n}\n');
  await writeFile(join(project, 'package.json'), '{\n  "version": "1.0.0"\n}\n');
});

afterEach(async () => {
  await rm(project, { recursive: true, force: true });
});

describe('run', () => {
  it('should stamp with src-tauri as the default crate directory', async () => {
    const { message } = await run(['2.3.4', '--cwd', project]);

    expect(message).toContain('Stamped app 2.3.4');
    expect(await readFile(join(project, 'src-tauri', 'Cargo.toml'), 'utf8')).toContain(
      'version = "2.3.4"',
    );
  });

  it('should stamp every --json manifest named', async () => {
    await run(['2.3.4', '--cwd', project, '--json', 'package.json']);

    expect(await readFile(join(project, 'package.json'), 'utf8')).toContain(
      '"version": "2.3.4"',
    );
  });

  it('should report the files it wrote, relative to where it ran', async () => {
    const { message } = await run(['2.3.4', '--cwd', project]);

    expect(message).toContain(join('src-tauri', 'Cargo.toml'));
    expect(message).toContain(join('src-tauri', 'Cargo.lock'));
  });

  it('should print the usage rather than stamp when asked for help', async () => {
    const { message } = await run(['--help']);

    expect(message).toBe(USAGE);
    expect(await readFile(join(project, 'src-tauri', 'Cargo.toml'), 'utf8')).toContain(
      'version = "1.0.0"',
    );
  });

  it('should ask for a version when given none', async () => {
    await expect(run(['--cwd', project])).rejects.toThrow('Expected a version to stamp');
  });

  it('should refuse more than one version', async () => {
    await expect(run(['1.2.3', '4.5.6', '--cwd', project])).rejects.toThrow(
      'Expected one version, received 2',
    );
  });
});
