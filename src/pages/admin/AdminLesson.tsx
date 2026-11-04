import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useDelete, useExercises, useLesson, useSave } from '../../hooks/queries'
import { Empty, ErrorBox, FormError, PageTitle, Spinner } from '../../components/ui'
import { splitTitle } from '../../lib/lessons'
import { EXERCISE_TYPES, type Exercise, type ExerciseType, type WritingOptions } from '../../types'

const TYPE_LABEL: Record<ExerciseType, string> = {
  multiple_choice: 'Opción múltiple',
  fill_blank: 'Rellenar hueco',
  listening: 'Listening',
  writing: 'Writing',
}

type Draft = { id?: string; lesson_id: string; type: ExerciseType; question: string; optionsText: string; correct_answer: string; points: number }

function toDraft(e: Exercise): Draft {
  const optionsText = Array.isArray(e.options)
    ? e.options.join('\n')
    : (e.options as WritingOptions | null)?.respuesta_modelo ?? ''
  return { id: e.id, lesson_id: e.lesson_id, type: e.type, question: e.question, optionsText, correct_answer: e.correct_answer ?? '', points: e.points }
}

function ExerciseForm({ initial, onDone }: { initial: Draft; onDone: () => void }) {
  const [d, setD] = useState<Draft>(initial)
  const [error, setError] = useState<string | null>(null)
  const save = useSave<Omit<Exercise, 'id'> & { id?: string }>('exercises', ['exercises', initial.lesson_id])
  const isWriting = d.type === 'writing'
  const usesOptions = d.type === 'multiple_choice' || d.type === 'listening'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const opts = d.optionsText.split('\n').map((s) => s.trim()).filter(Boolean)
    if (usesOptions && opts.length < 2) return setError('Escribe al menos dos opciones, una por línea.')
    if (usesOptions && d.correct_answer && !opts.includes(d.correct_answer)) {
      return setError('La respuesta correcta tiene que coincidir exactamente con una de las opciones.')
    }
    await save.mutateAsync({
      id: d.id,
      lesson_id: d.lesson_id,
      type: d.type,
      question: d.question,
      options: isWriting ? { respuesta_modelo: d.optionsText } : usesOptions ? opts : null,
      correct_answer: isWriting ? null : d.correct_answer || null,
      points: d.points,
    })
    onDone()
  }

  return (
    <form onSubmit={onSubmit} className="sheet grid gap-4 p-5 sm:grid-cols-[1fr_10rem_6rem]">
      <label className="block sm:col-span-1">
        <span className="mb-1 block text-sm font-bold">Enunciado</span>
        <textarea className="field min-h-20" required value={d.question} onChange={(e) => setD({ ...d, question: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-bold">Tipo</span>
        <select className="field" value={d.type} onChange={(e) => setD({ ...d, type: e.target.value as ExerciseType })}>
          {EXERCISE_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-bold">Puntos</span>
        <input className="field" type="number" min={0} value={d.points} onChange={(e) => setD({ ...d, points: Number(e.target.value) })} />
      </label>
      {(usesOptions || isWriting) && (
        <label className="block sm:col-span-3">
          <span className="mb-1 block text-sm font-bold">{isWriting ? 'Respuesta modelo' : 'Opciones (una por línea)'}</span>
          <textarea className="field min-h-24" value={d.optionsText} onChange={(e) => setD({ ...d, optionsText: e.target.value })} />
        </label>
      )}
      {!isWriting && (
        <label className="block sm:col-span-3">
          <span className="mb-1 block text-sm font-bold">Respuesta correcta</span>
          <input className="field" value={d.correct_answer} onChange={(e) => setD({ ...d, correct_answer: e.target.value })} />
        </label>
      )}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <button className="btn btn-primary" disabled={save.isPending}>{save.isPending ? 'Guardando…' : d.id ? 'Guardar ejercicio' : 'Crear ejercicio'}</button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancelar</button>
        <FormError error={error ?? save.error} />
      </div>
    </form>
  )
}

export default function AdminLesson() {
  const { lessonId } = useParams()
  const lesson = useLesson(lessonId)
  const exercises = useExercises(lessonId)
  const del = useDelete('exercises', ['exercises', lessonId])
  const [editing, setEditing] = useState<Draft | null>(null)

  if (lesson.isLoading || exercises.isLoading) return <Spinner />
  if (lesson.error) return <ErrorBox error={lesson.error} retry={() => lesson.refetch()} />
  if (exercises.error) return <ErrorBox error={exercises.error} retry={() => exercises.refetch()} />

  const l = lesson.data!
  const num = (q: string) => parseInt(q.match(/^(\d+)\./)?.[1] ?? '9999', 10)
  const list = [...(exercises.data ?? [])].sort((a, b) => num(a.question) - num(b.question))

  return (
    <div>
      <PageTitle back={{ to: `/admin/cursos/${l.course_id}`, label: splitTitle(l.title).unit }}>{splitTitle(l.title).part}</PageTitle>
      <button
        className="btn btn-primary -mt-4 mb-6"
        onClick={() => setEditing({ lesson_id: l.id, type: 'multiple_choice', question: `${list.length + 1}. `, optionsText: '', correct_answer: '', points: 1 })}
      >
        Nuevo ejercicio
      </button>
      {editing && !editing.id && <div className="mb-8"><ExerciseForm initial={editing} onDone={() => setEditing(null)} /></div>}
      <FormError error={del.error} />
      {list.length === 0 && <Empty>Esta lección no tiene ejercicios.</Empty>}
      <ol className="divide-y divide-rule border-y-2 border-ink">
        {list.map((e) =>
          editing?.id === e.id ? (
            <li key={e.id} className="py-3"><ExerciseForm initial={editing} onDone={() => setEditing(null)} /></li>
          ) : (
            <li key={e.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="line-clamp-2">{e.question.split('  —  Texto:')[0]}</p>
                <p className="text-sm text-slate">
                  {TYPE_LABEL[e.type]}
                  {e.correct_answer && <> · correcta: <span className="highlight text-ink">{e.correct_answer}</span></>}
                  {e.type !== 'writing' && !e.correct_answer && <span className="text-mark"> · sin respuesta correcta</span>}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-ghost px-3 py-1 text-sm" onClick={() => setEditing(toDraft(e))}>Editar</button>
                <button className="btn btn-danger px-3 py-1 text-sm" onClick={() => { if (window.confirm('¿Borrar este ejercicio?')) del.mutate(e.id) }}>Borrar</button>
              </div>
            </li>
          ),
        )}
      </ol>
    </div>
  )
}
