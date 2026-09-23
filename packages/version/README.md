# @pixpilot/tauri-version

Sets one version across every file a Tauri release has to keep in step:
`Cargo.toml`, `Cargo.lock`, `tauri.conf.json`, and any `package.json` you name.

`Cargo.lock` is the reason this exists. It carries the workspace crate's own
version beside every dependency's, so a release that stamps only the manifest
leaves the two disagreeing — and nothing fails until the next `cargo` run
rewrites the lock to settle it, either as a dirty tree in the middle of a build
or as drift in the next person's checkout. The lock is patched rather than
regenerated, so this needs no Rust toolchain: a release job running on Node has
none.

## Install

```sh
pnpm add -D @pixpilot/tauri-version
```

## CLI

```sh
tauri-version 1.2.3 --tauri-dir apps/desktop/src-tauri --json apps/desktop/package.json
```

| Option              | What it does                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| `--tauri-dir <dir>` | The crate directory, holding `Cargo.toml`, `Cargo.lock` and `tauri.conf.json`. Default: `src-tauri` |
| `--json <file>`     | Another JSON manifest to stamp, such as the app's `package.json`. Repeatable                        |
| `--cwd <dir>`       | What relative paths resolve against. Default: the working directory                                 |
| `-h`, `--help`      | Print the usage                                                                                     |

With [semantic-release](https://semantic-release.gitbook.io), as the `exec`
plugin's `prepareCmd`:

```json
{
  "prepareCmd": "pnpm exec tauri-version ${nextRelease.version} --tauri-dir apps/desktop/src-tauri --json apps/desktop/package.json"
}
```

Add `apps/desktop/src-tauri/Cargo.lock` to the `@semantic-release/git` assets
alongside the manifests, or the stamped lock is left out of the release commit
and the drift comes straight back.

## API

```ts
import { stampTauriVersion } from '@pixpilot/tauri-version';

const { crate, files } = await stampTauriVersion({
  version: '1.2.3',
  tauriDir: 'apps/desktop/src-tauri',
  json: ['apps/desktop/package.json'],
});
```

The string transforms underneath are exported too, for anything that already
has the file contents rather than a path: `readCargoCrateName`,
`setCargoManifestVersion`, `setCargoLockVersion`, `setJsonVersion`,
`isSemanticVersion` and `assertSemanticVersion`. Each setter answers `null`
when the key it was looking for is not in the file, so the caller can say which
file was wrong.

## Notes

- **Re-stamping is a no-op, not a failure.** A build asked to package the
  version already in the tree packages it.
- **A missing `Cargo.lock` is fine.** A project that does not commit one is
  left alone; a lock that is there but lists no such crate is an error.
- **Only the crate's own version moves.** The lock entry is matched on
  `[[package]]`, `name` and `version` together, so a dependency that happens to
  carry the same version is never touched.
- **JSON files are re-serialised** at two-space indent with a closing newline.
  Key order is kept; comments are not.
- **CRLF files stay CRLF.**
