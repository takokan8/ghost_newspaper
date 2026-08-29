import type { GhostClient } from './getIssue'
import type { GhostPost } from '../types/issue'

/**
 * Ghost未接続の開発・確認用モッククライアント
 *
 * 実際のGhost APIには一切問い合わせず、要求されたslugに対して
 * それらしい記事データを合成して返す。
 *
 * issues.json の読み込み・バリデーション・マージ処理(getIssue.ts)は
 * 本物のロジックをそのまま通すため、issues.json のスキーマ検証や
 * レイアウト解決の確認もこの状態で行える。
 *
 * 使用方法: server/api/issue/[id].get.ts で
 *   MOCK_GHOST=true の場合にこちらを使う
 */
export function createMockGhostClient(): GhostClient {
  return {
    async getPostsBySlugs(slugs: string[]): Promise<GhostPost[]> {
      return slugs.map(slugToMockPost)
    }
  }
}

function slugToMockPost(slug: string): GhostPost {
  return {
    slug,
    title: slugToTitle(slug),
    html: `<p>これは "${slug}" のモック本文です。実際のGhost記事に接続すると、ここに本物の本文が入ります。</p><p>2段落目のダミーテキストです。</p>`,
    excerpt: `"${slug}" のモック抜粋です。`,
    feature_image: `https://picsum.photos/seed/${encodeURIComponent(slug)}/800/400`,
    published_at: '2026-08-01T00:00:00Z',
    authors: [{ name: 'モック著者', slug: 'mock-author' }],
    tags: [{ name: 'モック', slug: 'mock' }]
  }
}

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
