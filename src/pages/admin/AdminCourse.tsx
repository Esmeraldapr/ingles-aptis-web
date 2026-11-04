import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCourse, useDelete, useExerciseCounts, useLessons, useSave } from '../../hooks/queries'
import { ErrorBox, FormError, PageTitle, SkillDot, Spinner } from '../../components/ui'
import { groupByUnit, skillOf, splitTitle } from '../../lib/lessons'
import type { Lesson } from '../../types'

type Draft = { id?: string; course_id: string; title: string; content: string; order_index: number; video_url: string }

function LessonForm({ initial, onDone }: { initial: Draft; onDone: () => void }) {
  const [d, setD] = useState<Draft>(initial)
  const save = useSave<Draft>('lessons', ['lessons', initial.course_id])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await save.mutateAsync({ ...d, video_url: d.video_url || '' })
    onDone()
  }

  return (
    <form onSubmit={onSubmit} className="sheet grid gap-4 p-5 sm:grid-cols-[1fr_8rem]">
      <label className="block">
        <span className="mb-1 block text-sm font-bold">Título (formato «Unidad — Parte»)</span>
        <input className="field" required value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-bold">Orden</span>
        <input className="field" type="number" value={d.order_index} onChange={(e) => setD({ ...d, order_index: Number(e.target.value) })} />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-sm font-bold">Contenido (Markdown: ## títulos, - listas, [texto](url))</span>
        <textarea className="field min-h-32 font-mono text-sm" value={d.content} onChange={(e) => setD({ ...d, content: e.target.value })} />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-sm font-bold">URL del vídeo (opcional)</span>
        <input className="field" type="url" value={d.video_url} onChange={(e) => setD({ ...d, video_url: e.target.value })} />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button className="btn btn-primary" disabled={save.isPending}>{save.isPending ? 'Guardando…' : d.id ? 'Guardar lección' : 'Crear lección'}</button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancelar</button>
        <FormError error={save.error} />
      </div>
    </form>
  )
}

const toDraft = (l: Lesson): Draft => ({
  id: l.id, course_id: l.course_id, title: l.title, content: l.content ?? '', order_index: l.order_index, video_url: l.video_url ?? '',
})

export default function AdminCourse() {
  const { courseId } = useParams()
  const course = useCourse(courseId)
  const lessons = useLessons(courseId)
  const counts = useExerciseCounts(courseId)
  const del = useDelete('lessons', ['lessons', courseId])
  const [editing, setEditing] = useState<Draft | null>(null)

  if (course.isLoading || lessons.isLoading) return <Spinner />
  if (course.error) return <ErrorBox error={course.error} retry={() => course.refetch()} />
  if (lessons.error) return <ErrorBox error={lessons.error} retry={() => lessons.refetch()} />

  const maxOrder = Math.max(0, ...(lessons.data ?? []).map((l) => l.order_index))

  return (
    <div>
      <PageTitle back={{ to: '/admin', label: 'Administración' }}>{course.data!.title}</PageTitle>
      <button
        className="btn btn-primary -mt-4 mb-6"
        onClick={() => setEditing({ course_id: courseId!, title: '', content: '', order_index: maxOrder + 10, video_url: '' })}
      >
        Nueva lección
      </button>
      {editing && !editing.id && <div className="mb-8"><LessonForm initial={editing} onDone={() => setEditing(null)} /></div>}
      <FormError error={del.error} />

      {groupByUnit(lessons.data ?? []).map((g) => (
        <section key={g.unit} className="mb-8">
          <h2 className="mb-2 text-xl font-bold">{g.unit}</h2>
          <ul className="divide-y divide-rule border-y-2 border-ink">
            {g.lessons.map((l) =>
              editing?.id === l.id ? (
                <li key={l.id} className="py-3"><LessonForm initial={editing} onDone={() => setEditing(null)} /></li>
              ) : (
                <li key={l.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <SkillDot skill={skillOf(l.title)} />
                  <Link to={`/admin/lecciones/${l.id}`} className="flex-1 underline-offset-4 hover:underline">
                    {splitTitle(l.title).part}
                    <span className="text-sm text-slate"> · {counts.data?.[l.id] ?? 0} ejercicios · orden {l.order_index}</span>
                  </Link>
                  <button className="btn btn-ghost px-3 py-1 text-sm" onClick={() => setEditing(toDraft(l))}>Editar</button>
                  <button
                    className="btn btn-danger px-3 py-1 text-sm"
                    onClick={() => { if (window.confirm(`¿Borrar «${l.title}» y sus ejercicios?`)) del.mutate(l.id) }}
                  >
                    Borrar
                  </button>
                </li>
              ),
            )}
          </ul>
        </section>
      ))}
    </div>
  )
}
