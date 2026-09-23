import { describe, expect, it } from 'vitest';
import { assertSemanticVersion, isSemanticVersion } from '../src/semantic-version';

describe('isSemanticVersion', () => {
  it('should accept a release, a prerelease and a build', () => {
    expect(isSemanticVersion('1.2.3')).toBe(true);
    expect(isSemanticVersion('1.2.3-beta.1')).toBe(true);
    expect(isSemanticVersion('1.2.3+build.5')).toBe(true);
  });

  it('should reject anything that is not one exact version', () => {
    expect(isSemanticVersion('1.2')).toBe(false);
    expect(isSemanticVersion('v1.2.3')).toBe(false);
    expect(isSemanticVersion('^1.2.3')).toBe(false);
    expect(isSemanticVersion('')).toBe(false);
  });
});

describe('assertSemanticVersion', () => {
  it('should pass a valid version through', () => {
    expect(() => assertSemanticVersion('1.2.3')).not.toThrow();
  });

  it('should name what it was given instead', () => {
    expect(() => assertSemanticVersion('v1')).toThrow('received v1');
    expect(() => assertSemanticVersion(undefined)).toThrow('received nothing');
  });
});
