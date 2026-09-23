/**
 * A manifest's `version`, set without disturbing the order of anything else.
 *
 * The file is re-serialised at two-space indent with a closing newline, which
 * is what npm and Tauri both write and what a formatter would leave behind
 * anyway. Comments and unusual indentation do not survive; neither file this
 * is meant for has either.
 */
export function setJsonVersion(contents: string, version: string): string {
  const json: unknown = JSON.parse(contents);

  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    throw new TypeError('Expected the file to hold a JSON object.');
  }

  const INDENT = 2;

  return `${JSON.stringify({ ...json, version }, null, INDENT)}\n`;
}
