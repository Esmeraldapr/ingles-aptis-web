import type { Lesson, Skill } from '../types'

/** Los títulos de lección tienen la forma "Unidad — Parte". */
const SMALL = new Set(['and', 'or', 'of', 'the', 'to', 'in', 'on', 'at', 'vs.', 'a'])

/** "GRAMMAR AND VOCABULARY TEST 1 [NUEVO]" -> "Grammar and Vocabulary Test 1" */
export function prettyPart(part: string): string {
  const clean = part.replace(/\s*\[nuevo\]\s*/i, '').trim()
  if (clean !== clean.toUpperCase()) return clean
  return clean
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
    .replace(/\bEd\b/g, 'ED')
}

export function splitTitle(title: string): { unit: string; part: string } {
  const i = title.indexOf(' — ')
  if (i === -1) return { unit: 'General', part: prettyPart(title) }
  return { unit: title.slice(0, i), part: prettyPart(title.slice(i + 3)) }
}

export function skillOf(title: string): Skill {
  const t = title.toUpperCase()
  if (t.includes('GRAMMAR') || t.includes('VOCABULARY TEST')) return 'grammar'
  if (t.includes('READING')) return 'reading'
  if (t.includes('LISTENING')) return 'listening'
  if (t.includes('WRITING')) return 'writing'
  if (t.includes('SPEAKING')) return 'speaking'
  return 'teoria'
}

export const SKILL_LABEL: Record<Skill, string> = {
  grammar: 'Grammar & Vocabulary',
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
  teoria: 'Teoría',
}

/** Agrupa lecciones por unidad manteniendo el orden. */
export function groupByUnit(lessons: Lesson[]): { unit: string; lessons: Lesson[] }[] {
  const groups: { unit: string; lessons: Lesson[] }[] = []
  for (const l of [...lessons].sort((a, b) => a.order_index - b.order_index)) {
    const { unit } = splitTitle(l.title)
    const last = groups[groups.length - 1]
    if (last && last.unit === unit) last.lessons.push(l)
    else groups.push({ unit, lessons: [l] })
  }
  return groups
}

/** Separa el texto de lectura añadido a las preguntas de huecos ("— Texto: ..."). */
export function splitPassage(question: string): { question: string; passage: string | null } {
  const marker = '  —  Texto: '
  const i = question.indexOf(marker)
  if (i === -1) return { question, passage: null }
  return { question: question.slice(0, i), passage: question.slice(i + marker.length) }
}

/** Separa el email recibido de los enunciados de writing parte 4. */
export function splitEmail(question: string): { question: string; email: string | null } {
  const marker = '\n\n--- Email recibido ---\n'
  const i = question.indexOf(marker)
  if (i === -1) return { question, email: null }
  return { question: question.slice(0, i), email: question.slice(i + marker.length) }
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

/** Enlaces al campus antiguo: no se muestran nunca, todo el material vive dentro de la web. */
export function isExternalCampus(url: string | null | undefined): boolean {
  return !!url && /nubily-educa\.com/i.test(url)
}

/** ¿La lección tiene material propio que enseñar (sin contar enlaces al campus)? */
export function hasOwnContent(content: string | null, videoUrl: string | null): boolean {
  if (videoUrl && !isExternalCampus(videoUrl)) return true
  if (!content) return false
  return content
    .split('\n')
    .some((line) => line.trim() && !line.startsWith('#') && !isExternalCampus(line) && !line.startsWith('Original en el campus'))
}
