import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  srcDir: 'app/',
  compatibilityDate: '2026-05-03',
  devtools: { enabled: true },
  alias: {
    '#shared': fileURLToPath(new URL('./shared', import.meta.url))
  },
  css: ['~/assets/css/tokens.css', '~/assets/css/app.css'],
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY
    }
  },
  imports: {
    dirs: ['../shared/domain']
  },
  typescript: {
    strict: true,
    typeCheck: true
  }
})
