import { describe, it, expect, vi, afterEach } from 'vitest'
import { createGhostClient, GhostApiError } from './ghostClient'

const originalFetch = global.fetch

afterEach(() => {
  global.fetch = originalFetch
  vi.restoreAllMocks()
})

function mockFetchOnce(response: {
  ok: boolean
  status?: number
  statusText?: string
  json?: unknown
  text?: string
}) {
  global.fetch = vi.fn(async () => ({
    ok: response.ok,
    status: response.status ?? 200,
    statusText: response.statusText ?? 'OK',
    json: async () => response.json,
    text: async () => response.text ?? ''
  })) as unknown as typeof fetch
}

describe('createGhostClient', () => {
  it('slugsが空なら fetch を呼ばない', async () => {
    global.fetch = vi.fn()
    const client = createGhostClient({ url: 'https://example.com', contentApiKey: 'key123' })

    const result = await client.getPostsBySlugs([])

    expect(result).toEqual([])
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('正しいURLとクエリパラメータでfetchする', async () => {
    mockFetchOnce({ ok: true, json: { posts: [] } })
    const client = createGhostClient({ url: 'https://example.com', contentApiKey: 'key123' })

    await client.getPostsBySlugs(['article-a', 'article-c'])

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const calledUrl = new URL((global.fetch as any).mock.calls[0][0])

    expect(calledUrl.origin + calledUrl.pathname).toBe(
      'https://example.com/ghost/api/content/posts/'
    )
    expect(calledUrl.searchParams.get('key')).toBe('key123')
    expect(calledUrl.searchParams.get('filter')).toBe('slug:[article-a,article-c]')
    expect(calledUrl.searchParams.get('include')).toBe('authors,tags')
    expect(calledUrl.searchParams.get('limit')).toBe('all')
  })

  it('レスポンスをGhostPost型にマッピングする', async () => {
    mockFetchOnce({
      ok: true,
      json: {
        posts: [
          {
            slug: 'hello-ghost',
            title: 'Hello Ghost',
            html: '<p>hi</p>',
            excerpt: 'hi excerpt',
            feature_image: 'https://example.com/img.jpg',
            published_at: '2026-08-01T00:00:00Z',
            authors: [{ name: 'Tanaka', slug: 'tanaka' }],
            tags: [{ name: 'News', slug: 'news' }]
          }
        ]
      }
    })
    const client = createGhostClient({ url: 'https://example.com', contentApiKey: 'key123' })

    const result = await client.getPostsBySlugs(['hello-ghost'])

    expect(result).toEqual([
      {
        slug: 'hello-ghost',
        title: 'Hello Ghost',
        html: '<p>hi</p>',
        excerpt: 'hi excerpt',
        feature_image: 'https://example.com/img.jpg',
        published_at: '2026-08-01T00:00:00Z',
        authors: [{ name: 'Tanaka', slug: 'tanaka' }],
        tags: [{ name: 'News', slug: 'news' }]
      }
    ])
  })

  it('feature_imageがnullならundefinedにする', async () => {
    mockFetchOnce({
      ok: true,
      json: {
        posts: [
          {
            slug: 'no-image',
            title: 'No Image',
            html: '<p>x</p>',
            feature_image: null,
            published_at: '2026-08-01T00:00:00Z'
          }
        ]
      }
    })
    const client = createGhostClient({ url: 'https://example.com', contentApiKey: 'key123' })

    const result = await client.getPostsBySlugs(['no-image'])

    expect(result[0].feature_image).toBeUndefined()
  })

  it('HTTPエラー時にGhostApiErrorを投げる', async () => {
    mockFetchOnce({ ok: false, status: 500, statusText: 'Internal Server Error', text: 'boom' })
    const client = createGhostClient({ url: 'https://example.com', contentApiKey: 'key123' })

    await expect(client.getPostsBySlugs(['a'])).rejects.toThrow(GhostApiError)
    await expect(client.getPostsBySlugs(['a'])).rejects.toThrow(/500/)
  })

  it('slugにカンマや角括弧が含まれる場合はエラー', async () => {
    global.fetch = vi.fn()
    const client = createGhostClient({ url: 'https://example.com', contentApiKey: 'key123' })

    await expect(client.getPostsBySlugs(['bad,slug'])).rejects.toThrow(GhostApiError)
    await expect(client.getPostsBySlugs(['bad[slug]'])).rejects.toThrow(GhostApiError)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
