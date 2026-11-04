import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnswerBubbles } from '../components/AnswerBubbles'
import { SkillDot } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { useCourses } from '../hooks/queries'
import type { Skill } from '../types'

const DEMO = {
  question: 'My sister ____ tidies her room.',
  options: ['every day', 'always', 'twice a week'],
  correct: 'always',
  why: 'Los adverbios de frecuencia de una palabra (always, never, often…) van antes del verbo principal.',
}

const SKILLS: { skill: Skill; title: string; text: string }[] = [
  { skill: 'grammar', title: 'Grammar & Vocabulary', text: '50 preguntas por unidad: tiempos verbales, sinónimos, definiciones y collocations.' },
  { skill: 'reading', title: 'Reading', text: 'Huecos en emails, ordenar frases y emparejar opiniones, como en el examen.' },
  { skill: 'listening', title: 'Listening', text: 'Preguntas de cada audio, con la parte del examen a la que corresponden.' },
  { skill: 'writing', title: 'Writing', text: 'Las cuatro partes con límite de palabras y una respuesta modelo para comparar.' },
  { skill: 'speaking', title: 'Speaking', text: 'Los tests de cada unidad enlazados para practicar en voz alta.' },
]

function Demo() {
  const [selected, setSelected] = useState<string | null>(null)
  const done = selected !== null
  return (
    <div className="sheet relative p-5 shadow-[6px_6px_0_var(--color-ink)] sm:p-7">
      <p className="text-sm text-slate">Pregunta 1 de 50 · Unit 1: Present Simple</p>
      <p className="mt-3 text-xl font-bold">{DEMO.question}</p>
      <AnswerBubbles
        name="demo"
        options={DEMO.options}
        selected={selected}
        result={done ? { correct: DEMO.correct, isCorrect: selected === DEMO.correct } : null}
        disabled={done}
        onSelect={setSelected}
      />
      <div aria-live="polite" className="mt-4 min-h-[3.5rem] text-sm">
        {done ? (
          <p>
            <strong className={selected === DEMO.correct ? 'text-ok' : 'text-mark'}>
              {selected === DEMO.correct ? 'Correcto.' : 'No es esa.'}
            </strong>{' '}
            {DEMO.why}{' '}
            <button className="underline underline-offset-4" onClick={() => setSelected(null)}>
              Probar otra vez
            </button>
          </p>
        ) : (
          <p className="text-slate">Elige una opción para ver la corrección.</p>
        )}
      </div>
    </div>
  )
}

export default function Landing() {
  const { session } = useAuth()
  const courses = useCourses()

  return (
    <div className="space-y-20">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="text-[2.6rem] font-extrabold leading-[1.02] sm:text-[3.6rem]">
            Practica el Aptis pregunta a pregunta, con la corrección al momento.
          </h1>
          <p className="mt-5 max-w-[34rem] text-lg text-slate">
            Los tests de las 12 unidades del curso en un solo sitio: respondes, ves la solución y tu progreso se guarda
            para que sepas qué repasar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {session ? (
              <Link to="/panel" className="btn btn-primary">Ir a mi panel</Link>
            ) : (
              <>
                <Link to="/registro" className="btn btn-primary">Crear cuenta</Link>
                <Link to="/entrar" className="btn btn-ghost">Ya tengo cuenta</Link>
              </>
            )}
          </div>
        </div>
        <Demo />
      </section>

      <section aria-labelledby="destrezas">
        <h2 id="destrezas" className="text-3xl font-extrabold">Las cinco partes del examen</h2>
        <ul className="mt-6 divide-y-2 divide-rule border-y-2 border-ink">
          {SKILLS.map((s) => (
            <li key={s.skill} className="grid gap-1 py-4 sm:grid-cols-[16rem_1fr] sm:items-baseline">
              <span className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl font-bold">
                <SkillDot skill={s.skill} /> {s.title}
              </span>
              <span className="text-slate">{s.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cursos">
        <h2 id="cursos" className="text-3xl font-extrabold">Cursos</h2>
        {courses.isLoading && <p className="mt-4 text-slate">Cargando cursos…</p>}
        {courses.data && courses.data.length > 0 && (
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {courses.data.slice(0, 4).map((c) => (
              <li key={c.id} className="sheet p-6">
                <span className="rounded-md bg-ink px-2 py-0.5 text-sm font-bold text-paper">{c.level}</span>
                <h3 className="mt-3 text-2xl font-bold">{c.title}</h3>
                <p className="mt-2 text-slate">{c.description}</p>
                <Link to={session ? `/cursos/${c.id}` : '/registro'} className="btn btn-ghost mt-5 text-sm">
                  {session ? 'Ver curso' : 'Crear cuenta para empezar'}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {(courses.isError || courses.data?.length === 0) && (
          <p className="mt-4 text-slate">Crea una cuenta para ver los cursos disponibles.</p>
        )}
      </section>
    </div>
  )
}
