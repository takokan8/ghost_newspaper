import { describe, it, expect, vi, beforeEach } from 'vitest'
import webhookHandler, { verifyGhostSignature, extractPostPayload } from './ghost.post'

const mockRemoveItem = vi.fn()
const mockGetKeys = vi.fn()

let runtimeConfigValue = {
  ghostWebhookSecret: '',
  ghostUrl: 'https://ghost.example.com',
  ghostContentApiKey: 'test-key'
}

vi.mock('#imports', () => ({
  useStorage: () => ({
    removeItem: mockRemoveItem,
    getKeys: mockGetKeys
  }),
  useRuntimeConfig: () => runtimeConfigValue
}))

vi.mock('../../lib/ghostClient', () => ({
  createGhostClient: () => ({
    getPostsBySlugs: vi.fn()
  }),
  GhostApiError: class extends Error {}
}))

function createMockEvent(body: unknown, headers: Record<string, string> = {}) {
  return {
    node: { req: { headers, body } },
    context: {}
  } as any
}

vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readRawBody: async (event: any) => {
      if (!event.node.req.body) return null
      return JSON.stringify(event.node.req.body)
    },
    getHeader: (event: any, name: string) => event.node.req.headers[name.toLowerCase()],
    createError: ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) => {
      const err = new Error(statusMessage) as any
      err.statusCode = statusCode
      err.statusMessage = statusMessage
      return err
    }
  }
})

describe('verifyGhostSignature', () => {
  it('正しい署名を検証できる', () => {
    const secret = 'my-secret'
    const rawBody = '{"event":"post.published","post":{"current":{"slug":"test"}}}'

    const { createHmac } = require('node:crypto')
    const hash = createHmac('sha256', secret).update(rawBody).digest('hex')
    const header = `sha256=${hash}, t=1234567890`

    expect(verifyGhostSignature(rawBody, header, secret)).toBe(true)
  })

  it('不正な署名を拒否する', () => {
    const secret = 'my-secret'
    const rawBody = '{"event":"post.published"}'
    const header = 'sha256=invalidhash, t=1234567890'

    expect(verifyGhostSignature(rawBody, header, secret)).toBe(false)
  })

  it('sha256= がないヘッダーを拒否する', () => {
    const secret = 'my-secret'
    const rawBody = '{"event":"post.published"}'
    const header = 't=1234567890'

    expect(verifyGhostSignature(rawBody, header, secret)).toBe(false)
  })

  it('空のヘッダーを拒否する', () => {
    expect(verifyGhostSignature('body', '', 'secret')).toBe(false)
  })
})

describe('extractPostPayload', () => {
  it('形式A: post.current.slug を抽出する', () => {
    const bodyObj = {
      post: {
        current: { slug: 'hello-ghost', status: 'published' },
        previous: { slug: 'hello-ghost', status: 'draft' }
      }
    }
    const result = extractPostPayload(bodyObj)
    expect(result).toEqual({ slug: 'hello-ghost', status: 'published' })
  })

  it('形式B: post.slug を直接抽出する', () => {
    const bodyObj = {
      post: { slug: 'hello-ghost', status: 'published' }
    }
    const result = extractPostPayload(bodyObj)
    expect(result).toEqual({ slug: 'hello-ghost', status: 'published' })
  })

  it('post がない場合は null を返す', () => {
    const bodyObj = { event: 'post.published' }
    const result = extractPostPayload(bodyObj)
    expect(result).toBeNull()
  })

  it('post.current と post.slug の両方がない場合は null を返す', () => {
    const bodyObj = { post: { title: 'No slug' } }
    const result = extractPostPayload(bodyObj)
    expect(result).toBeNull()
  })
})

