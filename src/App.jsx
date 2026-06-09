import { useEffect, useMemo, useRef, useState } from 'react'
import Avatar from 'boring-avatars'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  CircleHelp,
  CircleDot,
  Lock,
  LogOut,
  Medal,
  Menu,
  Monitor,
  Moon,
  Plus,
  Sparkles,
  Sun,
  Trash2,
  Trophy,
  UserPlus,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { pb } from './lib/pocketbase';
pb.autoCancellation(false)

// ---------------------------------------------------------------------------
// Required PocketBase schema
//
//  users  (built-in auth collection)
//    - email     (auth identity field)
//    - password  (auth field)
//    - name      (text, required)
//    - is_admin  (bool, default false; global fixture admin only)
//
//  workspaces
//    - name      (text, required; also used as the URL segment)
//
//  memberships
//    - workspace (relation → workspaces)
//    - user      (relation → users)
//    - role      (text/select: "owner" | "admin" | "member")
//
//  matches
//    - external_id (text, unique; football-data.org match id)
//    - stage, group, home, away, venue, kickoff, status, result
//    - home_crest, away_crest (url; synced from team crest)
//    - home_score, away_score (number; synced from score.fullTime)
//
//  predictions
//    - workspace (relation → workspaces)
//    - user      (relation → users)
//    - match     (relation → matches)
//    - pick      (text: "home" | "draw" | "away")
//
//  leaderboard
//    - workspace   (relation → workspaces)
//    - user        (relation → users)
//    - name        (text)
//    - points      (number)
//    - correct     (number)
//    - predictions (number)
//    - accuracy    (number)
//    - rank        (number)
//
// The UI still calls signed-in users "players" because that is the pool
// language, but live PocketBase data now uses the built-in users collection
// directly instead of a separate players collection.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'wc-pool-demo-data'
const PLAYER_KEY = 'wc-pool-player'   // demo mode only
const THEME_KEY = 'wc-pool-theme'
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '2026'

const STAGE_TABS = [
  { id: 'groups', label: 'Groups', stage: 'Group Stage' },
  { id: 'r32',    label: 'R32',    stage: 'Round of 32' },
  { id: 'r16',    label: 'R16',    stage: 'Round of 16' },
  { id: 'qf',     label: 'QF',     stage: 'Quarterfinal' },
  { id: 'sf',     label: 'SF',     stage: 'Semifinal' },
  { id: 'third',  label: '3rd',    stage: 'Third Place' },
  { id: 'final',  label: 'Final',  stage: 'Final' },
]

const STAGE_OPTIONS = STAGE_TABS.map(({ stage, label }) => [stage, label])

const TEAM_GROUPS = [
  ['Co-hosts', ['Canada', 'Mexico', 'USA']],
  ['AFC', ['Australia', 'Iraq', 'IR Iran', 'Japan', 'Jordan', 'Korea Republic', 'Qatar', 'Saudi Arabia', 'Uzbekistan']],
  ['CAF', ['Algeria', 'Cabo Verde', 'Congo DR', "Côte d'Ivoire", 'Egypt', 'Ghana', 'Morocco', 'Senegal', 'South Africa', 'Tunisia']],
  ['Concacaf', ['Curaçao', 'Haiti', 'Panama']],
  ['CONMEBOL', ['Argentina', 'Brazil', 'Colombia', 'Ecuador', 'Paraguay', 'Uruguay']],
  ['OFC', ['New Zealand']],
  ['UEFA', ['Austria', 'Belgium', 'Bosnia and Herzegovina', 'Croatia', 'Czechia', 'England', 'France', 'Germany', 'Netherlands', 'Norway', 'Portugal', 'Scotland', 'Spain', 'Sweden', 'Switzerland', 'Türkiye']],
]

const TEAM_OPTIONS = TEAM_GROUPS.flatMap(([group, teams]) => teams.map((team) => [team, team, group]))

const demoMatches = [
  { id: 'match-1', stage: 'Group Stage', group: 'Opening Night', home: 'Mexico',        away: 'Opening Rival', venue: 'Estadio Azteca',      kickoff: '2026-06-11T20:00:00.000Z', status: 'scheduled', result: '' },
  { id: 'match-2', stage: 'Group Stage', group: 'North America', home: 'Canada',        away: 'Group Opponent', venue: 'Toronto Stadium',     kickoff: '2026-06-12T22:00:00.000Z', status: 'scheduled', result: '' },
  { id: 'match-3', stage: 'Group Stage', group: 'Prime Time',    home: 'United States', away: 'Group Opponent', venue: 'Los Angeles Stadium', kickoff: '2026-06-13T01:00:00.000Z', status: 'scheduled', result: '' },
  { id: 'match-4', stage: 'Group Stage', group: 'Favorites',     home: 'Argentina',     away: 'Qualifier',      venue: 'MetLife Stadium',     kickoff: '2026-06-14T19:00:00.000Z', status: 'scheduled', result: '' },
  { id: 'match-5', stage: 'Group Stage', group: 'Showcase',      home: 'France',        away: 'Qualifier',      venue: 'Dallas Stadium',      kickoff: '2026-06-15T21:00:00.000Z', status: 'scheduled', result: '' },
  { id: 'match-6', stage: 'Round of 32', group: 'Knockout',      home: 'Winner A',      away: 'Runner-up B',    venue: 'Seattle Stadium',     kickoff: '2026-06-28T20:00:00.000Z', status: 'scheduled', result: '' },
]

const emptyData = { players: [], matches: [], predictions: [], leaderboard: [] }
const demoData = { ...emptyData, matches: demoMatches }
const HERO_SURFACE = 'relative overflow-visible border-b border-base-300 bg-base-100 text-base-content'
const HERO_STYLE = {
  backgroundImage: [
    'linear-gradient(135deg, color-mix(in oklch, var(--color-primary) 24%, transparent), transparent 52%)',
    'linear-gradient(225deg, color-mix(in oklch, var(--color-accent) 22%, transparent), transparent 46%)',
    'linear-gradient(180deg, var(--color-base-100), color-mix(in oklch, var(--color-base-200) 74%, var(--color-base-100)))',
  ].join(', '),
}
const HERO_PATTERN_STYLE = {
  backgroundImage: 'repeating-linear-gradient(135deg, color-mix(in oklch, var(--color-primary) 16%, transparent) 0 1px, transparent 1px 18px)',
}

// ---------------------------------------------------------------------------
// Local storage helpers (demo mode only)
// ---------------------------------------------------------------------------
function readStoredData() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return demoData
  try { return { ...demoData, ...JSON.parse(stored) } } catch { return demoData }
}

function writeStoredData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function initialThemePreference() {
  const stored = localStorage.getItem(THEME_KEY)
  return ['light', 'dark', 'system'].includes(stored) ? stored : 'system'
}

function preferredSystemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolvedTheme(preference, systemTheme) {
  return preference === 'system' ? systemTheme : preference
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function createId(prefix) { return `${prefix}-${crypto.randomUUID()}` }
function cleanName(name)   { return name.trim().replace(/\s+/g, ' ') }

function optionalScore(value) {
  if (value === null || value === undefined || value === '') return null;

  const score = Number(value)
  return Number.isFinite(score) ? score : null
}

function normalizeMatch(record) {
  return {
    id: record.id,
    stage:   record.stage  || 'Group Stage',
    group:   record.group  || '',
    home:    record.home   || '',
    away:    record.away   || '',
    homeCrest: record.home_crest || '',
    awayCrest: record.away_crest || '',
    venue:   record.venue  || '',
    kickoff: record.kickoff,
    status:  record.status || 'scheduled',
    result:  record.result || '',
    homeScore: optionalScore(record.home_score),
    awayScore: optionalScore(record.away_score),
  }
}

function hasMatchScore(match) {
  return match.status !== 'scheduled' && Number.isFinite(match.homeScore) && Number.isFinite(match.awayScore)
}

function userDisplayName(record) {
  return cleanName(record?.name || '') || 'Player'
}

function normalizeWorkspace(record) {
  return {
    id: record.id,
    name: cleanName(record.name || '') || 'Workspace',
  }
}

function normalizeUser(record, role = 'member', membershipId = '') {
  return {
    id: record.id,
    name: userDisplayName(record),
    isAdmin: Boolean(record.is_admin),
    role,
    membershipId,
  }
}

function normalizeMembership(record) {
  const user = record.expand?.user || record.user
  const userId = relationId(record.user)
  return {
    id: record.id,
    workspace: relationId(record.workspace),
    role: record.role || 'member',
    player: normalizeUser(
      typeof user === 'string' ? { id: userId, name: '' } : user,
      record.role || 'member',
      record.id,
    ),
  }
}

function normalizePrediction(record) {
  const user = record.user ?? record.player
  return {
    id:     record.id,
    workspace: relationId(record.workspace),
    player: typeof user === 'string' ? user : user?.id,
    match:  typeof record.match  === 'string' ? record.match  : record.match?.id,
    pick:   record.pick,
  }
}

function normalizeLeaderboard(record) {
  const user = record.user ?? record.player
  return {
    id:          record.id,
    player:      typeof user === 'string' ? user : user?.id || record.id,
    workspace:   relationId(record.workspace),
    name:        record.name || userDisplayName(user),
    points:      Number(record.points) || 0,
    correct:     Number(record.correct) || 0,
    predictions: Number(record.predictions) || 0,
    accuracy:    Number(record.accuracy) || 0,
    rank:        Number(record.rank) || 0,
  }
}

function formatKickoff(value) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(new Date(value))
}

function formatForInput(value) {
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function pickLabel(match, pick) {
  if (pick === 'home') return match.home
  if (pick === 'away') return match.away
  if (pick === 'draw') return 'Draw'
  return 'No pick'
}

function isLocked(match) {
  return new Date(match.kickoff).getTime() <= Date.now() || match.status !== 'scheduled'
}

function sortMatches(matches) {
  return [...matches].sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))
}

function workspaceNameFromPath() {
  const [segment = ''] = window.location.pathname.split('/').filter(Boolean)
  if (!segment) return ''
  try { return decodeURIComponent(segment) } catch { return segment }
}

function relationId(value) {
  return typeof value === 'string' ? value : value?.id
}

function friendlyAuthError(err) {
  const msg = err?.message || ''
  if (msg.includes('Only superusers') || err?.status === 403)
    return msg || 'Signed in, but PocketBase collection rules blocked this action.'
  if (msg.includes('Failed to authenticate') || msg.includes('invalid credentials'))
    return 'Wrong email or password.'
  if (msg.includes('already exists') || msg.includes('unique'))
    return 'An account with that email already exists.'
  if (msg.includes('password') && msg.includes('short'))
    return 'Password must be at least 8 characters.'
  return msg || 'Something went wrong. Please try again.'
}

function escapePbFilterValue(value) {
  return String(value || '').replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}

function collectionAccessError(collection, action, err) {
  const msg = err?.message || ''
  if (err?.status === 403 || msg.includes('Only superusers')) {
    const authPrefix = pb.authStore.isValid ? 'Signed in' : 'Guest access'
    return new Error(
      `${authPrefix}, but PocketBase blocked ${action} on "${collection}". Check that collection's API rules.`,
    )
  }
  return err
}

// ---------------------------------------------------------------------------
// PocketBase data loaders
// ---------------------------------------------------------------------------
async function loadPocketBaseCollection(collection, options, mapRecord) {
  try {
    const records = await pb.collection(collection).getFullList(options)
    return records.map(mapRecord)
  } catch (err) {
    throw collectionAccessError(collection, 'read', err)
  }
}

async function loadWorkspaceByName(name) {
  if (!name) return null

  try {
    const escapedName = escapePbFilterValue(name)
    const workspace = await pb.collection('workspaces')
      .getFirstListItem(`name="${escapedName}"`)
    return normalizeWorkspace(workspace)
  } catch (err) {
    if (err?.status === 404) return null
    throw collectionAccessError('workspaces', 'read', err)
  }
}

async function loadPocketBaseData(workspaceId) {
  const workspaceFilter = workspaceId ? `workspace="${escapePbFilterValue(workspaceId)}"` : 'id=""'
  const [memberships, matches, predictions, leaderboard] = await Promise.all([
    loadPocketBaseCollection('memberships', { filter: workspaceFilter, sort: 'created', expand: 'user' }, normalizeMembership),
    loadPocketBaseCollection('matches', { sort: 'kickoff' }, normalizeMatch),
    loadPocketBaseCollection('predictions', { filter: workspaceFilter, sort: 'created' }, normalizePrediction),
    loadPocketBaseCollection('leaderboard', { filter: workspaceFilter, sort: 'rank' }, normalizeLeaderboard),
  ])
  const players = memberships.map((membership) => membership.player)
  return { players, matches, predictions, leaderboard }
}

async function loadPocketBaseGuestData(workspaceId) {
  return loadPocketBaseData(workspaceId)
}

// The authenticated user is a pool player only after joining the active workspace.
async function resolvePlayerForAuth(workspaceId) {
  const authRecord = pb.authStore.record
  if (!authRecord?.id || !workspaceId) return null

  const eu = escapePbFilterValue(authRecord.id)
  const ew = escapePbFilterValue(workspaceId)
  const existing = await pb.collection('memberships')
    .getFirstListItem(`workspace="${ew}" && user="${eu}"`, { expand: 'user' })
    .catch(() => null)

  if (existing) return normalizeMembership(existing).player
  return null
}

async function joinWorkspaceForAuth(workspaceId) {
  const authRecord = pb.authStore.record
  if (!authRecord?.id || !workspaceId) return null

  const existing = await resolvePlayerForAuth(workspaceId)
  if (existing) return existing

  const membership = await pb.collection('memberships').create({
    workspace: workspaceId,
    user: authRecord.id,
    role: 'member',
  })
  return normalizeUser(authRecord, membership.role || 'member', membership.id)
}

// ---------------------------------------------------------------------------
// Score logic
// ---------------------------------------------------------------------------
function calculateLeaderboard(players, matches, predictions) {
  const finals = new Map(matches.filter((m) => m.result).map((m) => [m.id, m]))
  return players
    .map((player) => {
      const pp      = predictions.filter((p) => p.player === player.id)
      const correct = pp.filter((p) => { const m = finals.get(p.match); return m && m.result === p.pick }).length
      return { ...player, points: correct * 3, correct, predictions: pp.length }
    })
    .sort((a, b) => b.points - a.points || b.correct - a.correct || b.predictions - a.predictions)
}

function calculatePlayerStats(player, matches, predictions) {
  if (!player) return { correct: 0, wrong: 0, pending: 0, score: 0 }
  const byId    = new Map(matches.map((m) => [m.id, m]))
  const pp      = predictions.filter((p) => p.player === player.id)
  const correct = pp.filter((p) => { const m = byId.get(p.match); return m?.result && m.result === p.pick }).length
  const wrong   = pp.filter((p) => { const m = byId.get(p.match); return m?.result && m.result !== p.pick }).length
  const pending = pp.filter((p) => { const m = byId.get(p.match); return m && !m.result }).length
  return { correct, wrong, pending, score: correct * 3 }
}

