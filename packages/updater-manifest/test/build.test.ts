import type { UpdaterManifest } from '../src/manifest';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildManifest } from '../src/build';

let root: string;

/** One downloaded artifact directory, with its bundle and detached signature. */
async function writeArtifact(
  artifact: string,
  file: string,
  { signed = true } = {},
): Promise<void> {
  const directory = join(root, artifact);

  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, file), 'bundle');

  if (signed) {
    await writeFile(join(directory, `${file}.sig`), `signature-of-${artifact}\n`);
  }
}

/** Every platform present and signed, as a healthy release produces. */
async function writeCompleteRelease(): Promise<void> {
  await writeArtifact('tauri-macos-aarch64', 'Multi Mind.app.tar.gz');
  await writeArtifact('tauri-macos-x86_64', 'Multi Mind.app.tar.gz');
  await writeArtifact('tauri-linux-x86_64', 'multi-mind_1.2.3_amd64.AppImage');
  await writeArtifact('tauri-windows-x86_64', 'Multi Mind_1.2.3_x64-setup.exe');
}

async function build() {
  return buildManifest({
    artifactsRoot: root,
    version: '1.2.3',
    tag: 'v1.2.3',
    repository: 'ccpu/multi-mind',
    productName: 'Multi Mind',
    publishedAt: new Date('2026-01-02T03:04:05.000Z'),
  });
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'updater-manifest-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('buildManifest', () => {
  it('should write a manifest naming every platform', async () => {
    await writeCompleteRelease();

    const { manifest, path } = await build();

    expect(Object.keys(manifest.platforms).sort()).toStrictEqual([
      'darwin-aarch64',
      'darwin-x86_64',
      'linux-x86_64',
      'windows-x86_64',
    ]);

    const written: UpdaterManifest = JSON.parse(await readFile(path, 'utf8'));

    expect(written).toStrictEqual(manifest);
  });

  it('should carry each bundle signature into its platform entry', async () => {
    await writeCompleteRelease();

    const { manifest } = await build();

    expect(manifest.platforms['linux-x86_64']?.signature).toBe(
      'signature-of-tauri-linux-x86_64',
    );
  });

  /*
   * Both macOS builds hand over `Multi Mind.app.tar.gz`. Uploaded as they are,
   * the second would collide with the first and an architecture would vanish
   * from the release without anything failing.
   */
  it('should give the two macOS tarballs names a release can both hold', async () => {
    await writeCompleteRelease();

    const { manifest } = await build();

    expect(manifest.platforms['darwin-aarch64']?.url).toContain(
      'Multi.Mind_1.2.3_aarch64.app.tar.gz',
    );
    expect(manifest.platforms['darwin-x86_64']?.url).toContain(
      'Multi.Mind_1.2.3_x64.app.tar.gz',
    );
  });

  it('should rename the signature along with the bundle it signs', async () => {
    await writeCompleteRelease();
    await build();

    const files = await readdir(join(root, 'tauri-macos-aarch64'));

    expect(files.sort()).toStrictEqual([
      'Multi.Mind_1.2.3_aarch64.app.tar.gz',
      'Multi.Mind_1.2.3_aarch64.app.tar.gz.sig',
    ]);
  });

  it('should spell a URL the way GitHub will serve the asset', async () => {
    await writeCompleteRelease();

    const { manifest } = await build();

    expect(manifest.platforms['windows-x86_64']?.url).toBe(
      'https://github.com/ccpu/multi-mind/releases/download/v1.2.3/Multi.Mind_1.2.3_x64-setup.exe',
    );
  });

  /*
   * A platform quietly left out of the manifest is one that never sees another
   * update, which is worse than a release that fails and can be re-run.
   */
  it('should refuse to write a manifest when a platform built nothing', async () => {
    await writeCompleteRelease();
    await rm(join(root, 'tauri-linux-x86_64'), { recursive: true });

    await expect(build()).rejects.toThrow('Nothing was downloaded for linux-x86_64');
  });

  it('should refuse a bundle that was built without a signature', async () => {
    await writeCompleteRelease();
    await rm(join(root, 'tauri-windows-x86_64', 'Multi Mind_1.2.3_x64-setup.exe.sig'));

    await expect(build()).rejects.toThrow(
      /No signed -setup\.exe was built for windows-x86_64/u,
    );
  });

  it('should refuse a build that produced two candidate bundles', async () => {
    await writeCompleteRelease();
    await writeArtifact('tauri-linux-x86_64', 'another_1.2.3_amd64.AppImage');

    await expect(build()).rejects.toThrow(
      /Several signed \.AppImage bundles were built for linux-x86_64/u,
    );
  });

  it('should take the platforms it is given over the defaults', async () => {
    await writeArtifact('only', 'app.AppImage');

    const { manifest } = await buildManifest({
      artifactsRoot: root,
      version: '1.2.3',
      tag: 'v1.2.3',
      repository: 'o/n',
      productName: 'App',
      platforms: { only: { key: 'linux-x86_64', suffix: '.AppImage' } },
    });

    expect(Object.keys(manifest.platforms)).toStrictEqual(['linux-x86_64']);
  });
});
