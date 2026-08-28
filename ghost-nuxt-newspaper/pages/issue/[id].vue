<script setup lang="ts">
import type { MergedIssue } from '~/types/issue'

const route = useRoute()
const issueId = route.params.id as string

const { data: issue, error } = await useFetch<MergedIssue>(`/api/issue/${issueId}`)

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode ?? 500,
    statusMessage: error.value.statusMessage ?? 'Failed to load issue'
  })
}

const sortedPages = computed(() => {
  if (!issue.value) return []
  return Object.entries(issue.value.pages)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([pageNum, items]) => ({ pageNum, items }))
})

useHead(() => ({
  title: issue.value ? `${issue.value.title} | Ghost Newspaper` : 'Ghost Newspaper'
}))
</script>

<template>
  <div class="issue-page">
    <header v-if="issue" class="issue-header">
      <h1 class="issue-title">{{ issue.title }}</h1>
      <time class="issue-date" :datetime="issue.publishedAt">
        {{ issue.publishedAt }}
      </time>
    </header>

    <nav v-if="issue" class="page-nav">
      <span class="page-nav-label">面:</span>
      <NuxtLink
        v-for="{ pageNum } in sortedPages"
        :key="pageNum"
        :to="`#page-${pageNum}`"
        class="page-link"
      >
        {{ pageNum }}面
      </NuxtLink>
    </nav>

    <main v-if="issue" class="issue-content">
      <section
        v-for="{ pageNum, items } in sortedPages"
        :id="`page-${pageNum}`"
        :key="pageNum"
        class="page-section"
      >
        <h2 class="page-heading">{{ pageNum }}面</h2>
        <PageRenderer :items="items" />
      </section>
    </main>
  </div>
</template>

<style scoped>
.issue-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}
.issue-header {
  border-bottom: 3px double #333;
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
}
.issue-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  font-family: 'Noto Serif JP', serif;
}
.issue-date {
  color: #666;
  font-size: 0.9rem;
}
.page-nav {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 2rem;
  padding: 0.75rem 1rem;
  background: #f5f5f5;
  border-radius: 4px;
}
.page-nav-label {
  font-weight: 600;
  margin-right: 0.5rem;
}
.page-link {
  padding: 0.25rem 0.75rem;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-decoration: none;
  color: #333;
  font-size: 0.9rem;
  transition: background 0.2s;
}
.page-link:hover {
  background: #e8e8e8;
}
.page-section {
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #eee;
}
.page-heading {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1rem;
  padding: 0.5rem 0;
  border-bottom: 2px solid #333;
  font-family: 'Noto Serif JP', serif;
}
</style>
