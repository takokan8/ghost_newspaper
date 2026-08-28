import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getIssue, loadIssueFile, type GhostClient } from './getIssue'
import { IssueValidationError } from './validateIssue'
import type { GhostPost } from '../types/issue'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'issues-test-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

async function writeIssue(id: string, content: unknown) {
  await writeFile(join(dir, `${id}.json`), JSON.stringify(content), 'utf-8')
}

function makeGhostPost(slug: string): GhostPost {
  return {
    slug,
    title: `Title: ${slug}`,
    html: `<p>${slug}</p>`,
    published_at: '2026-08-01T00:00:00Z'
  }
}

describe('getIssue', () => {
  it('正常に記事をマージできる', async () => {
    await writeIssue('2026-08', {
      id: '2026-08',
      title: '2026年8月号',
      publishedAt: '2026-08-27',
      pages: {
        '1': [{ type: 'article', article: 'hello-ghost', layout: 'lead' }]
      }
    })

    const ghost: GhostClient = {
      getPostsBySlugs: vi.fn(async (slugs) => slugs.map(makeGhostPost))
    }

    const result = await getIssue(dir, '2026-08', ghost)

    expect(result.pages['1']).toHaveLength(1)
    expect(result.pages['1'][0]).toEqual({
      type: 'article',
      layout: 'lead',
      article: makeGhostPost('hello-ghost')
    })
  })

  it('複数記事を取得できる', async () => {
    await writeIssue('2026-08', {
      id: '2026-08',
      title: '2026年8月号',
      publishedAt: '2026-08-27',
      pages: {
        '1': [
          { type: 'article', article: 'post-a', layout: 'lead' },
          { type: 'article', article: 'post-b', layout: 'column' }
        ]
      }
    })

    const ghost: GhostClient = {
      getPostsBySlugs: vi.fn(async (slugs) => slugs.map(makeGhostPost))
    }

    const result = await getIssue(dir, '2026-08', ghost)
    expect(result.pages['1']).toHaveLength(2)
    expect(result.pages['1'].map((i) => i.article?.slug)).toEqual(['post-a', 'post-b'])
  })

  it('同じ記事が複数ページにあっても1回だけGhostへ問い合わせる', async () => {
    await writeIssue('2026-08', {
      id: '2026-08',
      title: '2026年8月号',
      publishedAt: '2026-08-27',
      pages: {
        '1': [{ type: 'article', article: 'interview', layout: 'lead' }],
        '8': [{ type: 'article', article: 'interview', layout: 'small' }]
      }
    })

    const getPostsBySlugs = vi.fn(async (slugs: string[]) => slugs.map(makeGhostPost))
    const ghost: GhostClient = { getPostsBySlugs }

    await getIssue(dir, '2026-08', ghost)

    expect(getPostsBySlugs).toHaveBeenCalledTimes(1)
    expect(getPostsBySlugs).toHaveBeenCalledWith(['interview'])
  })

  it('Ghostに存在しない記事はスキップされる', async () => {
    await writeIssue('2026-08', {
      id: '2026-08',
      title: '2026年8月号',
      publishedAt: '2026-08-27',
      pages: {
        '1': [
          { type: 'article', article: 'ok-post', layout: 'lead' },
          { type: 'article', article: 'deleted-post', layout: 'small' }
        ]
      }
    })

    const ghost: GhostClient = {
      getPostsBySlugs: vi.fn(async (slugs: string[]) =>
        slugs.filter((s) => s !== 'deleted-post').map(makeGhostPost)
      )
    }

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await getIssue(dir, '2026-08', ghost)

    expect(result.pages['1']).toHaveLength(1)
    expect(result.pages['1'][0].article?.slug).toBe('ok-post')

    warn.mockRestore()
  })

  it('欠損記事についてconsole.warnが呼ばれる', async () => {
    await writeIssue('2026-08', {
      id: '2026-08',
      title: '2026年8月号',
      publishedAt: '2026-08-27',
      pages: {
        '1': [{ type: 'article', article: 'deleted-post', layout: 'lead' }]
      }
    })

    const ghost: GhostClient = {
      getPostsBySlugs: vi.fn(async () => [])
    }

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await getIssue(dir, '2026-08', ghost)

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('article "deleted-post" not found in Ghost')
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('page=1 position=0'))

    warn.mockRestore()
  })

  it('ad/indexはGhost APIへ問い合わせない', async () => {
    await writeIssue('2026-08', {
      id: '2026-08',
      title: '2026年8月号',
      publishedAt: '2026-08-27',
      pages: {
        '1': [
          { type: 'ad', layout: 'half-page' },
          { type: 'index' }
        ]
      }
    })

    const getPostsBySlugs = vi.fn(async () => [])
    const ghost: GhostClient = { getPostsBySlugs }

    const result = await getIssue(dir, '2026-08', ghost)

    // slugが一つもないので空配列で呼ばれる(記事系が0件なため)
    expect(getPostsBySlugs).toHaveBeenCalledWith([])
    expect(result.pages['1']).toEqual([
      { type: 'ad', layout: 'half-page' },
      { type: 'index' }
    ])
  })

  it('articleとad/indexが混在していても、Ghostへはarticleのslugだけ渡す', async () => {
    await writeIssue('2026-08', {
      id: '2026-08',
      title: '2026年8月号',
      publishedAt: '2026-08-27',
      pages: {
        '1': [
          { type: 'ad', layout: 'half-page' },
          { type: 'article', article: 'article-a', layout: 'lead' },
          { type: 'index', target: 'article-b' },
          { type: 'article', article: 'article-c', layout: 'small' }
        ]
      }
    })

    const getPostsBySlugs = vi.fn(async (slugs: string[]) => slugs.map(makeGhostPost))
    const ghost: GhostClient = { getPostsBySlugs }

    const result = await getIssue(dir, '2026-08', ghost)

    expect(getPostsBySlugs).toHaveBeenCalledTimes(1)
    expect(getPostsBySlugs).toHaveBeenCalledWith(['article-a', 'article-c'])

    expect(result.pages['1']).toHaveLength(4)
    expect(result.pages['1'][0]).toEqual({ type: 'ad', layout: 'half-page' })
    expect(result.pages['1'][1].article?.slug).toBe('article-a')
    expect(result.pages['1'][2]).toEqual({ type: 'index' })
    expect(result.pages['1'][3].article?.slug).toBe('article-c')
  })

  it('空Issueでも動く', async () => {
    await writeIssue('2026-08', {
      id: '2026-08',
      title: '2026年8月号',
      publishedAt: '2026-08-27',
      pages: {}
    })

    const ghost: GhostClient = {
      getPostsBySlugs: vi.fn(async () => [])
    }

    const result = await getIssue(dir, '2026-08', ghost)
    expect(result.pages).toEqual({})
  })

  it('GhostClientが空配列を返しても動く(全記事欠損)', async () => {
    await writeIssue('2026-08', {
      id: '2026-08',
      title: '2026年8月号',
      publishedAt: '2026-08-27',
      pages: {
        '1': [{ type: 'article', article: 'ghost-gone', layout: 'lead' }]
      }
    })

    const ghost: GhostClient = {
      getPostsBySlugs: vi.fn(async () => [])
    }

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await getIssue(dir, '2026-08', ghost)

    expect(result.pages['1']).toEqual([])
    warn.mockRestore()
  })

  it('loadIssueFileのValidationErrorがそのまま伝播する', async () => {
    await writeIssue('2026-08', {
      id: '2026-09', // わざとファイル名と不一致
      title: '2026年8月号',
      publishedAt: '2026-08-27',
      pages: {}
    })

    const ghost: GhostClient = { getPostsBySlugs: vi.fn(async () => []) }

    await expect(getIssue(dir, '2026-08', ghost)).rejects.toThrow(IssueValidationError)
    await expect(getIssue(dir, '2026-08', ghost)).rejects.toThrow(/Issue ID mismatch/)
  })

  it('順序が維持される: GhostのAPI返却順に依存しない', async () => {
    await writeIssue('2026-08', {
      id: '2026-08',
      title: '2026年8月号',
      publishedAt: '2026-08-27',
      pages: {
        '1': [
          { type: 'article', article: 'article-a', layout: 'lead' },
          { type: 'article', article: 'article-b', layout: 'column' }
        ]
      }
    })

    // GhostがIssue側と逆順で返してくるケースを模擬
    const ghost: GhostClient = {
      getPostsBySlugs: vi.fn(async () => [
        makeGhostPost('article-b'),
        makeGhostPost('article-a')
      ])
    }

    const result = await getIssue(dir, '2026-08', ghost)

    expect(result.pages['1'].map((i) => i.article?.slug)).toEqual([
      'article-a',
      'article-b'
    ])
  })
})

