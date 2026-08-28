# Ghost + Nuxt 3 + Vercel ヘッドレス新聞サイト

Ghost（CMS/編集部）+ Nuxt 3（配信/レンダリング）+ Vercel（CDN/デプロイ）によるヘッドレス新聞サイト。

## アーキテクチャ

```
Ghost CMS ──→ Webhook ──→ Vercel ISR Cache Purge
     │                            ↑
     └─→ Content API ──→ Nuxt 3 Server ──→ レンダリング
                              ↑
                    data/issues/*.json（紙面構成）
```

- **記事内容**: Ghost Content API で管理（タグは分類用途に限定）
- **紙面構成（号・面・記事の順序）**: `data/issues/*.json` として Git 管理
- **レンダリング**: Nuxt 3 が両者をマージして表示
- **キャッシュ戦略**: ISR（Incremental Static Regeneration）+ Ghost Webhook による手動 purge

記事の公開経路（Ghost → Webhook → キャッシュ更新）とプログラム変更経路（GitHub → Vercel Build）を完全に分離。

## ディレクトリ構成

```
├── nuxt.config.ts                          # ISR/routeRules 設定
├── .env.example                            # 環境変数テンプレート
├── types/
│   └── issue.ts                            # Issue 関連の型定義
├── lib/
│   ├── validateIssue.ts                    # issues.json のバリデーション
│   ├── validateIssue.test.ts
│   ├── getIssue.ts                         # issues.json  Ghost データのマージ
│   ├── getIssue.test.ts
│   ├── ghostClient.ts                      # Ghost Content API クライアント
│   └── ghostClient.test.ts
├── server/
│   ├── utils/
│   │   ├── cache.ts                        # ISR キャッシュ無効化ユーティリティ
│   │   └── cache.test.ts
│   ├── api/
│   │   ├── issue/
│   │   │   └── [id].get.ts                # 号取得エンドポイント
│   │   ├── webhook/
│   │   │   └── ghost.post.ts             # Ghost Webhook ハンドラ
│   │   └── debug/
│   │       ├── cache-keys.get.ts          # デバッグ: storage キー一覧
│   │       └── webhook-echo.post.ts       # デバッグ: Webhook ペイロード確認
│   └── lib/
│       └── ghostClient.ts                  # Ghost API クライアント（server 用）
├── pages/
│   └── issue/
│       └── [id].vue                        # 号ページ（面一覧）
└── components/
    ├── PageRenderer.vue                    # レイアウト別コンポーネント解決
    ├── ArticleLead.vue                     # リード記事（大）
    ├── ArticleColumn.vue                   # コラム記事（中）
    ├── ArticleSmall.vue                    # 小記事（コンパクト）
    ├── AdPlaceholder.vue                   # 広告プレースホルダー
    └── IndexPlaceholder.vue                # 索引プレースホルダー
```

## issues.json スキーマ

```json
{
  "id": "2026-08",
  "title": "2026年8月号",
  "publishedAt": "2026-08-27",
  "pages": {
    "1": [
      { "type": "article", "article": "hello-ghost", "layout": "lead" },
      { "type": "article", "article": "second-post", "layout": "column" }
    ],
    "2": [
      { "type": "article", "article": "third-post", "layout": "small" }
    ]
  }
}
```

- `article` は Ghost の slug で統一
- `pages` のキーは 1 始まりの非ゼロ埋め文字（`"1"`, `"2"`, `"10"`）。疎らな面番号も可
- `type` は `article` / `ad` / `index`（ad, index は Phase 1 では構造のみ許容、描画は未実装）
- `layout` は `lead` / `column` / `small`（article 必須）
- ファイル名（`2026-08.json`）と `id` フィールドの一致を起動時に検証

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集：

```bash
GHOST_URL=https://your-ghost-instance.example.com
GHOST_CONTENT_API_KEY=your_content_api_key_here
GHOST_WEBHOOK_SECRET=your_webhook_secret_here  # 任意
SITE_NAME=Ghost Newspaper
```

- `GHOST_URL`: Ghost インスタンスの URL
- `GHOST_CONTENT_API_KEY`: Ghost Admin → Integrations → Custom Integration で取得
- `GHOST_WEBHOOK_SECRET`: Webhook の署名検証に使用（任意）

### 3. 号データの配置

```bash
mkdir -p data/issues
cp your-issue.json data/issues/2026-08.json
```

## テスト

