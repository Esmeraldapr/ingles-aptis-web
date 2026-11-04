import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useExercises, useLesson, useMyLessonSubmissions, useMyProgress, useSubmitAnswer } from '../hooks/queries'
import { AnswerBubbles } from '../components/AnswerBubbles'
import { Markdown } from '../components/Markdown'
import { ErrorBox, FormError, PageTitle, SkillTag, Spinner } from '../components/ui'
import { hasOwnContent, isExternalCampus, skillOf, splitEmail, splitPassage, splitTitle, wordCount } from '../lib/lessons'
import type { Exercise, WritingOptions } from '../types'

type Answer = { value: string; isCorrect: boolean | null; correct: string | null }

const num = (q: string) => parseInt(q.match(/^(\d+)\./)?.[1] ?? '9999', 10)
const stripNum = (q: string) => q.replace(/^\d+\.\s*/, '')

function wordLimit(q: string): [number, number] | null {
  const m = q.match(/\[\s*(\d+)\s*[-–]\s*(\d+)\s*words?\s*\]/i)
  if (m) return [Number(m[1]), Number(m[2])]
  const m2 = q.match(/(\d+)\s*[–-]\s*(\d+)\s*words/i)
  if (m2) return [Number(m2[1]), Number(m2[2])]
  const m3 = q.match(/about\s+(\d+)\s+words/i)
  if (m3) return [Math.round(Number(m3[1]) * 0.8), Math.round(Number(m3[1]) * 1.2)]
  return null
}

function WritingTask({ ex, answer, onSubmit, busy }: {
  ex: Exercise; answer?: Answer; onSubmit: (v: string) => void; busy: boolean
}) {
  const [text, setText] = useState(answer?.value ?? '')
  useEffect(() => setText(answer?.value ?? ''), [ex.id, answer?.value])
  const { question, email } = splitEmail(stripNum(ex.question))
  const limit = wordLimit(question)
  const wc = wordCount(text)
  const model = (ex.options as WritingOptions | null)?.respuesta_modelo
  const outOfRange = limit && wc > 0 && (wc < limit[0] || wc > limit[1])

  return (
    <div>
      {email && (
        <blockquote className="mb-4 whitespace-pre-line rounded-xl border-l-4 border-writing bg-writing/5 p-4 text-[0.95rem]">
          {email}
        </blockquote>
      )}
      <p className="text-xl font-bold">{question}</p>
      <label className="mt-4 block">
        <span className="sr-only">Tu respuesta</span>
        <textarea
          className="field min-h-40 font-[inherit]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
        />
      </label>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className={outOfRange ? 'font-bold text-mark' : 'text-slate'}>
          {wc} palabras{limit && ` · objetivo ${limit[0]}–${limit[1]}`}
        </span>
        <button className="btn btn-primary" disabled={!text.trim() || busy} onClick={() => onSubmit(text)}>
          {answer ? 'Guardar de nuevo' : 'Guardar respuesta'}
        </button>
      </div>
      {answer && model && (
        <details className="mt-5 rounded-xl bg-paper p-4" open>
          <summary className="cursor-pointer font-bold">Respuesta modelo para comparar</summary>
          <p className="mt-2 whitespace-pre-line">{model}</p>
        </details>
      )}
    </div>
  )
}

