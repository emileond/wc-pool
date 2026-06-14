import {useMemo, useState} from 'react'
import {CalendarClock, CheckCircle2, ChevronDown, Lock, XCircle} from 'lucide-react'
import {T, useGT} from 'gt-react'
import PlayerAvatar from '../shared/PlayerAvatar'

function formatKickoff(value) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
    }).format(new Date(value))
}

// Helper to extract raw team names cleanly for our UI layout blocks
function getPickTeamName(match, pick) {
    if (pick === 'home') return match.home
    if (pick === 'away') return match.away
    return null
}

function isLocked(match) {
    return new Date(match.kickoff).getTime() <= Date.now() || match.status !== 'scheduled'
}

function hasMatchScore(match) {
    return match.status !== 'scheduled' && Number.isFinite(match.homeScore) && Number.isFinite(match.awayScore)
}

function isMatchFinal(match) {
    return match.status === 'final' || Boolean(match.result)
}

function getMatchTimeLabel(match) {
    if (match.status === 'live') {
        if (Number.isFinite(Number(match.minute))) {
            return `${Math.max(0, Math.floor(Number(match.minute)))}'`
        }
        return '-'
    }
    if (isMatchFinal(match)) return 'FT'
    return '-'
}

function hasTbdTeam(match) {
    const isTbd = (team) => typeof team === 'string' && team.trim().toUpperCase() === 'TBD'
    return isTbd(match.home) || isTbd(match.away)
}

function TeamCrest({name, src}) {
    if (!src) return (
        <div
            className="flex h-6 w-9 shrink-0 items-center justify-center rounded-full border border-base-300 bg-base-200 text-[10px] font-black text-base-content/45">
            {name?.slice(0, 2).toUpperCase() || '??'}
        </div>
    )

    return (
        <img
            src={src}
            alt={`${name} crest`}
            className="h-6 w-9 shrink-0 rounded-sm object-cover shadow-sm"
            loading="lazy"
            referrerPolicy="no-referrer"
        />
    )
}

function translateStageLabel(stage, gt) {
    const labels = {
        'Group Stage': gt('Group Stage'),
        'Round of 32': gt('Round of 32'),
        'Round of 16': gt('Round of 16'),
        'Quarterfinal': gt('Quarterfinal'),
        'Semifinal': gt('Semifinal'),
        'Third Place': gt('Third Place'),
        'Final': gt('Final'),
    }
    return labels[stage] || stage
}

function translateTeamName(name, gt) {
    const labels = {
        Argentina: gt('Argentina'),
        Algeria: gt('Algeria'),
        Australia: gt('Australia'),
        Austria: gt('Austria'),
        Belgium: gt('Belgium'),
        'Bosnia and Herzegovina': gt('Bosnia and Herzegovina'),
        Brazil: gt('Brazil'),
        'Cabo Verde': gt('Cabo Verde'),
        Canada: gt('Canada'),
        Croatia: gt('Croatia'),
        Curacao: gt('Curacao'),
        Czechia: gt('Czechia'),
        'Congo DR': gt('Congo DR'),
        Colombia: gt('Colombia'),
        Ecuador: gt('Ecuador'),
        Egypt: gt('Egypt'),
        England: gt('England'),
        France: gt('France'),
        Germany: gt('Germany'),
        Ghana: gt('Ghana'),
        Haiti: gt('Haiti'),
        Iraq: gt('Iraq'),
        'IR Iran': gt('IR Iran'),
        Japan: gt('Japan'),
        Jordan: gt('Jordan'),
        'Korea Republic': gt('Korea Republic'),
        Mexico: gt('Mexico'),
        Morocco: gt('Morocco'),
        Netherlands: gt('Netherlands'),
        'New Zealand': gt('New Zealand'),
        Norway: gt('Norway'),
        Panama: gt('Panama'),
        Paraguay: gt('Paraguay'),
        Portugal: gt('Portugal'),
        Qatar: gt('Qatar'),
        'Saudi Arabia': gt('Saudi Arabia'),
        Scotland: gt('Scotland'),
        Senegal: gt('Senegal'),
        Spain: gt('Spain'),
        'South Africa': gt('South Africa'),
        Sweden: gt('Sweden'),
        Switzerland: gt('Switzerland'),
        Tunisia: gt('Tunisia'),
        Turkiye: gt('Turkiye'),
        Uruguay: gt('Uruguay'),
        USA: gt('USA'),
        Uzbekistan: gt('Uzbekistan'),
        'United States': gt('United States'),
        'Cote d\'Ivoire': gt('Cote d\'Ivoire'),
        "Côte d'Ivoire": gt("Côte d'Ivoire"),
        TBD: gt('TBD'),
        Qualifier: gt('Qualifier'),
        'Winner A': gt('Winner A'),
        'Runner-up B': gt('Runner-up B'),
        'Group Opponent': gt('Group Opponent'),
        'Opening Rival': gt('Opening Rival'),
    }
    return labels[name] || name
}

