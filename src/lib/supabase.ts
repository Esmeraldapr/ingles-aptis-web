import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !key) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. Copia .env.example a .env y rellénalo.',
  )
}

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

/** Convierte cualquier error de Supabase/JS en un mensaje legible. */
export function errorMessage(err: unknown): string {
  if (!err) return 'Error desconocido'
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message)
  return 'Error desconocido'
}
