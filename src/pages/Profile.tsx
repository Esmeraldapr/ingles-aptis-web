import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useMyHistory, useUpdateProfile } from '../hooks/queries'
import { supabase } from '../lib/supabase'
import { ErrorBox, FormError, PageTitle, Spinner } from '../components/ui'
import { LEVELS, type Level } from '../types'

function Saved({ show }: { show: boolean }) {
  return <span aria-live="polite" className="text-sm font-bold text-ok">{show ? 'Guardado' : ''}</span>
}

export default function ProfilePage() {
  const { profile, session } = useAuth()
  const update = useUpdateProfile()
  const history = useMyHistory(profile?.id)

  const [nombre, setNombre] = useState('')
  const [nivel, setNivel] = useState<Level>('A1')
  const [avatar, setAvatar] = useState('')
  const [saved, setSaved] = useState(false)

  const [pw, setPw] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState<unknown>(null)
  const [pwSaved, setPwSaved] = useState(false)

  useEffect(() => {
    if (!profile) return
    setNombre(profile.nombre ?? '')
    setNivel(profile.nivel_actual ?? 'A1')
    setAvatar(profile.avatar_url ?? '')
  }, [profile])

  if (!profile) return <Spinner />

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    setSaved(false)
    await update.mutateAsync({ id: profile!.id, patch: { nombre, nivel_actual: nivel, avatar_url: avatar || null } })
    setSaved(true)
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault()
    setPwSaved(false)
    if (pw.length < 8) return setPwError('La contraseña debe tener al menos 8 caracteres.')
    setPwBusy(true)
    setPwError(null)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setPwBusy(false)
    if (error) setPwError(error)
    else { setPw(''); setPwSaved(true) }
  }

  return (
    <div>
      <PageTitle>Mi perfil</PageTitle>
      <div className="grid gap-8 lg:grid-cols-2">
        <form onSubmit={saveProfile} className="sheet space-y-4 p-6">
          <h2 className="text-xl font-bold">Datos</h2>
          <p className="text-sm text-slate">{session?.user.email} · {profile.rol === 'student' ? 'Alumno' : profile.rol === 'teacher' ? 'Profesor' : 'Administrador'}</p>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">Nombre</span>
            <input className="field" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">Nivel actual</span>
            <select className="field" value={nivel} onChange={(e) => setNivel(e.target.value as Level)}>
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">URL de la foto (opcional)</span>
            <input className="field" type="url" value={avatar} onChange={(e) => setAvatar(e.target.value)} />
          </label>
          <FormError error={update.error} />
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" disabled={update.isPending}>{update.isPending ? 'Guardando…' : 'Guardar datos'}</button>
            <Saved show={saved} />
          </div>
        </form>

        <form onSubmit={savePassword} className="sheet space-y-4 p-6">
          <h2 className="text-xl font-bold">Cambiar contraseña</h2>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">Contraseña nueva</span>
            <input className="field" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>
          <FormError error={pwError} />
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" disabled={pwBusy || !pw}>{pwBusy ? 'Guardando…' : 'Cambiar contraseña'}</button>
            <Saved show={pwSaved} />
          </div>
        </form>
      </div>

      <section className="mt-12" aria-labelledby="hist">
        <h2 id="hist" className="text-2xl font-bold">Historial</h2>
        <p className="text-sm text-slate">Tus últimas 50 respuestas</p>
        {history.isLoading && <Spinner />}
        {history.error && <ErrorBox error={history.error} retry={() => history.refetch()} />}
        {history.data?.length === 0 && <p className="mt-3 text-slate">Aún no has respondido ninguna pregunta.</p>}
        <ul className="mt-4 divide-y divide-rule">
          {history.data?.map((h) => (
            <li key={h.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:gap-4">
              <div>
                <p className="line-clamp-2">{h.exercises?.question.replace(/^\d+\.\s*/, '').split('  —  Texto:')[0]}</p>
                <p className="text-sm text-slate">Tu respuesta: <span className="text-ink">{(h.answer ?? '').slice(0, 120)}</span></p>
              </div>
              <div className="flex items-center gap-3 text-sm sm:flex-col sm:items-end">
                <span className={h.is_correct === true ? 'font-bold text-ok' : h.is_correct === false ? 'font-bold text-mark' : 'text-slate'}>
                  {h.is_correct === true ? 'Correcta' : h.is_correct === false ? 'Incorrecta' : 'Sin corregir'}
                </span>
                <time className="text-slate" dateTime={h.submitted_at}>
                  {new Date(h.submitted_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                </time>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
