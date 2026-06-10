import { useAutoAnimate } from '@formkit/auto-animate/react'
import { Activity, Trophy, Users } from 'lucide-react'
import { T } from 'gt-react'
import Panel from '../shared/Panel'
import PlayerAvatar from '../shared/PlayerAvatar'
import PlayerNameHoverCard from '../shared/PlayerNameHoverCard'

function leaderboardPlayerId(player) {
  return String(player.player || player.id || '')
}

function podiumStyleForIndex(index) {
  const podium = [
    {
      row: 'border-yellow-300 bg-yellow-50 shadow-sm dark:border-yellow-500/35 dark:bg-yellow-500/12',
      rank: 'border-yellow-300 bg-yellow-400/20 text-yellow-700 dark:border-yellow-500/45 dark:bg-yellow-500/20 dark:text-yellow-200',
    },
    {
      row: 'border-slate-300 bg-slate-100/80 shadow-sm dark:border-slate-400/30 dark:bg-slate-400/10',
      rank: 'border-slate-300 bg-slate-200 text-slate-600 dark:border-slate-400/40 dark:bg-slate-300/20 dark:text-slate-200',
    },
    {
      row: 'border-orange-300 bg-orange-50 shadow-sm dark:border-orange-500/35 dark:bg-orange-500/12',
      rank: 'border-orange-300 bg-orange-200/70 text-orange-700 dark:border-orange-500/45 dark:bg-orange-500/20 dark:text-orange-200',
    },
  ]
  return podium[index]
}

function podiumMedalSrcForIndex(index) {
  const medalPaths = [
    '/medals/1st.png',
    '/medals/2nd.png',
    '/medals/3rd.png',
  ]
  return medalPaths[index] || ''
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
                    podiumStyle ? podiumStyle.row : 'border-base-200 hover:bg-base-200 hover:border-base-300'
                  }`}
                >
                  {podiumMedalSrcForIndex(index) ? (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center">
                      <img
                        src={podiumMedalSrcForIndex(index)}
                        alt={`${index + 1} place`}
                        className="h-9 w-9 object-contain"
                      />
                    </div>
                  ) : (
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${
                      podiumStyle ? podiumStyle.rank : 'border-base-300 bg-base-100 text-base-content/80'
                    }`}>
                      {index + 1}
                    </div>
                  )}

                  <PlayerAvatar name={player.name} size={38} className="border border-white shadow-sm dark:border-white/20" />

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      {onOpenProfile ? (
                        <PlayerNameHoverCard
                          playerId={leaderboardPlayerId(player)}
                          name={player.name}
                          rank={index + 1}
                          points={player.points}
                          correct={player.correct}
                          predictions={player.predictions}
                          accuracy={accuracy}
                          onOpenProfile={onOpenProfile}
                        />
                      ) : (
                        <div className="truncate font-black">{player.name}</div>
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
                        {player.correct}/{player.predictions}
                      </span>
                    </div>
                  </div>
                    <div className="text-right text-xl font-black tabular-nums">
                      {player.points}
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
