# SVGSketch Render Action

[![Marketplace](https://img.shields.io/badge/Marketplace-svgsketch%2Frender--action-blue?logo=github)](https://github.com/marketplace/actions/svgsketch-render)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

A GitHub Action that renders [SVGSketch](https://svgsketch.com) `.svgs`
documents to SVG files in CI/CD. Built on
[`@svgsketch/core`](https://www.npmjs.com/package/@svgsketch/core) — no
browser required, no network calls, no runtime surprises.

**Design as Code.** Commit `.svgs` files to your repo, run this action on
every PR, and get deterministic SVG output you can commit back, upload as
an artifact, or post as a preview in PR comments.

---

## Examples

The [`examples/`](./examples) directory contains three `.svgs` files
demonstrating the format:

| File | Description | Shows off |
| --- | --- | --- |
| [`icons.svgs`](./examples/icons.svgs) | 10 UI icons in a grid | Built-in primitives (`circle`, `rectangle`, `star`, `triangle`, `arrow`, `gear`, `ring`, `cross`) + `{{accent}}` template variable |
| [`bar-chart.svgs`](./examples/bar-chart.svgs) | Themed bar chart with gradients | Linear gradients + `{{title}}`, `{{barColorStart}}`, `{{barColorEnd}}` template variables |
| [`architecture.svgs`](./examples/architecture.svgs) | Three-tier system diagram | Grouped boxes, arrow connectors, per-tier template variables for retheming |

Every push to this repo re-renders them via this action. See
[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) for a working
reference workflow.

---

## Usage

### Render every `.svgs` in your repo

```yaml
name: Render SVGSketch
on: [push, pull_request]

jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: svgsketch/render-action@v1
```

By default the action finds every `.svgs` file under the repository and
writes a sibling `.svg` next to each one.

### Render a directory into an output folder

```yaml
      - uses: svgsketch/render-action@v1
        with:
          input: designs/**/*.svgs
          output-dir: rendered
```

Source directory structure beneath `designs/` is mirrored into
`rendered/` — `designs/icons/arrow.svgs` → `rendered/icons/arrow.svg`.

### Override template variables

```yaml
      - uses: svgsketch/render-action@v1
        with:
          input: designs/card.svgs
          output-dir: rendered
          variables: |
            accent=#3498db
            title=Hello World
            radius=48
```

Or as JSON:

```yaml
      - uses: svgsketch/render-action@v1
        with:
          variables: '{"accent":"#3498db","title":"Hello World","radius":"48"}'
```

Variables not overridden fall back to defaults declared in the
document's `templateVariables` field.

### Render a matrix of variants

```yaml
strategy:
  matrix:
    theme: [light, dark]
steps:
  - uses: actions/checkout@v5
  - uses: svgsketch/render-action@v1
    with:
      input: icons/*.svgs
      output-dir: rendered/${{ matrix.theme }}
      variables: |
        theme=${{ matrix.theme }}
```

### Commit rendered output back to the PR

```yaml
jobs:
  render:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v5
      - id: render
        uses: svgsketch/render-action@v1
        with:
          output-dir: rendered
      - name: Commit rendered SVGs
        run: |
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add rendered
          git diff --cached --quiet || git commit -m "chore: render ${{ steps.render.outputs.count }} .svgs file(s)"
          git push
```

### Upload as an artifact

```yaml
      - id: render
        uses: svgsketch/render-action@v1
        with:
          output-dir: rendered
      - uses: actions/upload-artifact@v5
        with:
          name: rendered-svgs
          path: rendered/
```

### Fail the build on validation warnings

```yaml
      - uses: svgsketch/render-action@v1
        with:
          fail-on-warnings: 'true'
```

### Post a visual preview as a PR comment

```yaml
jobs:
  render:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write    # required to post/update the comment
    steps:
      - uses: actions/checkout@v5
      - uses: svgsketch/render-action@v1
        with:
          input: designs/**/*.svgs
          output-dir: rendered
          comment-on-pr: 'true'
```

On every pull request, the action rasterizes each rendered SVG to PNG
(via [`@resvg/resvg-wasm`](https://www.npmjs.com/package/@resvg/resvg-wasm)),
embeds them as base64 data URIs, and posts a single comment containing
the visual previews. Re-runs update the same comment in place — no
spam. Works on pushes without failing; comments are only attempted when
the triggering event is a pull request.

---

## Inputs

| Name               | Required | Default       | Description                                                                 |
| ------------------ | -------- | ------------- | --------------------------------------------------------------------------- |
| `input`            | no       | `**/*.svgs`   | File path or glob pattern for `.svgs` files. Uses `@actions/glob` syntax.    |
| `output-dir`       | no       | *(sibling)*   | Directory to write outputs into. Source tree is mirrored. Omit to write next to sources. |
| `variables`        | no       | `''`          | Template variable overrides — JSON object or newline-separated `KEY=VALUE`. |
| `width`            | no       | *(document)*  | Override canvas width (positive number, pixels).                             |
| `height`           | no       | *(document)*  | Override canvas height (positive number, pixels).                            |
| `background`       | no       | *(none)*      | Background color (e.g. `#ffffff`). Adds a background `<rect>`.               |
| `fail-on-warnings` | no       | `false`       | Treat validation warnings as failures.                                       |
| `comment-on-pr`    | no       | `false`       | Post/update a visual preview comment on the triggering pull request.        |
| `comment-format`   | no       | `png`         | `png` (inline base64 PNGs) or `artifact-link` (skip embedding, note only).   |
| `comment-max-kb`   | no       | `400`         | Per-image size cap; PNGs above this fall back to an artifact-link note.      |
| `github-token`     | no       | *(env)*       | Token for posting the comment. Defaults to `GITHUB_TOKEN` env var.           |

## Outputs

| Name    | Description                                                            |
| ------- | ---------------------------------------------------------------------- |
| `files` | JSON array of rendered SVG paths (relative to the runner workspace).   |
| `count` | Number of `.svgs` files rendered.                                      |

## Exit codes

- **0** — All files rendered successfully.
- **non-zero** — One or more files failed to render, or `fail-on-warnings`
  was enabled and at least one warning was emitted.

Per-file errors surface via `::error::` annotations in the workflow log
and a summary block in the Action run summary.

---

## See also

- [`@svgsketch/core`](https://www.npmjs.com/package/@svgsketch/core) — the
  document format and rendering engine this action wraps.
- [`@svgsketch/cli`](https://www.npmjs.com/package/@svgsketch/cli) — the
  same rendering as a local command-line tool.
- [SVGSketch docs](https://docs.svgsketch.com) — full format specification.
- [SVGSketch editor](https://svgsketch.com) — author `.svgs` files
  visually, commit them like code.

## License

MIT — see [LICENSE](./LICENSE).
