import { describe, it, expect } from 'vitest'
import { validateIssue, IssueValidationError } from './validateIssue'

const baseValid = {
  id: '2026-08',
  title: '2026年8月号',
  publishedAt: '2026-08-27',
  pages: {
    '1': [{ type: 'article', article: 'hello-ghost', layout: 'lead' }]
  }
}

describe('validateIssue: 正常系', () => {
  it('正常なIssueを受け付ける', () => {
    expect(() => validateIssue(baseValid, '2026-08')).not.toThrow()
  })

  it('pagesが複数ある', () => {
    const issue = {
      ...baseValid,
      pages: {
        '1': [{ type: 'article', article: 'a', layout: 'lead' }],
        '2': [{ type: 'article', article: 'b', layout: 'column' }]
      }
    }
    expect(() => validateIssue(issue, '2026-08')).not.toThrow()
  })

  it.each(['1', '2', '10'])('ページ番号が %s でもOK', (pageNum) => {
    const issue = {
      ...baseValid,
      pages: { [pageNum]: [{ type: 'article', article: 'a', layout: 'lead' }] }
    }
    expect(() => validateIssue(issue, '2026-08')).not.toThrow()
  })

  it.each(['lead', 'column', 'small'])('article / %s', (layout) => {
    const issue = {
      ...baseValid,
      pages: { '1': [{ type: 'article', article: 'a', layout }] }
    }
    expect(() => validateIssue(issue, '2026-08')).not.toThrow()
  })

  it.each(['ad', 'index'])('未実装の %s も構造的に受け付ける', (type) => {
    const issue = {
      ...baseValid,
      pages: { '1': [{ type }] } // layoutなどは一切なくてもOK
    }
    expect(() => validateIssue(issue, '2026-08')).not.toThrow()
  })
})

describe('validateIssue: 異常系', () => {
  it('JSONがobjectではない', () => {
    expect(() => validateIssue('not an object', '2026-08')).toThrow(IssueValidationError)
    expect(() => validateIssue(null, '2026-08')).toThrow(IssueValidationError)
    expect(() => validateIssue([1, 2, 3], '2026-08')).toThrow(IssueValidationError)
  })

  it('idがない', () => {
    const { id, ...rest } = baseValid
    expect(() => validateIssue(rest, '2026-08')).toThrow(/Issue.id must be/)
  })

  it('filenameとidが違う', () => {
    expect(() => validateIssue(baseValid, '2026-09')).toThrow(/Issue ID mismatch/)
  })

  it('titleがない', () => {
    const { title, ...rest } = baseValid
    expect(() => validateIssue(rest, '2026-08')).toThrow(/Issue.title must be/)
  })

  it('publishedAtがない', () => {
    const { publishedAt, ...rest } = baseValid
    expect(() => validateIssue(rest, '2026-08')).toThrow(/Issue.publishedAt must be/)
  })

  it('pagesがない', () => {
    const { pages, ...rest } = baseValid
    expect(() => validateIssue(rest, '2026-08')).toThrow(/Issue.pages must be/)
  })

  it('page番号が "0"', () => {
    const issue = { ...baseValid, pages: { '0': [] } }
    expect(() => validateIssue(issue, '2026-08')).toThrow(/Page key must be/)
  })

  it('page番号が "01"', () => {
    const issue = { ...baseValid, pages: { '01': [] } }
    expect(() => validateIssue(issue, '2026-08')).toThrow(/Page key must be/)
  })

  it('page番号が "abc"', () => {
    const issue = { ...baseValid, pages: { abc: [] } }
    expect(() => validateIssue(issue, '2026-08')).toThrow(/Page key must be/)
  })

  it('itemsがarrayではない', () => {
    const issue = { ...baseValid, pages: { '1': { type: 'article' } } }
    expect(() => validateIssue(issue, '2026-08')).toThrow(/must be an array/)
  })

  it('itemがobjectではない', () => {
    const issue = { ...baseValid, pages: { '1': ['not an object'] } }
    expect(() => validateIssue(issue, '2026-08')).toThrow(/item must be an object/)
  })

  it('typeがない', () => {
    const issue = { ...baseValid, pages: { '1': [{ article: 'a', layout: 'lead' }] } }
    expect(() => validateIssue(issue, '2026-08')).toThrow(/type must be/)
  })

  it('typeが未知の値', () => {
    const issue = {
      ...baseValid,
      pages: { '1': [{ type: 'articel', article: 'a', layout: 'lead' }] }
    }
    expect(() => validateIssue(issue, '2026-08')).toThrow(/unknown type/)
  })

  it('layoutがない(article)', () => {
    const issue = { ...baseValid, pages: { '1': [{ type: 'article', article: 'a' }] } }
    expect(() => validateIssue(issue, '2026-08')).toThrow(/requires "layout"/)
  })

  it('articleなのにslugがない', () => {
    const issue = { ...baseValid, pages: { '1': [{ type: 'article', layout: 'lead' }] } }
    expect(() => validateIssue(issue, '2026-08')).toThrow(/requires non-empty "article"/)
  })

  it('articleなのに不正なlayout', () => {
    const issue = {
      ...baseValid,
      pages: { '1': [{ type: 'article', article: 'a', layout: 'huge' }] }
    }
    expect(() => validateIssue(issue, '2026-08')).toThrow(/invalid layout/)
  })
})
