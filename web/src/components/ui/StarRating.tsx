import { useState } from 'react'

interface Props {
  value: number | null
  onChange?: (v: number | null) => void
  readonly?: boolean
}

export default function StarRating({ value, onChange, readonly }: Props) {
  const [hover, setHover] = useState<number | null>(null)

  const display = hover ?? value
  const snap = (v: number) => Math.round(v * 2) / 2

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>, star: number) => {
    if (readonly) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    setHover(snap(x < rect.width / 2 ? star - 0.5 : star))
  }

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = display !== null && display >= star
        const half = display !== null && display >= star - 0.5 && display < star

        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            className={`relative text-xl leading-none w-5 ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
            onMouseMove={(e) => handleMouseMove(e, star)}
            onClick={(e) => {
              if (readonly) return
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX - rect.left
              const next = snap(x < rect.width / 2 ? star - 0.5 : star)
              onChange?.(next === value ? null : next)
            }}
          >
            {/* base empty star */}
            <span className="text-zinc-600">★</span>
            {/* filled overlay — full or half via clip */}
            {(filled || half) && (
              <span
                className="absolute inset-0 text-amber-400 overflow-hidden"
                style={{ width: filled ? '100%' : '50%' }}
              >
                ★
              </span>
            )}
          </button>
        )
      })}
      {value !== null && value !== undefined && (
        <span className="ml-1 text-sm text-zinc-400">{value.toFixed(1)}</span>
      )}
    </div>
  )
}
