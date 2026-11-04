import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { FormError } from '../components/ui'
import { UKFlag } from '../components/UKFlag'

function AuthCard({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  const { pathname } = useLocation()
  const tabs = pathname === '/entrar' || pathname === '/' || pathname === '/registro'
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,.35)_0%,transparent_45%),radial-gradient(circle_at_85%_80%,rgba(54,236,222,.28)_0%,transparent_45%),linear-gradient(160deg,#140e30_0%,#00203f_55%,#05305e_100%)] px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(54,236,222,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(54,236,222,.07)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 hidden w-72 bg-[url('/circuito-lateral.svg')] bg-no-repeat opacity-70 md:block" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-72 -scale-x-100 bg-[url('/circuito-lateral.svg')] bg-no-repeat opacity-70 md:block" />
      <div aria-hidden className="pointer-events-none absolute left-[8%] top-[12%] hidden rounded-2xl border border-menta/40 bg-ink/60 px-5 py-4 font-mono text-sm leading-relaxed text-menta/90 shadow-[0_0_24px_rgba(54,236,222,.25)] lg:block">
        while (practising) {'{'}<br />&nbsp;&nbsp;improve();<br />{'}'}
      </div>
      <div aria-hidden className="pointer-events-none absolute bottom-[12%] right-[8%] hidden rounded-2xl border border-menta/40 bg-ink/60 px-6 py-4 text-lg font-extrabold leading-snug tracking-wide text-menta/90 shadow-[0_0_24px_rgba(54,236,222,.25)] lg:block">
        ✓ READING<br />✓ LISTENING<br />✓ WRITING<br />✓ SPEAKING
      </div>

      <div className="relative w-full max-w-md rounded-3xl bg-[linear-gradient(160deg,#fbfaff_0%,#f2eefc_55%,#ecebfb_100%)] p-7 shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)] sm:p-9">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-[#012169] ring-4 ring-menta/60"><UKFlag className="h-20 w-32" /></span>
          <p className="mt-3 text-xl font-extrabold text-[#1e1b2e]">Inglés Aptis</p>
          <p className="text-slate">Practica el examen Aptis</p>
        </div>
        {tabs ? (
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-[#ece9fb] p-1 text-sm font-bold">
            <Link to="/entrar" className={`rounded-xl py-2 text-center ${pathname !== '/registro' ? 'bg-white text-[#6d28d9] shadow' : 'text-slate'}`}>Ya tengo cuenta</Link>
            <Link to="/registro" className={`rounded-xl py-2 text-center ${pathname === '/registro' ? 'bg-white text-[#6d28d9] shadow' : 'text-slate'}`}>Crear cuenta</Link>
          </div>
        ) : (
          <h1 className="mb-5 text-2xl">{title}</h1>
        )}
        {tabs && <h1 className="sr-only">{title}</h1>}
        {children}
        {footer && <div className="mt-5 text-center text-sm text-slate">{footer}</div>}
      </div>
    </div>
  )
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <input className="field" {...props} />
    </label>
  )
}

function GoogleButton() {
  const [error, setError] = useState<unknown>(null)
  return (
    <>
      <button
        type="button"
        className="btn btn-ghost w-full"
        onClick={async () => {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/panel` },
          })
          if (error) setError(error)
        }}
      >
        Continuar con Google
      </button>
      <FormError error={error} />
    </>
  )
}

export function Login() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/panel'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  if (session) return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError(error.message === 'Invalid login credentials' ? 'El email o la contraseña no son correctos.' : error)
    else navigate(from, { replace: true })
  }

  return (
    <AuthCard
      title="Entrar"
      footer={<>📖 Tests del curso · ✅ Corrección al momento</>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Contraseña" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <FormError error={error} />
        <button className="btn w-full bg-[linear-gradient(135deg,#7c6ff0_0%,#4fa3e3_100%)] text-white shadow-[0_8px_18px_-6px_rgba(124,111,240,.45)]" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        <Link to="/recuperar" className="block text-center text-sm text-slate underline-offset-4 hover:underline">
          He olvidado mi contraseña
        </Link>
      </form>
      <div className="my-5 border-t border-rule" />
      <GoogleButton />
    </AuthCard>
  )
}

export function Register() {
  const { session } = useAuth()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [sent, setSent] = useState(false)

  if (session) return <Navigate to="/panel" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre }, emailRedirectTo: `${window.location.origin}/panel` },
    })
    setBusy(false)
    if (error) return setError(error)
    if (!data.session) setSent(true)
    // la Edge Function de bienvenida es opcional: si no está desplegada, no bloquea el registro
    supabase.functions.invoke('welcome-email', { body: { email, nombre } }).catch(() => {})
  }

  if (sent) {
    return (
      <AuthCard title="Revisa tu correo">
        <p>
          Te hemos enviado un enlace a <strong>{email}</strong>. Ábrelo para confirmar la cuenta y después vuelve aquí
          para entrar.
        </p>
        <Link to="/entrar" className="btn btn-primary mt-6">Ir a entrar</Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Crear cuenta" footer={<>📖 Tests del curso · ✅ Corrección al momento</>}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nombre" autoComplete="name" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Contraseña (mínimo 8 caracteres)" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <FormError error={error} />
        <button className="btn w-full bg-[linear-gradient(135deg,#7c6ff0_0%,#4fa3e3_100%)] text-white shadow-[0_8px_18px_-6px_rgba(124,111,240,.45)]" disabled={busy}>{busy ? 'Creando cuenta…' : 'Crear cuenta'}</button>
      </form>
      <div className="my-5 border-t border-rule" />
      <GoogleButton />
    </AuthCard>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nueva-contrasena`,
    })
    setBusy(false)
    if (error) setError(error)
    else setSent(true)
  }

  return (
    <AuthCard title="Recuperar contraseña" footer={<Link to="/entrar" className="underline">Volver a entrar</Link>}>
      {sent ? (
        <p>Si existe una cuenta con <strong>{email}</strong>, te llegará un enlace para elegir una contraseña nueva.</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email de tu cuenta" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <FormError error={error} />
          <button className="btn w-full bg-[linear-gradient(135deg,#7c6ff0_0%,#4fa3e3_100%)] text-white shadow-[0_8px_18px_-6px_rgba(124,111,240,.45)]" disabled={busy}>{busy ? 'Enviando…' : 'Enviar enlace'}</button>
        </form>
      )}
    </AuthCard>
  )
}

export function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setError(error)
    else navigate('/panel', { replace: true })
  }

  return (
    <AuthCard title="Nueva contraseña">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Contraseña nueva" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <FormError error={error} />
        <button className="btn w-full bg-[linear-gradient(135deg,#7c6ff0_0%,#4fa3e3_100%)] text-white shadow-[0_8px_18px_-6px_rgba(124,111,240,.45)]" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
      </form>
    </AuthCard>
  )
}
