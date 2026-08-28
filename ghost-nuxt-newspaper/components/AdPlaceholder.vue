<script setup lang="ts">
import type { MergedIssueItem } from '~/types/issue'

defineProps<{
  item: MergedIssueItem
}>()
</script>

<template>
  <div class="ad-placeholder">
    <span class="ad-label">広告</span>
    <div class="ad-box">
      <span class="ad-text">Ad Placeholder</span>
      <span v-if="item.layout" class="ad-layout">({{ item.layout }})</span>
    </div>
  </div>
</template>

<style scoped>
.ad-placeholder {
  grid-column: span 12;
  padding: 1.5rem;
  background: #f8f8f8;
  border: 2px dashed #ccc;
  border-radius: 4px;
  text-align: center;
}
@media (min-width: 768px) {
  .ad-placeholder {
    grid-column: span 6;
  }
}
.ad-label {
  display: block;
  font-size: 0.7rem;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.5rem;
}
.ad-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}
.ad-text {
  font-size: 0.9rem;
  color: #aaa;
}
.ad-layout {
  font-size: 0.75rem;
  color: #bbb;
}
</style>
