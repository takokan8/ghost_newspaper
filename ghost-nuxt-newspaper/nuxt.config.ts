// nuxt.config.ts
export default defineNuxtConfig({
  ssr: true,
  nitro: {
    prerender: {
      routes: ['/']
    }
  },
  routeRules: {
    '/issue/**': {
      isr: 60,
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
      }
    },
    '/_nuxt/**': {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    }
  },
  runtimeConfig: {
    ghostUrl: process.env.GHOST_URL || '',
    ghostContentApiKey: process.env.GHOST_CONTENT_API_KEY || '',
    ghostWebhookSecret: process.env.GHOST_WEBHOOK_SECRET || '',
    public: {
      siteName: process.env.SITE_NAME || 'Ghost Newspaper'
    }
  },
  compatibilityDate: '2026-08-27'
})
