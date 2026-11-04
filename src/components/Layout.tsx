import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { UKFlag } from './UKFlag'

const NAV = [
  { to: '/cursos', label: 'Curso APTIS', icon: '📚' },
  { to: '/panel', label: 'Mi resumen', icon: '🏠' },
  { to: '/progreso', label: 'Mi progreso', icon: '📊' },
  { to: '/perfil', label: 'Mi perfil', icon: '👤' },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl border px-3 py-2.5 font-semibold whitespace-nowrap transition ${
    isActive
      ? 'border-menta bg-menta text-ink shadow-[0_0_14px_rgba(54,236,222,.6)]'
      : 'border-transparent text-white/90 hover:border-menta/25 hover:bg-menta/10 hover:text-menta'
  }`

/** Páginas sin menú lateral (portada y acceso) */
const PUBLIC = ['/', '/entrar', '/registro', '/recuperar', '/nueva-contrasena']

export function Layout() {
  const { session, profile, isStaff, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  if (!session || PUBLIC.includes(pathname)) {
    return (
      <main id="main" className="min-h-screen">
        <Outlet />
      </main>
    )
  }

  const links = isStaff ? [...NAV, { to: '/admin', label: 'Administración', icon: '🛠️' }] : NAV

  return (
    <div className="min-h-screen lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:bg-white focus:p-2">
        Saltar al contenido
      </a>
      <aside
        className="sticky top-0 z-30 flex flex-col gap-4 border-b-2 border-menta bg-[radial-gradient(circle_at_0%_0%,rgba(54,236,222,.16)_0%,transparent_40%),linear-gradient(180deg,#00203f_0%,#05305e_100%)] px-4 py-4 text-white shadow-[4px_0_18px_-8px_rgba(54,236,222,.45)] lg:h-screen lg:w-64 lg:shrink-0 lg:border-r-2 lg:border-b-0 lg:py-6"
      >
        <NavLink to="/cursos" className="flex items-center gap-2.5 px-1 text-lg font-extrabold">
          <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-[#012169] ring-2 ring-menta"><UKFlag className="h-9 w-14" /></span>
          Inglés Aptis
        </NavLink>
        <nav aria-label="Principal" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:flex-col lg:overflow-visible">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              <span aria-hidden>{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden flex-col gap-3 border-t border-menta/25 pt-4 text-sm lg:mt-auto lg:flex">
          <span className="truncate">👋 {profile?.nombre ?? session.user.email}</span>
          <span className="text-xs text-white/70">✅ Nivel {profile?.nivel_actual ?? 'A1'}</span>
          <button
            className="w-fit rounded-xl border border-menta/35 bg-white/5 px-4 py-2 font-semibold hover:bg-menta/20 hover:text-menta"
            onClick={async () => {
              await signOut()
              navigate('/')
            }}
          >
            Salir
          </button>
        </div>
      </aside>
      <main id="main" className="circuitos min-w-0 flex-1 px-4 py-8 sm:px-8 lg:py-10">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
        <div className="mt-10 flex justify-center lg:hidden">
          <button
            className="btn btn-ghost text-sm"
            onClick={async () => {
              await signOut()
              navigate('/')
            }}
          >
            Salir
          </button>
        </div>
      </main>
    </div>
  )
}