```bash
# 全テスト実行
npx vitest run

# ォッチモード
npx vitest
```

テスト対象：

- `lib/validateIssue.test.ts` — issues.json スキーマ検証（21 件）
- `lib/getIssue.test.ts` — マージロジック（13 件）
- `lib/ghostClient.test.ts` — Ghost API クライアント（7 件）
- `server/utils/cache.test.ts` — ISR キャッシュ無効化（9 件）
- `server/api/webhook/ghost.post.test.ts` — Webhook ハンドラ（16 件）

## 開発サーバー

```bash
npm run dev
```

http://localhost:3000/issue/2026-08 で号ページを確認。

## デプロイ

### Vercel へのデプロイ

```bash
# Vercel CLI のインストール（初回のみ）
npm i -g vercel

# プロジェクトのリンク（初回のみ）
vercel link

# 本番デプロイ
vercel --prod
```

### 環境変数の Vercel への設定

```bash
vercel env add GHOST_URL
vercel env add GHOST_CONTENT_API_KEY
vercel env add GHOST_WEBHOOK_SECRET
```

## Ghost Webhook の設定

Ghost Admin → Integrations → Custom Integration → Webhooks で以下を設定：

| Event | Target URL |
|-------|-----------|
| `post.published` | `https://your-domain/api/webhook/ghost` |
| `post.updated` | `https://your-domain/api/webhook/ghost` |
| `post.unpublished` | `https://your-domain/api/webhook/ghost` |
| `post.deleted` | `https://your-domain/api/webhook/ghost` |

Webhook の署名検証を有効にする場合は `GHOST_WEBHOOK_SECRET` を設定してください。

## デバッグ

### ISR キャッシュキー形式の確認

Vercel デプロイ後、実際の Nitro storage キー形式を確認：

```bash
curl https://your-domain/api/debug/cache-keys
```

### Webhook ペイロードの確認

Ghost からテスト Webhook を `https://your-domain/api/debug/webhook-echo` に送信して、実際のペイロード構造を確認。

**注意**: デバッグエンドポイント（`/api/debug/*`）は本番運用前に削除してください。

## 実装済み機能

### Phase 1: データ層（完了）

- [x] `types/issue.ts` — 型定義（ArticleItem / FutureItem 分離）
- [x] `lib/validateIssue.ts` — スキーマ検証 + テスト一式
- [x] `lib/getIssue.ts` — マージロジック（slug 重複排除・順序維・欠損記事は警告ログのみ）+ テスト一式
- [x] `lib/ghostClient.ts` — Ghost Content API 接続アダプター + テスト一式
- [x] `server/api/issue/[id].get.ts` — Nuxt server API（YYYY-MM 形式検証、404/500/400 切り分け）
- [x] `nuxt.config.ts` — ISR/routeRules 設定
- [x] `server/utils/cache.ts` — ISR キャッシュ無効化ユーティリティ
- [x] `server/api/webhook/ghost.post.ts` — Ghost Webhook 実装（HMAC-SHA256 署名検証対応）
- [x] `pages/issue/[id].vue` — 号ページ・面ページのレンダリング
- [x] `components/PageRenderer.vue` — レイアウト別コンポーネント解決
- [x] `components/ArticleLead.vue` / `ArticleColumn.vue` / `ArticleSmall.vue` — レイアウト別コンポーネント
- [x] `components/AdPlaceholder.vue` / `IndexPlaceholder.vue` — プレースホルダー

## 先送り事項

- Ghost filter URL の長さ制限対応（記事数が大幅に増えた場合の slug チャンク分割）
  → Phase 1 の規模（1 号あたり 10〜30 記事度）では対応不要と判断
- `ad` / `index` タイプの描画実装 → Phase 2 以降

## 設計の要点

### 三層分離

- **データ層**: `data/issues/*.json` + Ghost Content API
- **API 層**: `server/api/**/*.ts`（バリデーション・マージ・エラーハンドリング）
- **表示層**: `pages/` + `components/`（レイアウト別コンポーネント）

### キャッシュ戦略

- `/issue/**` に ISR（60 秒）+ stale-while-revalidate（300 秒）を適用
- Ghost Webhook で該当号のキャッシュを即座に purge
- 記事公開経路とプログラム変更経路を完全に分離

### 欠損記事の扱い

Ghost に存在しない記事は `console.warn` でログを出力し、該当スロットをスキップ。紙面が崩壊しないよう防御的に設計。

## License

まだない。
