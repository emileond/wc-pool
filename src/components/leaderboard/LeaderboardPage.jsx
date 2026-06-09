import { useAutoAnimate } from '@formkit/auto-animate/react'
import { useRef, useState } from 'react'
import { Activity, Medal, Trophy, Users } from 'lucide-react'
import { T } from 'gt-react'
import Panel from '../shared/Panel'
import PlayerAvatar from '../shared/PlayerAvatar'

function leaderboardPlayerId(player) {
  return String(player.player || player.id || '')
}

function podiumStyleForIndex(index) {
  const podium = [
    {
      row: 'border-yellow-300 bg-yellow-50 shadow-sm',
      rank: 'border-yellow-300 bg-yellow-400/20 text-yellow-700',
      score: 'text-yellow-700',
      medal: 'Gold',
    },
    {
      row: 'border-slate-300 bg-slate-100/80 shadow-sm',
      rank: 'border-slate-300 bg-slate-200 text-slate-600',
      score: 'text-slate-600',
      medal: 'Silver',
    },
    {
      row: 'border-orange-300 bg-orange-50 shadow-sm',
      rank: 'border-orange-300 bg-orange-200/70 text-orange-700',
      score: 'text-orange-700',
      medal: 'Bronze',
    },
  ]
  return podium[index]
}

function NameHoverCard({ player, index, accuracy, onOpenProfile }) {
  const podiumStyle = podiumStyleForIndex(index)
  const playerId = leaderboardPlayerId(player)
  const cardRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState('top')

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
        onClick={() => onOpenProfile(playerId)}
        onFocus={() => {
          updatePlacement()
          setOpen(true)
        }}
        onBlur={() => setOpen(false)}
        className="cursor-pointer truncate text-left font-bold hover:underline focus-visible:underline"
      >
        {player.name}
      </button>

      <div className={`pointer-events-none absolute left-1/2 z-20 w-64 -translate-x-1/2 rounded-xl border border-base-300 bg-base-100 p-3 shadow-xl transition-all ${
        open ? 'opacity-100' : 'opacity-0'
      } ${
        placement === 'top'
          ? `bottom-full mb-2 ${open ? 'translate-y-0' : 'translate-y-1'}`
          : `top-full mt-2 ${open ? 'translate-y-0' : '-translate-y-1'}`
      }`}>
        <div className="mb-2 flex items-center gap-2.5">
          <PlayerAvatar name={player.name} size={34} />
          <div className="min-w-0">
            <div className="truncate text-sm font-black">{player.name}</div>
            <div className="flex items-center gap-1.5 text-xs text-base-content/55">
              <span>#{index + 1}</span>
              {podiumStyle && (
                <span className={`inline-flex items-center rounded-full border p-1 ${podiumStyle.rank}`}>
                  <Medal size={10} aria-label={`${podiumStyle.medal} medal`} />
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-base-200/70 px-2 py-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wide text-base-content/50"><T>Points</T></div>
            <div className="text-sm font-black">{player.points}</div>
          </div>
          <div className="rounded-lg bg-base-200/70 px-2 py-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wide text-base-content/50"><T>Correct</T></div>
            <div className="text-sm font-black">{player.correct}</div>
          </div>
          <div className="rounded-lg bg-base-200/70 px-2 py-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wide text-base-content/50"><T>Accuracy</T></div>
            <div className="text-sm font-black">{accuracy}%</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LeaderboardPage({ leaderboard, matches, onOpenProfile }) {
  const playedGames = matches.filter((m) => m.status !== 'scheduled').length
  const [leaderboardParent] = useAutoAnimate({ duration: 220, easing: 'ease-out' })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black sm:text-3xl"><T>Leaderboard</T></h2>
        <p className="mt-0.5 text-sm text-base-content/60"><T>Updates live as match results are posted.</T></p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users, key: 'players', value: leaderboard.length, label: <T>Players</T> },
          { icon: Activity, key: 'played-games', value: playedGames, label: <T context="Played games on a sports prediction pool">Played</T> },
          { icon: Trophy, key: 'total-games', value: matches.length, label: <T>Total</T> },
        ].map(({ icon: Icon, key, label, value }) => (
          <Panel key={key}>
            <div className="mb-1 flex items-center gap-1.5 text-primary">
              <Icon size={15} />
              <span className="text-xs font-bold uppercase tracking-wide text-base-content/50">{label}</span>
            </div>
            <div className="text-2xl font-black">{value}</div>
          </Panel>
        ))}
      </div>

      <Panel>
        {leaderboard.length === 0 ? (
          <div className="py-8 text-center text-sm font-semibold text-base-content/40"><T>No players yet.</T></div>
        ) : (
          <div ref={leaderboardParent} className="space-y-2">
            {leaderboard.map((player, index) => {
              const accuracy = player.predictions > 0
                ? Math.round((player.correct / player.predictions) * 100)
                : 0
              const podiumStyle = podiumStyleForIndex(index)

              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                    podiumStyle ? podiumStyle.row : 'border-base-200 hover:bg-base-200/40'
                  }`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${
                    podiumStyle ? podiumStyle.rank : 'border-base-300 bg-base-100 text-base-content/40'
                  }`}>
                    {index + 1}
                  </div>

                  <PlayerAvatar name={player.name} size={38} className="border border-white shadow-sm" />

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      {onOpenProfile ? (
                        <NameHoverCard
                          player={player}
                          index={index}
                          accuracy={accuracy}
                          onOpenProfile={onOpenProfile}
                        />
                      ) : (
                        <div className="truncate font-black">{player.name}</div>
                      )}
                      {podiumStyle && (
                        <span className={`hidden items-center rounded-full border p-1 sm:inline-flex ${podiumStyle.rank}`}>
                          <Medal size={12} aria-label={`${podiumStyle.medal} medal`} />
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-base-300">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${accuracy}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-xs text-base-content/40">
                        {player.correct}/{player.predictions} <T>picks</T>
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-xl font-black tabular-nums ${podiumStyle?.score || ''}`}>
                      {player.points}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-wide text-base-content/40"><T>pts</T></div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel>
    </div>
  )
}