// ===========================================================================
// App
// ===========================================================================
function App() {
  const [activePage,    setActivePage]    = useState('predictions')
  const [backend,       setBackend]       = useState('loading')
  const [data,          setData]          = useState(emptyData)
  const [player,        setPlayer]        = useState(null)
  const [authUser,      setAuthUser]      = useState(null)
  const [workspaceName] = useState(() => workspaceNameFromPath())
  const [activeWorkspace, setActiveWorkspace] = useState(null)
  const [themePreference, setThemePreference] = useState(initialThemePreference)
  const [systemTheme, setSystemTheme] = useState(preferredSystemTheme)
  const [savingPick,    setSavingPick]    = useState('')
  const [adminPin,      setAdminPin]      = useState('')
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [newMatch,      setNewMatch]      = useState({
    stage: 'Group Stage', group: '', home: '', away: '', venue: '',
    kickoff: formatForInput('2026-06-11T20:00:00.000Z'),
  })

  // Auth modal + form state
  const [authModal,    setAuthModal]    = useState(false)
  const [authView,     setAuthView]     = useState('login')
  const [authLoading,  setAuthLoading]  = useState(false)
  const [authError,    setAuthError]    = useState('')
  const [authName,     setAuthName]     = useState('')
  const [authEmail,    setAuthEmail]    = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [joinModal,    setJoinModal]    = useState(false)
  const [joinLoading,  setJoinLoading]  = useState(false)
  const [joinError,    setJoinError]    = useState('')

  // Demo mode name (used when PocketBase is unreachable)
  const [demoName, setDemoName] = useState('')

  const matches      = useMemo(() => sortMatches(data.matches), [data.matches])
  const leaderboard  = useMemo(() => {
    if (backend === 'pocketbase') return data.leaderboard
    return calculateLeaderboard(data.players, matches, data.predictions)
  }, [backend, data.leaderboard, data.players, data.predictions, matches])
  const playerStats  = useMemo(() => calculatePlayerStats(player, matches, data.predictions), [data.predictions, matches, player])
  const playerPredictions = useMemo(() => {
    if (!player) return new Map()
    return new Map(
      data.predictions.filter((p) => p.player === player.id).map((p) => [p.match, p]),
    )
  }, [data.predictions, player])
  const completedMatches = matches.filter((m) => m.result).length
  const adminAllowed = Boolean(player?.isAdmin || ['owner', 'admin'].includes(player?.role) || adminUnlocked)
  const theme = resolvedTheme(themePreference, systemTheme)
  const canJoinWorkspace = backend === 'pocketbase' && activeWorkspace && authUser && !player
  const [pageParent] = useAutoAnimate({ duration: 180, easing: 'ease-out' })

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!query) return undefined

    const updateSystemTheme = () => setSystemTheme(query.matches ? 'dark' : 'light')
    updateSystemTheme()
    query.addEventListener('change', updateSystemTheme)
    return () => query.removeEventListener('change', updateSystemTheme)
  }, [])

  function changeThemePreference(preference) {
    setThemePreference(preference)
    localStorage.setItem(THEME_KEY, preference)
  }

  // ---------------------------------------------------------------------------
  // Startup: restore session or detect backend
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let active = true

    async function init() {
      // 1. Resolve the workspace from /WORKSPACE_NAME, then restore an existing session.
      try {
        const workspace = await loadWorkspaceByName(workspaceName)
        if (!active) return
        setActiveWorkspace(workspace)

        if (!workspace) {
          setData(emptyData)
          setBackend('pocketbase')
          return
        }

        if (pb.authStore.isValid) {
          try {
            await pb.collection('users').authRefresh()
            if (!active) return
            setAuthUser(normalizeUser(pb.authStore.record))
            const resolvedPlayer = await resolvePlayerForAuth(workspace.id)
            if (!active) return
            setPlayer(resolvedPlayer)
            setData(await loadPocketBaseData(workspace.id))
            setBackend('pocketbase')
            return
          } catch {
            pb.authStore.clear()
            setAuthUser(null)
            setPlayer(null)
          }
        }

        if (!active) return
        setData(await loadPocketBaseGuestData(workspace.id))
        setBackend('pocketbase')
      } catch (err) {
        if (pb.authStore.isValid) {
          pb.authStore.clear()
        }
        setAuthUser(null)
        setPlayer(null)
        if (!active) return
        if (err?.status && err.status !== 0) {
          // PocketBase returned an HTTP response (e.g. 401/403) — it IS running, just needs auth
          setBackend('pocketbase')
        } else {
          // Network error — PocketBase not reachable → demo mode
          const localData = readStoredData()
          setData(localData)
          setBackend('demo')
          const saved = localStorage.getItem(PLAYER_KEY)
          if (saved) { try { setPlayer(JSON.parse(saved)) } catch { /* ignore */ } }
        }
      }
    }

    init()
    return () => { active = false }
  }, [workspaceName])

  // ---------------------------------------------------------------------------
  // PocketBase auth actions
  // ---------------------------------------------------------------------------
  async function handleLogin(event) {
    event.preventDefault()
    if (!activeWorkspace) {
      setAuthError('Open a valid workspace URL before signing in.')
      return
    }
    setAuthLoading(true)
    setAuthError('')
    try {
      await pb.collection('users').authWithPassword(authEmail, authPassword)
      const resolvedAuthUser = normalizeUser(pb.authStore.record)
      const resolvedPlayer = await resolvePlayerForAuth(activeWorkspace.id)
      setAuthUser(resolvedAuthUser)
      setPlayer(resolvedPlayer)
      setData(await loadPocketBaseData(activeWorkspace.id))
      setBackend('pocketbase')
      setAuthModal(false)
    } catch (err) {
      setAuthError(friendlyAuthError(err))
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleSignup(event) {
    event.preventDefault()
    if (!activeWorkspace) {
      setAuthError('Open a valid workspace URL before creating an account.')
      return
    }
    setAuthLoading(true)
    setAuthError('')
    try {
      await pb.collection('users').create({
        name: authName,
        email: authEmail,
        password: authPassword,
        passwordConfirm: authPassword,
      })
      await pb.collection('users').authWithPassword(authEmail, authPassword)
      const resolvedAuthUser = normalizeUser(pb.authStore.record)
      const resolvedPlayer = await joinWorkspaceForAuth(activeWorkspace.id)
      setAuthUser(resolvedAuthUser)
      setPlayer(resolvedPlayer)
      setData(await loadPocketBaseData(activeWorkspace.id))
      setBackend('pocketbase')
      setAuthModal(false)
      toast.success(`Welcome, ${authName}!`)
    } catch (err) {
      setAuthError(friendlyAuthError(err))
    } finally {
      setAuthLoading(false)
    }
  }

  function openAuth(view = 'login') {
    setAuthView(view)
    setAuthError('')
    setAuthModal(true)
  }

  function logout() {
    pb.authStore.clear()
    setAuthUser(null)
    setPlayer(null)
    setJoinModal(false)
    setActivePage('predictions')
    setAdminUnlocked(false)
    if (backend === 'pocketbase') {
      loadPocketBaseGuestData(activeWorkspace?.id)
        .then(setData)
        .catch(() => setData(emptyData))
    } else {
      setData(readStoredData())
    }
  }

  async function joinWorkspace() {
    if (!activeWorkspace || !authUser) return
    setJoinLoading(true)
    setJoinError('')
    try {
      const resolvedPlayer = await joinWorkspaceForAuth(activeWorkspace.id)
      setPlayer(resolvedPlayer)
      setData(await loadPocketBaseData(activeWorkspace.id))
      setJoinModal(false)
      toast.success(`Joined ${activeWorkspace.name}.`)
    } catch (err) {
      setJoinError(friendlyAuthError(err))
    } finally {
      setJoinLoading(false)
    }
  }

  function openJoinModal() {
    setJoinError('')
    setJoinModal(true)
  }

  // ---------------------------------------------------------------------------
  // Demo mode registration (PocketBase unreachable)
  // ---------------------------------------------------------------------------
  function registerDemo(event) {
    event.preventDefault()
    const trimmed = cleanName(demoName)
    if (!trimmed) return
    const nextPlayer = { id: createId('player'), name: trimmed }
    syncLocal((current) => ({ ...current, players: [...current.players, nextPlayer] }))
    setPlayer(nextPlayer)
    localStorage.setItem(PLAYER_KEY, JSON.stringify(nextPlayer))
    toast.success(`Welcome, ${trimmed}. Demo mode active — data is stored locally.`)
  }

  // ---------------------------------------------------------------------------
  // Data mutations (PocketBase + demo fallback)
  // ---------------------------------------------------------------------------
  function syncLocal(updater) {
    setData((current) => {
      const next = updater(current)
      writeStoredData(next)
      return next
    })
  }

  async function savePrediction(match, pick) {
    if (isLocked(match)) return
    if (!player) {
      if (authUser && activeWorkspace) openJoinModal()
      else openAuth('signup')
      return
    }
    if (backend === 'pocketbase' && !activeWorkspace) {
      toast.error('Open a valid workspace URL before saving picks.')
      return
    }
    setSavingPick(`${match.id}-${pick}`)

    try {
      if (backend === 'pocketbase') {
        const ep = escapePbFilterValue(player.id)
        const em = escapePbFilterValue(match.id)
        const ew = escapePbFilterValue(activeWorkspace.id)
        const existing = await pb.collection('predictions')
          .getFirstListItem(`workspace="${ew}" && user="${ep}" && match="${em}"`).catch(() => null)
        if (existing) {
          await pb.collection('predictions').update(existing.id, { pick })
        } else {
          await pb.collection('predictions').create({ workspace: activeWorkspace.id, user: player.id, match: match.id, pick })
        }
        setData(await loadPocketBaseData(activeWorkspace.id))
        toast.success(`Saved: ${pickLabel(match, pick)} — ${match.home} vs ${match.away}`)
        return
      }
    } catch {
      // fall through to local
    } finally {
      setSavingPick('')
    }

    syncLocal((current) => {
      const existing = current.predictions.find((p) => p.player === player.id && p.match === match.id)
      const predictions = existing
        ? current.predictions.map((p) => p.id === existing.id ? { ...p, pick } : p)
        : [...current.predictions, { id: createId('prediction'), player: player.id, match: match.id, pick }]
      return { ...current, predictions }
    })
    toast.success(`Saved: ${pickLabel(match, pick)} — ${match.home} vs ${match.away}`)
  }

  async function addMatch(event) {
    event.preventDefault()
    const match = { ...newMatch, kickoff: new Date(newMatch.kickoff).toISOString(), status: 'scheduled', result: '' }
    try {
      if (backend === 'pocketbase') {
        await pb.collection('matches').create(match)
        setData(await loadPocketBaseData(activeWorkspace?.id))
      } else {
        syncLocal((c) => ({ ...c, matches: [...c.matches, { ...match, id: createId('match') }] }))
      }
      setNewMatch((c) => ({ ...c, home: '', away: '', venue: '', group: '' }))
      toast.success('Match added.')
    } catch {
      toast.error('Could not add the match. Check PocketBase collection rules.')
    }
  }

  async function updateMatch(match, patch) {
    try {
      if (backend === 'pocketbase') {
        await pb.collection('matches').update(match.id, patch)
        setData(await loadPocketBaseData(activeWorkspace?.id))
      } else {
        syncLocal((c) => ({ ...c, matches: c.matches.map((m) => m.id === match.id ? { ...m, ...patch } : m) }))
      }
      toast.success('Match updated.')
    } catch {
      toast.error('Could not update the match. Check PocketBase admin rules.')
    }
  }

  async function deleteMatch(match) {
    try {
      if (backend === 'pocketbase') {
        await pb.collection('matches').delete(match.id)
        setData(await loadPocketBaseData(activeWorkspace?.id))
      } else {
        syncLocal((c) => ({
          ...c,
          matches: c.matches.filter((m) => m.id !== match.id),
          predictions: c.predictions.filter((p) => p.match !== match.id),
        }))
      }
      toast.success('Match deleted.')
    } catch {
      toast.error('Could not delete the match. Check PocketBase admin rules.')
    }
  }

  function unlockAdmin(event) {
    event.preventDefault()
    const ok = adminPin === ADMIN_PIN
    setAdminUnlocked(ok)
    if (ok) toast.success('Admin unlocked.')
    else toast.error('Wrong PIN.')
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  // Loading state — waiting to know if PocketBase is reachable
  if (backend === 'loading') {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${HERO_SURFACE}`} style={HERO_STYLE} data-theme={theme}>
        <div className="pointer-events-none absolute inset-0 opacity-45" style={HERO_PATTERN_STYLE} />
        <div className="relative flex flex-col items-center">
          <Sparkles size={28} className="mb-4 opacity-70" />
          <p className="text-sm font-semibold text-base-content/65">Connecting…</p>
        </div>
      </div>
    )
  }

  // Main app — always shown (guests can browse; auth modal appears on demand)
  return (
    <div className="min-h-screen bg-base-200 text-base-content" data-theme={theme}>
      {/* Auth modal */}
      {authModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setAuthModal(false) }}
        >
          <AuthCard
            view={authView} setView={(v) => { setAuthView(v); setAuthError('') }}
            name={authName}         setName={setAuthName}
            email={authEmail}       setEmail={setAuthEmail}
            password={authPassword} setPassword={setAuthPassword}
            workspaceName={activeWorkspace?.name}
            error={authError} loading={authLoading}
            onLogin={handleLogin} onSignup={handleSignup}
            onClose={() => setAuthModal(false)}
          />
        </div>
      )}
      {joinModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setJoinModal(false) }}
        >
          <JoinWorkspaceModal
            workspaceName={activeWorkspace?.name}
            userName={authUser?.name}
            error={joinError}
            loading={joinLoading}
            onJoin={joinWorkspace}
            onClose={() => setJoinModal(false)}
          />
        </div>
      )}
      {/* Header */}
      <header className={HERO_SURFACE} style={HERO_STYLE}>
        <div className="pointer-events-none absolute inset-0 opacity-45" style={HERO_PATTERN_STYLE} />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-base-content/55">
                 {activeWorkspace?.name || workspaceName || 'Prediction Pool'}
              </div>
              <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
                World Cup 2026
              </h1>
            </div>
            <HeaderUserMenu
              backend={backend}
              player={player || authUser}
              workspace={activeWorkspace}
              themePreference={themePreference}
              onThemeChange={changeThemePreference}
              onLogin={() => openAuth('login')}
              onSignup={() => openAuth('signup')}
              onLogout={backend === 'pocketbase' ? logout : () => {
                localStorage.removeItem(PLAYER_KEY)
                setPlayer(null)
              }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <nav className="flex flex-wrap gap-1">
              <NavButton active={activePage === 'predictions'} onClick={() => setActivePage('predictions')} icon={CircleDot}>Predictions</NavButton>
              <NavButton active={activePage === 'leaderboard'} onClick={() => setActivePage('leaderboard')} icon={Trophy}>Leaderboard</NavButton>
              {/*<NavButton ctive={activePage === 'admin'}
                  onClick={() => setActivePage('admin')} icon={Settings}>Admin</NavButton>*/}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-3 lg:px-8">
        <section ref={pageParent} className="min-w-0 lg:col-span-2">
          {/* Demo mode: show name registration if no player yet */}
          {backend === 'demo' && !player && (
            <DemoRegistrationCard name={demoName} setName={setDemoName} onSubmit={registerDemo} />
          )}

          {backend === 'pocketbase' && !activeWorkspace && (
            <MissingWorkspaceCard workspaceName={workspaceName} />
          )}

          {canJoinWorkspace && (
            <JoinWorkspaceCard
              workspaceName={activeWorkspace.name}
              userName={authUser.name}
              onJoin={openJoinModal}
            />
          )}

          {(backend === 'demo' || activeWorkspace) && activePage === 'predictions' && (
            <PredictionsPage
              matches={matches}
              playerPredictions={playerPredictions}
              savingPick={savingPick} onPick={savePrediction}
              onShowAuth={backend === 'pocketbase' && !authUser ? () => openAuth('signup') : null}
              onShowJoin={canJoinWorkspace ? openJoinModal : null}
            />
          )}
          {(backend === 'demo' || activeWorkspace) && activePage === 'leaderboard' && (
            <LeaderboardPage leaderboard={leaderboard} matches={matches} predictions={data.predictions} />
          )}
          {activePage === 'admin' && (
            <AdminPage
              adminPin={adminPin} adminUnlocked={adminAllowed}
              setAdminPin={setAdminPin} unlockAdmin={unlockAdmin}
              backend={backend} newMatch={newMatch} setNewMatch={setNewMatch}
              addMatch={addMatch} matches={matches} updateMatch={updateMatch} deleteMatch={deleteMatch}
            />
          )}
        </section>

        <aside className="space-y-4">
          <UserStatsCard
            player={player}
            authUser={authUser}
            stats={playerStats}
            workspaceName={activeWorkspace?.name}
            onJoin={backend === 'pocketbase' && activeWorkspace ? (authUser ? openJoinModal : () => openAuth('signup')) : null}
          />

          {/* Pool status */}
          <Panel>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-base-content/40">Pool</p>
                <h2 className="text-2xl font-black">{data.players.length} players</h2>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Matches', value: matches.length },
                { label: 'Ended',  value: completedMatches },
                { label: 'Total Picks',   value: data.predictions.length },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-base-300 bg-base-200/50 p-3 text-center">
                  <div className="text-xl font-black">{value}</div>
                  <div className="mt-0.5 font-semibold uppercase stat-desc">{label}</div>
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </main>
    </div>
  )
}

// ===========================================================================
// AuthCard — rendered inside the backdrop modal
// ===========================================================================
function AuthCard({ view, setView, name, setName, email, setEmail, password, setPassword, workspaceName, error, loading, onLogin, onSignup, onClose }) {
  const [formParent] = useAutoAnimate({ duration: 180, easing: 'ease-out' })

  return (
    <div className="w-full max-w-sm rounded-2xl border border-base-200 bg-base-100 p-6 shadow-2xl">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black">{view === 'login' ? 'Welcome back' : 'Join the pool'}</h2>
          <p className="mt-0.5 text-xs text-base-content/50">
            {view === 'login'
              ? `Sign in to submit picks${workspaceName ? ` for ${workspaceName}` : ''}.`
              : `Create an account${workspaceName ? ` for ${workspaceName}` : ''}.`}
          </p>
        </div>
        <button type="button" onClick={onClose} className="ml-4 rounded-lg p-1 text-base-content/30 hover:text-base-content/60">✕</button>
      </div>

      {/* Tab toggle */}
      <div className="mb-5 flex rounded-xl border border-base-200 bg-base-200 p-1">
        {[['login', 'Sign in'], ['signup', 'Create account']].map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`flex-1 rounded-lg py-2 text-sm font-bold transition-colors ${
              view === v ? 'bg-base-100 text-base-content shadow-sm' : 'text-base-content/50 hover:text-base-content'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Form */}
      <form ref={formParent} onSubmit={view === 'login' ? onLogin : onSignup} className="space-y-3">
        {view === 'signup' && (
          <AuthField label="Name" type="text" value={name} onChange={setName} placeholder="Your name" required autoComplete="name" />
        )}
        <AuthField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required autoComplete="email" />
        <AuthField label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" required minLength={8} autoComplete={view === 'login' ? 'current-password' : 'new-password'} />

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-error/30 bg-error/10 px-3 py-2.5 text-xs font-semibold text-error">
            <XCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary w-full rounded-xl font-black">
          {loading && <span className="loading loading-spinner loading-sm" />}
          {view === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-base-content/40">
        {view === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <button type="button" className="font-bold text-primary hover:underline" onClick={() => setView(view === 'login' ? 'signup' : 'login')}>
          {view === 'login' ? 'Create one' : 'Sign in'}
        </button>
      </p>
    </div>
  )
}

function AuthField({ label, type, value, onChange, placeholder, required, minLength, autoComplete }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-base-content/50">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input input-bordered w-full rounded-xl"
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
      />
    </div>
  )
}

function JoinWorkspaceModal({ workspaceName, userName, error, loading, onJoin, onClose }) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-base-200 bg-base-100 p-6 shadow-2xl">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black">Join this pool?</h2>
          <p className="mt-0.5 text-xs text-base-content/50">
            {userName || 'You'} can browse {workspaceName || 'this workspace'} without joining, but picks require membership.
          </p>
        </div>
        <button type="button" onClick={onClose} className="ml-4 rounded-lg p-1 text-base-content/30 hover:text-base-content/60">✕</button>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-error/30 bg-error/10 px-3 py-2.5 text-xs font-semibold text-error">
          <XCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-2">
        <button type="button" disabled={loading} className="btn btn-primary w-full rounded-xl font-black" onClick={onJoin}>
          {loading && <span className="loading loading-spinner loading-sm" />}
          Join pool
        </button>
        <button type="button" className="btn btn-ghost rounded-xl font-bold" onClick={onClose}>
          Keep browsing
        </button>
      </div>
    </div>
  )
}

// ===========================================================================
// Shared components
// ===========================================================================
function NavButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
        active ? 'border border-primary/35 bg-base-100/70 text-primary shadow-xs' : 'text-base-content/60 hover:bg-base-100/70 hover:text-base-content'
      }`}
    >
      <Icon size={16} />
      {children}
    </button>
  )
}

function Panel({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-base-300 bg-base-100 ${className}`}>
      <div className="p-5">{children}</div>
    </div>
  )
}