describe('loadIssueFile', () => {
  it('正常なJSONを読み込める', async () => {
    await writeIssue('2026-08', {
      id: '2026-08',
      title: '2026年8月号',
      publishedAt: '2026-08-27',
      pages: {}
    })
    const issue = await loadIssueFile(dir, '2026-08')
    expect(issue.id).toBe('2026-08')
  })
})

describe('loadIssueFile: ファイル未存在', () => {
  it('存在しないissueIdを渡すとENOENTエラーになる', async () => {
    const ghost: GhostClient = { getPostsBySlugs: vi.fn(async () => []) }

    await expect(getIssue(dir, 'nonexistent-issue', ghost)).rejects.toMatchObject({
      code: 'ENOENT'
    })
  })

  it('IssueValidationErrorとENOENTを区別できる', async () => {
    // 壊れたJSON(idファイル名不一致)のケース
    await writeIssue('broken', {
      id: 'wrong-id',
      title: 'x',
      publishedAt: '2026-08-01',
      pages: {}
    })
    const ghost: GhostClient = { getPostsBySlugs: vi.fn(async () => []) }

    // ファイルは存在するのでENOENTにはならず、Validationエラーになる
    await expect(getIssue(dir, 'broken', ghost)).rejects.not.toMatchObject({
      code: 'ENOENT'
    })
    await expect(getIssue(dir, 'broken', ghost)).rejects.toThrow(IssueValidationError)
  })
})