export default function LessonView() {
  const { lessonId } = useParams()
  const { profile } = useAuth()
  const lesson = useLesson(lessonId)
  const exercises = useExercises(lessonId)
  const subs = useMyLessonSubmissions(profile?.id, lessonId)
  const progress = useMyProgress(profile?.id)
  const submit = useSubmitAnswer()

  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [idx, setIdx] = useState(0)
  const [pending, setPending] = useState<string | null>(null)

  const list = useMemo(
    () => [...(exercises.data ?? [])].sort((a, b) => num(a.question) - num(b.question)),
    [exercises.data],
  )

  // Cargar las últimas respuestas guardadas
  useEffect(() => {
    if (!subs.data || !exercises.data) return
    const byId = new Map(exercises.data.map((e) => [e.id, e]))
    const latest: Record<string, Answer> = {}
    for (const s of subs.data) {
      if (latest[s.exercise_id]) continue
      latest[s.exercise_id] = { value: s.answer ?? '', isCorrect: s.is_correct, correct: byId.get(s.exercise_id)?.correct_answer ?? null }
    }
    setAnswers(latest)
  }, [subs.data, exercises.data])

  useEffect(() => setIdx(0), [lessonId])

  if (lesson.isLoading || exercises.isLoading) return <Spinner />
  if (lesson.error) return <ErrorBox error={lesson.error} retry={() => lesson.refetch()} />
  if (exercises.error) return <ErrorBox error={exercises.error} retry={() => exercises.refetch()} />

  const l = lesson.data!
  const { unit, part } = splitTitle(l.title)
  const skill = skillOf(l.title)
  const ex = list[idx]
  const answered = list.filter((e) => answers[e.id]).length
  const gradable = list.filter((e) => e.type !== 'writing' && e.correct_answer)
  const right = gradable.filter((e) => answers[e.id]?.isCorrect).length
  const score = progress.data?.find((p) => p.lesson_id === l.id)?.score

  async function answer(e: Exercise, value: string) {
    setPending(e.id)
    try {
      const r = await submit.mutateAsync({ exerciseId: e.id, answer: value })
      setAnswers((a) => ({ ...a, [e.id]: { value, isCorrect: r.is_correct, correct: r.correct_answer } }))
    } finally {
      setPending(null)
    }
  }

  let passage = ex ? splitPassage(stripNum(ex.question)) : null
  // Reading parte 1: los huecos "(2)", "(3)"… usan el texto de la primera pregunta
  if (passage && !passage.passage && /^\(\d+\)$/.test(passage.question.trim()) && list[0]) {
    passage = { question: `Hueco ${passage.question.trim()}`, passage: stripNum(list[0].question) }
  }
  const options = ex && Array.isArray(ex.options) ? ex.options : []
  const a = ex ? answers[ex.id] : undefined

  return (
    <div>
      <PageTitle back={{ to: `/cursos/${l.course_id}`, label: unit }}>{part}</PageTitle>
      <div className="-mt-5 mb-8"><SkillTag skill={skill} /></div>

      {hasOwnContent(l.content, null) && (
        <section className="sheet mb-8 p-6"><Markdown source={l.content!} skipFirstHeading /></section>
      )}
      {l.video_url && !isExternalCampus(l.video_url) && (
        <video controls preload="metadata" src={l.video_url} className="mb-8 w-full rounded-xl bg-black" />
      )}
      {list.length === 0 && !hasOwnContent(l.content, l.video_url) && (
        <p className="sheet p-6 text-slate">Esta lección todavía no tiene material.</p>
      )}

      {list.length > 0 && (
        <>

          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 text-sm text-slate">
            <span>{answered} de {list.length} respondidas</span>
            {gradable.length > 0 && (
              <span>
                Aciertos: <strong className="text-ink">{right}</strong> / {gradable.length}
                {score != null && ` · nota ${Math.round(score)}%`}
              </span>
            )}
          </div>

          {/* navegador de preguntas, como la parrilla de la hoja de respuestas */}
          <nav aria-label="Preguntas" className="mb-6">
            <ol className="flex flex-wrap gap-1.5">
              {list.map((e, i) => {
                const ans = answers[e.id]
                const cls = !ans
                  ? 'border-rule bg-white text-slate'
                  : ans.isCorrect === true ? 'border-ok bg-ok text-white'
                  : ans.isCorrect === false ? 'border-mark bg-mark text-white'
                  : 'border-ink bg-ink text-paper'
                return (
                  <li key={e.id}>
                    <button
                      onClick={() => setIdx(i)}
                      aria-current={i === idx ? 'step' : undefined}
                      aria-label={`Pregunta ${i + 1}${ans ? (ans.isCorrect ? ', correcta' : ans.isCorrect === false ? ', incorrecta' : ', respondida') : ''}`}
                      className={`size-9 rounded-full border-2 text-sm font-bold ${cls} ${i === idx ? 'ring-4 ring-highlight' : ''}`}
                    >
                      {i + 1}
                    </button>
                  </li>
                )
              })}
            </ol>
          </nav>

          {ex && (
            <article className="sheet p-5 sm:p-8" aria-labelledby="q-title">
              <p className="text-sm text-slate" id="q-title">Pregunta {idx + 1} de {list.length}</p>

              {ex.type === 'writing' ? (
                <div className="mt-3">
                  <WritingTask ex={ex} answer={a} busy={pending === ex.id} onSubmit={(v) => answer(ex, v)} />
                </div>
              ) : (
                <>
                  {passage?.passage && (
                    <blockquote className="mt-3 rounded-xl border-l-4 border-reading bg-reading/5 p-4 text-[0.95rem] leading-relaxed">
                      {passage.passage}
                    </blockquote>
                  )}
                  <p className="mt-4 text-xl font-bold">{passage?.question}</p>
                  {options.length > 0 ? (
                    <AnswerBubbles
                      name={ex.id}
                      options={options}
                      selected={a?.value ?? null}
                      result={a ? { correct: a.correct, isCorrect: a.isCorrect } : null}
                      disabled={!!a || pending === ex.id}
                      onSelect={(v) => answer(ex, v)}
                    />
                  ) : (
                    <FillBlank key={ex.id} disabled={!!a || pending === ex.id} onSubmit={(v) => answer(ex, v)} />
                  )}
                  <div aria-live="polite" className="mt-4 min-h-6 text-sm">
                    {pending === ex.id && <span className="text-slate">Corrigiendo…</span>}
                    {a && a.isCorrect === true && <strong className="text-ok">Correcto.</strong>}
                    {a && a.isCorrect === false && (
                      <span><strong className="text-mark">Incorrecto.</strong> La respuesta es <span className="highlight font-bold">{a.correct}</span>.</span>
                    )}
                    {a && a.isCorrect === null && (
                      <span className="text-slate">Esta pregunta no tiene solución confirmada: compruébala con el audio.</span>
                    )}
                  </div>
                  {a && (
                    <button
                      className="mt-2 text-sm text-slate underline underline-offset-4"
                      onClick={() => setAnswers((s) => { const n = { ...s }; delete n[ex.id]; return n })}
                    >
                      Responder otra vez
                    </button>
                  )}
                </>
              )}
              <FormError error={submit.error} />
            </article>
          )}

          <div className="mt-6 flex justify-between gap-3">
            <button className="btn btn-ghost" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}>Anterior</button>
            {idx < list.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setIdx((i) => i + 1)}>Siguiente</button>
            ) : (
              <Link to={`/cursos/${l.course_id}`} className="btn btn-primary">Terminar</Link>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function FillBlank({ disabled, onSubmit }: { disabled: boolean; onSubmit: (v: string) => void }) {
  const [v, setV] = useState('')
  return (
    <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (v.trim()) onSubmit(v.trim()) }}>
      <label className="flex-1">
        <span className="sr-only">Tu respuesta</span>
        <input className="field" value={v} onChange={(e) => setV(e.target.value)} disabled={disabled} />
      </label>
      <button className="btn btn-primary" disabled={disabled || !v.trim()}>Comprobar</button>
    </form>
  )
}
