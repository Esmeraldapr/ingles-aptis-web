import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCourse, useEnroll, useExerciseCounts, useLessons, useMyEnrollments, useMyProgress } from '../hooks/queries'
import { ErrorBox, FormError, PageTitle, SKILL_ACCENT, SKILL_ICON, Spinner } from '../components/ui'
import { SKILL_LABEL, groupByUnit, skillOf, splitTitle } from '../lib/lessons'
import type { Skill } from '../types'

const SKILLS: Skill[] = ['grammar', 'reading', 'listening', 'writing', 'speaking', 'teoria']

/** "Unit 1: Present Simple" -> { short: "Unit 1", name: "Present Simple" } */
function unitLabel(unit: string) {
  const m = unit.match(/^(.*?)[:.]\s*(.*)$/)
  return m ? { short: m[1], name: m[2] } : { short: unit, name: '' }
}

export default function CourseDetail() {
  const { courseId } = useParams()
  const [params, setParams] = useSearchParams()
  const { profile } = useAuth()
  const course = useCourse(courseId)
  const lessons = useLessons(courseId)
  const counts = useExerciseCounts(courseId)
  const enrollments = useMyEnrollments(profile?.id)
  const progress = useMyProgress(profile?.id)
  const enroll = useEnroll(profile?.id)

  // Matrícula automática: al entrar en el curso queda matriculada, sin botón
  const enrolledHere = enrollments.data?.some((e) => e.course_id === courseId)
  const tried = useRef<string | null>(null)
  const { mutate: enrollMutate } = enroll
  useEffect(() => {
    if (profile?.id && courseId && enrollments.data && !enrolledHere && tried.current !== courseId) {
      tried.current = courseId
      enrollMutate(courseId)
    }
  }, [profile?.id, courseId, enrollments.data, enrolledHere, enrollMutate])

  if (course.isLoading || lessons.isLoading) return <Spinner />
  if (course.error) return <ErrorBox error={course.error} retry={() => course.refetch()} />
  if (lessons.error) return <ErrorBox error={lessons.error} retry={() => lessons.refetch()} />

  const c = course.data!
  const prog = new Map((progress.data ?? []).map((p) => [p.lesson_id, p]))
  const groups = groupByUnit(lessons.data ?? [])
  const skill = params.get('destreza') as Skill | null
  const unitParam = params.get('unidad')
  const current = skill ? null : unitParam ?? groups[1]?.unit ?? groups[0]?.unit

  const set = (k: 'unidad' | 'destreza', v: string | null) => {
    const next = new URLSearchParams()
    if (v) next.set(k, v)
    setParams(next, { replace: true })
  }

  const shown = skill
    ? (lessons.data ?? []).filter((l) => skillOf(l.title) === skill)
    : groups.find((g) => g.unit === current)?.lessons ?? []

  return (
    <div>
      <PageTitle sub={c.description}>
        📚 {c.title}
      </PageTitle>

      <FormError error={enroll.error} />

      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por destreza">
        <span className="mr-1 text-sm font-semibold text-slate">Destreza:</span>
        {SKILLS.map((sk) => (
          <button key={sk} className="pill-tab" aria-pressed={skill === sk} onClick={() => set('destreza', skill === sk ? null : sk)}>
            {SKILL_ICON[sk]} {SKILL_LABEL[sk]}
          </button>
        ))}
      </div>
      <div className="mb-8 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Unidades">
        {groups.map((g) => {
          const { short, name } = unitLabel(g.unit)
          return (
            <button key={g.unit} className="pill-tab" aria-pressed={!skill && current === g.unit} onClick={() => set('unidad', g.unit)}>
              {short}
              {name && <small>{name}</small>}
            </button>
          )
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl">{skill ? `${SKILL_ICON[skill]} ${SKILL_LABEL[skill]}` : current}</h2>
        <span className="text-sm text-slate">
          {shown.length} {shown.length === 1 ? 'tema' : 'temas'} · {shown.reduce((n, l) => n + (counts.data?.[l.id] ?? 0), 0)} preguntas
        </span>
      </div>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((l) => {
          const { unit, part } = splitTitle(l.title)
          const sk = skillOf(l.title)
          const n = counts.data?.[l.id] ?? 0
          const p = prog.get(l.id)
          return (
            <li key={l.id}>
              <Link to={`/lecciones/${l.id}`} className="neon-card h-full" style={{ ['--accent' as string]: SKILL_ACCENT[sk] }}>
                <div className="neon-head h-28 flex-col gap-1">
                  <span className="relative text-4xl drop-shadow-[0_0_12px_rgba(54,236,222,.7)]" aria-hidden>{SKILL_ICON[sk]}</span>
                  <span className="relative text-[0.7rem] font-bold tracking-wide text-menta">{unitLabel(unit).short} · {SKILL_LABEL[sk]}</span>
                  {p?.completed && <span className="absolute right-3 top-3 rounded-full bg-ok px-2 py-0.5 text-xs font-bold">✓ Hecho</span>}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-base">{part}</h3>
                  <p className="text-sm text-slate">
                    {n > 0 ? `${n} preguntas` : l.video_url ? 'Vídeo y recursos' : 'Recursos'}
                    {p && n > 0 && ` · nota ${Math.round(p.score ?? 0)}%`}
                  </p>
                  <span className="btn btn-primary mt-4 w-full">{n > 0 ? 'Practicar' : 'Ver'}</span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
