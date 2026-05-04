import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

export const useSupabaseServerClient = (event: H3Event) => {
  const config = useRuntimeConfig(event)
  const authorization = getHeader(event, 'authorization')

  return createClient(
    config.public.supabaseUrl as string,
    config.public.supabaseKey as string,
    {
      global: {
        headers: authorization ? { Authorization: authorization } : {}
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  )
}

export const requireSupabaseUser = async (event: H3Event) => {
  const supabase = useSupabaseServerClient(event)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  return { supabase, user: data.user }
}
