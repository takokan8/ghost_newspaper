<script setup lang="ts">
import type { MergedIssueItem } from '~/types/issue'

const props = defineProps<{
  item: MergedIssueItem
}>()

const article = computed(() => props.item.article)
</script>

<template>
  <article v-if="article" class="article-column">
    <figure v-if="article.feature_image" class="column-image-wrapper">
      <img
        :src="article.feature_image"
        :alt="article.title"
        class="column-image"
        loading="lazy"
      />
    </figure>
    <h3 class="column-title">
      <NuxtLink :to="`/article/${article.slug}`">
        {{ article.title }}
      </NuxtLink>
    </h3>
    <div v-if="article.authors?.length" class="column-meta">
      <span
        v-for="author in article.authors"
        :key="author.slug"
        class="author"
      >
        {{ author.name }}
      </span>
    </div>
    <div v-if="article.excerpt" class="column-excerpt">
      {{ article.excerpt }}
    </div>
  </article>
</template>

<style scoped>
.article-column {
  grid-column: span 12;
  padding: 1rem;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
@media (min-width: 640px) {
  .article-column {
    grid-column: span 6;
  }
}
@media (min-width: 1024px) {
  .article-column {
    grid-column: span 4;
  }
}
.column-image-wrapper {
  margin: -1rem -1rem 1rem;
  overflow: hidden;
  border-radius: 4px 4px 0 0;
}
.column-image {
  width: 100%;
  height: 180px;
  object-fit: cover;
  display: block;
}
.column-title {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  line-height: 1.4;
  font-family: 'Noto Serif JP', serif;
}
.column-title a {
  color: #1a1a1a;
  text-decoration: none;
}
.column-title a:hover {
  color: #c41e3a;
}
.column-meta {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
  color: #888;
}
.author::before {
  content: '✎ ';
}
.column-excerpt {
  font-size: 0.9rem;
  line-height: 1.6;
  color: #555;
}
</style>
