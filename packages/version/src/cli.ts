import { relative } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { stampTauriVersion } from './stamp';

export const USAGE = `Usage: tauri-version <version> [options]

Sets one version across a Tauri app's Cargo.toml, Cargo.lock, tauri.conf.json
and any other JSON manifest named.

Options:
  --tauri-dir <dir>  The crate directory, holding Cargo.toml, Cargo.lock and
                     tauri.conf.json. Default: src-tauri
  --json <file>      Another JSON manifest to stamp, such as the app's
                     package.json. May be given more than once.
  --cwd <dir>        What relative paths resolve against. Default: the working
                     directory.
  -h, --help         Print this.`;

export interface RunResult {
  /** What the binary should print. */
  readonly message: string;
}

/**
 * The binary's work, with nothing of the process in it: no `process.argv`, no
 * writing to the console, no exit code. `bin.ts` supplies those.
 */
export async function run(argv: readonly string[]): Promise<RunResult> {
  const { values, positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    options: {
      'tauri-dir': { type: 'string', default: 'src-tauri' },
      json: { type: 'string', multiple: true, default: [] },
      cwd: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  if (values.help) {
    return { message: USAGE };
  }

  if (positionals.length !== 1) {
    throw new Error(
      `${positionals.length === 0 ? 'Expected a version to stamp' : `Expected one version, received ${positionals.length}`}.\n\n${USAGE}`,
    );
  }

  const [version] = positionals as [string];
  const cwd = values.cwd ?? process.cwd();

  const { crate, files } = await stampTauriVersion({
    version,
    tauriDir: values['tauri-dir'],
    json: values.json,
    cwd,
  });

  const written = files.map((file) => relative(cwd, file)).join(', ');

  return { message: `Stamped ${crate} ${version} into ${written}.` };
}
