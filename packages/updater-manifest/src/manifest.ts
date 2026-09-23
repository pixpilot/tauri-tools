/** One platform's entry: the bundle to fetch and the signature to check it by. */
export interface UpdaterPlatform {
  readonly signature: string;
  readonly url: string;
}

/** The document the updater plugin fetches, usually published as `latest.json`. */
export interface UpdaterManifest {
  readonly version: string;
  readonly notes: string;
  /** Snake case because that is the key the plugin reads it by. */
  readonly pub_date: string;
  readonly platforms: Readonly<Record<string, UpdaterPlatform>>;
}

export interface BuildUpdaterManifestOptions {
  /** The version the manifest announces, which is what an older app compares against. */
  readonly version: string;
  /** The release tag the assets hang off. */
  readonly tag: string;
  /** `owner/name` on GitHub. */
  readonly repository: string;
  /** Each platform key and where its signed bundle is served from. */
  readonly platforms: Readonly<Record<string, UpdaterPlatform>>;
  /** Defaults to now. Taking it as an argument is what makes the output testable. */
  readonly publishedAt?: Date;
}

/**
 * GitHub replaces the spaces in an asset's name with dots as it uploads it, so
 * a URL has to name the file the way the release serves it rather than the way
 * the bundler wrote it.
 */
export function releaseAssetName(fileName: string): string {
  return fileName.replaceAll(' ', '.');
}

export function releaseAssetUrl(
  repository: string,
  tag: string,
  fileName: string,
): string {
  return `https://github.com/${repository}/releases/download/${tag}/${encodeURIComponent(
    releaseAssetName(fileName),
  )}`;
}

export function buildUpdaterManifest({
  version,
  tag,
  repository,
  platforms,
  publishedAt = new Date(),
}: BuildUpdaterManifestOptions): UpdaterManifest {
  return {
    version,
    notes: `See https://github.com/${repository}/releases/tag/${tag}`,
    pub_date: publishedAt.toISOString(),
    platforms,
  };
}
