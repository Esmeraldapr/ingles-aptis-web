import type { ReactNode } from 'react'
import { isExternalCampus } from '../lib/lessons'
import { AudioMedia, ImageMedia, PdfMedia } from './StorageMedia'

/** Renderizador mínimo para el contenido de las lecciones: títulos, listas y enlaces. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1]) {
      out.push(
        <a key={m.index} href={m[2]} target="_blank" rel="noreferrer" className="font-bold underline underline-offset-4">
          {m[1]}
        </a>,
      )
    } else out.push(<strong key={m.index}>{m[3]}</strong>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Markdown({ source, skipFirstHeading = false }: { source: string; skipFirstHeading?: boolean }) {
  const blocks: ReactNode[] = []
  let list: string[] = []
  let skipped = false
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={`l${blocks.length}`} className="my-3 list-disc space-y-1 pl-6">
          {list.map((li, i) => <li key={i}>{inline(li)}</li>)}
        </ul>,
      )
      list = []
    }
  }
  for (const raw of source.split('\n')) {
    const line = raw.trimEnd()
    if (isExternalCampus(line)) continue
    // Material incrustado: [[pdf:URL|Título]] y [[audio:URL|Título]]
    const media = line.match(/^\[\[(pdf|audio|img):([^|\]]+?)(?:\|(.+))?\]\]$/)
    if (media) {
      flush()
      const [, kind, url, label] = media
      blocks.push(
        kind === 'audio'
          ? <AudioMedia key={blocks.length} src={url} label={label} />
          : kind === 'img'
            ? <ImageMedia key={blocks.length} src={url} label={label} />
            : <PdfMedia key={blocks.length} src={url} label={label} />,
      )
      continue
    }
    if (line.startsWith('- ')) { list.push(line.slice(2)); continue }
    flush()
    if (line.startsWith('## ')) {
      if (skipFirstHeading && !skipped) { skipped = true; continue }
      blocks.push(<h2 key={blocks.length} className="mt-6 text-2xl font-bold">{inline(line.slice(3))}</h2>)
    } else if (line.startsWith('### ')) {
      blocks.push(<h3 key={blocks.length} className="mt-5 text-lg font-bold">{inline(line.slice(4))}</h3>)
    } else if (line.startsWith('> ')) {
      blocks.push(<blockquote key={blocks.length} className="my-2 rounded-lg border-l-4 border-turquesa bg-paper px-4 py-2 text-[0.95rem]">{inline(line.slice(2))}</blockquote>)
    } else if (line.trim()) {
      blocks.push(<p key={blocks.length} className="my-2">{inline(line)}</p>)
    }
  }
  flush()
  return <div>{blocks}</div>
}
