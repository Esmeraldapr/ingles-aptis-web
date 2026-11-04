import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useCourses, useDelete, useSave } from '../../hooks/queries'
import { Empty, ErrorBox, FormError, PageTitle, Spinner } from '../../components/ui'
import { LEVELS, type Course, type Level } from '../../types'

type Draft = { id?: string; title: string; description: string; level: Level; image_url: string; created_by?: string | null }
const blank: Draft = { title: '', description: '', level: 'B1', image_url: '' }

export function CourseForm({ initial, onDone }: { initial: Draft; onDone: () => void }) {
  const { profile } = useAuth()
  const [d, setD] = useState<Draft>(initial)
  const save = useSave<Draft>('courses', ['courses'])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await save.mutateAsync({
      ...d,
      image_url: d.image_url || '',
      created_by: d.id ? d.created_by : profile?.id ?? null,
    })
    onDone()
  }

  return (
    <form onSubmit={onSubmit} className="sheet grid gap-4 p-5 sm:grid-cols-[1fr_8rem]">
      <label className="block">
        <span className="mb-1 block text-sm font-bold">Título</span>
        <input className="field" required value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-bold">Nivel</span>
        <select className="field" value={d.level} onChange={(e) => setD({ ...d, level: e.target.value as Level })}>
          {LEVELS.map((l) => <option key={l}>{l}</option>)}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-sm font-bold">Descripción</span>
        <textarea className="field min-h-20" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-sm font-bold">URL de imagen (opcional)</span>
        <input className="field" type="url" value={d.image_url} onChange={(e) => setD({ ...d, image_url: e.target.value })} />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button className="btn btn-primary" disabled={save.isPending}>{save.isPending ? 'Guardando…' : d.id ? 'Guardar curso' : 'Crear curso'}</button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancelar</button>
        <FormError error={save.error} />
      </div>
    </form>
  )
}

export const toDraft = (c: Course): Draft => ({
  id: c.id, title: c.title, description: c.description ?? '', level: c.level, image_url: c.image_url ?? '', created_by: c.created_by,
})

export default function AdminHome() {
  const courses = useCourses()
  const del = useDelete('courses', ['courses'])
  const [editing, setEditing] = useState<Draft | null>(null)

  return (
    <div>
      <PageTitle sub="Cursos, lecciones, ejercicios y alumnos.">🛠️ Administración</PageTitle>
      <div className="-mt-4 mb-8 flex flex-wrap gap-3">
        <button className="btn btn-primary" onClick={() => setEditing(blank)}>Nuevo curso</button>
        <Link to="/admin/alumnos" className="btn btn-ghost">Alumnos y estadísticas</Link>
      </div>

      {editing && !editing.id && <div className="mb-8"><CourseForm initial={editing} onDone={() => setEditing(null)} /></div>}

      <h2 className="mb-3 text-2xl font-bold">Cursos</h2>
      {courses.isLoading && <Spinner />}
      {courses.error && <ErrorBox error={courses.error} retry={() => courses.refetch()} />}
      {courses.data?.length === 0 && <Empty>No hay cursos. Crea el primero con «Nuevo curso».</Empty>}
      <FormError error={del.error} />
      <ul className="divide-y-2 divide-rule border-y-2 border-ink">
        {courses.data?.map((c) =>
          editing?.id === c.id ? (
            <li key={c.id} className="py-4"><CourseForm initial={editing} onDone={() => setEditing(null)} /></li>
          ) : (
            <li key={c.id} className="flex flex-wrap items-center gap-3 py-4">
              <span className="rounded-md bg-ink px-2 py-0.5 text-sm font-bold text-paper">{c.level}</span>
              <Link to={`/admin/cursos/${c.id}`} className="flex-1 font-bold underline-offset-4 hover:underline">{c.title}</Link>
              <button className="btn btn-ghost text-sm" onClick={() => setEditing(toDraft(c))}>Editar</button>
              <button
                className="btn btn-danger text-sm"
                disabled={del.isPending}
                onClick={() => {
                  if (window.confirm(`¿Borrar «${c.title}» con todas sus lecciones y ejercicios? No se puede deshacer.`)) del.mutate(c.id)
                }}
              >
                Borrar
              </button>
            </li>
          ),
        )}
      </ul>
    </div>
  )
}
