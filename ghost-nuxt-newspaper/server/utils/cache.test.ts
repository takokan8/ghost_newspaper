import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invalidateIssueCache, invalidateAllIssueCache, getCacheKeys } from './cache'

const mockStorage = {
  removeItem: vi.fn(),
  getKeys: vi.fn()
}

vi.mock('#imports', () => ({
  useStorage: () => mockStorage
}))

describe('cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('invalidateIssueCache', () => {
    it('コロン区切りのキー形式で issueId を削除する', async () => {
      mockStorage.getKeys.mockResolvedValue([
        'nitro:routes:issue:2026-08.json',
        'nitro:routes:issue:2026-09.json',
        'nitro:routes:_nuxt:something'
      ])

      await invalidateIssueCache('2026-08')

      expect(mockStorage.getKeys).toHaveBeenCalledWith('nitro:routes')
      expect(mockStorage.removeItem).toHaveBeenCalledTimes(1)
      expect(mockStorage.removeItem).toHaveBeenCalledWith('nitro:routes:issue:2026-08.json')
    })

    it('スラッシュ区切りのキー形式でも削除する', async () => {
      mockStorage.getKeys.mockResolvedValue([
        'nitro:routes/issue/2026-08.json',
        'nitro:routes/issue/2026-09.json'
      ])

      await invalidateIssueCache('2026-08')

      expect(mockStorage.removeItem).toHaveBeenCalledTimes(1)
      expect(mockStorage.removeItem).toHaveBeenCalledWith('nitro:routes/issue/2026-08.json')
    })

    it('キーが見つからない場合は削除しない', async () => {
      mockStorage.getKeys.mockResolvedValue([
        'nitro:routes:issue:2026-09.json'
      ])

      await invalidateIssueCache('2026-08')

      expect(mockStorage.removeItem).not.toHaveBeenCalled()
    })

    it('複数のキーがマッチした場合はすべて削除する', async () => {
      mockStorage.getKeys.mockResolvedValue([
        'nitro:routes:issue:2026-08.json',
        'nitro:routes:issue:2026-08:variant.json'
      ])

      await invalidateIssueCache('2026-08')

      expect(mockStorage.removeItem).toHaveBeenCalledTimes(2)
    })

    it('コロンとスラッシュが混在していてもマッチするものを削除する', async () => {
      mockStorage.getKeys.mockResolvedValue([
        'nitro:routes:issue:2026-08.json',
        'nitro:routes/issue/2026-08/prerender.json'
      ])

      await invalidateIssueCache('2026-08')

      expect(mockStorage.removeItem).toHaveBeenCalledTimes(2)
    })

    it('myissue:2026-08 のような誤マッチはしない', async () => {
      mockStorage.getKeys.mockResolvedValue([
        'nitro:routes:myissue:2026-08.json',
        'nitro:routes:issue:2026-09.json'
      ])

      await invalidateIssueCache('2026-08')

      expect(mockStorage.removeItem).not.toHaveBeenCalled()
    })

    it('issue2026-08 のような区切りなしはマッチしない', async () => {
      mockStorage.getKeys.mockResolvedValue([
        'nitro:routes:issue2026-08.json'
      ])

      await invalidateIssueCache('2026-08')

      expect(mockStorage.removeItem).not.toHaveBeenCalled()
    })
  })

  describe('invalidateAllIssueCache', () => {
    it('コロン区切りの issue キーをすべて削除する', async () => {
      mockStorage.getKeys.mockResolvedValue([
        'nitro:routes:issue:2026-08.json',
        'nitro:routes:issue:2026-09.json',
        'nitro:routes:_nuxt:something'
      ])

      await invalidateAllIssueCache()

      expect(mockStorage.getKeys).toHaveBeenCalledWith('nitro:routes')
      expect(mockStorage.removeItem).toHaveBeenCalledTimes(2)
      expect(mockStorage.removeItem).toHaveBeenCalledWith('nitro:routes:issue:2026-08.json')
      expect(mockStorage.removeItem).toHaveBeenCalledWith('nitro:routes:issue:2026-09.json')
    })

    it('スラッシュ区切りの issue キーも削除する', async () => {
      mockStorage.getKeys.mockResolvedValue([
        'nitro:routes/issue/2026-08.json',
        'nitro:routes/issue/2026-09.json',
        'nitro:routes/_nuxt/something'
      ])

      await invalidateAllIssueCache()

      expect(mockStorage.removeItem).toHaveBeenCalledTimes(2)
    })

    it('issue キーがない場合は何も削除しない', async () => {
      mockStorage.getKeys.mockResolvedValue([
        'nitro:routes:_nuxt:something'
      ])

      await invalidateAllIssueCache()

      expect(mockStorage.removeItem).not.toHaveBeenCalled()
    })

    it('myissue: のような誤マッチはしない', async () => {
      mockStorage.getKeys.mockResolvedValue([
        'nitro:routes:myissue:2026-08.json',
        'nitro:routes:other:something'
      ])

      await invalidateAllIssueCache()

      expect(mockStorage.removeItem).not.toHaveBeenCalled()
    })
  })

  describe('getCacheKeys', () => {
    it('全storageキーを返す', async () => {
      mockStorage.getKeys.mockResolvedValue([
        'nitro:routes:issue:2026-08.json'
      ])

      const keys = await getCacheKeys()
      expect(keys).toEqual(['nitro:routes:issue:2026-08.json'])
    })
  })
})
