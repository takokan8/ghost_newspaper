import { readFile } from 'node:fs/promises'
import { validateIssue } from './validateIssue'
import type {
  IssueSchema,
  IssueItem,
  MergedIssue,
  MergedIssueItem,
  GhostPost
} from '../types/issue'

export interface GhostClient {
  getPostsBySlugs(slugs: string[]): Promise<GhostPost[]>
}

export async function loadIssueFile(
  issuesDir: string,
  issueId: string
): Promise<IssueSchema> {
  const raw = await readFile(`${issuesDir}/${issueId}.json`, 'utf-8')
  const parsed = JSON.parse(raw)
  return validateIssue(parsed, issueId)
}

function collectArticleSlugs(issue: IssueSchema): string[] {
  const slugs = new Set<string>()
  for (const items of Object.values(issue.pages)) {
    for (const item of items) {
      if (item.type === 'article') slugs.add(item.article)
    }
  }
  return [...slugs]
}

function mergeItem(
  item: IssueItem,
  postMap: Map<string, GhostPost>,
  context: { issueId: string; pageNum: string; position: number }
): MergedIssueItem | null {
  if (item.type !== 'article') {
    // FutureItem: layoutはオプショナルなので、存在する場合だけ含める
    const layout = typeof item.layout === 'string' ? item.layout : undefined
    return {
      type: item.type,
      ...(layout !== undefined ? { layout } : {})
    }
  }

  const post = postMap.get(item.article)
  if (!post) {
    console.warn(
      `[WARN] Issue ${context.issueId}: article "${item.article}" not found in Ghost (page=${context.pageNum} position=${context.position})`
    )
    return null
  }
  return { type: 'article', layout: item.layout, article: post }
}

export async function getIssue(
  issuesDir: string,
  issueId: string,
  ghost: GhostClient
): Promise<MergedIssue> {
  const issue = await loadIssueFile(issuesDir, issueId)
  const slugs = collectArticleSlugs(issue)
  const posts = await ghost.getPostsBySlugs(slugs)
  const postMap = new Map(posts.map((p) => [p.slug, p]))

  const mergedPages: MergedIssue['pages'] = {}
  for (const [pageNum, items] of Object.entries(issue.pages)) {
    mergedPages[pageNum] = items
      .map((item, position) =>
        mergeItem(item, postMap, { issueId: issue.id, pageNum, position })
      )
      .filter((x): x is MergedIssueItem => x !== null)
  }

  return {
    id: issue.id,
    title: issue.title,
    publishedAt: issue.publishedAt,
    pages: mergedPages
  }
}
