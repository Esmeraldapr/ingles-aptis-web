import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCourses } from '../hooks/queries'
import { useAuth } from '../hooks/useAuth'
import { Empty, ErrorBox, PageTitle, Spinner } from '../components/ui'
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

  return (
    <div>
      <PageTitle>Cursos</PageTitle>

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
                className={`rounded-full border-2 px-3 py-1 text-sm font-bold ${level === l ? 'border-ink bg-ink text-paper' : 'border-rule bg-white hover:border-ink'}`}
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
          <li key={c.id} className="sheet flex flex-col p-6">
            <span className="w-fit rounded-md bg-ink px-2 py-0.5 text-sm font-bold text-paper">{c.level}</span>
            <h2 className="mt-3 text-2xl font-bold">{c.title}</h2>
            <p className="mt-2 flex-1 text-slate">{c.description}</p>
            <Link to={session ? `/cursos/${c.id}` : '/entrar'} className="btn btn-ghost mt-5 w-fit text-sm">
              Ver curso
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
