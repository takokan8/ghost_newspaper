import type { IssueSchema } from '../types/issue'

export class IssueValidationError extends Error {}

const KNOWN_TYPES = ['article', 'ad', 'index']
const VALID_LAYOUTS = ['lead', 'column', 'small']
const PAGE_KEY_RE = /^[1-9][0-9]*$/

export function validateIssue(raw: unknown, expectedId: string): IssueSchema {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new IssueValidationError('Issue must be an object')
  }
  const obj = raw as Record<string, unknown>

  if (typeof obj.id !== 'string' || obj.id.length === 0) {
    throw new IssueValidationError('Issue.id must be a non-empty string')
  }
  if (obj.id !== expectedId) {
    throw new IssueValidationError(
      `Issue ID mismatch: filename=${expectedId} id=${obj.id}`
    )
  }
  if (typeof obj.title !== 'string' || obj.title.length === 0) {
    throw new IssueValidationError('Issue.title must be a non-empty string')
  }
  if (typeof obj.publishedAt !== 'string' || obj.publishedAt.length === 0) {
    throw new IssueValidationError('Issue.publishedAt must be a non-empty string')
  }
  if (typeof obj.pages !== 'object' || obj.pages === null || Array.isArray(obj.pages)) {
    throw new IssueValidationError('Issue.pages must be an object')
  }

  const pages = obj.pages as Record<string, unknown>
  for (const [pageNum, items] of Object.entries(pages)) {
    if (!PAGE_KEY_RE.test(pageNum)) {
      throw new IssueValidationError(
        `Page key must be a 1-indexed, non-zero-padded string (e.g. "1", "10"): got "${pageNum}"`
      )
    }
    if (!Array.isArray(items)) {
      throw new IssueValidationError(`Page "${pageNum}" must be an array`)
    }
    items.forEach((item, i) => validateIssueItem(item, pageNum, i))
  }

  return obj as unknown as IssueSchema
}

function validateIssueItem(item: unknown, pageNum: string, index: number): void {
  const loc = `page ${pageNum}, item ${index}`
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    throw new IssueValidationError(`${loc}: item must be an object`)
  }
  const obj = item as Record<string, unknown>

  if (typeof obj.type !== 'string' || obj.type.length === 0) {
    throw new IssueValidationError(`${loc}: type must be a non-empty string`)
  }
  if (!KNOWN_TYPES.includes(obj.type)) {
    throw new IssueValidationError(`${loc}: unknown type "${obj.type}"`)
  }

  if (obj.type === 'article') {
    if (typeof obj.article !== 'string' || obj.article.length === 0) {
      throw new IssueValidationError(
        `${loc}: article-type item requires non-empty "article" slug`
      )
    }
    if (typeof obj.layout !== 'string') {
      throw new IssueValidationError(`${loc}: article-type item requires "layout"`)
    }
    if (!VALID_LAYOUTS.includes(obj.layout)) {
      throw new IssueValidationError(
        `${loc}: invalid layout "${obj.layout}" (must be one of ${VALID_LAYOUTS.join(', ')})`
      )
    }
    return
  }

  // ad / index: typeが既知であること以外は何も要求しない(Phase 1では構造未確定)
}
