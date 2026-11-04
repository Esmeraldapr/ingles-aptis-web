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
        <div className="h-full rounded-full bg-ink" style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}

export function PageTitle({ children, back }: { children: ReactNode; back?: { to: string; label: string } }) {
  return (
    <header className="mb-8">
      {back && (
        <Link to={back.to} className="mb-3 inline-block text-sm text-slate underline-offset-4 hover:underline">
          ← {back.label}
        </Link>
      )}
      <h1 className="text-[2.1rem] font-extrabold sm:text-[2.6rem]">{children}</h1>
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
