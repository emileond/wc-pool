import { useAutoAnimate } from '@formkit/auto-animate/react'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Trophy, Users } from 'lucide-react'
import { T } from 'gt-react'
import Panel from '../shared/Panel'
import PlayerAvatar from '../shared/PlayerAvatar'
import PlayerNameHoverCard from '../shared/PlayerNameHoverCard'

function leaderboardPlayerId(player) {
  return String(player.player || player.id || '')
}

function podiumStyleForRank(rank) {
  const podiumByRank = {
    1: {
      row: 'border-yellow-300 bg-yellow-50 shadow-sm dark:border-yellow-500/35 dark:bg-yellow-500/12',
      rank: 'border-yellow-300 bg-yellow-400/20 text-yellow-700 dark:border-yellow-500/45 dark:bg-yellow-500/20 dark:text-yellow-200',
    },
    2: {
      row: 'border-slate-300 bg-slate-100/80 shadow-sm dark:border-slate-400/30 dark:bg-slate-400/10',
      rank: 'border-slate-300 bg-slate-200 text-slate-600 dark:border-slate-400/40 dark:bg-slate-300/20 dark:text-slate-200',
    },
    3: {
      row: 'border-orange-300 bg-orange-50 shadow-sm dark:border-orange-500/35 dark:bg-orange-500/12',
      rank: 'border-orange-300 bg-orange-200/70 text-orange-700 dark:border-orange-500/45 dark:bg-orange-500/20 dark:text-orange-200',
    },
  }
  return podiumByRank[rank]
}

function podiumMedalSrcForRank(rank) {
  const medalPathsByRank = {
    1: '/medals/1st.png',
    2: '/medals/2nd.png',
    3: '/medals/3rd.png',
  }
  return medalPathsByRank[rank] || ''
}

