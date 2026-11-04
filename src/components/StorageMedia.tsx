import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/** Resuelve "storage:bucket/ruta" a una URL firmada (el almacén es privado). */
function useMediaUrl(src: string, enabled: boolean) {
  const [url, setUrl] = useState<string | null>(src.startsWith('storage:') ? null : src)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!enabled || !src.startsWith('storage:')) return
    const path = src.slice('storage:'.length)
    const i = path.indexOf('/')
    supabase.storage
      .from(path.slice(0, i))
      .createSignedUrl(path.slice(i + 1), 60 * 60 * 6)
      .then(({ data, error }) => {
        if (error || !data) setError('No se encuentra el archivo. ¿Está subido al almacén «material»?')
        else setUrl(data.signedUrl)
      })
  }, [src, enabled])
  return { url, error }
}

export function AudioMedia({ src, label }: { src: string; label?: string }) {
  const { url, error } = useMediaUrl(src, true)
  return (
    <figure className="my-4 rounded-xl border border-rule bg-paper p-4">
      <figcaption className="mb-2 font-bold">🎧 {label ?? 'Audio'}</figcaption>
      {error ? <p className="text-sm text-mark">{error}</p> : url ? (
        <audio controls preload="none" src={url} className="w-full">Tu navegador no puede reproducir audio.</audio>
      ) : <p className="text-sm text-slate">Cargando audio…</p>}
    </figure>
  )
}

/** PDF plegable: solo se carga al abrirlo, para que la página vaya rápida. */
export function PdfMedia({ src, label }: { src: string; label?: string }) {
  const [open, setOpen] = useState(false)
  const { url, error } = useMediaUrl(src, open)
  return (
    <details className="my-3 overflow-hidden rounded-xl border border-rule bg-white" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 font-bold hover:bg-paper">
        <span aria-hidden>📄</span>
        <span className="flex-1">{label ?? 'Documento'}</span>
        <span className="text-sm font-semibold text-turquesa-osc">{open ? 'Cerrar' : 'Abrir'}</span>
      </summary>
      {open && (
        <div className="border-t border-rule">
          {error ? <p className="p-4 text-sm text-mark">{error}</p> : url ? (
            <iframe title={label ?? 'Documento'} src={url} className="h-[80vh] w-full bg-white" />
          ) : <p className="p-4 text-sm text-slate">Cargando documento…</p>}
        </div>
      )}
    </details>
  )
}
