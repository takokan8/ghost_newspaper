import { useStorage } from '#imports'

/**
 * ISRキャッシュを無効化するユーティリティ
 *
 * WARNING: Nitroのstorage key形式は環境(Vercel/Node/etc)とstorage driverによって変わる。
 * 確認された形式の例:
 *   - コロン区切り: "nitro:routes:issue:2026-08.json"
 *   - スラッシュ区切り: "nitro:routes/issue/2026-08.json"
 *
 * 本番デプロイ後、/api/debug/cache-keys で実際の形式を確認すること。
 */

/**
 * issueId を含むキーかどうかを判定する
 * 誤マッチを防ぐため、区切り文字(: または /)を含めたパターンで検索する
 */
function matchesIssueId(key: string, issueId: string): boolean {
  // コロン区切り: ":issue:2026-08" が現れる
  // スラッシュ区切り: "/issue/2026-08" が現れる
  // "myissue:2026-08" のような誤マッチを防ぐため、区切り文字を含めたパターンを使う
  const colonPattern = `:issue:${issueId}`
  const slashPattern = `/issue/${issueId}`
  return key.includes(colonPattern) || key.includes(slashPattern)
}

/**
 * 特定の号ページのISRキャッシュを削除する
 */
export async function invalidateIssueCache(issueId: string): Promise<void> {
  const storage = useStorage()
  const keys = await storage.getKeys('nitro:routes')

  const targetKeys = keys.filter((k) => matchesIssueId(k, issueId))

  if (targetKeys.length === 0) {
    console.warn(`[cache] No cache keys found for issue "${issueId}"`)
    console.warn(`[cache] Available keys: ${keys.join(', ')}`)
    return
  }

  await Promise.all(targetKeys.map((k) => storage.removeItem(k)))
  console.log(`[cache] Invalidated keys: ${targetKeys.join(', ')}`)
}

/**
 * 全号ページのISRキャッシュを削除する
 */
export async function invalidateAllIssueCache(): Promise<void> {
  const storage = useStorage()
  const keys = await storage.getKeys('nitro:routes')
  // :issue: または /issue/ を含むキーを対象とする
  const issueKeys = keys.filter((k) => k.includes(':issue:') || k.includes('/issue/'))

  if (issueKeys.length === 0) {
    console.warn('[cache] No issue cache keys found')
    console.warn(`[cache] Available keys: ${keys.join(', ')}`)
    return
  }

  await Promise.all(issueKeys.map((k) => storage.removeItem(k)))
  console.log(`[cache] Invalidated ${issueKeys.length} issue keys`)
}

/**
 * デバッグ用: 現在のstorageキー一覧を返す
 */
export async function getCacheKeys(): Promise<string[]> {
  const storage = useStorage()
  return storage.getKeys('nitro:routes')
}
