import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import Panel from '../shared/Panel'

const STAGE_OPTIONS = [
  ['Group Stage', 'Groups'],
  ['Round of 32', 'R32'],
  ['Round of 16', 'R16'],
  ['Quarterfinal', 'QF'],
  ['Semifinal', 'SF'],
  ['Third Place', '3rd'],
  ['Final', 'Final'],
]

const TEAM_GROUPS = [
  ['Co-hosts', ['Canada', 'Mexico', 'USA']],
  ['AFC', ['Australia', 'Iraq', 'IR Iran', 'Japan', 'Jordan', 'Korea Republic', 'Qatar', 'Saudi Arabia', 'Uzbekistan']],
  ['CAF', ['Algeria', 'Cabo Verde', 'Congo DR', "Cote d'Ivoire", 'Egypt', 'Ghana', 'Morocco', 'Senegal', 'South Africa', 'Tunisia']],
  ['Concacaf', ['Curacao', 'Haiti', 'Panama']],
  ['CONMEBOL', ['Argentina', 'Brazil', 'Colombia', 'Ecuador', 'Paraguay', 'Uruguay']],
  ['OFC', ['New Zealand']],
  ['UEFA', ['Austria', 'Belgium', 'Bosnia and Herzegovina', 'Croatia', 'Czechia', 'England', 'France', 'Germany', 'Netherlands', 'Norway', 'Portugal', 'Scotland', 'Spain', 'Sweden', 'Switzerland', 'Turkiye']],
]

const TEAM_OPTIONS = TEAM_GROUPS.flatMap(([group, teams]) => teams.map((team) => [team, team, group]))

