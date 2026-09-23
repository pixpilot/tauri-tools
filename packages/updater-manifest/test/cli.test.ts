import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { run, USAGE } from '../src/cli';

let root: string;

async function writeArtifact(artifact: string, file: string): Promise<void> {
  const directory = join(root, artifact);

  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, file), 'bundle');
  await writeFile(join(directory, `${file}.sig`), 'signature\n');
}

const REQUIRED = [
  '--version',
  '1.2.3',
  '--tag',
  'v1.2.3',
  '--repository',
  'ccpu/multi-mind',
  '--product-name',
  'Multi Mind',
];

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'updater-manifest-cli-'));
  await writeArtifact('tauri-macos-aarch64', 'Multi Mind.app.tar.gz');
  await writeArtifact('tauri-macos-x86_64', 'Multi Mind.app.tar.gz');
  await writeArtifact('tauri-linux-x86_64', 'app_1.2.3_amd64.AppImage');
  await writeArtifact('tauri-windows-x86_64', 'Multi Mind_1.2.3_x64-setup.exe');
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('run', () => {
  it('should write latest.json into the artifacts root', async () => {
    const { message } = await run([root, ...REQUIRED]);

    expect(message).toContain('for 1.2.3');
    expect(JSON.parse(await readFile(join(root, 'latest.json'), 'utf8'))).toMatchObject({
      version: '1.2.3',
    });
  });

  it('should report the bundle each platform resolved to', async () => {
    const { message } = await run([root, ...REQUIRED]);

    expect(message).toContain('darwin-aarch64: Multi.Mind_1.2.3_aarch64.app.tar.gz');
    expect(message).toContain('windows-x86_64: Multi Mind_1.2.3_x64-setup.exe');
  });

  it('should write the file name it is given instead', async () => {
    await run([root, ...REQUIRED, '--file-name', 'updater.json']);

    expect(JSON.parse(await readFile(join(root, 'updater.json'), 'utf8'))).toMatchObject({
      version: '1.2.3',
    });
  });

  it('should name every option it still needs', async () => {
    await expect(run([root, '--version', '1.2.3'])).rejects.toThrow(
      'Missing --tag, --repository, --product-name',
    );
  });

  it('should ask for an artifacts root when given none', async () => {
    await expect(run(REQUIRED)).rejects.toThrow('Expected one artifacts root');
  });

  it('should print the usage rather than build when asked for help', async () => {
    const { message } = await run(['--help']);

    expect(message).toBe(USAGE);
  });
});
