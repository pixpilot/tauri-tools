import { describe, expect, it } from 'vitest';
import { setJsonVersion } from '../src/json';

describe('setJsonVersion', () => {
  it('should set the version and keep the other keys in order', () => {
    const contents = `{\n  "name": "app",\n  "version": "1.0.0",\n  "private": true\n}\n`;

    expect(setJsonVersion(contents, '2.3.4')).toBe(
      `{\n  "name": "app",\n  "version": "2.3.4",\n  "private": true\n}\n`,
    );
  });

  it('should add a version to a manifest that has none', () => {
    expect(setJsonVersion('{"name":"app"}', '2.3.4')).toContain('"version": "2.3.4"');
  });

  it('should end the file with a newline', () => {
    expect(setJsonVersion('{"name":"app"}', '2.3.4').endsWith('\n')).toBe(true);
  });

  it('should refuse a file that does not hold a JSON object', () => {
    expect(() => setJsonVersion('[]', '2.3.4')).toThrow(TypeError);
    expect(() => setJsonVersion('"text"', '2.3.4')).toThrow(TypeError);
  });
});
