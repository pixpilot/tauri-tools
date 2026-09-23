/**
 * Cargo's two files, edited as text rather than parsed.
 *
 * A TOML round-trip would reformat the manifest and reorder the lock, and the
 * lock is generated: the only edit wanted in either is the one version, left
 * in a file the next `cargo` run still recognises as its own.
 *
 * Every function here answers `null` rather than throwing when the key it was
 * looking for is not there, so the caller can say which file was wrong.
 */

/** Cargo allows only word characters and dashes in a crate name. */
const CRATE_NAME = /^name = "(?<name>[\w-]+)"\r?$/mu;

/**
 * The crate's own version is the first `version` in the manifest: `[package]`
 * is at the top, and the target and dependency tables under it give the key to
 * something other than the crate itself.
 */
const PACKAGE_VERSION = /^version = "[^"]+"\r?$/mu;

/** The name under `[package]`, or null for a manifest that declares none. */
export function readCargoCrateName(manifest: string): string | null {
  return CRATE_NAME.exec(manifest)?.groups?.['name'] ?? null;
}

/** The manifest with the crate's own version replaced, or null if it has none. */
export function setCargoManifestVersion(
  manifest: string,
  version: string,
): string | null {
  const match = PACKAGE_VERSION.exec(manifest);

  if (match === null) {
    return null;
  }

  return manifest.replace(
    PACKAGE_VERSION,
    `version = "${version}"${carriageReturn(match[0])}`,
  );
}

/**
 * The lock with `crate`'s own version replaced, or null if the lock has no
 * such package.
 *
 * Cargo writes `name` directly above `version` in every `[[package]]` block,
 * so matching the pair is what keeps the edit off a dependency that happens to
 * carry the version being stamped.
 */
export function setCargoLockVersion(
  lock: string,
  crate: string,
  version: string,
): string | null {
  // Only a real crate name is looked for, which is also why the name needs no
  // escaping before it goes into the pattern.
  if (!/^[\w-]+$/u.test(crate)) {
    return null;
  }

  const entry = new RegExp(
    String.raw`(?<entry>\[\[package\]\]\r?\nname = "${crate}"\r?\n)version = "[^"]+"`,
    'u',
  );

  return entry.test(lock) ? lock.replace(entry, `$<entry>version = "${version}"`) : null;
}

/** Keeps a CRLF file CRLF, since only the quoted value is being replaced. */
function carriageReturn(line: string): string {
  return line.endsWith('\r') ? '\r' : '';
}
