import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useCourses } from '../hooks/queries'
import { useAuth } from '../hooks/useAuth'
import { Empty, ErrorBox, PageTitle, Spinner } from '../components/ui'
import { UKFlag } from '../components/UKFlag'
import { LEVELS, type Level } from '../types'

export default function Catalog() {
  const { session } = useAuth()
  const courses = useCourses()
  const [level, setLevel] = useState<Level | 'all'>('all')
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (courses.data ?? []).filter(
      (c) =>
        (level === 'all' || c.level === level) &&
        (!term || c.title.toLowerCase().includes(term) || (c.description ?? '').toLowerCase().includes(term)),
    )
  }, [courses.data, level, q])

  if (session && courses.data?.length === 1) return <Navigate to={`/cursos/${courses.data[0].id}`} replace />

  return (
    <div>
      <PageTitle sub="Elige un curso y practica por unidades o por destreza.">📚 Cursos</PageTitle>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="block flex-1">
          <span className="mb-1 block text-sm font-bold">Buscar</span>
          <input className="field" type="search" placeholder="Título o tema" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <fieldset>
          <legend className="mb-1 text-sm font-bold">Nivel</legend>
          <div className="flex flex-wrap gap-1.5">
            {(['all', ...LEVELS] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={level === l}
                onClick={() => setLevel(l)}
                className="pill-tab"
              >
                {l === 'all' ? 'Todos' : l}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {courses.isLoading && <Spinner />}
      {courses.error && <ErrorBox error={courses.error} retry={() => courses.refetch()} />}
      {!session && !courses.isLoading && (courses.data ?? []).length === 0 && (
        <Empty action={<Link to="/entrar" className="btn btn-primary">Entrar</Link>}>Entra en tu cuenta para ver los cursos.</Empty>
      )}
      {session && courses.data && filtered.length === 0 && <Empty>Ningún curso coincide con esa búsqueda.</Empty>}

      <ul className="grid gap-5 md:grid-cols-2">
        {filtered.map((c) => (
          <li key={c.id}>
            <Link to={session ? `/cursos/${c.id}` : '/entrar'} className="neon-card h-full">
              <div className="neon-head h-32 flex-col gap-1">
                <span className="relative overflow-hidden rounded-md ring-2 ring-menta"><UKFlag className="h-10 w-16" /></span>
                <span className="relative rounded-md border border-menta px-2 text-sm font-bold text-menta">{c.level}</span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="text-xl">{c.title}</h2>
                <p className="mt-1 flex-1 text-sm text-slate">{c.description}</p>
                <span className="btn btn-primary mt-4 w-full">Entrar al curso</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
