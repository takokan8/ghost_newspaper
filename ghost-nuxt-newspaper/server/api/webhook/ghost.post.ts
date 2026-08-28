import { defineEventHandler, readRawBody, createError, getHeader } from 'h3'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { invalidateIssueCache, invalidateAllIssueCache } from '../../utils/cache'
import { useRuntimeConfig } from '#imports'

/**
 * Ghost Webhook ハンドラ
 *
 * Ghost Admin → Integrations → Custom Integration → Webhooks:
 *   Event: post.published, post.updated, post.unpublished, post.deleted
 *   Target URL: https://<your-domain>/api/webhook/ghost
 *
 * GhostのWebhook署名ヘッダー形式:
 *   x-ghost-signature: sha256=<hex_hmac_sha256>, t=<unix_timestamp>
 *
 * 署名対象は生のリクエストボディ(JSON文字列そのもの)。
 */

// デバッグモード: 受信したペイロードをそのままログ出力する
// Vercelデプロイ後、GhostからテストWebhookを送って実際のペイロード構造を確認する用途
const DEBUG_WEBHOOK_PAYLOAD = process.env.DEBUG_WEBHOOK_PAYLOAD === 'true'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const secret = config.ghostWebhookSecret

  // --- 1. 生のリクエストボディを取得(署名検証に必要) ---
  const rawBody = await readRawBody(event)
  if (!rawBody) {
    throw createError({ statusCode: 400, statusMessage: 'Empty request body' })
  }

  // デバッグモード: 受信ボディをそのままログ出力
  if (DEBUG_WEBHOOK_PAYLOAD) {
    console.log('[DEBUG] Raw webhook payload:', rawBody)
  }

  // --- 2. シグネチャ検証 ---
  if (secret) {
    const signatureHeader = getHeader(event, 'x-ghost-signature') ?? ''
    if (!verifyGhostSignature(rawBody, signatureHeader, secret)) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }
  }

  // --- 3. ボディをパース ---
  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON body' })
  }

  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON body' })
  }

  const bodyObj = body as Record<string, unknown>

  // --- 4. GhostのWebhookペイロード構造を解決 ---
  // Ghostの実際のペイロードは以下の2つの形式のいずれか:
  //   (A) { post: { current: { slug, status, ... }, previous: { ... } } }
  //   (B) { post: { slug, status, ... } } (テスト・簡易形式)
  const postPayload = extractPostPayload(bodyObj)

  if (!postPayload) {
    throw createError({ statusCode: 400, statusMessage: 'Missing post object' })
  }

  const slug = postPayload.slug
  const eventName = typeof bodyObj.event === 'string' ? bodyObj.event : 'unknown'

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing post slug' })
  }

  // ログの重複を避ける: eventName は "post.published" のような値なので "post." を重ねない
  console.log(`[Webhook] ${eventName} slug=${slug}`)

  // --- 5. 該当する号を特定してキャッシュ無効化 ---
  const issuesDir = './data/issues'
  const issueIds = await findIssuesContainingSlug(issuesDir, slug)

  if (issueIds.length > 0) {
    console.log(`[Webhook] Invalidating cache for issues: ${issueIds.join(', ')}`)
    await Promise.all(issueIds.map((id) => invalidateIssueCache(id)))
  } else {
    console.log('[Webhook] Slug not found in any issue, invalidating all issue caches')
    await invalidateAllIssueCache()
  }

  return { success: true, invalidatedIssues: issueIds }
})

/**
 * GhostのWebhookペイロードからpostオブジェクトを抽出する
 *
 * 形式A: { post: { current: { slug, ... } } }  → current を返す
 * 形式B: { post: { slug, ... } }               → post を返す
 */
export function extractPostPayload(bodyObj: Record<string, unknown>): { slug?: string } | null {
  const post = bodyObj.post
  if (!post || typeof post !== 'object') return null

  const postObj = post as Record<string, unknown>

  // 形式A: post.current が存在する場合
  if (postObj.current && typeof postObj.current === 'object') {
    return postObj.current as { slug?: string }
  }

  // 形式B: post.slug が直接存在する場合
  if (typeof postObj.slug === 'string') {
    return postObj as { slug?: string }
  }

  return null
}

/**
 * GhostのWebhook署名を検証する
 *
 * @param rawBody     - 生のリクエストボディ(JSON文字列)
 * @param header      - x-ghost-signature ヘッダーの値
 * @param secret      - Webhookシークレット
 * @returns 署名が正しければ true
 */
export function verifyGhostSignature(rawBody: string, header: string, secret: string): boolean {
  // 形式: "sha256=<hex>, t=<timestamp>"
  const parts = header.split(',').map((s) => s.trim())
  const hashPart = parts.find((p) => p.startsWith('sha256='))
  if (!hashPart) return false

  const expectedHash = hashPart.slice('sha256='.length)
  if (!expectedHash) return false

  const computed = createHmac('sha256', secret).update(rawBody).digest('hex')

  const a = Buffer.from(expectedHash)
  const b = Buffer.from(computed)

  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * 全ての issues/*.json をスキャンして、指定slugを含む号IDを返す
 */
async function findIssuesContainingSlug(
  issuesDir: string,
  targetSlug: string
): Promise<string[]> {
  const { readdir, readFile } = await import('node:fs/promises')
  const { join } = await import('node:path')

  try {
    const files = await readdir(issuesDir)
    const jsonFiles = files.filter((f) => f.endsWith('.json'))

    const matched: string[] = []
    for (const file of jsonFiles) {
      const raw = await readFile(join(issuesDir, file), 'utf-8')
      const issue = JSON.parse(raw) as {
        id: string
        pages: Record<string, Array<{ type: string; article?: string }>>
      }

      const found = Object.values(issue.pages).some((items) =>
        items.some((item) => item.type === 'article' && item.article === targetSlug)
      )

      if (found) {
        matched.push(issue.id)
      }
    }
    return matched
  } catch {
    return []
  }
}
