const LETTERS = 'ABCDEFGHIJ'

type State = 'idle' | 'chosen' | 'right' | 'wrong' | 'reveal'

interface Props {
  name: string
  options: string[]
  selected: string | null
  /** cuando hay resultado: la respuesta correcta y si la elegida acertó */
  result?: { correct: string | null; isCorrect: boolean | null } | null
  disabled?: boolean
  onSelect: (value: string) => void
}

/** Opciones en forma de burbujas de hoja de respuestas. */
export function AnswerBubbles({ name, options, selected, result, disabled, onSelect }: Props) {
  return (
    <fieldset className="mt-4 grid gap-2 sm:grid-cols-2">
      <legend className="sr-only">Elige una respuesta</legend>
      {options.map((opt, i) => {
        let state: State = 'idle'
        if (result) {
          if (opt === result.correct) state = opt === selected ? 'right' : 'reveal'
          else if (opt === selected) state = 'wrong'
        } else if (opt === selected) state = 'chosen'

        const bubble = {
          idle: 'border-ink text-ink',
          chosen: 'border-ink bg-ink text-paper',
          right: 'border-ok bg-ok text-white',
          wrong: 'border-mark bg-mark text-white',
          reveal: 'border-ok text-ok border-dashed',
        }[state]

        return (
          <label
            key={opt + i}
            className={`group flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-3 py-2 transition-colors ${
              state === 'idle' ? 'border-transparent hover:border-rule hover:bg-paper' : 'border-rule bg-paper'
            } ${disabled ? 'cursor-default' : ''}`}
          >
            <input
              type="radio"
              className="peer sr-only"
              name={name}
              value={opt}
              checked={selected === opt}
              disabled={disabled}
              onChange={() => onSelect(opt)}
            />
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold peer-focus-visible:ring-4 peer-focus-visible:ring-grammar/40 ${bubble} ${
                state !== 'idle' ? 'bubble-fill' : ''
              }`}
              aria-hidden
            >
              {LETTERS[i]}
            </span>
            <span className={state === 'right' || state === 'reveal' ? 'highlight font-bold' : state === 'wrong' ? 'text-mark line-through decoration-2' : ''}>
              {opt}
            </span>
            {state === 'right' && <span className="sr-only">(correcta, tu respuesta)</span>}
            {state === 'reveal' && <span className="sr-only">(respuesta correcta)</span>}
            {state === 'wrong' && <span className="sr-only">(tu respuesta, incorrecta)</span>}
          </label>
        )
      })}
    </fieldset>
  )
}
