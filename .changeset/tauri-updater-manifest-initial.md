---
'@pixpilot/tauri-updater-manifest': minor
---

Build the `latest.json` a Tauri updater reads from a release's downloaded build
artifacts, as a `tauri-updater-manifest` binary and an API. Each updater bundle
is paired with the detached signature beside it, the two macOS tarballs are
renamed to carry their architecture so one release can hold both, and a
platform that built nothing or went unsigned fails the release rather than
disappearing from the manifest.
