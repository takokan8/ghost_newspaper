<script setup lang="ts">
import type { Component } from 'vue'
import type { MergedIssueItem } from '~/types/issue'
import ArticleLead from './ArticleLead.vue'
import ArticleColumn from './ArticleColumn.vue'
import ArticleSmall from './ArticleSmall.vue'
import AdPlaceholder from './AdPlaceholder.vue'
import IndexPlaceholder from './IndexPlaceholder.vue'

const props = defineProps<{
  items: MergedIssueItem[]
}>()

// 文字列名ではなく、実際にimportしたコンポーネント定義をマップする。
// Nuxtのコンポーネント自動インポートは <component :is="文字列"> のような
// 動的参照を解決できない(テンプレート内の静的タグしか検出しないため)。
// 明示的にimportし、コンポーネントオブジェクトそのものをマップの値にすることで
// 実行時にも確実に解決できるようにする。
const componentMap: Record<string, Component> = {
  lead: ArticleLead,
  column: ArticleColumn,
  small: ArticleSmall,
  ad: AdPlaceholder,
  index: IndexPlaceholder
}

function resolveComponent(item: MergedIssueItem): Component {
  if (item.type === 'article') {
    return componentMap[item.layout ?? 'column'] ?? ArticleColumn
  }
  return componentMap[item.type] ?? ArticleColumn
}
</script>

<template>
  <div class="page-renderer">
    <component
      :is="resolveComponent(item)"
      v-for="(item, index) in items"
      :key="index"
      :item="item"
    />
  </div>
</template>

<style scoped>
.page-renderer {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1rem;
  align-items: start;
}
</style>