function StatusPill({match, prediction}) {
    const isFinal = Boolean(match.result)
    const hasPrediction = Boolean(prediction?.pick)
    const pickIsCorrect = isFinal && hasPrediction && prediction.pick === match.result

    if (match.status === 'live') {
        return (
            <span
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-200/15 px-2.5 py-1 text-xs font-bold dark:border-emerald-400/30 dark:bg-emerald-400/12 text-success">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"/>
                <T>Live</T>
            </span>
        )
    }
    if (isFinal) {
        if (!hasPrediction) {
            return (
                <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-base-300 bg-base-100 px-2.5 py-1 text-xs font-semibold text-base-content/55">
                    <XCircle size={11}/>
                    <T>No pick</T>
                </span>
            )
        }

        return (
            pickIsCorrect ? (
                <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-xs font-bold text-success">
                    <CheckCircle2 size={11}/>
                    <T>Correct pick</T>
                </span>
            ) : (
                <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-error/25 bg-error/10 px-2.5 py-1 text-xs font-bold text-error">
                    <XCircle size={11}/>
                    <T>Missed pick</T>
                </span>
            )
        )
    }
    return (
        <span
            className="inline-flex items-center gap-1.5 rounded-full border border-base-300 bg-base-100 px-2.5 py-1 text-xs font-semibold text-base-content/45">
            <span className="h-1.5 w-1.5 rounded-full bg-base-content/25"/>
            <T>Upcoming</T>
        </span>
    )
}

