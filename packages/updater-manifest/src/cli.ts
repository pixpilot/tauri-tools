import { relative } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { buildManifest } from './build';

export const USAGE = `Usage: tauri-updater-manifest <artifacts-root> [options]

Builds the latest.json a Tauri updater reads, over the signed bundles a
release's downloaded build artifacts contain. Every platform has to be present
and signed; a missing one is an error, because a platform left out of the
manifest never sees another update.

Options:
  --version <version>        The version the manifest announces. Required.
  --tag <tag>                The release tag the assets hang off. Required.
  --repository <owner/name>  The GitHub repository serving them. Required.
  --product-name <name>      productName from tauri.conf.json, used to rename
                             the two macOS tarballs the bundler names alike.
                             Required.
  --file-name <name>         The manifest to write, inside <artifacts-root>.
                             Default: latest.json
  -h, --help                 Print this.`;

export interface RunResult {
  /** What the binary should print. */
  readonly message: string;
}

/**
 * The binary's work, with nothing of the process in it: `bin.ts` supplies
 * `process.argv`, the console and the exit code.
 */
export async function run(argv: readonly string[]): Promise<RunResult> {
  const { values, positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    options: {
      version: { type: 'string' },
      tag: { type: 'string' },
      repository: { type: 'string' },
      'product-name': { type: 'string' },
      'file-name': { type: 'string', default: 'latest.json' },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  if (values.help) {
    return { message: USAGE };
  }

  const [artifactsRoot] = positionals;

  if (artifactsRoot === undefined || positionals.length !== 1) {
    throw new Error(`Expected one artifacts root.\n\n${USAGE}`);
  }

  const required = {
    '--version': values.version,
    '--tag': values.tag,
    '--repository': values.repository,
    '--product-name': values['product-name'],
  };
  const missing = Object.entries(required)
    .filter(([, value]) => value === undefined)
    .map(([flag]) => flag);

  if (missing.length > 0) {
    throw new Error(`Missing ${missing.join(', ')}.\n\n${USAGE}`);
  }

  const { manifest, path, bundles } = await buildManifest({
    artifactsRoot,
    version: required['--version'] as string,
    tag: required['--tag'] as string,
    repository: required['--repository'] as string,
    productName: required['--product-name'] as string,
    fileName: values['file-name'],
  });

  const found = Object.entries(bundles)
    .map(([key, bundle]) => `  ${key}: ${bundle}`)
    .join('\n');

  return {
    message: `${found}\nWrote ${relative(process.cwd(), path)} for ${manifest.version}.`,
  };
}
