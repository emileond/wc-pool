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

function StatusPill({match}) {
    const gt = useGT()

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
                    <T><span><Var>{translateTeamName(teamName, gt)}</Var> won</span></T>
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

    const pickOptions = [
        {pick: 'home', label: gt('Home'), name: translateTeamName(match.home, gt)},
        {pick: 'draw', label: gt('Draw'), name: '—'},
        {pick: 'away', label: gt('Away'), name: translateTeamName(match.away, gt)},
    ]

    const selectedPickName = prediction?.pick === 'draw'
        ? gt('Draw')
        : translateTeamName(getPickTeamName(match, prediction?.pick), gt)

    return (
        <article
            className={`overflow-hidden border border-base-300 bg-base-100 ${compact ? 'rounded-xl' : 'rounded-2xl'}`}>
            <div
                className={`flex items-center gap-2 border-b border-base-300 bg-base-200/50 text-xs ${compact ? 'px-3 py-1.5' : 'px-4 py-2'}`}>
                <span className="font-semibold text-base-content/50">{translateStageLabel(match.stage, gt)}</span>
                <div className="ml-auto"><StatusPill match={match}/></div>
            </div>

            <div className={compact ? 'p-3' : 'p-4'}>
                <div className={`grid grid-cols-[1fr_auto_1fr] items-center ${compact ? 'mb-2 gap-3' : 'mb-3 gap-4'}`}>
                    <div className="flex flex-col items-end gap-1.5">
                        <TeamCrest name={match.home} src={match.homeCrest}/>
                        <div className={`text-right font-black leading-tight ${compact ? 'text-sm' : 'text-base'}`}>
                            {translateTeamName(match.home, gt)}
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
                                    {name}
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

                        {!prediction ? (
                            readOnly ? <T>No pick</T> : onShowAuth ? <T>Sign in to pick</T> : onShowJoin ?
                                <T>Join to pick</T> : <T>No pick yet</T>
                        ) : isFinal ? (
                            pickIsCorrect
                                ?
                                <T context="Status of pick"><span>Correct pick: <Var>{selectedPickName}</Var></span></T>
                                :
                                <T context="Status of pick"><span>Missed pick: <Var>{selectedPickName}</Var></span></T>
                        ) : (
                            readOnly
                                ?
                                <T context="Status of pick"><span>Pick: <Var>{selectedPickName}</Var></span></T>
                                :
                                <T context="Status of pick"><span>Your pick: <Var>{selectedPickName}</Var></span></T>
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
