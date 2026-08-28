<script setup lang="ts">
import type { MergedIssueItem } from '~/types/issue'

const props = defineProps<{
  item: MergedIssueItem
}>()

const article = computed(() => props.item.article)
</script>

<template>
  <article v-if="article" class="article-small">
    <h4 class="small-title">
      <NuxtLink :to="`/article/${article.slug}`">
        {{ article.title }}
      </NuxtLink>
    </h4>
    <div v-if="article.excerpt" class="small-excerpt">
      {{ article.excerpt }}
    </div>
  </article>
</template>

<style scoped>
.article-small {
  grid-column: span 12;
  padding: 0.75rem 0;
  border-bottom: 1px solid #eee;
}
@media (min-width: 640px) {
  .article-small {
    grid-column: span 4;
  }
}
.small-title {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
  line-height: 1.4;
}
.small-title a {
  color: #1a1a1a;
  text-decoration: none;
}
.small-title a:hover {
  color: #c41e3a;
}
.small-excerpt {
  font-size: 0.8rem;
  line-height: 1.5;
  color: #777;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
