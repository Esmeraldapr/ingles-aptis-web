import { useAuth } from '../../hooks/useAuth'
import { useStudentStats, useStudents, useUpdateProfile } from '../../hooks/queries'
import { Empty, ErrorBox, FormError, PageTitle, Spinner } from '../../components/ui'
import type { Profile, Role } from '../../types'

function StatsCells({ id }: { id: string }) {
  const s = useStudentStats(id)
  if (s.isLoading) return <td colSpan={4} className="py-2 text-slate">Cargando…</td>
  if (s.error || !s.data) return <td colSpan={4} className="py-2 text-mark">Sin datos</td>
  return (
    <>
      <td className="py-2 pr-4">{s.data.total_submissions}</td>
      <td className="py-2 pr-4">{s.data.accuracy != null ? `${Math.round(s.data.accuracy)}%` : '—'}</td>
      <td className="py-2 pr-4">{s.data.lessons_completed}</td>
      <td className="py-2 pr-4">{s.data.streak_days} d</td>
    </>
  )
}

function RoleSelect({ p }: { p: Profile }) {
  const { profile } = useAuth()
  const update = useUpdateProfile()
  if (profile?.rol !== 'admin' || p.id === profile.id) return <span>{p.rol}</span>
  return (
    <>
      <select
        className="field py-1"
        aria-label={`Rol de ${p.nombre ?? p.email}`}
        value={p.rol}
        onChange={(e) => update.mutate({ id: p.id, patch: { rol: e.target.value as Role } })}
      >
        <option value="student">student</option>
        <option value="teacher">teacher</option>
        <option value="admin">admin</option>
      </select>
      <FormError error={update.error} />
    </>
  )
}

export default function AdminStudents() {
  const students = useStudents()

  return (
    <div>
      <PageTitle back={{ to: '/admin', label: 'Administración' }}>Alumnos</PageTitle>
      {students.isLoading && <Spinner />}
      {students.error && <ErrorBox error={students.error} retry={() => students.refetch()} />}
      {students.data?.length === 0 && <Empty>Todavía no hay usuarios registrados.</Empty>}
      {students.data && students.data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left">
            <thead className="border-b-2 border-ink text-sm text-slate">
              <tr>
                <th className="py-2 pr-4 font-bold">Nombre</th>
                <th className="py-2 pr-4 font-bold">Nivel</th>
                <th className="py-2 pr-4 font-bold">Rol</th>
                <th className="py-2 pr-4 font-bold">Respuestas</th>
                <th className="py-2 pr-4 font-bold">Aciertos</th>
                <th className="py-2 pr-4 font-bold">Tests</th>
                <th className="py-2 pr-4 font-bold">Racha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {students.data.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 pr-4">
                    <span className="block font-bold">{p.nombre ?? 'Sin nombre'}</span>
                    <span className="text-sm text-slate">{p.email}</span>
                  </td>
                  <td className="py-2 pr-4">{p.nivel_actual ?? '—'}</td>
                  <td className="py-2 pr-4"><RoleSelect p={p} /></td>
                  <StatsCells id={p.id} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
