<script setup lang="ts">
import type { MergedIssueItem } from '~/types/issue'

const props = defineProps<{
  item: MergedIssueItem
}>()

const article = computed(() => props.item.article)
</script>

<template>
  <article v-if="article" class="article-lead">
    <figure v-if="article.feature_image" class="lead-image-wrapper">
      <img
        :src="article.feature_image"
        :alt="article.title"
        class="lead-image"
        loading="eager"
      />
    </figure>
    <div class="lead-content">
      <h2 class="lead-title">
        <NuxtLink :to="`/article/${article.slug}`">
          {{ article.title }}
        </NuxtLink>
      </h2>
      <div v-if="article.authors?.length" class="lead-meta">
        <span
          v-for="author in article.authors"
          :key="author.slug"
          class="author"
        >
          {{ author.name }}
        </span>
      </div>
      <div v-if="article.excerpt" class="lead-excerpt">
        {{ article.excerpt }}
      </div>
      <div class="lead-body" v-html="article.html" />
    </div>
  </article>
</template>

<style scoped>
.article-lead {
  grid-column: span 12;
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  padding: 1.5rem;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
@media (min-width: 768px) {
  .article-lead {
    grid-template-columns: 1fr 1fr;
  }
}
.lead-image-wrapper {
  margin: 0;
  overflow: hidden;
  border-radius: 4px;
}
.lead-image {
  width: 100%;
  height: auto;
  object-fit: cover;
  display: block;
}
.lead-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
  line-height: 1.3;
  font-family: 'Noto Serif JP', serif;
}
.lead-title a {
  color: #1a1a1a;
  text-decoration: none;
}
.lead-title a:hover {
  color: #c41e3a;
}
.lead-meta {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  color: #666;
}
.author::before {
  content: '✎ ';
}
.lead-excerpt {
  font-size: 1rem;
  line-height: 1.7;
  color: #444;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}
.lead-body {
  line-height: 1.8;
  color: #333;
}
.lead-body :deep(p) {
  margin: 0 0 1rem;
}
.lead-body :deep(h2),
.lead-body :deep(h3) {
  font-family: 'Noto Serif JP', serif;
  margin: 1.5rem 0 0.75rem;
}
</style>
