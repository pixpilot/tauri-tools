import type { UpdaterManifest, UpdaterPlatform } from './manifest';
import type { PlatformArtifact } from './platforms';
import { readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { architectureBundleName, findSignedBundles } from './bundles';
import { buildUpdaterManifest, releaseAssetUrl } from './manifest';
import { DEFAULT_PLATFORMS } from './platforms';

export interface BuildManifestOptions {
  /** The directory the per-platform artifact directories were downloaded into. */
  readonly artifactsRoot: string;
  /** The version the manifest announces. */
  readonly version: string;
  /** The release tag the assets hang off. */
  readonly tag: string;
  /** `owner/name` on GitHub. */
  readonly repository: string;
  /**
   * `productName` from `tauri.conf.json`. Only used to rename the bundles the
   * bundler gave identical names.
   */
  readonly productName: string;
  /** Defaults to {@link DEFAULT_PLATFORMS}. */
  readonly platforms?: Readonly<Record<string, PlatformArtifact>>;
  /** The manifest file to write, relative to `artifactsRoot`. Default: `latest.json`. */
  readonly fileName?: string;
  /** Defaults to now. */
  readonly publishedAt?: Date;
}

export interface BuildManifestResult {
  readonly manifest: UpdaterManifest;
  /** Where the manifest was written. */
  readonly path: string;
  /** The bundle each platform resolved to, for a build log to print. */
  readonly bundles: Readonly<Record<string, string>>;
}

/**
 * Writes the manifest the updater asks for, over the bundles a release built.
 *
 * A platform whose artifact or signature is missing is an error rather than an
 * omission: a quietly absent platform is one that never sees another update,
 * which is the failure this exists to end.
 *
 * It runs before the assets are uploaded, because it renames the macOS
 * tarballs and the manifest has to name the files the release will actually
 * receive.
 */
export async function buildManifest(
  options: BuildManifestOptions,
): Promise<BuildManifestResult> {
  const {
    artifactsRoot,
    version,
    tag,
    repository,
    productName,
    platforms = DEFAULT_PLATFORMS,
    fileName = 'latest.json',
    publishedAt,
  } = options;

  const root = resolve(artifactsRoot);
  const entries = Object.entries(platforms);
  const resolved = await Promise.all(
    entries.map(async ([artifact, platform]) =>
      resolvePlatform({
        root,
        artifact,
        platform,
        productName,
        version,
        repository,
        tag,
      }),
    ),
  );

  const manifestPlatforms: Record<string, UpdaterPlatform> = {};
  const bundles: Record<string, string> = {};

  for (const { key, entry, bundle } of resolved) {
    manifestPlatforms[key] = entry;
    bundles[key] = bundle;
  }

  const manifest = buildUpdaterManifest({
    version,
    tag,
    repository,
    platforms: manifestPlatforms,
    ...(publishedAt === undefined ? {} : { publishedAt }),
  });

  const path = join(root, fileName);
  const INDENT = 2;

  await writeFile(path, `${JSON.stringify(manifest, null, INDENT)}\n`);

  return { manifest, path, bundles };
}

interface ResolveOptions {
  readonly root: string;
  readonly artifact: string;
  readonly platform: PlatformArtifact;
  readonly productName: string;
  readonly version: string;
  readonly repository: string;
  readonly tag: string;
}

/** One platform's signed bundle, or an explanation of why the release cannot ship. */
async function resolvePlatform({
  root,
  artifact,
  platform,
  productName,
  version,
  repository,
  tag,
}: ResolveOptions): Promise<{ key: string; entry: UpdaterPlatform; bundle: string }> {
  const directory = join(root, artifact);
  let files: string[];

  try {
    files = await filesUnder(directory);
  } catch {
    throw new Error(
      `Nothing was downloaded for ${platform.key}; expected the ${artifact} artifact.`,
    );
  }

  const found = findSignedBundles(files, platform.suffix);

  if (found.length !== 1) {
    throw new Error(
      found.length === 0
        ? `No signed ${platform.suffix} was built for ${platform.key}. Check that ` +
            'bundle.createUpdaterArtifacts is set and that the signing key reached the build.'
        : `Several signed ${platform.suffix} bundles were built for ${platform.key}: ` +
            `${found.map((file) => basename(file)).join(', ')}.`,
    );
  }

  const bundle = await disambiguate(found[0] as string, platform, productName, version);
  const signature = await readFile(`${bundle}.sig`, 'utf8');

  return {
    key: platform.key,
    bundle: basename(bundle),
    entry: {
      signature: signature.trim(),
      url: releaseAssetUrl(repository, tag, basename(bundle)),
    },
  };
}

/**
 * Renames a bundle whose name the release could not keep two of, along with
 * its signature. Every other platform already names its bundle unambiguously
 * and is left alone, so published installers keep the names they have had.
 */
async function disambiguate(
  file: string,
  { arch, suffix }: PlatformArtifact,
  productName: string,
  version: string,
): Promise<string> {
  if (arch === undefined) {
    return file;
  }

  const renamed = join(
    dirname(file),
    architectureBundleName(productName, version, arch, suffix),
  );

  await Promise.all([rename(file, renamed), rename(`${file}.sig`, `${renamed}.sig`)]);

  return renamed;
}

async function filesUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}
