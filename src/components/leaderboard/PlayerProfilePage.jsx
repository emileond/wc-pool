import { useMemo, useState } from 'react'
import { ArrowLeft, Medal } from 'lucide-react'
import { T } from 'gt-react'
import Panel from '../shared/Panel'
import PlayerAvatar from '../shared/PlayerAvatar'
import MatchPredictionCard from '../predictions/MatchPredictionCard'

function playerIdFromLeaderboard(player) {
  return String(player?.player || player?.id || '')
}

function podiumStyleForIndex(index) {
  const podium = [
    { rank: 'border-yellow-300 bg-yellow-400/20 text-yellow-700', medal: 'Gold' },
    { rank: 'border-slate-300 bg-slate-200 text-slate-600', medal: 'Silver' },
    { rank: 'border-orange-300 bg-orange-200/70 text-orange-700', medal: 'Bronze' },
  ]
  return podium[index]
}

const PICKS_PAGE_SIZE = 10

export default function PlayerProfilePage({ playerId, leaderboard, matches, predictions, onBack }) {
  const profile = leaderboard.find((entry) => playerIdFromLeaderboard(entry) === String(playerId))
  const rankIndex = leaderboard.findIndex((entry) => playerIdFromLeaderboard(entry) === String(playerId))
  const rank = rankIndex >= 0 ? rankIndex + 1 : null
  const podiumStyle = rankIndex >= 0 ? podiumStyleForIndex(rankIndex) : null
  const [picksPage, setPicksPage] = useState(1)
  const matchesById = new Map(matches.map((match) => [match.id, match]))
  const picks = predictions
    .filter((prediction) => prediction.player === playerId)
    .map((prediction) => ({ prediction, match: matchesById.get(prediction.match) }))
    .filter(({ match }) => Boolean(match))
    .sort((a, b) => new Date(a.match.kickoff) - new Date(b.match.kickoff))
  const totalPicksPages = Math.max(1, Math.ceil(picks.length / PICKS_PAGE_SIZE))
  const currentPicksPage = Math.min(picksPage, totalPicksPages)
  const pagedPicks = useMemo(() => {
    const start = (currentPicksPage - 1) * PICKS_PAGE_SIZE
    return picks.slice(start, start + PICKS_PAGE_SIZE)
  }, [currentPicksPage, picks])

  const correct = picks.filter(({ prediction, match }) => match.result && prediction.pick === match.result).length
  const wrong = picks.filter(({ prediction, match }) => match.result && prediction.pick !== match.result).length
  const pending = picks.filter(({ match }) => !match.result).length
  const points = profile?.points ?? correct * 3

  if (!profile) {
    return (
      <Panel>
        <div className="space-y-3 py-2">
          <button type="button" className="btn btn-ghost btn-sm rounded-xl" onClick={onBack}>
            <ArrowLeft size={16} />
            <T>Back</T>
          </button>
          <p className="text-sm text-base-content/55"><T>Player not found in this leaderboard.</T></p>
        </div>
      </Panel>
    )
  }

  return (
    <div className="space-y-4">
      <button type="button" className="btn btn-ghost btn-sm rounded-xl" onClick={onBack}>
        <ArrowLeft size={16} />
        <T>Back</T>
      </button>

      <Panel>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <PlayerAvatar name={profile.name} size={48} />
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">{profile.name}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {rank && (
              <span className="text-3xl font-black leading-none sm:text-4xl">#{rank}</span>
            )}
            {podiumStyle && (
              <span className={`inline-flex items-center rounded-full border p-1.5 text-xs font-semibold ${podiumStyle.rank}`}>
                <Medal size={24} aria-label={`${podiumStyle.medal} medal`} />
              </span>
            )}
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Panel>
          <div className="text-xs font-bold uppercase tracking-wide text-base-content/50"><T>Points</T></div>
          <div className="mt-1 text-2xl font-black">{points}</div>
        </Panel>
        <Panel>
          <div className="text-xs font-bold uppercase tracking-wide text-base-content/50"><T>Correct</T></div>
          <div className="mt-1 text-2xl font-black text-success">{correct}</div>
        </Panel>
        <Panel>
          <div className="text-xs font-bold uppercase tracking-wide text-base-content/50"><T>Wrong</T></div>
          <div className="mt-1 text-2xl font-black text-error">{wrong}</div>
        </Panel>
        <Panel>
          <div className="text-xs font-bold uppercase tracking-wide text-base-content/50"><T>Pending</T></div>
          <div className="mt-1 text-2xl font-black text-warning">{pending}</div>
        </Panel>
      </div>

      <Panel>
        <div className="mb-3">
          <h3 className="text-lg font-black"><T>Picks</T></h3>
          <p className="mt-0.5 text-sm text-base-content/60"><T>All predictions from this player.</T></p>
        </div>

        {picks.length === 0 ? (
          <div className="py-6 text-sm text-base-content/50"><T>No picks yet.</T></div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
            {pagedPicks.map(({ prediction, match }) => (
              <MatchPredictionCard
                key={prediction.id}
                match={match}
                prediction={prediction}
                readOnly
                compact
              />
            ))}
            </div>
            {totalPicksPages > 1 && (
              <div className="flex items-center justify-between gap-2 border-t border-base-300 pt-3">
                <button
                  type="button"
                  className="btn btn-sm rounded-lg"
                  onClick={() => setPicksPage((page) => Math.max(1, page - 1))}
                  disabled={currentPicksPage <= 1}
                >
                  <T>Previous</T>
                </button>
                <span className="text-xs font-semibold text-base-content/55">
                  <T>Picks page</T> {currentPicksPage}/{totalPicksPages}
                </span>
                <button
                  type="button"
                  className="btn btn-sm rounded-lg"
                  onClick={() => setPicksPage((page) => Math.min(totalPicksPages, page + 1))}
                  disabled={currentPicksPage >= totalPicksPages}
                >
                  <T>Next</T>
                </button>
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  )
}
