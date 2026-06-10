import { useRef, useState } from 'react'
import { T } from 'gt-react'
import PlayerAvatar from './PlayerAvatar'

export default function PlayerNameHoverCard({
  playerId,
  name,
  rank,
  points,
  correct,
  predictions,
  accuracy,
  onOpenProfile,
  withInlineAvatar = false,
  inlineAvatarSize = 16,
  buttonClassName = '',
}) {
  const cardRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState('top')
  const resolvedName = name || 'Player'
  const resolvedAccuracy = Number.isFinite(accuracy)
    ? accuracy
    : (Number(predictions) > 0 ? Math.round((Number(correct) / Number(predictions)) * 100) : 0)

  function updatePlacement() {
    const triggerRect = cardRef.current?.getBoundingClientRect()
    if (!triggerRect) return
    const cardHeight = 160
    const gap = 10
    const spaceAbove = triggerRect.top
    if (spaceAbove >= cardHeight + gap) {
      setPlacement('top')
      return
    }
    setPlacement('bottom')
  }

  function openProfile() {
    if (!onOpenProfile || !playerId) return
    onOpenProfile(playerId)
  }

  return (
    <div
      ref={cardRef}
      className="relative min-w-0"
      onMouseEnter={() => {
        updatePlacement()
        setOpen(true)
      }}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={openProfile}
        onFocus={() => {
          updatePlacement()
          setOpen(true)
        }}
        onBlur={() => setOpen(false)}
        className={`cursor-pointer min-w-0 truncate text-left font-bold hover:underline focus-visible:underline ${buttonClassName}`}
      >
        {withInlineAvatar ? (
          <span className="inline-flex items-center gap-1 align-middle">
            <PlayerAvatar name={resolvedName} size={inlineAvatarSize} className="border border-base-300/80" />
            <span className="truncate">{resolvedName}</span>
          </span>
        ) : (
          resolvedName
        )}
      </button>

      <div className={`pointer-events-none absolute left-1/2 z-20 w-64 -translate-x-1/2 rounded-xl border border-base-300 bg-base-100 p-3 shadow-xl transition-all ${
        open ? 'opacity-100' : 'opacity-0'
      } ${
        placement === 'top'
          ? `bottom-full mb-2 ${open ? 'translate-y-0' : 'translate-y-1'}`
          : `top-full mt-2 ${open ? 'translate-y-0' : '-translate-y-1'}`
      }`}>
        <div className="mb-2 flex items-center gap-2.5">
          <PlayerAvatar name={resolvedName} size={34} />
          <div className="min-w-0">
            <div className="truncate text-sm font-black">{resolvedName}</div>
            <div className="flex items-center gap-1.5 text-xs text-base-content/50">
              #{rank || '-'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-base-200/70 px-2 py-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wide text-base-content/50"><T>Points</T></div>
            <div className="text-sm font-black">{Number(points) || 0}</div>
          </div>
          <div className="rounded-lg bg-base-200/70 px-2 py-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wide text-base-content/50"><T>Correct</T></div>
            <div className="text-sm font-black">{Number(correct) || 0}</div>
          </div>
          <div className="rounded-lg bg-base-200/70 px-2 py-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wide text-base-content/50"><T>Accuracy</T></div>
            <div className="text-sm font-black">{resolvedAccuracy}%</div>
          </div>
        </div>
      </div>
    </div>
  )
}