function ordinal(value) {
  const mod10 = value % 10
  const mod100 = value % 100
  if (mod10 === 1 && mod100 !== 11) return `${value}st`
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`
  return `${value}th`
}

function rankRows(rows) {
  return rows.map((player) => ({
    player,
    rank: rows.findIndex((entry) => Number(entry.points) === Number(player.points)) + 1,
  }))
}

function matchStage(match) {
  return match.stage || 'Group Stage'
}

function inferGroupRounds(matches) {
  const byGroup = new Map()
  matches.forEach((match) => {
    if (matchStage(match) !== 'Group Stage') return
    const groupKey = match.group || 'Ungrouped'
    if (!byGroup.has(groupKey)) byGroup.set(groupKey, [])
    byGroup.get(groupKey).push(match)
  })

  const rounds = new Map()
  byGroup.forEach((groupMatches) => {
    const ordered = [...groupMatches].sort((a, b) => {
      const kickoffDiff = new Date(a.kickoff) - new Date(b.kickoff)
      if (kickoffDiff !== 0) return kickoffDiff
      return String(a.id).localeCompare(String(b.id))
    })
    ordered.forEach((match, index) => {
      rounds.set(match.id, Math.floor(index / 2) + 1)
    })
  })

  return rounds
}

function scopeKey(scope) {
  return `${scope.type}:${scope.value}`
}

function leaderboardScopeOptions(matches) {
  const options = [{
    type: 'overall',
    value: '',
    label: 'All tournament',
    matches,
  }]

  Array.from(new Set(matches.map(matchStage))).forEach((stage) => {
    options.push({
      type: 'stage',
      value: stage,
      label: stage,
      matches: matches.filter((match) => matchStage(match) === stage),
    })
  })

  const inferredRounds = inferGroupRounds(matches)
  const groupRounds = new Map()
  matches.forEach((match) => {
    if (matchStage(match) !== 'Group Stage') return
    const roundNumber = match.matchday || inferredRounds.get(match.id)
    if (!roundNumber) return
    const roundMatches = groupRounds.get(roundNumber) || []
    roundMatches.push(match)
    groupRounds.set(roundNumber, roundMatches)
  })

  Array.from(groupRounds.entries())
    .sort(([a], [b]) => a - b)
    .forEach(([roundNumber, roundMatches]) => {
      options.push({
        type: 'group-round',
        value: String(roundNumber),
        label: `Group Stage - ${ordinal(roundNumber)} round`,
        matches: roundMatches,
      })
    })

  return options
}

export default function LeaderboardPage({
  workspaceId,
  leaderboard,
  matches,
  loadWorkspaceLeaderboard,
  onOpenProfile,
}) {
  const [selectedScopeKey, setSelectedScopeKey] = useState('overall:')
  const scopeOptions = useMemo(() => leaderboardScopeOptions(matches), [matches])
  const selectedScope = scopeOptions.find((scope) => scopeKey(scope) === selectedScopeKey) || scopeOptions[0]
  const scopedLeaderboardQuery = useQuery({
    queryKey: ['workspace-leaderboard', workspaceId || 'none', selectedScope.type, selectedScope.value],
    enabled: Boolean(workspaceId && loadWorkspaceLeaderboard && selectedScope.type !== 'overall'),
    queryFn: () => loadWorkspaceLeaderboard(workspaceId, selectedScope),
    staleTime: 15000,
  })

  const leaderboardRows = useMemo(
    () => (selectedScope.type === 'overall' ? leaderboard : scopedLeaderboardQuery.data || []),
    [leaderboard, scopedLeaderboardQuery.data, selectedScope.type],
  )

  const leaderboardWithRanks = useMemo(
    () => rankRows(leaderboardRows),
    [leaderboardRows],
  )
  const playedGames = selectedScope.matches.filter((m) => m.status !== 'scheduled').length
  const [leaderboardParent] = useAutoAnimate({ duration: 220, easing: 'ease-out' })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black sm:text-3xl"><T>Leaderboard</T></h2>
          <p className="mt-0.5 text-sm text-base-content/60"><T>Updates live as match results are posted.</T></p>
        </div>
        <label className="w-full sm:w-56">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-base-content/45">
            <T>Stage</T>
          </span>
          <select
            className="select select-bordered w-full rounded-xl font-semibold"
            value={selectedScopeKey}
            onChange={(event) => setSelectedScopeKey(event.target.value)}
          >
            {scopeOptions.map((scope) => (
              <option key={scopeKey(scope)} value={scopeKey(scope)}>{scope.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users, key: 'players', value: leaderboardRows.length, label: <T>Players</T> },
          { icon: Activity, key: 'played-games', value: playedGames, label: <T context="Played games on a sports prediction pool">Played</T> },
          { icon: Trophy, key: 'total-games', value: selectedScope.matches.length, label: <T>Total</T> },
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
        {scopedLeaderboardQuery.isLoading ? (
          <div className="py-8 text-center">
            <span className="loading loading-dots loading-md text-base-content/40" />
          </div>
        ) : scopedLeaderboardQuery.error ? (
          <div className="py-8 text-center text-sm font-semibold text-base-content/40">
            <T>Could not load this leaderboard.</T>
          </div>
        ) : leaderboardRows.length === 0 ? (
          <div className="py-8 text-center text-sm font-semibold text-base-content/40"><T>No players yet.</T></div>
        ) : (
          <div ref={leaderboardParent} className="space-y-2">
            {leaderboardWithRanks.map(({ player, rank }) => {
              const predictionsCount = Number(player.predictions) || 0
              const accuracy = Number(player.accuracy) || 0
              const podiumStyle = podiumStyleForRank(rank)

              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                    podiumStyle ? podiumStyle.row : 'border-base-200 hover:bg-base-200 hover:border-base-300'
                  }`}
                >
                  {podiumMedalSrcForRank(rank) ? (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center">
                      <img
                        src={podiumMedalSrcForRank(rank)}
                        alt={`${rank} place`}
                        className="h-9 w-9 object-contain"
                      />
                    </div>
                  ) : (
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${
                      podiumStyle ? podiumStyle.rank : 'border-base-300 bg-base-100 text-base-content/80'
                    }`}>
                      {rank}
                    </div>
                  )}

                  <PlayerAvatar name={player.name} size={38} className="border border-white shadow-sm dark:border-white/20" />

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {onOpenProfile ? (
                        <PlayerNameHoverCard
                          playerId={leaderboardPlayerId(player)}
                          name={player.name}
                          rank={rank}
                          points={player.points}
                          correct={player.correct}
                          predictions={predictionsCount}
                          accuracy={accuracy}
                          buttonClassName="block w-full"
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
                        {player.correct}/{predictionsCount}
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
