import { describe, expect, it } from 'vitest';
import { architectureBundleName, findSignedBundles } from '../src/bundles';

describe('findSignedBundles', () => {
  /*
   * The updater verifies every artifact against the key in tauri.conf.json, so
   * an unsigned bundle is one it would refuse to install. Offering it in the
   * manifest would turn a missing signature into a failed update on the user's
   * machine instead of a failed release.
   */
  it('should ignore a bundle that was built without a signature', () => {
    const files = ['out/app.AppImage', 'out/other.AppImage', 'out/other.AppImage.sig'];

    expect(findSignedBundles(files, '.AppImage')).toStrictEqual(['out/other.AppImage']);
  });

  it('should find the signed bundle for the suffix asked for', () => {
    const files = [
      'out/app-setup.exe',
      'out/app-setup.exe.sig',
      'out/app.msi',
      'out/app.msi.sig',
    ];

    expect(findSignedBundles(files, '-setup.exe')).toStrictEqual(['out/app-setup.exe']);
  });

  it('should report every match, so the caller can refuse an ambiguous build', () => {
    const files = ['a.AppImage', 'a.AppImage.sig', 'b.AppImage', 'b.AppImage.sig'];

    expect(findSignedBundles(files, '.AppImage')).toHaveLength(2);
  });

  it('should find nothing in an empty directory', () => {
    expect(findSignedBundles([], '.AppImage')).toStrictEqual([]);
  });
});

describe('architectureBundleName', () => {
  /*
   * Both macOS builds produce `<product>.app.tar.gz`, and one release cannot
   * hold two assets under one name: uploading them as built loses an
   * architecture without failing.
   */
  it('should put the architecture into a name two builds would share', () => {
    expect(architectureBundleName('Multi Mind', '1.2.3', 'aarch64', '.app.tar.gz')).toBe(
      'Multi.Mind_1.2.3_aarch64.app.tar.gz',
    );
  });

  it('should spell the product the way the release will serve it', () => {
    expect(architectureBundleName('My App', '1.0.0', 'x64', '.app.tar.gz')).not.toContain(
      ' ',
    );
  });
});
