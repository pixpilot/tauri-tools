# Tauri Tools

> A modern TypeScript monorepo managed with pnpm and TurboRepo.

## 🚀 Getting Started

### Development

Build all packages:

```sh
pnpm build
```

Run tests:

```sh
pnpm test
```

Lint and format:

```sh
pnpm lint
pnpm format
```

### Create a New Package

Generate a new package in the monorepo:

```sh
pnpm run gen:package
```

## 📦 Packages

### [updater-manifest](./packages/updater-manifest/README.md)

Builds the latest.json a Tauri updater reads, from the signed bundles a release's build artifacts contain.

### [version](./packages/version/README.md)

Sets one version across a Tauri app's Cargo.toml, Cargo.lock, tauri.conf.json and package.json.


## 🚢 Releases

This project uses [Changesets](https://github.com/changesets/changesets) for version management and publishing.

## 📄 License

[MIT](LICENSE)
