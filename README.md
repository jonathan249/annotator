# Annotator

Annotator is a native Tauri desktop app for reading PDFs, selecting text, adding local annotations, searching PDF content, and writing per-document notes next to the PDF.

## Features

- Native PDF open dialog via `File > Open PDF`
- PDF viewer with selectable text
- Floating annotation editor for selected PDF text
- Annotation list in a collapsible sidebar
- PDF search with `Cmd/Ctrl+F`
- Per-PDF rich-text notes powered by Tiptap
- Local sidecar storage; the original PDF is never modified

## Stack

- Tauri 2
- React 19
- Vite
- Bun
- PDF.js through `react-pdf`
- Tiptap editor

## Requirements

- Bun
- Rust stable
- Tauri system prerequisites for your OS

On Linux, install the WebKit/AppIndicator dependencies required by Tauri before building.

## Development

Install dependencies:

```sh
bun install
```

Run the native app in development:

```sh
bun run tauri dev
```

Run the frontend only:

```sh
bun run dev
```

## Build Locally

Build the frontend:

```sh
bun run build
```

Check the Rust/Tauri side:

```sh
cargo check --manifest-path src-tauri/Cargo.toml
```

Build installable desktop bundles:

```sh
bun run tauri build
```

Generated bundles are written under:

```text
src-tauri/target/release/bundle/
```

## Local Data

Annotations and notes are stored in the app data directory, keyed by the PDF content hash:

```text
{app_data_dir}/annotations/{pdf_id}.json
{app_data_dir}/markdown/{pdf_id}.md
```

The opened PDF file is read but not changed.

## GitHub Releases

Yes, you can build releases on GitHub.

This repo includes `.github/workflows/release.yml`, which uses `tauri-apps/tauri-action` to build macOS, Windows, and Linux bundles and upload them to a draft GitHub Release.

To create a release:

1. Commit and push your changes.
2. Make sure the version in `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `package.json` is correct.
3. Create and push a version tag:

```sh
git tag v0.1.0
git push origin v0.1.0
```

The workflow will create a draft release named `Annotator v__VERSION__` and attach the platform bundles.

You can also run it manually from GitHub:

```text
Actions > Release > Run workflow
```

## Notes About Signing

The included workflow builds unsigned bundles. That is fine for testing and internal use, but public distribution should use platform signing:

- macOS: Developer ID signing and notarization
- Windows: code signing certificate

Unsigned macOS builds may show Gatekeeper warnings.

## Useful Commands

```sh
bun install
bun run build
bun run tauri dev
bun run tauri build
cargo check --manifest-path src-tauri/Cargo.toml
```
