<script setup lang="ts">
import type { MergedIssueItem } from '~/types/issue'

const props = defineProps<{
  items: MergedIssueItem[]
}>()

const componentMap: Record<string, string> = {
  lead: 'ArticleLead',
  column: 'ArticleColumn',
  small: 'ArticleSmall',
  ad: 'AdPlaceholder',
  index: 'IndexPlaceholder'
}

function resolveComponentName(item: MergedIssueItem): string {
  if (item.type === 'article') {
    return componentMap[item.layout ?? 'column'] ?? 'ArticleColumn'
  }
  return componentMap[item.type] ?? 'ArticleColumn'
}
</script>

<template>
  <div class="page-renderer">
    <component
      :is="resolveComponentName(item)"
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
