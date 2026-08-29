import { getIssue } from '../../../lib/getIssue'
import { createGhostClient } from '../../../lib/ghostClient'
import { createMockGhostClient } from '../../../lib/mockGhostClient'
import { IssueValidationError } from '../../../lib/validateIssue'
import type { GhostClient } from '../../../lib/getIssue'

// MOCK_GHOST=true の場合、実際のGhost APIには問い合わせず
// 合成データを返すモッククライアントを使う。
// issues.json の読み込み・バリデーション・マージ処理(getIssue)は
// 通常通り本物のロジックが動くため、レイアウト確認や紙面構成の
// 動作確認をGhost未接続の状態でも行える。
const useMock = process.env.MOCK_GHOST === 'true'

const ghost: GhostClient = useMock
  ? createMockGhostClient()
  : createGhostClient({
      url: useRuntimeConfig().ghostUrl,
      contentApiKey: useRuntimeConfig().ghostContentApiKey
    })

const ISSUES_DIR = './data/issues'

// Phase 1: 号IDはYYYY-MM形式のみ許可。将来「臨時号」等が必要になったら
// この正規表現を緩める(例: `^\d{4}-\d{2}(-\w+)?$`)だけで拡張できる
const ISSUE_ID_RE = /^\d{4}-\d{2}$/

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id || !ISSUE_ID_RE.test(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid issue id (expected format: YYYY-MM)'
    })
  }

  try {
    const issue = await getIssue(ISSUES_DIR, id, ghost)
    if (useMock) {
      console.warn(`[MOCK_GHOST] Issue "${id}" served with synthetic article data`)
    }
    return issue
  } catch (err) {
    if (err instanceof IssueValidationError) {
      // データ不整合はサーバーエラー(500)。クライアント起因ではないため404にしない
      console.error(`[ERROR] Issue validation failed for "${id}": ${err.message}`)
      throw createError({ statusCode: 500, statusMessage: 'Issue data is invalid' })
    }
    if (
      err instanceof Error &&
      'code' in err &&
      (err as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      throw createError({ statusCode: 404, statusMessage: `Issue "${id}" not found` })
    }
    throw err
  }
})
