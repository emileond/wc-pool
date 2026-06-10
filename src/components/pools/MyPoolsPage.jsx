import { ArrowRight, Plus, Trophy, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import Panel from '../shared/Panel'

function roleBadge(role = 'member') {
  if (role === 'owner') return 'badge badge-primary badge-outline'
  if (role === 'admin') return 'badge badge-secondary badge-outline'
  return 'badge badge-ghost'
}

export default function MyPoolsPage({
  authUser,
  pools,
  loading,
  creating,
  onLogin,
  onSignup,
  onCreatePool,
  onOpenPool,
}) {
  const [newPoolName, setNewPoolName] = useState('')
  const sortedPools = useMemo(
    () => [...pools].sort((a, b) => a.workspaceName.localeCompare(b.workspaceName)),
    [pools],
  )

  function handleCreate(event) {
    event.preventDefault()
    onCreatePool(newPoolName)
      .then(() => setNewPoolName(''))
      .catch(() => {})
  }

  if (!authUser) {
    return (
      <Panel>
        <div className="py-8 text-center">
          <Trophy className="mx-auto mb-3 text-primary/45" size={30} />
          <h2 className="text-2xl font-black">My Pools</h2>
          <p className="mt-2 text-sm text-base-content/60">Sign in to see all your pools in one place.</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button type="button" className="btn btn-primary btn-sm sm:btn-md" onClick={onLogin}>Log in</button>
            <button type="button" className="btn btn-outline btn-sm sm:btn-md" onClick={onSignup}>Create account</button>
          </div>
        </div>
      </Panel>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black sm:text-3xl">My Pools</h2>
          <p className="text-sm text-base-content/60">Choose a pool to continue or create a new one.</p>
        </div>
        <div className="stat w-full rounded-box border border-base-300 bg-base-100 p-4 sm:w-56">
          <div className="stat-title text-xs font-semibold uppercase tracking-wide text-base-content/50">Pools Joined</div>
          <div className="stat-value text-3xl text-base-content">{sortedPools.length}</div>
        </div>
      </div>

      <Panel>
        <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleCreate}>
          <label className="form-control">
            <div className="label pb-1">
              <span className="label-text text-xs font-semibold uppercase tracking-wide text-base-content/50">Create new pool</span>
            </div>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Pool name"
              value={newPoolName}
              onChange={(event) => setNewPoolName(event.target.value)}
              disabled={creating}
            />
          </label>
          <button type="submit" className="btn btn-primary sm:mt-7" disabled={creating || !newPoolName.trim()}>
            {creating ? <span className="loading loading-spinner loading-sm" /> : <Plus size={16} />}
            Create Pool
          </button>
        </form>
      </Panel>

      <Panel>
        {loading ? (
          <div className="py-10 text-center">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        ) : sortedPools.length === 0 ? (
          <div className="py-8 text-center">
            <Users className="mx-auto mb-3 text-base-content/35" size={30} />
            <h3 className="text-lg font-black">You have no pools yet</h3>
            <p className="mt-1 text-sm text-base-content/55">Create your first pool with the form above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedPools.map((pool) => (
              <button
                key={pool.membershipId}
                type="button"
                onClick={() => onOpenPool(pool.workspaceName)}
                className="flex w-full items-center gap-3 rounded-xl border border-base-300 bg-base-100 p-3 text-left transition-colors hover:border-primary/40 hover:bg-base-200"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Trophy size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black text-base-content">{pool.workspaceName}</div>
                  <div className="mt-1">
                    <span className={roleBadge(pool.role)}>{pool.role}</span>
                  </div>
                </div>
                <ArrowRight size={16} className="shrink-0 text-base-content/45" />
              </button>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
