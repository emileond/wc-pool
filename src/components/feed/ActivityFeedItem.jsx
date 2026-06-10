import {Clock3, Timer, Bolt, TrendingUp} from 'lucide-react'
import {T, Var} from 'gt-react'
import PlayerAvatar from '../shared/PlayerAvatar'
import PlayerNameHoverCard from '../shared/PlayerNameHoverCard'

function ordinal(value) {
    const mod10 = value % 10
    const mod100 = value % 100
    if (mod10 === 1 && mod100 !== 11) return `${value}st`
    if (mod10 === 2 && mod100 !== 12) return `${value}nd`
    if (mod10 === 3 && mod100 !== 13) return `${value}rd`
    return `${value}th`
}

function formatRelativeTime(value) {
    const target = new Date(value).getTime()
    if (!Number.isFinite(target)) return ''
    const now = Date.now()
    const deltaSeconds = Math.round((target - now) / 1000)
    const abs = Math.abs(deltaSeconds)
    const rtf = new Intl.RelativeTimeFormat(undefined, {numeric: 'auto'})

    if (abs < 60) return rtf.format(deltaSeconds, 'second')
    if (abs < 3600) return rtf.format(Math.round(deltaSeconds / 60), 'minute')
    if (abs < 86400) return rtf.format(Math.round(deltaSeconds / 3600), 'hour')
    return rtf.format(Math.round(deltaSeconds / 86400), 'day')
}

function scoreLabel(homeScore, awayScore) {
    if (Number.isFinite(homeScore) && Number.isFinite(awayScore)) {
        return `${homeScore}-${awayScore}`
    }
    return ''
}

function InlineUser({name, playerId, stats, onOpenProfile}) {
    if (onOpenProfile && playerId) {
        return (
            <PlayerNameHoverCard
                playerId={playerId}
                name={name}
                rank={stats?.rank}
                points={stats?.points}
                correct={stats?.correct}
                predictions={stats?.predictions}
                accuracy={stats?.accuracy}
                onOpenProfile={onOpenProfile}
                withInlineAvatar
                inlineAvatarSize={20}
                buttonClassName="font-bold"
            />
        )
    }
    return (
        <strong className="inline-flex items-center gap-1 align-middle">
            <PlayerAvatar name={name || 'Pool'} size={20} className="border border-base-300/80"/>
            <Var>{name}</Var>
        </strong>
    )
}

function PickHighlight({event}) {
    if (event.pick.kind === 'draw') {
        return (
            <T context="Sports pool activity feed pick highlight draw">Draw</T>
        )
    }

    return (
        <T context="Sports pool activity feed pick highlight team to win label">
      <span className="inline-flex items-center gap-1">
        <TeamCrest
            name={event.pick.team}
            src={event.pick.kind === 'home-win' ? event.homeCrest : event.awayCrest}
            small
        />
        <Var>{event.pick.team}</Var>
      </span>
        </T>
    )
}

function RankClimbLine({event, onOpenProfile, stats}) {
    return (
        <span>
      <InlineUser name={event.playerName} playerId={event.playerId} stats={stats} onOpenProfile={onOpenProfile}/>{' '}
            <strong>
        <T context="Sports pool activity feed ranking climb">
          climbed <Var>{event.spots}</Var> spots
        </T>
      </strong>{' '}
            <T>into</T>{' '}
            <Var>{ordinal(event.rank)}</Var>{' '}
            <T>place.</T>
    </span>
    )
}

function ResultLine({event}) {
    if (event.summary.kind === 'draw') {
        return (
            <span>
        <T>Final whistle:</T>{' '}
                <strong><T>Draw</T></strong>
      </span>
        )
    }

    return (
        <span>
      <T>Final whistle:</T>{' '}
            <strong>
        <Var>{event.summary.team}</Var>{' '}
                <T>won</T>
      </strong>
    </span>
    )
}

function TeamCrest({name, src, small = false}) {
    const sizeClass = small ? 'h-4 w-6 text-[8px]' : 'h-5 w-7 text-[9px]'
    if (src) {
        return (
            <img
                src={src}
                alt={`${name} crest`}
                className={`${sizeClass} rounded-sm object-cover`}
                loading="lazy"
                referrerPolicy="no-referrer"
            />
        )
    }

    return (
        <span
            className={`inline-flex items-center justify-center rounded-sm border border-base-300 bg-base-200 font-black text-base-content/50 ${sizeClass}`}>
      {(name || '??').slice(0, 2).toUpperCase()}
    </span>
    )
}

