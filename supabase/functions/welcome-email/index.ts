// Envía un email de bienvenida tras el registro.
// Requiere el secreto RESEND_API_KEY (https://resend.com). Sin él, responde "skipped" y no hace nada.
// Desplegar: supabase functions deploy welcome-email
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { email, nombre } = await req.json()
    if (!email || typeof email !== 'string') {
      return Response.json({ error: 'Falta el email' }, { status: 400, headers: cors })
    }

    // Solo se envía a usuarios que existen en auth.users (evita usar la función para mandar spam)
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: exists } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
    if (!exists) return Response.json({ status: 'unknown-user' }, { headers: cors })

    const key = Deno.env.get('RESEND_API_KEY')
    if (!key) return Response.json({ status: 'skipped' }, { headers: cors })

    const from = Deno.env.get('WELCOME_FROM') ?? 'Hoja de respuestas <onboarding@resend.dev>'
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: email,
        subject: 'Bienvenida a tu práctica del Aptis',
        html: `<p>Hola ${String(nombre ?? '').replace(/[<>&]/g, '')},</p>
               <p>Tu cuenta ya está lista. Entra, matricúlate en el curso y empieza por el primer test.</p>`,
      }),
    })
    if (!r.ok) return Response.json({ error: await r.text() }, { status: 502, headers: cors })
    return Response.json({ status: 'sent' }, { headers: cors })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500, headers: cors })
  }
})
