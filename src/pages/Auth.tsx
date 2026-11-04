import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { FormError } from '../components/ui'

function AuthCard({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md">
      <div className="sheet p-6 shadow-[6px_6px_0_var(--color-ink)] sm:p-8">
        <h1 className="text-3xl font-extrabold">{title}</h1>
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-5 text-center text-sm text-slate">{footer}</div>}
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
      footer={<>¿Aún no tienes cuenta? <Link to="/registro" className="font-bold underline">Crear cuenta</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Contraseña" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <FormError error={error} />
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
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
    <AuthCard title="Crear cuenta" footer={<>¿Ya tienes cuenta? <Link to="/entrar" className="font-bold underline">Entrar</Link></>}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nombre" autoComplete="name" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Contraseña (mínimo 8 caracteres)" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <FormError error={error} />
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Creando cuenta…' : 'Crear cuenta'}</button>
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
          <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Enviando…' : 'Enviar enlace'}</button>
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
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
      </form>
    </AuthCard>
  )
}
