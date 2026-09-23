/**
 * How each build's downloaded artifact maps to the platform the updater looks
 * itself up by.
 *
 * The plugin fetches one manifest and finds itself in `platforms` by a key it
 * builds from its own target triple. Nothing else about the release is read,
 * so a platform missing from the map is a platform that never updates.
 */
export interface PlatformArtifact {
  /** The key the updater looks itself up by, such as `darwin-aarch64`. */
  readonly key: string;
  /** How that platform's updater bundle ends. */
  readonly suffix: string;
  /**
   * Set only where the bundler gives two builds the same file name. The
   * architecture then goes into the name before either is uploaded, because
   * one release cannot hold two assets under one name and uploading them as
   * they are silently loses an architecture.
   */
  readonly arch?: string;
}

/**
 * The layout `tauri build` and a per-target artifact upload produce: each
 * build's files kept in a directory named after the matrix entry that made
 * them. For the two macOS builds that directory name is the only thing left
 * that tells them apart, because the bundler gives both tarballs the same one.
 */
export const DEFAULT_PLATFORMS: Readonly<Record<string, PlatformArtifact>> = {
  'tauri-macos-aarch64': {
    key: 'darwin-aarch64',
    suffix: '.app.tar.gz',
    arch: 'aarch64',
  },
  'tauri-macos-x86_64': { key: 'darwin-x86_64', suffix: '.app.tar.gz', arch: 'x64' },
  'tauri-linux-x86_64': { key: 'linux-x86_64', suffix: '.AppImage' },
  'tauri-windows-x86_64': { key: 'windows-x86_64', suffix: '-setup.exe' },
};
