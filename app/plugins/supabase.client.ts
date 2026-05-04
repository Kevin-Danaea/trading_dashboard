import { createClient } from '@supabase/supabase-js'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.public.supabaseKey as string,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  )

  return {
    provide: {
      supabase
    }
  }
})
