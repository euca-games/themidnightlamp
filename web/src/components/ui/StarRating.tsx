interface Props {
  value: number | null
  onChange?: (v: number) => void
  readonly?: boolean
}

export default function StarRating({ value, onChange, readonly }: Props) {
  const stars = [1, 2, 3, 4, 5]

  const snap = (v: number) => Math.round(v * 2) / 2

  return (
    <div className="flex items-center gap-0.5">
      {stars.map((star) => {
        const filled = value !== null && value >= star
        const half = value !== null && value >= star - 0.5 && value < star
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(snap(star))}
            onMouseEnter={(e) => {
              if (readonly) return
              const rect = (e.target as HTMLElement).getBoundingClientRect()
              const x = e.clientX - rect.left
              const v = x < rect.width / 2 ? snap(star - 0.5) : snap(star)
              onChange?.(v)
            }}
            className={`text-xl leading-none ${readonly ? 'cursor-default' : 'cursor-pointer'} ${
              filled || half ? 'text-amber-400' : 'text-zinc-600'
            }`}
          >
            {half ? '⯨' : '★'}
          </button>
        )
      })}
      {value !== null && (
        <span className="ml-1 text-sm text-zinc-400">{value?.toFixed(1)}</span>
      )}
    </div>
  )
}