function MatchupStrip({event, scoreFallback = 'FT', withTopMargin = true}) {
    if (!event.home || !event.away) return null
    const score = scoreLabel(event.homeScore, event.awayScore) || scoreFallback

    return (
        <div
            className={`${withTopMargin ? 'mt-2 ' : ''}flex items-center w-fit gap-1.5 rounded-lg border border-base-300 bg-base-200/35 px-2 py-1 text-xs font-semibold`}>
            <TeamCrest small name={event.home} src={event.homeCrest}/>
            <span className="max-w-22 truncate">{event.home}</span>
            <span
                className="rounded-md border border-base-300 bg-base-100 px-1.5 py-0.5 font-black text-base-content/75">
        {score}
      </span>
            <span className="max-w-22 truncate">{event.away}</span>
            <TeamCrest small name={event.away} src={event.awayCrest}/>
        </div>
    )
}

function PredictionMiniCard({event}) {
    return (
        <div className="my-2 rounded-lg p-2">
            <MatchupStrip event={event} scoreFallback="VS" withTopMargin={false}/>
        </div>
    )
}

function PredictionEventItem({event, relative, onOpenProfile, stats}) {
    return (
        <li className="rounded-xl border border-base-300 bg-base-100 p-3">
            <div className="flex items-start gap-3">
        <span
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary">
          <Bolt size={16}/>
        </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm leading-snug text-base-content/90">
                        <InlineUser name={event.playerName} playerId={event.playerId} stats={stats}
                                    onOpenProfile={onOpenProfile}/>
                        <T context="Sports pool activity feed actor header for prediction event">picked</T>
                        <span
                            className="inline-flex items-center gap-1.5 rounded-md border border-secondary/40 bg-secondary/5 px-2 py-0.5 text-[11px] font-semibold text-secondary">
              <PickHighlight event={event}/>
            </span>
                    </div>
                    <PredictionMiniCard event={event}/>
                    <div className="mt-1.5 inline-flex items-center gap-1 text-xs text-base-content/45">
                        <Clock3 size={12}/>
                        {relative}
                    </div>
                </div>
            </div>
        </li>
    )
}

function EventLine({event, onOpenProfile, stats}) {
    if (event.type === 'rank-climb') return <RankClimbLine event={event} onOpenProfile={onOpenProfile} stats={stats}/>
    return <ResultLine event={event}/>
}

function LeadingVisual({event}) {
    if (event.type === 'prediction') {
        return (
            <span
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-info/40 text-info">
        <Bolt size={16}/>
      </span>
        )
    }
    if (event.type === 'rank-climb') {
        return (
            <span
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-success/40 text-success">
        <TrendingUp size={16}/>
      </span>
        )
    }
    if (event.type === 'result') {
        return (
            <span
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-500/40 text-slate-500">
        <Timer size={16}/>
      </span>
        )
    }
    return null
}

export default function ActivityFeedItem({event, onOpenProfile, leaderboardByPlayer}) {
    const relative = formatRelativeTime(event.createdAt)
    const playerStats = event.playerId ? leaderboardByPlayer?.get(String(event.playerId)) : undefined
    if (event.type === 'prediction') {
        return (
            <PredictionEventItem
                event={event}
                relative={relative}
                onOpenProfile={onOpenProfile}
                stats={playerStats}
            />
        )
    }

    return (
        <li className="rounded-xl border border-base-300 bg-base-100 p-3">
            <div className="flex items-start gap-3">
                <LeadingVisual event={event}/>
                <div className="min-w-0 flex-1">
                    <div className="text-sm leading-snug text-base-content/90">
                        <EventLine event={event} onOpenProfile={onOpenProfile} stats={playerStats}/>
                    </div>
                    {event.type === 'result' && <MatchupStrip event={event}/>}
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-base-content/45">
            <span className="inline-flex items-center gap-1">
              <Clock3 size={12}/>
                {relative}
            </span>
                    </div>
                </div>
            </div>
        </li>
    )
}
