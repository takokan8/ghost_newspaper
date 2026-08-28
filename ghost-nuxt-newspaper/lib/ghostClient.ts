import type { GhostClient } from './getIssue'
import type { GhostPost } from '../types/issue'

interface GhostClientConfig {
  url: string // 例: "https://your-ghost.example.com"
  contentApiKey: string
}

interface GhostContentApiResponse {
  posts: Array<{
    slug: string
    title: string
    html: string
    excerpt?: string
    feature_image?: string | null
    published_at: string
    authors?: Array<{ name: string; slug: string }>
    tags?: Array<{ name: string; slug: string }>
  }>
}

export class GhostApiError extends Error {}

export function createGhostClient(config: GhostClientConfig): GhostClient {
  return {
    async getPostsBySlugs(slugs: string[]): Promise<GhostPost[]> {
      if (slugs.length === 0) return []

      // Ghost Content APIのfilter構文: slug:[a,b,c]
      // slugにカンマや角括弧を含む値は仕様上あり得ないが、念のためエンコードする
      const filter = `slug:[${slugs.map(encodeFilterValue).join(',')}]`

      const url = new URL(`${config.url}/ghost/api/content/posts/`)
      url.searchParams.set('key', config.contentApiKey)
      url.searchParams.set('filter', filter)
      url.searchParams.set('include', 'authors,tags')
      url.searchParams.set('limit', 'all')

      const res = await fetch(url.toString())
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new GhostApiError(
          `Ghost Content API request failed: ${res.status} ${res.statusText} ${body}`
        )
      }

      const data = (await res.json()) as GhostContentApiResponse
      return data.posts.map(toGhostPost)
    }
  }
}

function encodeFilterValue(slug: string): string {
  // Ghost NQL(Node Query Language)のfilter構文上、カンマ・角括弧は区切り文字として
  // 意味を持つため、slugにこれらが混入するケースを想定しエラーとして早期検出する
  if (/[,\[\]]/.test(slug)) {
    throw new GhostApiError(`Invalid slug for Ghost filter: "${slug}"`)
  }
  return slug
}

function toGhostPost(raw: GhostContentApiResponse['posts'][number]): GhostPost {
  return {
    slug: raw.slug,
    title: raw.title,
    html: raw.html,
    excerpt: raw.excerpt,
    feature_image: raw.feature_image ?? undefined,
    published_at: raw.published_at,
    authors: raw.authors,
    tags: raw.tags
  }
}
