import { T } from 'gt-react'
import Panel from '../shared/Panel'

function PoolCountdown({ countdown }) {
  if (!countdown) {
    return (
      <div className="mt-4 rounded-xl border border-base-300 bg-base-200/50 p-4 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-base-content/40"><T context="Sports prediction pool app">Pool starts</T></p>
        <p className="mt-1 text-sm font-semibold text-base-content/55"><T>Waiting for fixtures</T></p>
      </div>
    )
  }

  if (countdown.isStarted) {
    return (
      <div className="mt-4 rounded-xl border border-primary/20 bg-primary/10 p-4 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-primary"><T context="Sports prediction pool app">Pool started</T></p>
        <p className="mt-1 text-sm font-semibold text-base-content/60"><T context="Sports prediction pool app">Picks are locked as matches begin.</T></p>
      </div>
    )
  }

  const units = [
    { key: 'days', value: countdown.days, label: <T>days</T> },
    { key: 'hours', value: countdown.hours, label: <T>hours</T> },
    { key: 'min', value: countdown.minutes, label: <T>min</T> },
    { key: 'sec', value: countdown.seconds, label: <T>sec</T> },
  ]

  return (
    <div className="mt-4 rounded-xl border border-base-300 bg-base-200/50 p-4">
      <p className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-base-content/40"><T context="Sports prediction pool app">Starts in</T></p>
      <div className="grid grid-cols-4 gap-2 text-center">
        {units.map(({ key, value, label }) => (
          <div key={key} className="flex min-w-0 flex-col items-center">
            <span className="countdown font-mono text-2xl font-black text-base-content sm:text-3xl">
              <span style={{ '--value': value }} aria-live="polite" aria-label={String(value)}>{value}</span>
            </span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-base-content/45">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PoolStatusCard({ playersCount, matchesCount, completedMatches, totalPredictions, countdown }) {
  return (
    <Panel>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-base-content/40"><T context="Sports prediction pool app">Pool</T></p>
          <h2 className="text-2xl font-black">{playersCount} <T>players</T></h2>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { key: 'matches', value: matchesCount, label: <T>Matches</T> },
          { key: 'ended', value: completedMatches, label: <T context="Played games in a tournament">Played</T> },
          { key: 'total-picks', value: totalPredictions, label: <T>Total Picks</T> },
        ].map(({ key, label, value }) => (
          <div key={key} className="rounded-xl border border-base-300 bg-base-200/50 p-3 text-center">
            <div className="text-xl font-black">{value}</div>
            <div className="mt-0.5 font-semibold uppercase stat-desc">{label}</div>
          </div>
        ))}
      </div>
      <PoolCountdown countdown={countdown} />
    </Panel>
  )
}
