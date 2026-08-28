# Ghost + Nuxt 3 + Vercel ヘッドレス新聞サイト

Ghost(CMS/編集部) + Nuxt 3(配信/レンダリング) + Vercel(CDN/デプロイ) による
ヘッドレス新聞サイトの実装(Phase 1: データ層〜Webhook〜レンダリング)。

## 設計の要点

- **記事内容**: Ghost Content APIで管理(タグはあくまで分類用途に限定)
- **紙面構成(号・面・記事の順序)**: `data/issues/*.json` としてGit管理
- **レンダリング**: Nuxt 3が両者をマージして表示
- 記事の公開経路(Ghost → Webhook → キャッシュ更新)とプログラム変更経路(GitHub → Vercel Build)を分離

## ディレクトリ構成

```
types/issue.ts                          # Issue関連の型定義
lib/validateIssue.ts                     # issues.jsonのバリデーション
lib/validateIssue.test.ts
lib/getIssue.ts                          # issues.jsonとGhostデータのマージ処理
lib/getIssue.test.ts
lib/ghostClient.ts                       # Ghost Content APIクライアント
lib/ghostClient.test.ts
server/api/issue/[id].get.ts             # 号取得エンドポイント
server/api/webhook/ghost.post.ts         # Ghost Webhook受信(署名検証・ペイロード両対応)
server/api/webhook/ghost.post.test.ts
server/utils/cache.ts                    # ISRキャッシュ無効化ユーティリティ
server/utils/cache.test.ts
server/api/debug/cache-keys.get.ts       # デバッグ: storageキー形式確認用(本番では削除)
server/api/debug/webhook-echo.post.ts    # デバッグ: Webhookペイロード確認用(本番では削除)
nuxt.config.ts                           # routeRules(ISR)・runtimeConfig
pages/issue/[id].vue                     # 号ページ
components/PageRenderer.vue              # type/layoutからコンポーネントを解決
components/ArticleLead.vue               # layout: lead
components/ArticleColumn.vue             # layout: column
components/ArticleSmall.vue              # layout: small
components/AdPlaceholder.vue             # type: ad(Phase1は構造のみ)
components/IndexPlaceholder.vue          # type: index(Phase1は構造のみ)
.env.example
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
- `pages` のキーは 1始まりの非ゼロ埋め文字列("1", "2", "10")。疎らな面番号も可
- `type` は `article` / `ad` / `index`(ad, index は Phase 1 では構造のみ許容、描画はプレースホルダー)
- `layout` は `lead` / `column` / `small`(article必須)
- ファイル名(`2026-08.json`)と `id` フィールドの一致を起動時に検証

## Webhook

- 署名検証: HMAC-SHA256(`x-ghost-signature: sha256=<hex>, t=<timestamp>`)、`timingSafeEqual`で比較
- ペイロード形式: Ghostの実際の形式(`post.current.slug`)とテスト用フラット形式(`post.slug`)の両方に対応(`extractPostPayload`)
- 該当slugを含む号を`issues/*.json`全スキャンで特定し、該当号のみキャッシュ無効化。見つからない場合は全号を無効化

## キャッシュ無効化

Nitroのstorage key形式(コロン区切りかスラッシュ区切りか)は環境依存で未確定のため、`cache.ts`は両形式・誤マッチ防止込みで部分一致探索する実装になっている。**本番デプロイ後、`/api/debug/cache-keys`で実際の形式を確認すること。**

## デプロイ前のTODO

- [ ] Vercelにデプロイし `/api/debug/cache-keys` で実際のキー形式を確認
- [ ] GhostからテストWebhookを `/api/debug/webhook-echo` に送り、実際のペイロード形式を確認
- [ ] 上記確認後、`server/api/debug/` 配下のエンドポイントを削除
- [ ] `.env` の `DEBUG_WEBHOOK_PAYLOAD` を `false` にする(デフォルトのまま)
- [ ] `routeRules` の ISR 設定が Vercel 上で意図通り動作するか確認

## テスト実行

```bash
npm install
npx vitest run
```

## 環境変数

`.env.example` を `.env` にコピーして値を設定:

```bash
cp .env.example .env
```