const AVATAR_COLORS = [
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-accent)',
  'var(--color-neutral)',
  'var(--color-base-content)',
]

function PlayerAvatar({ name, size = 36, className = '' }) {
  return (
    <div className={`shrink-0 overflow-hidden rounded-full bg-white/90 ${className}`} style={{ width: size, height: size }}>
      <Avatar
        name={name || 'Guest'}
        variant="beam"
        colors={AVATAR_COLORS}
        size={size}
        square
      />
    </div>
  )
}

function HeaderUserMenu({ backend, player, workspace, themePreference, onThemeChange, onLogin, onSignup, onLogout }) {
  const [menuParent] = useAutoAnimate({ duration: 160, easing: 'ease-out' })
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const themeOptions = [
    { value: 'system', label: 'System', icon: Monitor },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
  ]

  useEffect(() => {
    if (!menuOpen) return undefined

    function closeOnOutsidePointer(event) {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [menuOpen])

  return (
    <div ref={menuRef} className="relative z-50 self-start">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className="btn btn-ghost h-auto min-h-0 rounded-full border border-base-content/10 bg-base-100/70 py-1 pl-1 pr-2.5 text-base-content shadow-xs hover:border-primary/25 hover:bg-base-100"
      >
        <PlayerAvatar name={player?.name || 'Guest'} size={32} />
        <span className="hidden max-w-40 truncate text-xs font-black normal-case sm:inline">
          {player?.name || 'Guest'}
        </span>
        <Menu size={15} className="shrink-0 text-base-content/45" />
      </button>
      {menuOpen && (
        <ul
          ref={menuParent}
          className="menu absolute right-0 top-full z-50 mt-2 w-60 rounded-box border border-base-300 bg-base-100 p-2 text-base-content shadow-xl"
          role="menu"
        >
          {backend === 'pocketbase' && (
            <li className="menu-title">
              <span className="truncate">{workspace?.name || 'No workspace'}</span>
            </li>
          )}
          <li className="menu-title">
            <span className="truncate">{player?.name || 'Guest'}</span>
          </li>
          <li className="menu-title mt-1">
            <span>Theme</span>
          </li>
          <li className="px-2 pb-1">
            <div className="flex items-center gap-2 rounded-lg bg-base-100 py-1.5">
              {themeOptions.map(({ value, icon: Icon }) => (
                value === themePreference ? <Icon key={value} size={15} className="shrink-0 text-base-content/50" /> : null
              ))}
              <select
                value={themePreference}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => onThemeChange(event.target.value)}
                className="select select-bordered select-sm h-8 min-h-8 flex-1 bg-base-100 text-xs font-bold"
                aria-label="Theme"
              >
                {themeOptions.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </li>
          {backend === 'pocketbase' && !player ? (
            <>
              <li><button type="button" onClick={() => { setMenuOpen(false); onLogin() }}>Sign in</button></li>
              <li><button type="button" onClick={() => { setMenuOpen(false); onSignup() }}>Join the pool</button></li>
            </>
          ) : (
            <li>
              <button type="button" className="text-error" onClick={() => { setMenuOpen(false); onLogout() }}>
                <LogOut size={16} />
                {backend === 'pocketbase' ? 'Sign out' : 'Switch player'}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

function TeamCrest({ name, src }) {
  if (!src) return (
    <div className="flex h-6 w-9 shrink-0 items-center justify-center rounded-full border border-base-300 bg-base-200 text-[10px] font-black text-base-content/45">
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

function UserStatsCard({ player, authUser, stats, workspaceName, onJoin }) {
  const displayUser = player || authUser

  if (!player) {
    return (
      <Panel>
        <div className="mb-4 flex min-w-0 items-center gap-3">
          <PlayerAvatar name={displayUser?.name || 'Guest'} size={38} className="border border-base-300" />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-base-content/40">Your stats</p>
            <h2 className="truncate text-xl font-black">{displayUser?.name || 'Guest'}</h2>
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-base-300 bg-base-200/50 p-4 text-center">
          <Trophy className="mx-auto mb-2 text-primary/45" size={28} />
          <h3 className="font-black">No stats yet</h3>
          <p className="mt-1 text-sm text-base-content/55">
            {workspaceName
              ? `Join ${workspaceName} to submit picks and start tracking your score.`
              : 'Join a workspace to submit picks and start tracking your score.'}
          </p>
          {onJoin && (
            <button type="button" className="btn btn-primary btn-sm mt-4 rounded-xl font-black" onClick={onJoin}>
              Join now
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
          <PlayerAvatar name={player?.name || 'Guest'} size={38} className="border border-base-300" />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-base-content/40">Your stats</p>
            <h2 className="truncate text-xl font-black">{player?.name || 'Guest'}</h2>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatTile icon={CheckCircle2} label="Correct" value={stats.correct} tone="success" />
        <StatTile icon={XCircle}      label="Wrong"   value={stats.wrong}   tone="error" />
        <StatTile icon={CalendarClock} label="Pending" value={stats.pending} tone="warning" />
        <StatTile icon={Trophy}       label="Score"   value={stats.score}   tone="primary" />
      </div>
    </Panel>
  )
}

function StatTile({ icon: Icon, label, value, tone }) {
  const accentClass = {
    success: 'text-success',
    error:   'text-error',
    warning: 'text-warning',
    primary: 'text-primary',
  }
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-3">
        <span className="text-xs font-bold uppercase tracking-wide stat-title">{label}</span>
        <div className={`flex items-center gap-1 ${accentClass[tone]}`}>
          <Icon size={20} />
      <div className="text-2xl font-black text-neutral">{value}</div>
        </div>
    </div>
  )
}

// Demo-mode only registration card
function DemoRegistrationCard({ name, setName, onSubmit }) {
  return (
    <Panel className="mb-5">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warning">
        <WifiOff size={13} />
        Demo mode — PocketBase not reachable
      </div>
      <form className="mt-3 flex flex-col gap-3 sm:flex-row" onSubmit={onSubmit}>
        <label className="flex-1">
          <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold">
            <UserPlus size={15} />
            Join the pool — enter your name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input input-bordered w-full rounded-xl font-semibold"
            placeholder="Your name"
            maxLength={48}
          />
        </label>
        <button type="submit" className="btn btn-primary self-end rounded-xl font-black">
          Start picking
        </button>
      </form>
    </Panel>
  )
}

function JoinWorkspaceCard({ workspaceName, userName, onJoin }) {
  return (
    <Panel className="mb-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <UserPlus size={13} />
            Not a member yet
          </div>
          <h3 className="text-lg font-black">Join {workspaceName} to submit picks</h3>
          <p className="mt-1 text-sm text-base-content/55">
            Signed in as {userName || 'a user'}. You can keep browsing, or join this pool when you are ready.
          </p>
        </div>
        <button type="button" className="btn btn-primary rounded-xl font-black" onClick={onJoin}>
          Join pool
        </button>
      </div>
    </Panel>
  )
}

function MissingWorkspaceCard({ workspaceName }) {
  return (
    <Panel>
      <div className="py-8 text-center">
        <Trophy className="mx-auto mb-3 text-primary/40" size={32} />
        <h3 className="text-lg font-black">
          {workspaceName ? 'Workspace not found' : 'Open a workspace URL'}
        </h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-base-content/50">
          {workspaceName
            ? `No PocketBase workspace exists with the name "${workspaceName}".`
            : 'Use a URL like /Family%20Pool where the path matches a PocketBase workspace name.'}
        </p>
      </div>
    </Panel>
  )
}

// ===========================================================================
// Predictions page
// ===========================================================================
function PredictionsPage({ matches, playerPredictions, savingPick, onPick, onShowAuth, onShowJoin }) {
  const [activeStage, setActiveStage] = useState(STAGE_TABS[0].id)
  const [matchesParent] = useAutoAnimate({ duration: 220, easing: 'ease-out' })
  const activeStageInfo = STAGE_TABS.find((s) => s.id === activeStage) || STAGE_TABS[0]
  const visibleMatches  = matches.filter((m) => m.stage === activeStageInfo.stage)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black sm:text-3xl">Predictions</h2>
          <p className="mt-0.5 text-sm text-base-content/60">Pick the result before kickoff to score points.</p>
        </div>
        <details className="dropdown dropdown-end shrink-0">
          <summary className="btn btn-soft btn-sm rounded-xl">
            Scoring
            <CircleHelp size={16} />
          </summary>
          <div className="dropdown-content z-20 mt-2 w-72 rounded-box border border-base-300 bg-base-100 p-4 shadow-xl">
            <h3 className="font-black">Scoring system</h3>
            <ul className="mt-3 space-y-2 text-sm text-base-content/70">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={16} />
                <span>Correctly picking the match result earns 3 points.</span>
              </li>
              <li className="flex gap-2">
                <Lock className="mt-0.5 shrink-0 text-warning" size={16} />
                <span>Picks lock at kickoff and cannot be changed afterward.</span>
              </li>
            </ul>
          </div>
        </details>
      </div>

      <StageTabs activeStage={activeStage} matches={matches} onChange={setActiveStage} />

      <div ref={matchesParent} className="grid gap-3">
        {visibleMatches.length === 0 && (
          <Panel>
            <div className="py-10 text-center">
              <CircleDot className="mx-auto mb-3 text-primary/40" size={32} />
              <h3 className="text-lg font-black">No {activeStageInfo.label} matches yet</h3>
              <p className="mt-1 text-sm text-base-content/50">Add fixtures from the admin panel to open this round.</p>
            </div>
          </Panel>
        )}
        {visibleMatches.map((match) => (
          <MatchPredictionCard
            key={match.id}
            match={match}
            prediction={playerPredictions.get(match.id)}
            savingPick={savingPick}
            onPick={onPick}
            onShowAuth={onShowAuth}
            onShowJoin={onShowJoin}
          />
        ))}
      </div>
    </div>
  )
}

function StageTabs({ activeStage, matches, onChange }) {
  const [tabsParent] = useAutoAnimate({ duration: 180, easing: 'ease-out' })

  return (
    <div ref={tabsParent} className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Prediction rounds">
      {STAGE_TABS.map((stage) => {
        const count  = matches.filter((m) => m.stage === stage.stage).length
        const active = activeStage === stage.id
        return (
          <button
            key={stage.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(stage.id)}
            className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${
              active
                ? 'border-primary/35 bg-base-100 text-primary shadow-xs'
                : 'border-base-300 bg-base-100 text-base-content/55 hover:border-base-content/30 hover:text-base-content'
            }`}
          >
            {stage.label}
            <span className={`rounded-lg px-1.5 py-0.5 text-xs font-black ${active ? 'bg-primary/10 text-primary' : 'bg-base-200'}`}>
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function MatchPredictionCard({ match, prediction, savingPick, onPick, onShowAuth, onShowJoin }) {
  const locked = isLocked(match)
  const isFinal = Boolean(match.result)
  const showScore = hasMatchScore(match)
  const pickIsCorrect = isFinal && prediction?.pick === match.result
  const pickStatus = prediction
    ? `${isFinal ? (pickIsCorrect ? 'Correct pick' : 'Missed pick') : 'Your pick'}: ${pickLabel(match, prediction.pick)}`
    : (onShowAuth ? 'Sign in to pick' : onShowJoin ? 'Join to pick' : 'No pick yet')
  const pickOptions = [
    { pick: 'home', label: 'Home', name: match.home },
    { pick: 'draw', label: 'Draw', name: '—' },
    { pick: 'away', label: 'Away', name: match.away },
  ]

  return (
    <article className="overflow-hidden rounded-2xl border border-base-300 bg-base-100">
      {/* Meta strip */}
      <div className="flex items-center gap-2 border-b border-base-300 bg-base-200/50 px-4 py-2 text-xs">
        <span className="font-semibold text-base-content/50">{match.stage}</span>
        <div className="ml-auto"><StatusPill match={match} /></div>
      </div>

      <div className="p-4">
        {/* Teams */}
        <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex flex-col items-end gap-1.5">
            <TeamCrest name={match.home} src={match.homeCrest} />
            <div className="text-right text-base font-black leading-tight">{match.home}</div>
          </div>
          <div className="flex items-center justify-center">
            {showScore ? (
              <span className="rounded-xl border border-base-300 bg-base-200 px-3 py-1.5 text-base font-black text-base-content">
                {match.homeScore}–{match.awayScore}
              </span>
            ) : (
              <span className="rounded-xl bg-neutral/5 border border-base-300 px-2.5 py-1 text-xs font-black text-neutral/60">VS</span>
            )}
          </div>
          <div className="flex flex-col items-start gap-1.5">
            <TeamCrest name={match.away} src={match.awayCrest} />
            <div className="text-base font-black leading-tight">{match.away}</div>
          </div>
        </div>

        {/* Kickoff + venue */}
        <div className="flex justify-center mb-4 text-xs text-base-content/45">
          <span className="flex items-center gap-1"><CalendarClock size={12} />{formatKickoff(match.kickoff)}</span>
        </div>

        {/* Pick buttons — clicking triggers auth modal if not logged in */}
        <div className="grid grid-cols-3 gap-2">
          {pickOptions.map(({ pick, label, name }) => {
            const active   = prediction?.pick === pick
            const loading  = savingPick === `${match.id}-${pick}`
            const handleClick = () => {
              if (onShowAuth) { onShowAuth(); return }
              if (onShowJoin) { onShowJoin(); return }
              onPick(match, pick)
            }
            return (
              <button
                key={pick}
                type="button"
                disabled={locked || loading}
                onClick={handleClick}
                className={`cursor-pointer rounded-xl border px-2 py-3 text-center transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                  active
                    ? 'border-primary/50 bg-primary/85 text-primary-content'
                    : 'border-base-300 bg-base-100 hover:border-primary/40 hover:bg-primary/5 hover:text-primary'
                }`}
              >
                <div className="mb-1 text-xs font-bold uppercase tracking-wide opacity-60">{loading ? '…' : label}</div>
                <div className="truncate text-sm font-black">{name}</div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between text-xs text-base-content/45">
          <span className={`flex items-center gap-1.5 font-black ${
            isFinal && prediction
              ? (pickIsCorrect ? 'text-success' : 'text-error')
              : 'text-base-content/60'
          }`}>
            {isFinal && prediction && (
              pickIsCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />
            )}
            {pickStatus}
          </span>
          <span className="flex items-center gap-1">
            {locked ? <Lock size={12} /> : <CheckCircle2 size={12} />}
            {locked ? 'Locked' : 'Open'}
          </span>
        </div>
      </div>
    </article>
  )
}

function StatusPill({ match }) {
  if (match.status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-error/25 bg-error/10 px-2.5 py-1 text-xs font-bold text-error">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-error" />
        Live
      </span>
    )
  }
  if (match.result) {
    const label = match.result === 'home' ? match.home : match.result === 'away' ? match.away : 'Draw'
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-xs font-bold text-success">
        <CheckCircle2 size={11} />
        {label} won
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-base-300 bg-base-100 px-2.5 py-1 text-xs font-semibold text-base-content/45">
      <span className="h-1.5 w-1.5 rounded-full bg-base-content/25" />
      Upcoming
    </span>
  )
}

// ===========================================================================
// Leaderboard
// ===========================================================================
function LeaderboardPage({ leaderboard, matches, predictions }) {
  const scored = matches.filter((m) => m.result).length
  const [leaderboardParent] = useAutoAnimate({ duration: 220, easing: 'ease-out' })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black sm:text-3xl">Leaderboard</h2>
        <p className="mt-0.5 text-sm text-base-content/60">Updates live as match results are posted.</p>
      </div>

      {/* Stats first */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Activity, label: 'Predictions',    value: predictions.length },
          { icon: Trophy,   label: 'Matches scored', value: scored },
          { icon: Lock,     label: 'Locked',         value: matches.filter(isLocked).length },
        ].map(({ icon: Icon, label, value }) => (
          <Panel key={label}>
            <div className="mb-1 flex items-center gap-1.5 text-primary">
              <Icon size={15} />
              <span className="text-xs font-bold uppercase tracking-wide text-base-content/50">{label}</span>
            </div>
            <div className="text-2xl font-black">{value}</div>
          </Panel>
        ))}
      </div>

      {/* Leaderboard list */}
      <Panel>
        {leaderboard.length === 0 ? (
          <div className="py-8 text-center text-sm font-semibold text-base-content/40">No players yet.</div>
        ) : (
          <div ref={leaderboardParent} className="space-y-2">
            {leaderboard.map((player, index) => {
              const accuracy = player.predictions > 0
                ? Math.round((player.correct / player.predictions) * 100)
                : 0
              const podium = [
                {
                  row: 'border-yellow-300 bg-yellow-50 shadow-sm',
                  rank: 'border-yellow-300 bg-yellow-400/20 text-yellow-700',
                  score: 'text-yellow-700',
                  medal: 'Gold',
                },
                {
                  row: 'border-slate-300 bg-slate-100/80 shadow-sm',
                  rank: 'border-slate-300 bg-slate-200 text-slate-600',
                  score: 'text-slate-600',
                  medal: 'Silver',
                },
                {
                  row: 'border-orange-300 bg-orange-50 shadow-sm',
                  rank: 'border-orange-300 bg-orange-200/70 text-orange-700',
                  score: 'text-orange-700',
                  medal: 'Bronze',
                },
              ]
              const podiumStyle = podium[index]
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                    podiumStyle ? podiumStyle.row : 'border-base-200 hover:bg-base-200/40'
                  }`}
                >
                  {/* Rank */}
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${
                    podiumStyle ? podiumStyle.rank : 'border-base-300 bg-base-100 text-base-content/40'
                  }`}>
                    {podiumStyle ? <Medal size={14} aria-label={`${podiumStyle.medal} medal`} /> : index + 1}
                  </div>

                  <PlayerAvatar name={player.name} size={38} className="border border-white shadow-sm" />

                  {/* Name + stats */}
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="truncate font-black">{player.name}</div>
                      {podiumStyle && (
                        <span className={`hidden rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide sm:inline-flex ${podiumStyle.rank}`}>
                          {podiumStyle.medal}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-base-300">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${accuracy}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-xs text-base-content/40">
                        {player.correct}/{player.predictions} picks
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <div className={`text-xl font-black tabular-nums ${podiumStyle?.score || ''}`}>
                      {player.points}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-wide text-base-content/40">pts</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel>
    </div>
  )
}

// ===========================================================================
// Admin
// ===========================================================================
function AdminPage({ adminPin, adminUnlocked, setAdminPin, unlockAdmin, backend, newMatch, setNewMatch, addMatch, matches, updateMatch, deleteMatch }) {
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
            onChange={(e) => setAdminPin(e.target.value)}
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
          <AdminSelect label="Stage"  value={newMatch.stage}  onChange={(v) => setNewMatch({ ...newMatch, stage: v })} options={STAGE_OPTIONS} />
          <AdminInput  label="Group"  value={newMatch.group}  onChange={(v) => setNewMatch({ ...newMatch, group: v })} />
          <AdminSelect label="Home"   value={newMatch.home}   onChange={(v) => setNewMatch({ ...newMatch, home: v })} options={TEAM_OPTIONS} placeholder="Select home team" required />
          <AdminSelect label="Away"   value={newMatch.away}   onChange={(v) => setNewMatch({ ...newMatch, away: v })} options={TEAM_OPTIONS} placeholder="Select away team" required />
          <AdminInput  label="Venue"  value={newMatch.venue}  onChange={(v) => setNewMatch({ ...newMatch, venue: v })} />
          <label className="form-control">
            <span className="label p-0 pb-1">
              <span className="label-text text-xs font-black uppercase tracking-wide text-base-content/50">Kickoff</span>
            </span>
            <input
              type="datetime-local"
              value={newMatch.kickoff}
              onChange={(e) => setNewMatch({ ...newMatch, kickoff: e.target.value })}
              className="input input-bordered w-full rounded-xl font-semibold"
              required
            />
          </label>
          <button type="submit" className="btn btn-primary gap-2 rounded-xl font-black md:col-span-2">
            <Plus size={18} />Add match
          </button>
        </form>
      </Panel>

      <Panel>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-black">Fixtures</h3>
          <span className="rounded-full border border-base-300 bg-base-200 px-2 py-1 text-xs font-semibold text-base-content/50">{backend} mode</span>
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
          <Trash2 size={16} />Delete
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <AdminSelect label="Stage" value={draft.stage} onChange={(v) => saveSelect('stage', v)} options={STAGE_OPTIONS} />
        <AdminInput label="Group" value={draft.group} onChange={(v) => setDraftField('group', v)} onBlur={() => saveField('group', draft.group)} />
        <AdminSelect label="Home" value={draft.home} onChange={(v) => saveSelect('home', v)} options={TEAM_OPTIONS} placeholder="Select home team" required />
        <AdminSelect label="Away" value={draft.away} onChange={(v) => saveSelect('away', v)} options={TEAM_OPTIONS} placeholder="Select away team" required />
        <AdminInput label="Venue" value={draft.venue} onChange={(v) => setDraftField('venue', v)} onBlur={() => saveField('venue', draft.venue)} />
        <AdminInput label="Kickoff" type="datetime-local" value={draft.kickoff} onChange={(v) => setDraftField('kickoff', v)} onBlur={() => saveField('kickoff', draft.kickoff)} required />
        <AdminSelect label="Status" value={draft.status} onChange={(v) => saveSelect('status', v)} options={[['scheduled', 'Scheduled'], ['live', 'Live'], ['final', 'Final']]} />
        <AdminSelect
          label="Result"
          value={draft.result}
          onChange={(v) => saveSelect('result', v, v ? { status: 'final' } : {})}
          options={[['', 'None'], ['home', draft.home || match.home], ['draw', 'Draw'], ['away', draft.away || match.away]]}
        />
      </div>
    </div>
  )
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
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="input input-bordered w-full rounded-xl font-semibold"
        required={required}
      />
    </label>
  )
}

function groupOptions(options) {
  return options.reduce((groups, [value, label, group]) => {
    const groupName = group || ''
    if (!groups.has(groupName)) groups.set(groupName, [])
    groups.get(groupName).push([value, label])
    return groups
  }, new Map())
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
        onChange={(e) => onChange(e.target.value)}
        className="select select-bordered w-full rounded-xl text-sm font-bold"
        required={required}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {[...groupedOptions.entries()].map(([group, items]) => (
          group
            ? (
              <optgroup key={group} label={group}>
                {items.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </optgroup>
            )
            : items.map(([v, l]) => <option key={v} value={v}>{l}</option>)
        ))}
      </select>
    </label>
  )
}

export default App
