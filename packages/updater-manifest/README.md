# @pixpilot/tauri-updater-manifest

Builds the `latest.json` a Tauri updater reads, over the signed bundles a
release's downloaded build artifacts contain.

The updater plugin never looks at the release itself. It fetches one file,
reads the version in it, and trusts nothing else: every artifact named there
has to carry a detached signature it can check against the public key baked
into `tauri.conf.json`. So this runs over the downloaded bundles, pairs each
updater artifact with the `.sig` the bundler wrote beside it, and points at
where the release will serve it from.

**A platform whose artifact or signature is missing is an error, not an
omission.** A platform quietly left out of the manifest is one that never sees
another update — a failed release you can re-run is the better outcome.

## Install

```sh
pnpm add -D @pixpilot/tauri-updater-manifest
```

## CLI

```sh
tauri-updater-manifest release-artifacts \
  --version 1.2.3 \
  --tag v1.2.3 \
  --repository owner/name \
  --product-name "My App"
```

| Option                      | What it does                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------- |
| `--version <version>`       | The version the manifest announces. Required                                          |
| `--tag <tag>`               | The release tag the assets hang off. Required                                         |
| `--repository <owner/name>` | The GitHub repository serving them. Required                                          |
| `--product-name <name>`     | `productName` from `tauri.conf.json`, used to rename the two macOS tarballs. Required |
| `--file-name <name>`        | The manifest to write, inside the artifacts root. Default: `latest.json`              |
| `-h`, `--help`              | Print the usage                                                                       |

Run it **before** uploading the assets: it renames the macOS tarballs, and the
manifest has to name the files the release will actually receive.

### In a release workflow

```yaml
- name: Download the installers
  uses: actions/download-artifact@v4
  with:
    path: release-artifacts
    # No merge-multiple: each build keeps its own directory, because the two
    # macOS builds name their tarball identically and merging drops one.

- name: Build the updater manifest
  run: >-
    pnpm exec tauri-updater-manifest release-artifacts
    --version "${{ inputs.app-version }}"
    --tag "${{ inputs.tag-name }}"
    --repository "${{ github.repository }}"
    --product-name "My App"
```

Then upload `latest.json` to the release alongside the installers.

## Expected layout

Each build's files kept in a directory named after the matrix entry that
produced them:

```
release-artifacts/
├── tauri-macos-aarch64/    My App.app.tar.gz  + .sig
├── tauri-macos-x86_64/     My App.app.tar.gz  + .sig
├── tauri-linux-x86_64/     my-app_1.2.3_amd64.AppImage + .sig
└── tauri-windows-x86_64/   My App_1.2.3_x64-setup.exe  + .sig
```

Those four directory names are the default map. For the two macOS builds the
directory name is the only thing left that tells them apart, because the
bundler gives both tarballs the same one — which is also why they are renamed
to carry their architecture before upload. A different set of targets is passed
through the API's `platforms` option.

## API

```ts
import { buildManifest } from '@pixpilot/tauri-updater-manifest';

const { manifest, path, bundles } = await buildManifest({
  artifactsRoot: 'release-artifacts',
  version: '1.2.3',
  tag: 'v1.2.3',
  repository: 'owner/name',
  productName: 'My App',
});
```

`platforms` overrides the default map; `fileName` the written file; and
`publishedAt` the `pub_date`, which is what makes the output reproducible in a
test. The pieces underneath are exported too: `DEFAULT_PLATFORMS`,
`findSignedBundles`, `architectureBundleName`, `buildUpdaterManifest`,
`releaseAssetName` and `releaseAssetUrl`.

## Signing keys

The `.sig` files this looks for only exist if the build was given a signing
key. See [`tauri signer generate`](https://v2.tauri.app/plugin/updater/) and
set `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` on the
build job, with the matching public key in `plugins.updater.pubkey`.
