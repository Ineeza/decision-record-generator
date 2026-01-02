# decision-record-generator (dr-gen)

Generate lightweight Decision Records (DRs) from `decision.yaml`.
Built for fast-moving teams who need a small, reproducible “evidence trail” of decisions (why/rule) for handoffs, audits, and security questionnaires.

日本語は下の「Japanese (日本語)」セクションにまとめています。

**Outputs (4 files)**
- `decision-record.md` (human-readable)
- `summary.json` (structured data)
- `repro.md` (reproducibility notes)
- `manifest.json` (SHA256 hashes for tamper detection)

## Input (decision.yaml)

All fields except `title` are optional. Empty strings are OK.

```yaml
title: "Use PostgreSQL for user data" # required
date: "2024-01-15"                   # optional (YYYY-MM-DD)
decider: "Alice (PM)"                # optional

# ADR-style lifecycle (optional)
status: "accepted"                   # optional: accepted | deprecated | superseded

# Tip: dr-gen is designed for post-decision records. For drafts, use `dr-gen new --skip-generate` instead of managing a "proposed" lifecycle.

# Linking DRs when a decision changes:
# - Recommended (minimal): set `supersedes` on the newer DR.
supersedes: ""                        # optional: link/id/path of the older DR (recommended)

context: ""                           # optional
why: ""                               # optional
rule: ""                              # optional (the decision/policy; rendered as "Decision" in decision-record.md)
alternatives: ""                      # optional
consequences: ""                      # optional
tags: []                               # optional
```

If a decision is reversed later, prefer creating a new DR and setting `supersedes` on the new DR (rather than rewriting history).

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

Japanese prompts:

```bash
dr-gen new --lang ja
```

You can also set `DR_GEN_LANG=ja`.

This asks for the minimum useful info (Title + Why + Rule). Other fields are optional.
By default, `date` is set to today's date (YYYY-MM-DD). To disable this:

```bash
dr-gen new --no-date
```

By default this creates:
- `in/<date>__<title>__<id>/decision.yaml`
- `out/<date>__<title>__<id>/` (generated files)

If you want to fill more fields (status/alternatives/etc) before generating outputs, use:

```bash
dr-gen new --skip-generate
```

Then edit the generated `decision.yaml`, and run `dr-gen generate`.

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
dr-gen list --from 2026-01-01 --to 2026-01-31

# Optional: keep the Decision line on one terminal line
dr-gen list --from 2026-01-01 --to 2026-01-31 --max-decision-len 60
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

日本語で質問を表示する場合:

```bash
dr-gen new --lang ja
```

環境変数で指定することもできます（例: `DR_GEN_LANG=ja`）。

Title / Why / Rule を中心に入力します（他は任意）。`--no-date` で日付自動入力を無効にできます。

`status` / `alternatives` などを追記してから生成したい場合は、まず `decision.yaml` だけ作るのがおすすめです。

```bash
dr-gen new --skip-generate
```

その後、生成された `decision.yaml` を編集してから `dr-gen generate` を実行します。

### 検証（改ざん検知）

生成後のファイルが変更されていないか確認するには、`manifest.json` と照合します。

```bash
npx dr-gen@latest verify out/<date>__<title>__<id>/
```

### 一覧（レポート出力）

期間を指定して、コピペしやすい Markdown レポートを標準出力に出します。

```bash
dr-gen list --from 2026-01-01 --to 2026-01-31

# 任意: Decision 行の文字数上限（デフォルト: 80）
dr-gen list --from 2026-01-01 --to 2026-01-31 --max-decision-len 60
```

### Drive / Box 運用

非エンジニアの運用で Drive / Box に保存する場合は、ガイドを参照してください。

- [DRIVE_BOX_OPERATION_GUIDE.md](https://github.com/Ineeza/decision-record-generator/blob/main/DRIVE_BOX_OPERATION_GUIDE.md)

### 入力（decision.yaml）

`title` 以外はすべて任意です。空文字でもOKです。

```yaml
title: "ユーザーデータはPostgreSQLを使う" # 必須
date: "2024-01-15"                      # 任意（YYYY-MM-DD）
decider: "Alice (PM)"                   # 任意

# ADR風のライフサイクル管理（任意）
status: "accepted"                      # 任意: accepted | deprecated | superseded

# Tip: dr-gen は「決定後に残す」用途がメインです。下書きは `dr-gen new --skip-generate` で YAML だけ作るのがおすすめです。

# DRのリンク（判断が変わったとき）:
# - 推奨（最小運用）: 新しいDRに `supersedes` を書く
supersedes: ""                           # 任意: 以前のDRのリンク/ID/パス（推奨）

context: ""                              # 任意
why: ""                                  # 任意
rule: ""                                 # 任意（決めたこと/方針。decision-record.md では "Decision" として表示）
alternatives: ""                         # 任意
consequences: ""                         # 任意
tags: []                                  # 任意
```

後から判断が覆った場合は、既存DRを書き換えるよりも「新しいDRを作り、新DRに `supersedes` を書く」運用がおすすめです。


### ライセンスについて

本ソフトウェアは MIT License のもとで OSS として無料で提供しています（個人・法人を問わず利用可能です）。

組織・チームでの利用において、サポート、利用条件の明確化、継続的な提供が必要な場合は、法人契約をご検討ください。

法人契約はこちら:
https://www.ineeza.com/