---
'@pixpilot/tauri-version': minor
---

Stamp one version across a Tauri app's `Cargo.toml`, `Cargo.lock`,
`tauri.conf.json` and any `package.json` named, as a `tauri-version` binary and
an API. The lock file is patched rather than regenerated, so a release job
running on Node needs no Rust toolchain to keep it from drifting.
