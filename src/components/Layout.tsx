import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-extrabold">
      <span className="flex gap-1" aria-hidden>
        <span className="size-4 rounded-full border-2 border-ink" />
        <span className="size-4 rounded-full bg-highlight ring-2 ring-ink" />
        <span className="size-4 rounded-full border-2 border-ink" />
      </span>
      Hoja de respuestas
    </Link>
  )
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-1.5 font-bold transition-colors ${isActive ? 'bg-ink text-paper' : 'hover:bg-rule'}`

export function Layout() {
  const { session, isStaff, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const links = session
    ? [
        { to: '/panel', label: 'Mi panel' },
        { to: '/cursos', label: 'Cursos' },
        { to: '/progreso', label: 'Progreso' },
        { to: '/perfil', label: 'Perfil' },
        ...(isStaff ? [{ to: '/admin', label: 'Administración' }] : []),
      ]
    : [{ to: '/cursos', label: 'Cursos' }]

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:bg-paper focus:p-2">
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Logo />
          <button
            className="btn btn-ghost px-3 py-1.5 text-sm md:hidden"
            aria-expanded={open}
            aria-controls="main-nav"
            onClick={() => setOpen((o) => !o)}
          >
            Menú
          </button>
          <nav
            id="main-nav"
            aria-label="Principal"
            className={`${open ? 'flex' : 'hidden'} absolute left-0 right-0 top-full flex-col gap-1 border-b-2 border-ink bg-paper p-3 md:static md:flex md:flex-row md:items-center md:border-0 md:p-0`}
          >
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass} onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            ))}
            {session ? (
              <button
                className="rounded-full px-3 py-1.5 text-left text-slate hover:bg-rule"
                onClick={async () => {
                  await signOut()
                  navigate('/')
                }}
              >
                Cerrar sesión
              </button>
            ) : (
              <>
                <NavLink to="/entrar" className={linkClass} onClick={() => setOpen(false)}>
                  Entrar
                </NavLink>
                <Link to="/registro" className="btn btn-primary text-sm" onClick={() => setOpen(false)}>
                  Crear cuenta
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <Outlet />
      </main>
      <footer className="border-t border-rule py-6 text-center text-sm text-slate">
        Práctica personal del examen Aptis
      </footer>
    </div>
  )
}
