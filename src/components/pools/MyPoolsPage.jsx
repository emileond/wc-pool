import {ArrowRight, Plus, Trophy, Users} from 'lucide-react'
import {useMemo} from 'react'

function roleBadge(role = 'member') {
    if (role === 'owner') return 'badge badge-primary badge-sm'
    if (role === 'admin') return 'badge badge-secondary badge-sm'
    return 'badge badge-ghost badge-sm'
}

function poolInitials(name = '') {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('')
}

const AVATAR_GRADIENTS = [
    'from-violet-500 to-indigo-500',
    'from-rose-500 to-pink-500',
    'from-amber-500 to-orange-500',
    'from-emerald-500 to-teal-500',
    'from-sky-500 to-cyan-500',
    'from-fuchsia-500 to-purple-500',
]

function avatarGradient(name = '') {
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % AVATAR_GRADIENTS.length
    return AVATAR_GRADIENTS[hash]
}

export default function MyPoolsPage({
                                        authUser,
                                        pools,
                                        loading,
                                        onLogin,
                                        onSignup,
                                        onCreate,
                                        onOpenPool,
                                    }) {
    const sortedPools = useMemo(
        () => [...pools].sort((a, b) => a.workspaceName.localeCompare(b.workspaceName)),
        [pools],
    )

    if (!authUser) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center px-4">
                <div className="w-full max-w-sm text-center">
                    <div
                        className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 shadow-inner">
                        <Trophy className="text-primary" size={36}/>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight">My Pools</h2>
                    <p className="mx-auto mt-2 max-w-xs text-sm text-base-content/60">
                        Sign in to manage all your pools in one place.
                    </p>
                    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                        <button type="button" className="btn btn-primary btn-md" onClick={onLogin}>Log in</button>
                        <button type="button" className="btn btn-outline btn-md" onClick={onSignup}>Create account
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-3xl font-black tracking-tight sm:text-4xl">My Pools</h2>
                    <p className="mt-1 text-sm text-base-content/55">Manage your pools or create a new one.</p>
                </div>
                {sortedPools.length > 0 && (
                    <div
                        className="flex items-center gap-2 self-start rounded-2xl border border-base-300 bg-base-100 px-4 py-2 shadow-sm sm:self-auto">
                        <span className="text-2xl font-black text-primary">{sortedPools.length}</span>
                        <span className="text-xs font-semibold uppercase tracking-wide text-base-content/50">
              {sortedPools.length === 1 ? 'Pool' : 'Pools'}
            </span>
                    </div>
                )}
            </div>

            {/* Create CTA */}
            <button
                type="button"
                onClick={onCreate}
                className="group relative w-full overflow-hidden rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5 p-6 text-left transition-all hover:border-primary/60 hover:from-primary/10 hover:to-secondary/10 hover:shadow-lg"
            >
                <div className="flex items-center gap-4">
                    <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-content shadow-md shadow-primary/30 transition-transform group-hover:scale-110">
                        <Plus size={22} strokeWidth={2.5}/>
                    </div>
                    <div className="flex-1">
                        <div className="font-black text-base-content">Create a new pool</div>
                        <div className="mt-0.5 text-sm text-base-content/55">Set up a name, pick a plan, and share in 3
                            easy steps.
                        </div>
                    </div>
                    <ArrowRight
                        size={20}
                        className="shrink-0 text-primary/50 transition-transform group-hover:translate-x-1 group-hover:text-primary"
                    />
                </div>
            </button>

            {/* Pool list */}
            <div>
                {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16">
                        <span className="loading loading-spinner loading-md text-primary"/>
                        <span className="text-sm text-base-content/50">Loading your pools…</span>
                    </div>
                ) : sortedPools.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div
                            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-base-200">
                            <Users className="text-base-content/30" size={28}/>
                        </div>
                        <h3 className="font-black text-base-content">No pools yet</h3>
                        <p className="mt-1 max-w-xs text-sm text-base-content/50">Hit the button above to create your
                            first pool — it only takes a minute.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                        {sortedPools.map((pool) => (
                            <button
                                key={pool.membershipId}
                                type="button"
                                onClick={() => onOpenPool(pool.workspaceName)}
                                className="group flex flex-col items-start gap-3 rounded-xl cursor-pointer border border-base-200 shadow-xs bg-base-100 p-4 text-left transition-all hover:border-primary/30 hover:shadow-md"
                            >
                                {/* Avatar + arrow row */}
                                <div className="flex w-full items-center justify-between">
                                    <div
                                        className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${avatarGradient(pool.workspaceName)} text-sm font-black text-white shadow-sm`}
                                    >
                                        {poolInitials(pool.workspaceName) || <Trophy size={16}/>}
                                    </div>
                                    <ArrowRight
                                        size={15}
                                        className="text-base-content/25 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
                                    />
                                </div>

                                {/* Info */}
                                <div className="min-w-0 w-full">
                                    <div className="truncate font-black text-base-content">{pool.workspaceName}</div>
                                    <div className="mt-1">
                                        <span className={roleBadge(pool.role)}>{pool.role}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
