<script setup lang="ts">
import type { MergedIssueItem } from '~/types/issue'

defineProps<{
  item: MergedIssueItem
}>()
</script>

<template>
  <div class="index-placeholder">
    <span class="index-label">索引</span>
    <div class="index-box">
      <span class="index-text">Index Placeholder</span>
    </div>
  </div>
</template>

<style scoped>
.index-placeholder {
  grid-column: span 12;
  padding: 1rem;
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  text-align: center;
}
.index-label {
  display: block;
  font-size: 0.7rem;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.25rem;
}
.index-text {
  font-size: 0.85rem;
  color: #aaa;
}
</style>
