import { describe, expect, it } from 'vitest';
import { buildUpdaterManifest, releaseAssetName, releaseAssetUrl } from '../src/manifest';

describe('releaseAssetName', () => {
  /*
   * GitHub does this on upload, so a URL built from the bundler's name would
   * 404 for exactly the products whose name has a space in it.
   */
  it('should replace the spaces a release turns into dots', () => {
    expect(releaseAssetName('Multi Mind_1.2.3_x64-setup.exe')).toBe(
      'Multi.Mind_1.2.3_x64-setup.exe',
    );
  });

  it('should leave a name with no spaces alone', () => {
    expect(releaseAssetName('app_1.2.3_amd64.AppImage')).toBe('app_1.2.3_amd64.AppImage');
  });
});

describe('releaseAssetUrl', () => {
  it('should point at the release the tag names', () => {
    expect(releaseAssetUrl('ccpu/multi-mind', 'v1.2.3', 'app.AppImage')).toBe(
      'https://github.com/ccpu/multi-mind/releases/download/v1.2.3/app.AppImage',
    );
  });

  it('should escape a name that is not URL-safe', () => {
    expect(releaseAssetUrl('o/n', 'v1', 'Multi Mind.app.tar.gz')).toContain(
      'Multi.Mind.app.tar.gz',
    );
  });
});

describe('buildUpdaterManifest', () => {
  const platforms = {
    'darwin-aarch64': { signature: 'sig', url: 'https://example.com/a.tar.gz' },
  };

  it('should announce the version and link the release notes', () => {
    const manifest = buildUpdaterManifest({
      version: '1.2.3',
      tag: 'v1.2.3',
      repository: 'ccpu/multi-mind',
      platforms,
      publishedAt: new Date('2026-01-02T03:04:05.000Z'),
    });

    expect(manifest).toStrictEqual({
      version: '1.2.3',
      notes: 'See https://github.com/ccpu/multi-mind/releases/tag/v1.2.3',
      pub_date: '2026-01-02T03:04:05.000Z',
      platforms,
    });
  });

  /* The plugin reads `pub_date`; a camelCase key would simply not be found. */
  it('should name the publication date the way the plugin reads it', () => {
    const manifest = buildUpdaterManifest({
      version: '1.2.3',
      tag: 'v1.2.3',
      repository: 'o/n',
      platforms,
    });

    expect(Object.keys(manifest)).toContain('pub_date');
  });
});
