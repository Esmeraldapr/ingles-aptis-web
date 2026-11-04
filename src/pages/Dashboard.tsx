import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useCourses, useExerciseCounts, useLessons, useMyEnrollments, useMyProgress, useStudentStats } from '../hooks/queries'
import { ActionCard, Empty, ErrorBox, FormError, PageTitle, ProgressBar, SKILL_ACCENT, SKILL_ICON, Spinner, StatTile } from '../components/ui'
import { SKILL_LABEL, splitTitle } from '../lib/lessons'
import type { Course, Skill, StudentProgress } from '../types'

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
        {busy ? 'Generando…' : '🏆 Descargar certificado'}
      </button>
      <FormError error={error} />
    </>
  )
}

const SKILL_TEXT: Record<Exclude<Skill, 'teoria'>, string> = {
  grammar: 'Tiempos verbales, sinónimos, definiciones y collocations.',
  reading: 'Huecos en emails, ordenar frases y emparejar opiniones.',
  listening: 'Preguntas de cada audio del examen.',
  writing: 'Las cuatro partes con contador de palabras y modelo.',
  speaking: 'Los tests de speaking de cada unidad.',
}

function CourseHome({ course, progress }: { course: Course; progress: Map<string, StudentProgress> }) {
  const lessons = useLessons(course.id)
  const counts = useExerciseCounts(course.id)
  if (lessons.isLoading || counts.isLoading) return <Spinner />
  if (lessons.error) return <ErrorBox error={lessons.error} retry={() => lessons.refetch()} />

  const practice = (lessons.data ?? []).filter((l) => (counts.data?.[l.id] ?? 0) > 0)
  const done = practice.filter((l) => progress.get(l.id)?.completed).length
  const next = practice.find((l) => !progress.get(l.id)?.completed)
  const nextInfo = next ? splitTitle(next.title) : null

  return (
    <>
      <section aria-labelledby="hoy">
        <h2 id="hoy" className="mb-4 text-xl">¿Qué quieres hacer hoy?</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {next && nextInfo && (
            <ActionCard
              to={`/lecciones/${next.id}`}
              icon="⚡"
              title="Seguir donde lo dejé"
              text={`${nextInfo.part} · ${nextInfo.unit}`}
              cta="Empezar"
              accent="#fbbf24"
            />
          )}
          {(['grammar', 'reading', 'listening', 'writing', 'speaking'] as const).map((sk) => (
            <ActionCard
              key={sk}
              to={`/cursos/${course.id}?destreza=${sk}`}
              icon={SKILL_ICON[sk]}
              title={SKILL_LABEL[sk]}
              text={SKILL_TEXT[sk]}
              cta={sk === 'speaking' ? 'Ver' : 'Empezar'}
              accent={SKILL_ACCENT[sk]}
            />
          ))}
          <ActionCard to="/progreso" icon="📈" title="Mi progreso" text="Tu racha y cómo evolucionan tus aciertos." cta="Ver" accent="#3b82f6" />
          <ActionCard to={`/cursos/${course.id}`} icon="🗂️" title="Por unidades" text="Todas las unidades del curso, de la 0 a los tests extra." cta="Ver" accent="#36ecde" />
        </div>
      </section>

      <section className="sheet mt-10 p-6" aria-labelledby="avance">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="avance" className="text-xl">{course.title}</h2>
          <span className="text-sm text-slate">{done} de {practice.length} tests completados</span>
        </div>
        <div className="mt-3"><ProgressBar value={practice.length ? (100 * done) / practice.length : 0} label={`Progreso en ${course.title}`} /></div>
        {!next && practice.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <p className="font-bold text-ok">Has completado todos los tests del curso.</p>
            <CertificateButton courseId={course.id} />
          </div>
        )}
      </section>
    </>
  )
}

export default function Dashboard() {
  const { profile } = useAuth()
  const enrollments = useMyEnrollments(profile?.id)
  const courses = useCourses()
  const progress = useMyProgress(profile?.id)
  const stats = useStudentStats(profile?.id)
  const map = new Map((progress.data ?? []).map((p) => [p.lesson_id, p]))
  const s = stats.data

  return (
    <div>
      <PageTitle sub="Este es tu resumen de progreso en el Aptis.">👋 Hola{profile?.nombre ? `, ${profile.nombre.split(' ')[0]}` : ' de nuevo'}</PageTitle>

      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile tone="teal" icon="📚" value={String(s?.total_submissions ?? 0)} label="Respuestas enviadas" />
        <StatTile tone="blue" icon="✅" value={s?.accuracy != null ? `${Math.round(s.accuracy)}%` : '—'} label="Aciertos" />
        <StatTile tone="pink" icon="🔥" value={`${s?.streak_days ?? 0} ${s?.streak_days === 1 ? 'día' : 'días'}`} label="Racha de estudio" />
        <StatTile tone="amber" icon="🏆" value={String(s?.lessons_completed ?? 0)} label="Tests completados" />
      </div>

      {enrollments.isLoading && <Spinner />}
      {enrollments.error && <ErrorBox error={enrollments.error} retry={() => enrollments.refetch()} />}
      {enrollments.data?.length === 0 && (
        <Empty
          action={
            courses.data?.[0] ? (
              <Link to={`/cursos/${courses.data[0].id}`} className="btn btn-primary">Empezar el curso APTIS</Link>
            ) : (
              <Link to="/cursos" className="btn btn-primary">Ver cursos</Link>
            )
          }
        >
          Todavía no estás matriculada en ningún curso. Entra en el curso y pulsa «Matricularme».
        </Empty>
      )}
      {enrollments.data?.map((e) => <CourseHome key={e.id} course={e.courses} progress={map} />)}
    </div>
  )
}
