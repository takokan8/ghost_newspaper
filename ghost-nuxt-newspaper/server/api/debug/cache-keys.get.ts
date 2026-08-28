import { defineEventHandler } from 'h3'
import { getCacheKeys } from '../../utils/cache'

/**
 * デバッグ用: ISRキャッシュのstorageキー一覧を返す
 *
 * Vercelデプロイ後に /api/debug/cache-keys にアクセスして、
 * 実際のNitro storage key形式を確認する。
 *
 * 本番ではこのエンドポイントを保護・削除すること。
 */
export default defineEventHandler(async () => {
  const keys = await getCacheKeys()
  return {
    storageKeyPrefix: 'nitro:routes',
    totalKeys: keys.length,
    issueKeys: keys.filter((k) => k.includes(':issue:') || k.includes('/issue/')),
    allKeys: keys
  }
})
