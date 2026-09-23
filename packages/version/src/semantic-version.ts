/**
 * The subset of semver a release tool actually hands over: a full `x.y.z`,
 * optionally with a prerelease or build suffix. A range or a partial version
 * is not a version to stamp.
 */
const SEMANTIC_VERSION =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u;

export function isSemanticVersion(value: string): boolean {
  return SEMANTIC_VERSION.test(value);
}

/** Throws unless `value` is a version these files can be stamped with. */
export function assertSemanticVersion(
  value: string | undefined,
): asserts value is string {
  if (value === undefined || !isSemanticVersion(value)) {
    throw new Error(`Expected a semantic version, received ${value ?? 'nothing'}.`);
  }
}
