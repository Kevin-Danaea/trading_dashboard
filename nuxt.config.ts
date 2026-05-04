export default defineNuxtConfig({
  srcDir: 'app/',
  compatibilityDate: '2026-05-03',
  devtools: { enabled: true },
  css: ['~/assets/css/tokens.css', '~/assets/css/app.css'],
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY
    }
  },
  imports: {
    dirs: ['shared/domain', 'shared/data']
  },
  typescript: {
    strict: true,
    typeCheck: true
  }
})
