export type ArticleItem = {
  type: 'article'
  article: string // Ghost slug
  layout: 'lead' | 'column' | 'small'
}

export type FutureItem = {
  type: 'ad' | 'index'
  [key: string]: unknown // layoutを含め、内容は未確定なので自由
}

export type IssueItem = ArticleItem | FutureItem

export interface IssueSchema {
  id: string
  title: string
  publishedAt: string
  pages: Record<string, IssueItem[]>
}

export interface GhostPost {
  slug: string
  title: string
  html: string
  excerpt?: string
  feature_image?: string
  published_at: string
  authors?: { name: string; slug: string }[]
  tags?: { name: string; slug: string }[]
}

export interface MergedIssueItem {
  type: string
  layout?: string
  article?: GhostPost
}

export interface MergedIssue {
  id: string
  title: string
  publishedAt: string
  pages: Record<string, MergedIssueItem[]>
}