export default function MatchPredictionCard({
                                                match,
                                                prediction,
                                                poolPicks = [],
                                                savingPick,
                                                onPick,
                                                onShowAuth,
                                                onShowJoin,
                                                readOnly = false,
                                                compact = false,
                                            }) {
    const gt = useGT()
    const locked = isLocked(match)
    const hasPlaceholderTeam = hasTbdTeam(match)
    const showScore = hasMatchScore(match)
    const matchTimeLabel = getMatchTimeLabel(match)
    const [showPicksList, setShowPicksList] = useState(false)

    const pickOptions = [
        {pick: 'home', label: gt('Home'), name: translateTeamName(match.home, gt)},
        {pick: 'draw', label: gt('Draw'), name: '—'},
        {pick: 'away', label: gt('Away'), name: translateTeamName(match.away, gt)},
    ]

    const poolPickStats = useMemo(() => {
        const counts = {home: 0, draw: 0, away: 0}
        poolPicks.forEach((poolPick) => {
            if (poolPick.pick === 'home' || poolPick.pick === 'draw' || poolPick.pick === 'away') {
                counts[poolPick.pick] += 1
            }
        })
        const total = counts.home + counts.draw + counts.away
        const percentage = (count) => (total > 0 ? Math.round((count / total) * 100) : 0)

        return {
            total,
            rows: [
                {
                    key: 'home',
                    label: translateTeamName(match.home, gt),
                    percent: percentage(counts.home),
                },
                {key: 'draw', label: gt('Draw'), percent: percentage(counts.draw)},
                {
                    key: 'away',
                    label: translateTeamName(match.away, gt),
                    percent: percentage(counts.away),
                },
            ],
        }
    }, [gt, match.away, match.home, poolPicks])

    return (
        <article
            className={`overflow-hidden border border-base-300 bg-base-100 ${compact ? 'rounded-xl' : 'rounded-2xl'}`}>
            <div
                className={`flex items-center gap-2 border-b border-base-300 bg-base-200/50 text-xs ${compact ? 'px-3 py-1.5' : 'px-4 py-2'}`}>
                <span className="font-semibold text-base-content/50">{translateStageLabel(match.stage, gt)}</span>
                <div className="ml-auto"><StatusPill match={match} prediction={prediction}/></div>
            </div>

            <div className={compact ? 'p-3' : 'p-4'}>
                <div className={`grid grid-cols-[1fr_auto_1fr] items-center ${compact ? 'mb-2 gap-3' : 'mb-3 gap-4'}`}>
                    <div className="flex flex-col items-end gap-1.5">
                        <TeamCrest name={match.home} src={match.homeCrest}/>
                        <div className={`text-right font-black leading-tight ${compact ? 'text-sm' : 'text-base'}`}>
                            {translateTeamName(match.home, gt)}
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1">
                        <span
                            className="text-[10px] font-bold tabular-nums uppercase tracking-wide text-base-content/45">
                            {matchTimeLabel}
                        </span>
                        {showScore ? (
                            <span
                                className={`rounded-xl border border-base-300 bg-base-200 font-black text-base-content ${compact ? 'px-2.5 py-1 text-sm' : 'px-3 py-1.5 text-base'}`}>
                                {match.homeScore}–{match.awayScore}
                            </span>
                        ) : (
                            <span
                                className="rounded-xl bg-neutral/5 border border-base-300 px-2.5 py-1 text-xs font-black text-base-content/70">
                                <T>VS</T>
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col items-start gap-1.5">
                        <TeamCrest name={match.away} src={match.awayCrest}/>
                        <div className={`font-black leading-tight ${compact ? 'text-sm' : 'text-base'}`}>
                            {translateTeamName(match.away, gt)}
                        </div>
                    </div>
                </div>

                <div className={`flex justify-center text-xs text-base-content/45 ${compact ? 'mb-3' : 'mb-4'}`}>
                    <span className="flex items-center gap-1">
                        <CalendarClock size={12}/>
                        {formatKickoff(match.kickoff)}
                    </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {pickOptions.map(({pick, label, name}) => {
                        const active = prediction?.pick === pick
                        const loading = savingPick === `${match.id}-${pick}`
                        const handleClick = () => {
                            if (readOnly) return
                            if (onShowAuth) {
                                onShowAuth();
                                return
                            }
                            if (onShowJoin) {
                                onShowJoin();
                                return
                            }
                            if (onPick) onPick(match, pick)
                        }
                        const activeClass = pick === 'home'
                            ? 'border-primary/50 bg-primary/85 text-primary-content'
                            : pick === 'draw'
                                ? 'border-base-content/20 bg-base-content/15 text-base-content'
                                : 'border-secondary/50 bg-secondary/85 text-secondary-content'
                        const hoverClass = pick === 'home'
                            ? 'hover:border-primary/40 hover:bg-primary/8 hover:text-primary'
                            : pick === 'draw'
                                ? 'hover:border-base-content/20 hover:bg-base-content/8 hover:text-base-content/80'
                                : 'hover:border-secondary/40 hover:bg-secondary/8 hover:text-secondary'
                        return (
                            <button
                                key={pick}
                                type="button"
                                disabled={readOnly || locked || hasPlaceholderTeam || loading}
                                onClick={handleClick}
                                className={`${readOnly ? 'cursor-default' : 'cursor-pointer'} rounded-xl border px-2 text-center transition-all disabled:cursor-not-allowed disabled:opacity-40 ${compact ? 'py-2.5' : 'py-3'} ${
                                    active
                                        ? activeClass
                                        : `border-base-300 bg-base-100 ${hoverClass}`
                                }`}
                            >
                                <div className="mb-1 text-xs font-bold uppercase tracking-wide opacity-60">
                                    {loading ? '…' : label}
                                </div>
                                <div className="truncate text-sm font-black">
                                    {name}
                                </div>
                            </button>
                        )
                    })}
                </div>

                <div className={`${compact ? 'mt-2.5' : 'mt-3'}`}>
                    <button
                        type="button"
                        onClick={() => setShowPicksList((open) => !open)}
                        aria-expanded={showPicksList}
                        className="group w-full cursor-pointer rounded-lg p-1.5 -mx-1.5 transition-colors hover:bg-base-200/60"
                    >
                        <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-base-content/40">
                                <T>Pool picks</T>
                            </span>
                            <span className="text-[10px] font-semibold text-base-content/35">
                                · {poolPickStats.total}
                            </span>
                            <ChevronDown
                                size={11}
                                className={`ml-auto text-base-content/35 transition-transform ${showPicksList ? 'rotate-180' : ''}`}
                            />
                        </div>

                        {/* Stacked horizontal bar */}
                        <div className="flex h-2 overflow-hidden rounded-full bg-base-200">
                            {poolPickStats.rows.map((row) =>
                                row.percent > 0 ? (
                                    <div
                                        key={row.key}
                                        style={{width: `${row.percent}%`}}
                                        className={`h-full transition-all ${
                                            row.key === 'home' ? 'bg-primary/65' :
                                                row.key === 'draw' ? 'bg-base-content/22' :
                                                    'bg-secondary/65'
                                        }`}
                                    />
                                ) : null
                            )}
                        </div>

                        {/* Legend */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                            {poolPickStats.rows.map((row) => (
                                <div key={row.key} className="flex items-center gap-1">
                                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                        row.key === 'home' ? 'bg-primary/65' :
                                            row.key === 'draw' ? 'bg-base-content/22' :
                                                'bg-secondary/65'
                                    }`}/>
                                    <span
                                        className="max-w-[5rem] truncate text-[10px] font-semibold text-base-content/50">
                                        {row.label}
                                    </span>
                                    <span className="text-[10px] font-black tabular-nums text-base-content/40">
                                        {row.percent}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </button>

                    {/* Expanded player list */}
                    {showPicksList && (
                        <ul className="mt-2.5 space-y-1.5">
                            {poolPicks.length === 0 ? (
                                <p className="text-xs font-semibold text-base-content/45">
                                    <T>No picks yet.</T>
                                </p>
                            ) : (
                                poolPicks.map((poolPick) => {
                                    const pickName = poolPick.pick === 'draw'
                                        ? gt('Draw')
                                        : translateTeamName(getPickTeamName(match, poolPick.pick), gt)
                                    const chipStyle = poolPick.pick === 'home'
                                        ? 'border-primary/30 bg-primary/10 text-primary'
                                        : poolPick.pick === 'draw'
                                            ? 'border-base-content/20 bg-base-content/8 text-base-content/60'
                                            : 'border-secondary/30 bg-secondary/10 text-secondary'
                                    return (
                                        <li key={poolPick.id}
                                            className="flex items-center gap-2">
                                            <PlayerAvatar
                                                name={poolPick.playerName}
                                                size={24}
                                                className="border border-base-300/80"
                                            />
                                            <span
                                                className="flex-1 truncate text-sm font-semibold text-base-content/75">
                                                {poolPick.playerName}
                                            </span>
                                            <span
                                                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${chipStyle}`}>
                                                {pickName}
                                            </span>
                                        </li>
                                    )
                                })
                            )}
                        </ul>
                    )}
                </div>

                <div
                    className={`flex items-center justify-between text-xs text-base-content/45 ${compact ? 'mt-2.5' : 'mt-3'}`}>
                    <span className="flex items-center gap-1">
                        {locked ? <Lock size={12}/> : <CheckCircle2 size={12}/>}
                        {locked ? gt('Locked') : gt('Open')}
                    </span>
                </div>
            </div>
        </article>
    )
}
