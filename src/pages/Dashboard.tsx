import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useExerciseCounts, useLessons, useMyEnrollments, useMyProgress, useStudentStats } from '../hooks/queries'
import { Empty, ErrorBox, FormError, PageTitle, ProgressBar, SkillDot, Spinner } from '../components/ui'
import { skillOf, splitTitle } from '../lib/lessons'
import type { Course, StudentProgress } from '../types'

function CourseBlock({ course, progress }: { course: Course; progress: Map<string, StudentProgress> }) {
  const lessons = useLessons(course.id)
  const counts = useExerciseCounts(course.id)
  if (lessons.isLoading || counts.isLoading) return <Spinner />
  if (lessons.error) return <ErrorBox error={lessons.error} retry={() => lessons.refetch()} />

  const practice = (lessons.data ?? []).filter((l) => (counts.data?.[l.id] ?? 0) > 0)
  const done = practice.filter((l) => progress.get(l.id)?.completed).length
  const pct = practice.length ? (100 * done) / practice.length : 0
  const next = practice.filter((l) => !progress.get(l.id)?.completed).slice(0, 4)

  return (
    <article className="sheet p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-bold">
          <Link to={`/cursos/${course.id}`} className="underline-offset-4 hover:underline">{course.title}</Link>
        </h2>
        <span className="text-sm text-slate">{done} de {practice.length} tests completados</span>
      </div>
      <div className="mt-3">
        <ProgressBar value={pct} label={`Progreso en ${course.title}`} />
      </div>
      {next.length > 0 ? (
        <>
          <h3 className="mt-6 text-sm font-bold text-slate">Siguientes</h3>
          <ul className="mt-2 divide-y divide-rule">
            {next.map((l) => {
              const { unit, part } = splitTitle(l.title)
              const score = progress.get(l.id)?.score
              return (
                <li key={l.id}>
                  <Link to={`/lecciones/${l.id}`} className="flex items-center gap-3 py-2.5 hover:bg-paper">
                    <SkillDot skill={skillOf(l.title)} />
                    <span className="flex-1">
                      <span className="font-bold">{part}</span> <span className="text-slate">· {unit}</span>
                    </span>
                    {score != null && score > 0 && <span className="text-sm text-slate">{Math.round(score)}%</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <p className="font-bold text-ok">Has completado todos los tests de este curso.</p>
          <CertificateButton courseId={course.id} />
        </div>
      )}
    </article>
  )
}

function CertificateButton({ courseId }: { courseId: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  return (
    <>
      <button
        className="btn btn-ghost text-sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setError(null)
          const { data, error } = await supabase.functions.invoke('generate-certificate', { body: { course_id: courseId } })
          setBusy(false)
          if (error || !data?.html) return setError(data?.error ?? error ?? 'No se pudo generar el certificado')
          const w = window.open(URL.createObjectURL(new Blob([data.html], { type: 'text/html' })), '_blank')
          if (!w) setError('Permite las ventanas emergentes para ver el certificado.')
        }}
      >
        {busy ? 'Generando…' : 'Descargar certificado'}
      </button>
      <FormError error={error} />
    </>
  )
}

export default function Dashboard() {
  const { profile } = useAuth()
  const enrollments = useMyEnrollments(profile?.id)
  const progress = useMyProgress(profile?.id)
  const stats = useStudentStats(profile?.id)

  const map = new Map((progress.data ?? []).map((p) => [p.lesson_id, p]))
  const name = profile?.nombre?.split(' ')[0]

  return (
    <div>
      <PageTitle>{name ? `Hola, ${name}` : 'Mi panel'}</PageTitle>

      {stats.data && (
        <dl className="mb-10 grid grid-cols-2 gap-x-6 gap-y-4 border-y-2 border-ink py-5 sm:grid-cols-4">
          {[
            ['Racha', `${stats.data.streak_days} ${stats.data.streak_days === 1 ? 'día' : 'días'}`],
            ['Aciertos', stats.data.accuracy != null ? `${Math.round(stats.data.accuracy)}%` : '—'],
            ['Respuestas', String(stats.data.total_submissions)],
            ['Tests completados', String(stats.data.lessons_completed)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-sm text-slate">{k}</dt>
              <dd className="font-[family-name:var(--font-display)] text-3xl font-extrabold">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {enrollments.isLoading && <Spinner />}
      {enrollments.error && <ErrorBox error={enrollments.error} retry={() => enrollments.refetch()} />}
      {enrollments.data?.length === 0 && (
        <Empty action={<Link to="/cursos" className="btn btn-primary">Ver cursos</Link>}>
          Todavía no estás matriculada en ningún curso. Elige uno para empezar a practicar.
        </Empty>
      )}
      <div className="space-y-6">
        {enrollments.data?.map((e) => <CourseBlock key={e.id} course={e.courses} progress={map} />)}
      </div>
    </div>
  )
}