describe('POST /api/webhook/ghost', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    runtimeConfigValue = {
      ghostWebhookSecret: '',
      ghostUrl: 'https://ghost.example.com',
      ghostContentApiKey: 'test-key'
    }
  })

  // 注意: findIssuesContainingSlug は実際の ./data/issues をファイルシステムから
  // 読む実装のため、このテストのslugが data/issues/*.json 内の実データと
  // 衝突すると期待値が変わってしまう。「該当する号が見つからない」ケースを
  // 検証する目的なので、実データに存在しないことが明らかなslugを使う。
  it('形式Aのペイロードでキャッシュ無効化を実行する(該当号なし)', async () => {
    mockGetKeys.mockResolvedValue([])

    const event = createMockEvent({
      event: 'post.published',
      post: {
        current: { slug: 'unmatched-test-slug-a', status: 'published' },
        previous: { slug: 'unmatched-test-slug-a', status: 'draft' }
      }
    })

    const result = await webhookHandler(event)

    expect(result).toEqual({ success: true, invalidatedIssues: [] })
  })

  it('形式Bのペイロードでもキャッシュ無効化を実行する(該当号なし)', async () => {
    mockGetKeys.mockResolvedValue([])

    const event = createMockEvent({
      event: 'post.published',
      post: { slug: 'unmatched-test-slug-b', status: 'published' }
    })

    const result = await webhookHandler(event)

    expect(result).toEqual({ success: true, invalidatedIssues: [] })
  })

  it('空ボディは400を返す', async () => {
    const event = createMockEvent(null)

    await expect(webhookHandler(event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Empty request body'
    })
  })

  it('不正なJSONは400を返す', async () => {
    const event = {
      node: { req: { headers: {}, body: 'not-json' } },
      context: {}
    } as any

    await expect(webhookHandler(event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Invalid JSON body'
    })
  })

  it('postオブジェクトがない場合は400を返す', async () => {
    const event = createMockEvent({ event: 'post.published' })

    await expect(webhookHandler(event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Missing post object'
    })
  })

  it('slugがない場合は400を返す(形式Aでcurrent.slugなし)', async () => {
    const event = createMockEvent({
      event: 'post.published',
      post: {
        current: { status: 'published', title: 'No slug' }
      }
    })

    await expect(webhookHandler(event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Missing post slug'
    })
  })

  it('secretが設定されている場合、不正なシグネチャは401を返す', async () => {
    runtimeConfigValue = {
      ghostWebhookSecret: 'correct-secret',
      ghostUrl: 'https://ghost.example.com',
      ghostContentApiKey: 'test-key'
    }

    const event = createMockEvent(
      { event: 'post.published', post: { slug: 'a', status: 'published' } },
      { 'x-ghost-signature': 'wrong-signature' }
    )

    await expect(webhookHandler(event)).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  })

  it('secretが設定されている場合、正しい署名で通過する', async () => {
    const secret = 'correct-secret'
    const body = {
      event: 'post.published',
      post: {
        current: { slug: 'a', status: 'published' }
      }
    }
    const rawBody = JSON.stringify(body)

    const { createHmac } = require('node:crypto')
    const hash = createHmac('sha256', secret).update(rawBody).digest('hex')

    runtimeConfigValue = {
      ghostWebhookSecret: secret,
      ghostUrl: 'https://ghost.example.com',
      ghostContentApiKey: 'test-key'
    }

    mockGetKeys.mockResolvedValue([])

    const event = createMockEvent(body, {
      'x-ghost-signature': `sha256=${hash}, t=1234567890`
    })

    const result = await webhookHandler(event)

    expect(result).toEqual({ success: true, invalidatedIssues: [] })
  })

  it('data/issues 内の実データに一致するslugでは該当号がinvalidatedIssuesに含まれる', async () => {
    mockGetKeys.mockResolvedValue([])

    // data/issues/2026-08.json の 1面 に "hello-ghost" が含まれている前提
    const event = createMockEvent({
      event: 'post.published',
      post: { slug: 'hello-ghost', status: 'published' }
    })

    const result = await webhookHandler(event)

    expect(result).toEqual({ success: true, invalidatedIssues: ['2026-08'] })
  })
})