function formatForInput(value) {
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function formatKickoff(value) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function editableMatchDraft(match) {
  return {
    stage: match.stage,
    group: match.group,
    home: match.home,
    away: match.away,
    venue: match.venue,
    kickoff: formatForInput(match.kickoff),
    status: match.status,
    result: match.result,
  }
}

function groupOptions(options) {
  return options.reduce((groups, [value, label, group]) => {
    const groupName = group || ''
    if (!groups.has(groupName)) groups.set(groupName, [])
    groups.get(groupName).push([value, label])
    return groups
  }, new Map())
}

function AdminInput({ label, value, onChange, required = false, type = 'text', onBlur }) {
  return (
    <label className="form-control">
      <span className="label p-0 pb-1">
        <span className="label-text text-xs font-black uppercase tracking-wide text-base-content/50">{label}</span>
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className="input input-bordered w-full rounded-xl font-semibold"
        required={required}
      />
    </label>
  )
}

function AdminSelect({ label, value, onChange, options, placeholder = '', required = false }) {
  const groupedOptions = groupOptions(options)

  return (
    <label className="form-control">
      <span className="label p-0 pb-1">
        <span className="label-text text-xs font-black uppercase tracking-wide text-base-content/50">{label}</span>
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="select select-bordered w-full rounded-xl text-sm font-bold"
        required={required}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {[...groupedOptions.entries()].map(([group, items]) => (
          group
            ? (
              <optgroup key={group} label={group}>
                {items.map(([optionValue, optionLabel]) => (
                  <option key={optionValue} value={optionValue}>{optionLabel}</option>
                ))}
              </optgroup>
            )
            : items.map(([optionValue, optionLabel]) => (
              <option key={optionValue} value={optionValue}>{optionLabel}</option>
            ))
        ))}
      </select>
    </label>
  )
}

function MatchAdminCard({ match, updateMatch, deleteMatch }) {
  const [draft, setDraft] = useState(() => editableMatchDraft(match))

  function setDraftField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function saveField(field, value) {
    const current = field === 'kickoff' ? formatForInput(match.kickoff) : match[field]
    if (value === current) return
    updateMatch(match, { [field]: field === 'kickoff' ? new Date(value).toISOString() : value })
  }

  function saveSelect(field, value, extraPatch = {}) {
    setDraft((current) => ({ ...current, [field]: value, ...extraPatch }))
    updateMatch(match, { [field]: value, ...extraPatch })
  }

  return (
    <div className="rounded-xl border border-base-200 bg-base-200/50 p-3">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-black">{draft.home || 'Home'} vs {draft.away || 'Away'}</div>
          <div className="text-xs text-base-content/50">{formatKickoff(match.kickoff)}</div>
        </div>
        <button
          type="button"
          className="btn btn-error btn-sm gap-2 rounded-xl font-black"
          onClick={() => deleteMatch(match)}
        >
          <Trash2 size={16} />
          Delete
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <AdminSelect label="Stage" value={draft.stage} onChange={(value) => saveSelect('stage', value)} options={STAGE_OPTIONS} />
        <AdminInput
          label="Group"
          value={draft.group}
          onChange={(value) => setDraftField('group', value)}
          onBlur={() => saveField('group', draft.group)}
        />
        <AdminSelect label="Home" value={draft.home} onChange={(value) => saveSelect('home', value)} options={TEAM_OPTIONS} placeholder="Select home team" required />
        <AdminSelect label="Away" value={draft.away} onChange={(value) => saveSelect('away', value)} options={TEAM_OPTIONS} placeholder="Select away team" required />
        <AdminInput
          label="Venue"
          value={draft.venue}
          onChange={(value) => setDraftField('venue', value)}
          onBlur={() => saveField('venue', draft.venue)}
        />
        <AdminInput
          label="Kickoff"
          type="datetime-local"
          value={draft.kickoff}
          onChange={(value) => setDraftField('kickoff', value)}
          onBlur={() => saveField('kickoff', draft.kickoff)}
          required
        />
        <AdminSelect
          label="Status"
          value={draft.status}
          onChange={(value) => saveSelect('status', value)}
          options={[['scheduled', 'Scheduled'], ['live', 'Live'], ['final', 'Final']]}
        />
        <AdminSelect
          label="Result"
          value={draft.result}
          onChange={(value) => saveSelect('result', value, value ? { status: 'final' } : {})}
          options={[['', 'None'], ['home', draft.home || match.home], ['draw', 'Draw'], ['away', draft.away || match.away]]}
        />
      </div>
    </div>
  )
}

export default function AdminPage({
  adminPin,
  adminUnlocked,
  setAdminPin,
  unlockAdmin,
  newMatch,
  setNewMatch,
  addMatch,
  matches,
  updateMatch,
  deleteMatch,
}) {
  const [fixturesParent] = useAutoAnimate({ duration: 200, easing: 'ease-out' })

  if (!adminUnlocked) {
    return (
      <Panel>
        <form className="max-w-sm space-y-4" onSubmit={unlockAdmin}>
          <div>
            <h2 className="text-2xl font-black">Admin</h2>
            <p className="mt-1 text-sm text-base-content/60">Enter the pool PIN to manage fixtures and results.</p>
          </div>
          <input
            value={adminPin}
            onChange={(event) => setAdminPin(event.target.value)}
            className="input input-bordered w-full rounded-xl font-semibold"
            placeholder="Admin PIN"
            type="password"
          />
          <button className="btn btn-neutral rounded-xl font-black" type="submit">Unlock</button>
        </form>
      </Panel>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black sm:text-3xl">Admin</h2>
        <p className="mt-0.5 text-sm text-base-content/60">Add fixtures, edit details, and publish results.</p>
      </div>

      <Panel>
        <h3 className="mb-3 font-black">Add match</h3>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={addMatch}>
          <AdminSelect
            label="Stage"
            value={newMatch.stage}
            onChange={(value) => setNewMatch({ ...newMatch, stage: value })}
            options={STAGE_OPTIONS}
          />
          <AdminInput label="Group" value={newMatch.group} onChange={(value) => setNewMatch({ ...newMatch, group: value })} />
          <AdminSelect
            label="Home"
            value={newMatch.home}
            onChange={(value) => setNewMatch({ ...newMatch, home: value })}
            options={TEAM_OPTIONS}
            placeholder="Select home team"
            required
          />
          <AdminSelect
            label="Away"
            value={newMatch.away}
            onChange={(value) => setNewMatch({ ...newMatch, away: value })}
            options={TEAM_OPTIONS}
            placeholder="Select away team"
            required
          />
          <AdminInput label="Venue" value={newMatch.venue} onChange={(value) => setNewMatch({ ...newMatch, venue: value })} />
          <label className="form-control">
            <span className="label p-0 pb-1">
              <span className="label-text text-xs font-black uppercase tracking-wide text-base-content/50">Kickoff</span>
            </span>
            <input
              type="datetime-local"
              value={newMatch.kickoff}
              onChange={(event) => setNewMatch({ ...newMatch, kickoff: event.target.value })}
              className="input input-bordered w-full rounded-xl font-semibold"
              required
            />
          </label>
          <button type="submit" className="btn btn-primary gap-2 rounded-xl font-black md:col-span-2">
            <Plus size={18} />
            Add match
          </button>
        </form>
      </Panel>

      <Panel>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-black">Fixtures</h3>
        </div>
        <div ref={fixturesParent} className="space-y-2">
          {matches.map((match) => (
            <MatchAdminCard
              key={match.id}
              match={match}
              updateMatch={updateMatch}
              deleteMatch={deleteMatch}
            />
          ))}
        </div>
      </Panel>
    </div>
  )
}
