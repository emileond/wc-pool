import {CalendarClock, CheckCircle2, Lock, XCircle} from 'lucide-react'
import {T, useGT, Var} from 'gt-react'

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

function StatusPill({match}) {
    const gt = useGT();

    if (match.status === 'live') {
        return (
            <span
                className="inline-flex items-center gap-1.5 rounded-full border border-error/25 bg-error/10 px-2.5 py-1 text-xs font-bold text-error">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-error"/>
                <T>Live</T>
            </span>
        )
    }
    if (match.result) {
        const teamName = match.result === 'home' ? match.home : match.result === 'away' ? match.away : null
        return (
            <span
                className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-xs font-bold text-success">
                <CheckCircle2 size={11}/>
                {teamName ? (
                    <T><span><Var>{teamName}</Var> won</span></T>
                ) : (
                    <T>Draw</T>
                )}
            </span>
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
    const isFinal = Boolean(match.result)
    const showScore = hasMatchScore(match)
    const pickIsCorrect = isFinal && prediction?.pick === match.result

    // FIX 1: Wrap static code terms in the gt() hook so they translate inside arrays
    const pickOptions = [
        {pick: 'home', label: gt('Home'), name: match.home},
        {pick: 'draw', label: gt('Draw'), name: '—'},
        {pick: 'away', label: gt('Away'), name: match.away},
    ]

    return (
        <article
            className={`overflow-hidden border border-base-300 bg-base-100 ${compact ? 'rounded-xl' : 'rounded-2xl'}`}>
            <div
                className={`flex items-center gap-2 border-b border-base-300 bg-base-200/50 text-xs ${compact ? 'px-3 py-1.5' : 'px-4 py-2'}`}>
                {/* FIX 2: Dynamic database strings like stage names are cleanly handled via gt() */}
                <span className="font-semibold text-base-content/50">{gt(match.stage)}</span>
                <div className="ml-auto"><StatusPill match={match}/></div>
            </div>

            <div className={compact ? 'p-3' : 'p-4'}>
                <div className={`grid grid-cols-[1fr_auto_1fr] items-center ${compact ? 'mb-2 gap-3' : 'mb-3 gap-4'}`}>
                    <div className="flex flex-col items-end gap-1.5">
                        <TeamCrest name={match.home} src={match.homeCrest}/>
                        <div className={`text-right font-black leading-tight ${compact ? 'text-sm' : 'text-base'}`}>
                            {gt(match.home)}
                        </div>
                    </div>
                    <div className="flex items-center justify-center">
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
                            {gt(match.away)}
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
                        return (
                            <button
                                key={pick}
                                type="button"
                                disabled={readOnly || locked || hasPlaceholderTeam || loading}
                                onClick={handleClick}
                                className={`${readOnly ? 'cursor-default' : 'cursor-pointer'} rounded-xl border px-2 text-center transition-all disabled:cursor-not-allowed disabled:opacity-40 ${compact ? 'py-2.5' : 'py-3'} ${
                                    active
                                        ? 'border-primary/50 bg-primary/85 text-primary-content'
                                        : 'border-base-300 bg-base-100 hover:border-primary/40 hover:bg-primary/5 hover:text-primary'
                                }`}
                            >
                                <div className="mb-1 text-xs font-bold uppercase tracking-wide opacity-60">
                                    {loading ? '…' : label}
                                </div>
                                <div className="truncate text-sm font-black">
                                    {name === '—' ? name : gt(name)}
                                </div>
                            </button>
                        )
                    })}
                </div>

                <div
                    className={`flex items-center justify-between text-xs text-base-content/45 ${compact ? 'mt-2.5' : 'mt-3'}`}>
                    <span className={`flex items-center gap-1.5 font-black ${
                        isFinal && prediction ? (pickIsCorrect ? 'text-success' : 'text-error') : 'text-base-content/60'
                    }`}>
                        {isFinal && prediction && (pickIsCorrect ? <CheckCircle2 size={14}/> : <XCircle size={14}/>)}

                        {/* FIX 3: Replaced the dynamic JavaScript string builder with structured JSX markup that the compiler can natively read */}
                        {!prediction ? (
                            readOnly ? <T>No pick</T> : onShowAuth ? <T>Sign in to pick</T> : onShowJoin ?
                                <T>Join to pick</T> : <T>No pick yet</T>
                        ) : isFinal ? (
                            pickIsCorrect
                                ?
                                <T context="Status of pick"><span>Correct pick: <Var>{prediction.pick === 'draw' ? gt('Draw') : gt(getPickTeamName(match, prediction.pick))}</Var></span></T>
                                :
                                <T context="Status of pick"><span>Missed pick: <Var>{prediction.pick === 'draw' ? gt('Draw') : gt(getPickTeamName(match, prediction.pick))}</Var></span></T>
                        ) : (
                            readOnly
                                ?
                                <T context="Status of pick"><span>Pick: <Var>{prediction.pick === 'draw' ? gt('Draw') : gt(getPickTeamName(match, prediction.pick))}</Var></span></T>
                                :
                                <T context="Status of pick"><span>Your pick: <Var>{prediction.pick === 'draw' ? gt('Draw') : gt(getPickTeamName(match, prediction.pick))}</Var></span></T>
                        )}
                    </span>
                    <span className="flex items-center gap-1">
                        {locked ? <Lock size={12}/> : <CheckCircle2 size={12}/>}
                        {locked ? gt('Locked') : gt('Open')}
                    </span>
                </div>
            </div>
        </article>
    )
}