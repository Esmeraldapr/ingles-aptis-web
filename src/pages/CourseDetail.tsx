import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCourse, useEnroll, useExerciseCounts, useLessons, useMyEnrollments, useMyProgress } from '../hooks/queries'
import { ErrorBox, FormError, PageTitle, ProgressBar, SkillDot, Spinner } from '../components/ui'
import { groupByUnit, skillOf, splitTitle } from '../lib/lessons'

export default function CourseDetail() {
  const { courseId } = useParams()
  const { profile } = useAuth()
  const course = useCourse(courseId)
  const lessons = useLessons(courseId)
  const counts = useExerciseCounts(courseId)
  const enrollments = useMyEnrollments(profile?.id)
  const progress = useMyProgress(profile?.id)
  const enroll = useEnroll(profile?.id)
  const [openUnit, setOpenUnit] = useState<string | null>(null)

  if (course.isLoading || lessons.isLoading) return <Spinner />
  if (course.error) return <ErrorBox error={course.error} retry={() => course.refetch()} />
  if (lessons.error) return <ErrorBox error={lessons.error} retry={() => lessons.refetch()} />
  const c = course.data!
  const enrolled = enrollments.data?.some((e) => e.course_id === c.id)
  const prog = new Map((progress.data ?? []).map((p) => [p.lesson_id, p]))
  const groups = groupByUnit(lessons.data ?? [])
  const current = openUnit ?? groups[0]?.unit

  return (
    <div>
      <PageTitle back={{ to: '/cursos', label: 'Cursos' }}>{c.title}</PageTitle>
      <div className="-mt-4 mb-8 flex flex-wrap items-center gap-4">
        <span className="rounded-md bg-ink px-2 py-0.5 text-sm font-bold text-paper">{c.level}</span>
        <p className="max-w-2xl text-slate">{c.description}</p>
        {!enrolled && (
          <button className="btn btn-primary" disabled={enroll.isPending} onClick={() => enroll.mutate(c.id)}>
            {enroll.isPending ? 'Matriculando…' : 'Matricularme'}
          </button>
        )}
      </div>
      <FormError error={enroll.error} />

      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        <nav aria-label="Unidades" className="lg:sticky lg:top-24 lg:self-start">
          <ol className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-0.5 lg:overflow-visible">
            {groups.map((g) => {
              const practice = g.lessons.filter((l) => (counts.data?.[l.id] ?? 0) > 0)
              const done = practice.filter((l) => prog.get(l.id)?.completed).length
              return (
                <li key={g.unit} className="shrink-0">
                  <button
                    onClick={() => setOpenUnit(g.unit)}
                    aria-current={current === g.unit}
                    className={`w-full rounded-lg px-3 py-2 text-left ${current === g.unit ? 'bg-ink text-paper' : 'hover:bg-rule'}`}
                  >
                    <span className="block font-bold">{g.unit}</span>
                    {practice.length > 0 && (
                      <span className={`text-xs ${current === g.unit ? 'text-paper/80' : 'text-slate'}`}>
                        {done}/{practice.length} tests
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        <section aria-live="polite">
          {groups
            .filter((g) => g.unit === current)
            .map((g) => (
              <div key={g.unit}>
                <h2 className="mb-4 text-3xl font-extrabold">{g.unit}</h2>
                <ul className="divide-y-2 divide-rule border-y-2 border-ink">
                  {g.lessons.map((l) => {
                    const { part } = splitTitle(l.title)
                    const n = counts.data?.[l.id] ?? 0
                    const p = prog.get(l.id)
                    return (
                      <li key={l.id}>
                        <Link to={`/lecciones/${l.id}`} className="grid gap-2 py-4 hover:bg-white sm:grid-cols-[1fr_10rem] sm:items-center">
                          <span className="flex items-center gap-3">
                            <SkillDot skill={skillOf(l.title)} />
                            <span>
                              <span className="block font-bold">{part}</span>
                              <span className="text-sm text-slate">
                                {n > 0 ? `${n} preguntas` : l.video_url ? 'Vídeo y recursos' : 'Recursos'}
                                {p?.completed && ' · completado'}
                              </span>
                            </span>
                          </span>
                          {n > 0 && (
                            <span className="flex items-center gap-2 text-sm">
                              <span className="flex-1"><ProgressBar value={p?.score ?? 0} label={`Nota de ${part}`} /></span>
                              <span className="w-10 text-right text-slate">{p ? `${Math.round(p.score ?? 0)}%` : '—'}</span>
                            </span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
        </section>
      </div>
    </div>
  )
}
