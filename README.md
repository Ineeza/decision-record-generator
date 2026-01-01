# decision-record-generator
A lightweight generator for decision records,
designed for fast-moving teams who need reproducible decisions.

（日本語）アジャイルチーム向けの軽量な意思決定記録（DR）ジェネレーターです。`decision.yaml` から Markdown / JSON を生成し、`manifest.json` の SHA256 ハッシュで改ざん検知できます。

## Fastest try (npm)

```bash
npm install -g dr-gen

# If decision.yaml doesn't exist yet, this creates a template for you.
dr-gen generate decision.yaml
```

## No-YAML mode (interactive)

If you don't want to write YAML by hand:

```bash
dr-gen new
```

This asks for the minimum useful info (Title + Why + Rule). Other fields are optional.
By default, `date` is set to today's date (YYYY-MM-DD). To disable this:

```bash
dr-gen new --no-date
```

By default this creates:
- `in/<date>__<title>__<id>/decision.yaml`
- `out/<date>__<title>__<id>/` (generated files)

## Quickstart

```bash
npm install
npm run build
node dist/cli.js generate examples/decision.yaml
```

By default, outputs are written under `out/<date>__<title>__<id>/`.

## Examples

See `examples/README.md`.

- Japanese examples: `examples/ja/README.md`
- English examples: `examples/en/README.md`

Try:

```bash
dr-gen generate examples/ja/01_product_pricing_rule.yaml
dr-gen generate examples/en/01_product_pricing_rule.yaml
```

## Install (global)

```bash
npm install -g dr-gen
dr-gen generate decision.yaml
```

## Run with npx

After publishing to npm, you can run without installing globally:

```bash
npx dr-gen@latest generate decision.yaml
```

## Local development (npm link)

```bash
npm install
npm run build
npm link

dr-gen generate examples/decision.yaml
```

This generates 4 files in the output directory:
- `decision-record.md`
- `summary.json`
- `repro.md`
- `manifest.json` (SHA256 hashes for tamper detection)

If you prefer a different base output directory:

```bash
dr-gen generate decision.yaml --out-dir some-dir
```

### 日本語の入力について

- `decision.yaml` の値は日本語OKです（UTF-8）。生成される `decision-record.md` などにもそのまま出力されます。
- CLIのコマンド/ヘルプは英語のまま運用し、必要になったら日本語対応（i18n）を追加します。

## CLI

```bash
dr-gen generate decision.yaml
```