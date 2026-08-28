import { defineEventHandler, readRawBody } from 'h3'

/**
 * デバッグ用: Ghost Webhookのペイロードをそのまま返す
 *
 * Vercelデプロイ後、GhostからテストWebhookを送って
 * 実際のペイロード構造を確認する用途。
 *
 * 使用方法:
 *   1. Ghost Admin → Integrations → Webhooks → Test Webhook
 *   2. Target URL: https://your-domain/api/debug/webhook-echo
 *   3. Vercel Function Logs でペイロードを確認
 *
 * 本番ではこのエンドポイントを削除すること。
 */
export default defineEventHandler(async (event) => {
  const rawBody = await readRawBody(event)

  return {
    receivedAt: new Date().toISOString(),
    headers: Object.fromEntries(
      Object.entries(event.node.req.headers).map(([k, v]) => [k, v])
    ),
    rawBody: rawBody ?? null,
    parsedBody: rawBody ? JSON.parse(rawBody) : null
  }
})
