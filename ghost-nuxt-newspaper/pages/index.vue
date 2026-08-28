<script setup lang="ts">
useHead({ title: 'Ghost Newspaper' })
</script>

<template>
  <div class="home">
    <h1>Ghost Newspaper</h1>
    <p>
      各号は <code>/issue/YYYY-MM</code> の形式でアクセスできます。
      例: <NuxtLink to="/issue/2026-08">/issue/2026-08</NuxtLink>
    </p>
  </div>
</template>

<style scoped>
.home {
  max-width: 640px;
  margin: 4rem auto;
  padding: 0 1rem;
  text-align: center;
  font-family: 'Noto Serif JP', serif;
}
code {
  background: #f0f0f0;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
}
</style>
