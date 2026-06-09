import {CalendarClock, CheckCircle2, Trophy, XCircle} from 'lucide-react'
import {T, Var} from 'gt-react'
import Panel from '../shared/Panel'
import PlayerAvatar from '../shared/PlayerAvatar'

function StatTile({icon: Icon, label, value, tone}) {
    const accentClass = {
        success: 'text-success',
        error: 'text-error',
        warning: 'text-warning',
        primary: 'text-primary',
    }

    return (
        <div className="rounded-xl border border-base-300 bg-base-100 p-3">
            <span className="text-xs font-bold uppercase tracking-wide stat-title">{label}</span>
            <div className={`flex items-center gap-1 ${accentClass[tone]}`}>
                <Icon size={20}/>
                <div className="text-2xl font-black text-neutral">{value}</div>
            </div>
        </div>
    )
}

export default function UserStatsCard({player, authUser, stats, workspaceName, onJoin}) {
    const displayUser = player || authUser

    if (!player) {
        return (
            <Panel>
                <div className="mb-4 flex min-w-0 items-center gap-3">
                    <PlayerAvatar name={displayUser?.name || 'Guest'} size={38} className="border border-base-300"/>
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-base-content/40"><T>Your stats</T>
                        </p>
                        <h2 className="truncate text-xl font-black">{displayUser?.name || 'Guest'}</h2>
                    </div>
                </div>
                <div className="rounded-xl border border-dashed border-base-300 bg-base-200/50 p-4 text-center">
                    <Trophy className="mx-auto mb-2 text-primary/45" size={28}/>
                    <h3 className="font-black"><T>No stats yet</T></h3>
                    <p className="mt-1 text-sm text-base-content/55">
                        {workspaceName
                            ? <T>Join <Var>{workspaceName}</Var> to submit picks and start tracking your score.</T>
                            : <T>Join a workspace to submit picks and start tracking your score.</T>}
                    </p>
                    {onJoin && (
                        <button type="button" className="btn btn-primary btn-sm mt-4 rounded-xl font-black"
                                onClick={onJoin}>
                            <T>Join now</T>
                        </button>
                    )}
                </div>
            </Panel>
        )
    }

    return (
        <Panel>
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <PlayerAvatar name={player?.name || 'Guest'} size={38} className="border border-base-300"/>
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-base-content/40"><T>Your stats</T>
                        </p>
                        <h2 className="truncate text-xl font-black">{player?.name || "Guest"}</h2>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <StatTile icon={CheckCircle2} label={<T>Correct</T>} value={stats.correct} tone="success"/>
                <StatTile icon={XCircle} label={<T>Wrong</T>} value={stats.wrong} tone="error"/>
                <StatTile icon={CalendarClock} label={<T>Pending</T>} value={stats.pending} tone="warning"/>
                <StatTile icon={Trophy} label={<T>Score</T>} value={stats.score} tone="primary"/>
            </div>
        </Panel>
    )
}
