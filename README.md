# decision-record-generator (dr-gen)

Generate lightweight Decision Records (DRs) from `decision.yaml`.
Built for fast-moving teams who need a small, reproducible “evidence trail” of decisions (why/rule) for handoffs, audits, and security questionnaires.

日本語は下の「Japanese (日本語)」セクションにまとめています。

**Outputs (4 files)**
- `decision-record.md` (human-readable)
- `summary.json` (structured data)
- `repro.md` (reproducibility notes)
- `manifest.json` (SHA256 hashes for tamper detection)

## Operations (Drive / Box)

If you store DRs in Drive / Box (common for non-developers), see this guide (Japanese):
- [DRIVE_BOX_OPERATION_GUIDE.md](https://github.com/Ineeza/decision-record-generator/blob/main/DRIVE_BOX_OPERATION_GUIDE.md)

## Verify (integrity / tamper detection)

To verify that generated files were not modified after generation, run:

```bash
dr-gen verify out/<date>__<title>__<id>/
```

Without installing globally:

```bash
npx dr-gen@latest verify out/<date>__<title>__<id>/
```

This checks `decision-record.md`, `summary.json`, and `repro.md` against hashes in `manifest.json`.

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

## CLI

```bash
dr-gen generate decision.yaml
```

Other commands:

```bash
dr-gen new
dr-gen verify out/<date>__<title>__<id>/
```

---

## Japanese (日本語)

引き継ぎ・監査対応・セキュリティに関する確認（質問対応）のために、意思決定（Why / Rule）を小さく・再現可能な形で残すDRジェネレーターです。`decision.yaml` から Markdown / JSON を生成し、`manifest.json` の SHA256 ハッシュで改ざん検知できます。

### 最速で試す（npm）

```bash
npm install -g dr-gen

# decision.yaml が無い場合はテンプレを作成します
dr-gen generate decision.yaml
```

### YAMLなし（対話形式）

```bash
dr-gen new
```

Title / Why / Rule を中心に入力します（他は任意）。`--no-date` で日付自動入力を無効にできます。

### 検証（改ざん検知）

生成後のファイルが変更されていないか確認するには、`manifest.json` と照合します。

```bash
npx dr-gen@latest verify out/<date>__<title>__<id>/
```

### Drive / Box 運用

非エンジニアの運用で Drive / Box に保存する場合は、ガイドを参照してください。

- [DRIVE_BOX_OPERATION_GUIDE.md](https://github.com/Ineeza/decision-record-generator/blob/main/DRIVE_BOX_OPERATION_GUIDE.md)

### 日本語の入力について

- `decision.yaml` は UTF-8 を想定しています。値（title / why など）は日本語でも問題ありません。
	生成される `decision-record.md` / `summary.json` / `repro.md` にも、そのまま出力されます。
- 現時点では CLI のコマンド名・ヘルプ表示は英語です（ドキュメントで補足しています）。
	需要があれば日本語表示（i18n）も検討します。

### ライセンスについて

本ソフトウェアは MIT License のもとで OSS として無料で提供しています（個人・法人を問わず利用可能です）。

組織・チームでの利用において、サポート、利用条件の明確化、継続的な提供が必要な場合は、法人契約をご検討ください。

法人契約はこちら:
https://www.ineeza.com/