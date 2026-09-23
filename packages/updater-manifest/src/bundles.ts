/**
 * The bundles in `files` that end in `suffix` and have a detached signature
 * beside them.
 *
 * The signature is not optional: the plugin trusts nothing about the release
 * itself and verifies every artifact it downloads against the public key baked
 * into `tauri.conf.json`. A bundle with no `.sig` is one the updater would
 * refuse, so it is not a bundle this can offer.
 *
 * Anything other than exactly one result is the caller's to explain, since
 * only the caller knows which platform was being looked for.
 */
export function findSignedBundles(files: readonly string[], suffix: string): string[] {
  const signed = new Set(files.filter((file) => file.endsWith('.sig')));

  return files.filter((file) => file.endsWith(suffix) && signed.has(`${file}.sig`));
}

/**
 * The name a bundle has to take when the bundler gave two builds the same one.
 *
 * `Multi Mind.app.tar.gz` comes out of both macOS builds, and one release
 * cannot hold two assets under one name. The dots match what GitHub would do
 * to the spaces anyway.
 */
export function architectureBundleName(
  productName: string,
  version: string,
  arch: string,
  suffix: string,
): string {
  return `${productName.replaceAll(' ', '.')}_${version}_${arch}${suffix}`;
}
