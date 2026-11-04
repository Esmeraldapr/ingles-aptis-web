import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { errorMessage } from '../lib/supabase'
import { SKILL_LABEL } from '../lib/lessons'
import type { Skill } from '../types'

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-10 text-slate">
      <span className="inline-block size-5 animate-spin rounded-full border-[3px] border-rule border-t-ink" aria-hidden />
      <span>{label}</span>
    </div>
  )
}

export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div role="alert" className="my-6 rounded-xl border-2 border-mark/40 bg-mark/5 p-4 text-mark">
      <p className="font-bold">No se pudo cargar.</p>
      <p className="text-sm">{errorMessage(error)}</p>
      {retry && (
        <button className="btn btn-danger mt-3 text-sm" onClick={retry}>
          Reintentar
        </button>
      )}
    </div>
  )
}

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="sheet my-6 flex flex-col items-start gap-3 p-6">
      <p className="text-slate">{children}</p>
      {action}
    </div>
  )
}

const SKILL_CLASS: Record<Skill, string> = {
  grammar: 'text-grammar border-grammar',
  reading: 'text-reading border-reading',
  listening: 'text-listening border-listening',
  writing: 'text-writing border-writing',
  speaking: 'text-speaking border-speaking',
  teoria: 'text-slate border-slate',
}

export function SkillTag({ skill }: { skill: Skill }) {
  return (
    <span className={`inline-block rounded-full border-[1.5px] px-2.5 py-0.5 text-xs font-bold ${SKILL_CLASS[skill]}`}>
      {SKILL_LABEL[skill]}
    </span>
  )
}

export function SkillDot({ skill }: { skill: Skill }) {
  const bg: Record<Skill, string> = {
    grammar: 'bg-grammar', reading: 'bg-reading', listening: 'bg-listening',
    writing: 'bg-writing', speaking: 'bg-speaking', teoria: 'bg-slate',
  }
  return <span className={`inline-block size-2.5 shrink-0 rounded-full ${bg[skill]}`} aria-hidden />
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-rule"
        role="progressbar"
        aria-valuenow={Math.round(v)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#14b8a6_0%,#36ecde_60%,#3b82f6_100%)]" style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}

export function PageTitle({ children, back, sub }: { children: ReactNode; back?: { to: string; label: string }; sub?: ReactNode }) {
  return (
    <header className="mb-8">
      {back && (
        <Link to={back.to} className="mb-3 inline-block text-sm text-slate underline-offset-4 hover:underline">
          ← {back.label}
        </Link>
      )}
      <h1 className="text-[1.8rem] sm:text-[2.1rem]">{children}</h1>
      {sub && <p className="mt-1 text-slate">{sub}</p>}
    </header>
  )
}

export function FormError({ error }: { error: unknown }) {
  if (!error) return null
  return (
    <p role="alert" className="rounded-lg bg-mark/10 px-3 py-2 text-sm text-mark">
      {errorMessage(error)}
    </p>
  )
}

const TILE_BG: Record<string, string> = {
  teal: 'bg-[linear-gradient(135deg,#0f766e_0%,#0b3a6b_100%)] [--accent:#36ecde]',
  blue: 'bg-[linear-gradient(135deg,#1e3a8a_0%,#0b3a6b_100%)] [--accent:#3b82f6]',
  pink: 'bg-[linear-gradient(135deg,#6b2a5e_0%,#1e2a5e_100%)] [--accent:#ec4899]',
  amber: 'bg-[linear-gradient(135deg,#5a4a1a_0%,#1e2a4a_100%)] [--accent:#fbbf24]',
}

export function StatTile({ icon, value, label, tone }: { icon: string; value: string; label: string; tone: keyof typeof TILE_BG }) {
  return (
    <div className={`stat-tile ${TILE_BG[tone]}`}>
      <span className="text-2xl" aria-hidden>{icon}</span>
      <p className="mt-2 text-3xl font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-sm font-semibold text-white/85">{label}</p>
    </div>
  )
}

export const SKILL_ACCENT: Record<Skill, string> = {
  grammar: '#3b82f6', reading: '#14b8a6', listening: '#a855f7', writing: '#f97316', speaking: '#ec4899', teoria: '#36ecde',
}
export const SKILL_ICON: Record<Skill, string> = {
  grammar: '📝', reading: '📖', listening: '🎧', writing: '✍️', speaking: '🗣️', teoria: '📘',
}

export function ActionCard({ to, icon, title, text, cta, accent = '#36ecde', headHeight = 'h-20' }: {
  to: string; icon: string; title: string; text?: string; cta: string; accent?: string; headHeight?: string
}) {
  return (
    <Link to={to} className="neon-card group" style={{ ['--accent' as string]: accent }}>
      <div className={`neon-head ${headHeight} justify-start px-5`}>
        <span className="relative text-3xl drop-shadow-[0_0_10px_rgba(54,236,222,.6)]" aria-hidden>{icon}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-5">
        <h3 className="text-lg">{title}</h3>
        {text && <p className="flex-1 text-sm text-slate">{text}</p>}
        <span className="mt-2 self-end font-bold text-turquesa-osc group-hover:text-turquesa">{cta} →</span>
      </div>
    </Link>
  )
}
