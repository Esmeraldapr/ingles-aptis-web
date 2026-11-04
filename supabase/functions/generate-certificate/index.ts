// Comprueba que el alumno ha completado todos los tests de un curso, registra el certificado
// y devuelve un HTML imprimible.
// Desplegar: supabase functions deploy generate-certificate
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]!)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { course_id } = await req.json()
    const url = Deno.env.get('SUPABASE_URL')!
    // cliente con la identidad del alumno (respeta RLS)
    const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: auth } = await user.auth.getUser()
    if (!auth.user) return Response.json({ error: 'No autenticado' }, { status: 401, headers: cors })

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: profile } = await admin.from('profiles').select('id, nombre, email').eq('user_id', auth.user.id).single()
    const { data: course } = await admin.from('courses').select('id, title, level').eq('id', course_id).single()
    if (!profile || !course) return Response.json({ error: 'Curso o perfil no encontrado' }, { status: 404, headers: cors })

    // lecciones con ejercicios vs. completadas por el alumno
    const { data: lessons } = await admin.from('lessons').select('id, exercises(count)').eq('course_id', course_id)
    const practice = (lessons ?? []).filter((l: { exercises: { count: number }[] }) => (l.exercises?.[0]?.count ?? 0) > 0)
    const { data: done } = await admin
      .from('student_progress').select('lesson_id, score')
      .eq('student_id', profile.id).eq('completed', true)
      .in('lesson_id', practice.map((l: { id: string }) => l.id))
    if ((done?.length ?? 0) < practice.length) {
      return Response.json(
        { error: `Te faltan ${practice.length - (done?.length ?? 0)} tests por completar.` },
        { status: 400, headers: cors },
      )
    }
    const avg = Math.round((done ?? []).reduce((a: number, d: { score: number }) => a + Number(d.score), 0) / (done?.length || 1))

    const { data: cert } = await admin
      .from('certificates')
      .upsert({ student_id: profile.id, course_id }, { onConflict: 'student_id,course_id' })
      .select().single()

    const fecha = new Date(cert?.issued_at ?? Date.now()).toLocaleDateString('es-ES', { dateStyle: 'long' })
    const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>Certificado</title>
<style>body{font-family:Georgia,serif;color:#1b2a4a;display:grid;place-items:center;min-height:100vh;margin:0}
.c{border:6px double #1b2a4a;padding:56px 72px;max-width:760px;text-align:center}
h1{font-size:40px;margin:0 0 8px}p{font-size:18px;line-height:1.6}.n{font-size:30px;font-weight:bold;margin:18px 0}
@media print{button{display:none}}</style>
<div class="c"><h1>Certificado de finalización</h1><p>Se certifica que</p>
<p class="n">${esc(profile.nombre ?? profile.email ?? '')}</p>
<p>ha completado todos los tests del curso <strong>${esc(course.title)}</strong> (nivel ${esc(course.level)})<br>
con una nota media del ${avg}%.</p><p>${fecha}</p><button onclick="print()">Imprimir o guardar en PDF</button></div></html>`
    return Response.json({ html, average: avg }, { headers: cors })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500, headers: cors })
  }
})
