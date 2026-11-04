import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../hooks/useAuth'
import { useMyProgress, useStudentStats, useSubmissionDays } from '../hooks/queries'
import { ErrorBox, PageTitle, SkillDot, Spinner, StatTile } from '../components/ui'
import { SKILL_LABEL, skillOf, splitTitle } from '../lib/lessons'
import type { Skill } from '../types'

const INK = '#14b8a6'
const GRID = '#d9e8f0'
const TICK = { fill: '#56657d', fontSize: 13 }

function dayKey(d: Date) {
  return d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' })
}

function TooltipBox({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; unit: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border-[1.5px] border-rule bg-white px-3 py-2 text-sm shadow-sm">
      <p className="text-slate">{label}</p>
      <p className="font-bold">{payload[0].value} {unit}</p>
    </div>
  )
}

export default function Progress() {
  const { profile } = useAuth()
  const stats = useStudentStats(profile?.id)
  const progress = useMyProgress(profile?.id)
  const days = useSubmissionDays(profile?.id)

  if (stats.isLoading || progress.isLoading) return <Spinner />
  if (stats.error) return <ErrorBox error={stats.error} retry={() => stats.refetch()} />
  if (progress.error) return <ErrorBox error={progress.error} retry={() => progress.refetch()} />
  const s = stats.data!

  // actividad de los últimos 30 días
  const counts = new Map<string, number>()
  for (const r of days.data ?? []) {
    const k = dayKey(new Date(r.submitted_at))
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const activity = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000)
    return {
      day: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' }),
      respuestas: counts.get(dayKey(d)) ?? 0,
    }
  })

  // nota media por destreza
  const bySkill = new Map<Skill, number[]>()
  for (const p of progress.data ?? []) {
    const sk = skillOf(p.lessons.title)
    if (sk === 'teoria' || sk === 'writing' || sk === 'speaking') continue
    bySkill.set(sk, [...(bySkill.get(sk) ?? []), Number(p.score ?? 0)])
  }
  const skills = (['grammar', 'reading', 'listening'] as Skill[]).map((sk) => {
    const v = bySkill.get(sk) ?? []
    return { skill: sk, label: SKILL_LABEL[sk], media: v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0, tests: v.length }
  })

  const lessons = [...(progress.data ?? [])].sort((a, b) => a.lessons.order_index - b.lessons.order_index)

  return (
    <div>
      <PageTitle sub="Tu racha de días y cómo evolucionan tus aciertos.">📊 Mi progreso</PageTitle>

      <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile tone="pink" icon="🔥" value={`${s.streak_days} ${s.streak_days === 1 ? 'día' : 'días'}`} label="Racha de estudio" />
        <StatTile tone="blue" icon="✅" value={s.accuracy != null ? `${Math.round(s.accuracy)}%` : '—'} label="Aciertos" />
        <StatTile tone="teal" icon="📚" value={String(s.total_submissions)} label="Respuestas enviadas" />
        <StatTile tone="amber" icon="⭐" value={s.avg_score != null ? `${Math.round(s.avg_score)}%` : '—'} label="Nota media por test" />
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="act">
          <h2 id="act" className="text-2xl font-bold">Respuestas por día</h2>
          <p className="text-sm text-slate">Últimos 30 días</p>
          <div className="mt-4 h-64" role="img" aria-label="Gráfico de respuestas por día en los últimos 30 días">
            <ResponsiveContainer>
              <BarChart data={activity} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap={2}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="day" tick={TICK} tickLine={false} axisLine={{ stroke: GRID }} interval={6} />
                <YAxis allowDecimals={false} tick={TICK} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#dce6f580' }} content={<TooltipBox unit="respuestas" />} />
                <Bar dataKey="respuestas" fill={INK} radius={[4, 4, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section aria-labelledby="skills">
          <h2 id="skills" className="text-2xl font-bold">Nota media por destreza</h2>
          <p className="text-sm text-slate">Media de los tests que has hecho</p>
          <ul className="mt-6 space-y-5">
            {skills.map((k) => (
              <li key={k.skill}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="flex items-center gap-2 font-bold"><SkillDot skill={k.skill} /> {k.label}</span>
                  <span className="text-sm text-slate">
                    {k.tests ? <><strong className="text-ink">{k.media}%</strong> · {k.tests} tests</> : 'sin tests aún'}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-rule" aria-hidden>
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#14b8a6_0%,#36ecde_60%,#3b82f6_100%)]" style={{ width: `${k.media}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="tests" className="mt-12">
        <h2 id="tests" className="text-2xl font-bold">Tests empezados</h2>
        {lessons.length === 0 ? (
          <p className="mt-3 text-slate">Cuando respondas tu primera pregunta aparecerá aquí.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b-2 border-ink text-sm text-slate">
                <tr><th className="py-2 pr-4 font-bold">Test</th><th className="py-2 pr-4 font-bold">Unidad</th><th className="py-2 pr-4 font-bold">Nota</th><th className="py-2 font-bold">Estado</th></tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {lessons.map((p) => {
                  const { unit, part } = splitTitle(p.lessons.title)
                  return (
                    <tr key={p.id}>
                      <td className="py-2 pr-4"><span className="flex items-center gap-2"><SkillDot skill={skillOf(p.lessons.title)} />{part}</span></td>
                      <td className="py-2 pr-4 text-slate">{unit}</td>
                      <td className="py-2 pr-4 font-bold">{Math.round(Number(p.score ?? 0))}%</td>
                      <td className="py-2">{p.completed ? 'Completado' : 'A medias'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
