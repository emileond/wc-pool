import {useEffect, useMemo, useState} from 'react'
import {useAutoAnimate} from '@formkit/auto-animate/react'
import {GTProvider, T, Var} from 'gt-react'
import gtConfig from '../gt.config.json'
import loadTranslations from './loadTranslations.ts'
import {
    Activity,
    ChevronDown,
    CircleDot,
    Sparkles,
    Trophy,
    UserPlus,
    XCircle,
} from 'lucide-react'
import {toast} from 'sonner'
import {useLocation, useNavigate} from 'react-router-dom'
import {pb} from './lib/pocketbase';
import useWorkspaceData from './hooks/react-query/useWorkspaceData'
import { ACTIVITY_PAGE_SIZE } from './hooks/react-query/useActivityEvents'
import Panel from './components/shared/Panel'
import UserStatsCard from './components/sidebar/UserStatsCard'
import PoolStatusCard from './components/sidebar/PoolStatusCard'
import MatchPredictionCard from './components/predictions/MatchPredictionCard'
import FiltersPopover from './components/predictions/FiltersPopover'
import ScoringPopover from './components/predictions/ScoringPopover'
import LeaderboardPage from './components/leaderboard/LeaderboardPage'
import PlayerProfilePage from './components/leaderboard/PlayerProfilePage'
import AuthModal from './components/auth/AuthModal'
import AdminPage from './components/admin/AdminPage'
import ActivityFeedPage from './components/feed/ActivityFeedPage'
import HomeLandingPage from './components/marketing/HomeLandingPage'
import CreatePoolPage from './components/pools/CreatePoolPage'
import MyPoolsPage from './components/pools/MyPoolsPage'
import UserMenu from './components/shared/UserMenu'

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
//    - matchday (number, optional; group-stage round from football-data.org)
//    - minute (number, optional; live match minute from football-data.org)
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
//    - scope_type  (text/select: "overall" | "stage" | "group-round")
//    - scope_value (text; empty string for overall)
//    - scope_label (text)
//    - name        (text)
//    - points      (number)
//    - correct     (number)
//    - predictions (number)
//    - accuracy    (number)
//    - rank        (number)
//
//  activity_events
//    - workspace   (relation → workspaces)
//    - user        (relation → users, optional)
//    - match       (relation → matches, optional)
//    - type        (text/select: "prediction" | "result" | "rank-climb")
//    - dedupe_key  (text, unique)
//    - occurred_at (date)
//    - payload     (json)
//
// The UI still calls signed-in users "players" because that is the pool
// language, but live PocketBase data now uses the built-in users collection
// directly instead of a separate players collection.
// ---------------------------------------------------------------------------

const THEME_KEY = 'wc-pool-theme'
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '2026'
const GLOBAL_PAGES = new Set(['pools', 'create-pool'])

const STAGE_TABS = [
    {id: 'groups', label: 'Groups', stage: 'Group Stage'},
    {id: 'r32', label: 'R32', stage: 'Round of 32'},
    {id: 'r16', label: 'R16', stage: 'Round of 16'},
    {id: 'qf', label: 'QF', stage: 'Quarterfinal'},
    {id: 'sf', label: 'SF', stage: 'Semifinal'},
    {id: 'third', label: '3rd', stage: 'Third Place'},
    {id: 'final', label: 'Final', stage: 'Final'},
]

const emptyData = {players: [], matches: [], predictions: [], leaderboard: []}
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

function cleanName(name) {
    return name.trim().replace(/\s+/g, ' ')
}

function optionalScore(value) {
    if (value === null || value === undefined || value === '') return null;

    const score = Number(value)
    return Number.isFinite(score) ? score : null
}

function optionalInteger(value) {
    if (value === null || value === undefined || value === '') return null
    const parsed = Number(value)
    return Number.isInteger(parsed) ? parsed : null
}

function normalizeMatch(record) {
    return {
        id: record.id,
        stage: record.stage || 'Group Stage',
        group: record.group || '',
        home: record.home || '',
        away: record.away || '',
        homeCrest: record.home_crest || '',
        awayCrest: record.away_crest || '',
        venue: record.venue || '',
        kickoff: record.kickoff,
        matchday: optionalInteger(record.matchday),
        minute: optionalInteger(record.minute),
        status: record.status || 'scheduled',
        result: record.result || '',
        homeScore: optionalScore(record.home_score),
        awayScore: optionalScore(record.away_score),
        createdAt: record.created || '',
        updatedAt: record.updated || '',
    }
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
            typeof user === 'string' ? {id: userId, name: ''} : user,
            record.role || 'member',
            record.id,
        ),
    }
}

function normalizePrediction(record) {
    const user = record.user ?? record.player
    return {
        id: record.id,
        workspace: relationId(record.workspace),
        player: typeof user === 'string' ? user : user?.id,
        match: typeof record.match === 'string' ? record.match : record.match?.id,
        pick: record.pick,
        createdAt: record.created || '',
        updatedAt: record.updated || '',
    }
}

function normalizeLeaderboard(record) {
    const user = record.user ?? record.player
    return {
        id: record.id,
        player: typeof user === 'string' ? user : user?.id || record.id,
        workspace: relationId(record.workspace),
        scopeType: record.scope_type || 'overall',
        scopeValue: record.scope_value || '',
        scopeLabel: record.scope_label || 'All tournament',
        name: record.name || userDisplayName(user),
        points: Number(record.points) || 0,
        correct: Number(record.correct) || 0,
        predictions: Number(record.predictions) || 0,
        accuracy: Number(record.accuracy) || 0,
        rank: Number(record.rank) || 0,
        previousRank: optionalInteger(
            record.previous_rank ?? record.previousRank ?? record.rank_previous,
        ),
        createdAt: record.created || '',
        updatedAt: record.updated || '',
    }
}

function normalizeActivityEvent(record) {
    const payload = record.payload && typeof record.payload === 'object' ? record.payload : {}
    const createdAt = record.occurred_at || record.created || ''
    const at = createdAt ? new Date(createdAt).getTime() : 0

    return {
        id: record.id,
        type: record.type || payload.type || '',
        at: Number.isFinite(at) ? at : 0,
        createdAt,
        playerId: relationId(record.user) || payload.playerId || '',
        ...payload,
    }
}

function kickoffDateKey(value) {
    const date = new Date(value)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function kickoffDateLabel(value) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    }).format(new Date(value))
}

function ordinal(value) {
    const mod10 = value % 10
    const mod100 = value % 100
    if (mod10 === 1 && mod100 !== 11) return `${value}st`
    if (mod10 === 2 && mod100 !== 12) return `${value}nd`
    if (mod10 === 3 && mod100 !== 13) return `${value}rd`
    return `${value}th`
}

function inferGroupRounds(matches) {
    const byGroup = new Map()
    matches.forEach((match) => {
        if (match.stage !== 'Group Stage') return
        const groupKey = match.group || 'Ungrouped'
        if (!byGroup.has(groupKey)) byGroup.set(groupKey, [])
        byGroup.get(groupKey).push(match)
    })

    const rounds = new Map()
    byGroup.forEach((groupMatches) => {
        const ordered = [...groupMatches].sort((a, b) => {
            const kickoffDiff = new Date(a.kickoff) - new Date(b.kickoff)
            if (kickoffDiff !== 0) return kickoffDiff
            return String(a.id).localeCompare(String(b.id))
        })
        ordered.forEach((match, index) => {
            rounds.set(match.id, Math.floor(index / 2) + 1)
        })
    })

    return rounds
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

function workspaceNameFromPath(pathname) {
    const [segment = ''] = pathname.split('/').filter(Boolean)
    if (!segment || segment === '_' || GLOBAL_PAGES.has(segment)) return ''
    try {
        return decodeURIComponent(segment)
    } catch {
        return segment
    }
}

function isPoolsRoute(pathname) {
    return pathname === '/pools'
}

function isCreatePoolRoute(pathname) {
    return pathname === '/create-pool'
}

function normalizeAppRoute(pathname) {
    const segments = pathname.split('/').filter(Boolean)
    const hasWorkspace = segments[0] && segments[0] !== '_'
    const section = hasWorkspace ? (segments[1] || 'predictions') : (segments[1] || segments[0] || 'predictions')
    const normalizedSection = section === 'pulse' ? 'activity' : section
    const page = ['predictions', 'leaderboard', 'activity', 'admin'].includes(normalizedSection)
        ? normalizedSection
        : 'predictions'
    const profileBaseIndex = hasWorkspace ? 2 : (segments[0] === '_' ? 2 : 1)
    const profileId = page === 'leaderboard' && segments[profileBaseIndex] === 'player' && segments[profileBaseIndex + 1]
        ? decodeURIComponent(segments[profileBaseIndex + 1])
        : ''
    return {page, profileId}
}

function workspacePath(workspaceName, page = 'predictions') {
    const base = workspaceName ? `/${encodeURIComponent(workspaceName)}` : ''
    if (page === 'predictions') return base || '/'
    if (!base) return `/_/${page}`
    return `${base}/${page}`
}

function leaderboardProfilePath(workspaceName, playerId) {
    return `${workspacePath(workspaceName, 'leaderboard')}/player/${encodeURIComponent(playerId)}`
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

async function loadWorkspacePlayers(workspaceId) {
    const workspaceFilter = workspaceId ? `workspace="${escapePbFilterValue(workspaceId)}"` : 'id=""'
    const memberships = await loadPocketBaseCollection('memberships', {
        filter: workspaceFilter,
        sort: 'created',
        expand: 'user',
    }, normalizeMembership)
    return memberships.map((membership) => membership.player)
}

async function loadWorkspaceMatches() {
    return loadPocketBaseCollection('matches', {sort: 'kickoff'}, normalizeMatch)
}

async function loadWorkspacePredictions(workspaceId) {
    const workspaceFilter = workspaceId ? `workspace="${escapePbFilterValue(workspaceId)}"` : 'id=""'
    return loadPocketBaseCollection('predictions', {filter: workspaceFilter, sort: 'created'}, normalizePrediction)
}

async function loadWorkspaceLeaderboard(workspaceId, scope = {type: 'overall', value: ''}) {
    const workspaceFilter = workspaceId ? `workspace="${escapePbFilterValue(workspaceId)}"` : 'id=""'
    const scopeType = scope?.type || 'overall'
    const scopeValue = scope?.value || ''
    const filter = [
        workspaceFilter,
        `scope_type="${escapePbFilterValue(scopeType)}"`,
        `scope_value="${escapePbFilterValue(scopeValue)}"`,
    ].join(' && ')
    return loadPocketBaseCollection('leaderboard', {filter, sort: 'rank'}, normalizeLeaderboard)
}

async function loadWorkspaceActivityEvents(workspaceId, {page = 1, perPage = ACTIVITY_PAGE_SIZE} = {}) {
    const workspaceFilter = workspaceId ? `workspace="${escapePbFilterValue(workspaceId)}"` : 'id=""'
    try {
        const result = await pb.collection('activity_events').getList(page, perPage, {
            filter: workspaceFilter,
            sort: '-occurred_at,-created',
        })
        return {
            events: result.items.map(normalizeActivityEvent),
            page: result.page,
            hasMore: result.page < result.totalPages,
        }
    } catch (err) {
        throw collectionAccessError('activity_events', 'read', err)
    }
}

async function loadUserPools(userId) {
    if (!userId) return []
    const userFilter = `user="${escapePbFilterValue(userId)}"`
    const memberships = await loadPocketBaseCollection('memberships', {
        filter: userFilter,
        sort: 'created',
        expand: 'workspace',
    }, (record) => ({
        id: record.id,
        role: record.role || 'member',
        workspace: record.expand?.workspace
            ? normalizeWorkspace(record.expand.workspace)
            : {id: relationId(record.workspace), name: ''},
    }))

    return memberships
        .filter((membership) => membership.workspace?.id && membership.workspace?.name)
        .map((membership) => ({
            membershipId: membership.id,
            role: membership.role,
            workspaceId: membership.workspace.id,
            workspaceName: membership.workspace.name,
        }))
}

// The authenticated user is a pool player only after joining the active workspace.
async function resolvePlayerForAuth(workspaceId) {
    const authRecord = pb.authStore.record
    if (!authRecord?.id || !workspaceId) return null

    const eu = escapePbFilterValue(authRecord.id)
    const ew = escapePbFilterValue(workspaceId)
    const existing = await pb.collection('memberships')
        .getFirstListItem(`workspace="${ew}" && user="${eu}"`, {expand: 'user'})
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
function calculatePlayerStats(player, matches, predictions) {
    if (!player) return {correct: 0, wrong: 0, pending: 0, score: 0}
    const byId = new Map(matches.map((m) => [m.id, m]))
    const pp = predictions.filter((p) => p.player === player.id)
    const correct = pp.filter((p) => {
        const m = byId.get(p.match);
        return m?.result && m.result === p.pick
    }).length
    const wrong = pp.filter((p) => {
        const m = byId.get(p.match);
        return m?.result && m.result !== p.pick
    }).length
    const pending = pp.filter((p) => {
        const m = byId.get(p.match);
        return m && !m.result
    }).length
    return {correct, wrong, pending, score: correct * 3}
}

function calculateCountdown(targetTime, nowTime) {
    const remaining = Math.max(0, targetTime - nowTime)
    const totalSeconds = Math.floor(remaining / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return {days, hours, minutes, seconds, isStarted: remaining === 0}
}

// ===========================================================================
// App
// ===========================================================================
function AppContent() {
    const location = useLocation()
    const navigate = useNavigate()
    const [appLoading, setAppLoading] = useState(true)
    const [player, setPlayer] = useState(null)
    const [authUser, setAuthUser] = useState(null)
    const workspaceName = useMemo(() => workspaceNameFromPath(location.pathname), [location.pathname])
    const routeState = useMemo(() => normalizeAppRoute(location.pathname), [location.pathname])
    const activePage = routeState.page
    const profilePlayerId = routeState.profileId
    const isHomeRoute = location.pathname === '/'
    const poolsRoute = isPoolsRoute(location.pathname)
    const createPoolRoute = isCreatePoolRoute(location.pathname)
    const [activeWorkspace, setActiveWorkspace] = useState(null)
    const [themePreference, setThemePreference] = useState(initialThemePreference)
    const [systemTheme, setSystemTheme] = useState(preferredSystemTheme)
    const [savingPick, setSavingPick] = useState('')
    const [adminPin, setAdminPin] = useState('')
    const [adminUnlocked, setAdminUnlocked] = useState(false)
    const [newMatch, setNewMatch] = useState({
        stage: 'Group Stage', group: '', home: '', away: '', venue: '',
        kickoff: formatForInput('2026-06-11T20:00:00.000Z'),
    })

    // Auth modal + form state
    const [authModal, setAuthModal] = useState(false)
    const [authView, setAuthView] = useState('login')
    const [authLoading, setAuthLoading] = useState(false)
    const [authError, setAuthError] = useState('')
    const [authName, setAuthName] = useState('')
    const [authEmail, setAuthEmail] = useState('')
    const [authPassword, setAuthPassword] = useState('')
    const [joinModal, setJoinModal] = useState(false)
    const [joinLoading, setJoinLoading] = useState(false)
    const [joinError, setJoinError] = useState('')
    const [userPools, setUserPools] = useState([])
    const [userPoolsLoading, setUserPoolsLoading] = useState(false)
    const [creatingPool, setCreatingPool] = useState(false)
    const [now, setNow] = useState(() => Date.now())

    const workspaceId = activeWorkspace?.id
    const {
        effectiveData,
        pocketbaseQueryLoading,
        pocketbaseQueryError,
        refreshWorkspaceData,
        savePrediction: savePredictionRequest,
        createMatch: createMatchRequest,
        updateMatch: updateMatchRequest,
        deleteMatch: deleteMatchRequest,
    } = useWorkspaceData({
        backend: 'pocketbase',
        workspaceId,
        fallbackData: emptyData,
        loadWorkspacePlayers,
        loadWorkspaceMatches,
        loadWorkspacePredictions,
        loadWorkspaceLeaderboard,
        recordActivityEventRequest: async (event) => {
            const authToken = pb.authStore.token
            if (!authToken) throw new Error('Missing auth session.')

            const response = await fetch('/api/activity/events', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify(event),
            })
            const payload = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(payload?.error || payload?.message || 'Could not record activity.')
            }
            return payload
        },
        savePredictionRequest: async ({workspaceId: targetWorkspaceId, playerId, matchId, pick}) => {
            const ep = escapePbFilterValue(playerId)
            const em = escapePbFilterValue(matchId)
            const ew = escapePbFilterValue(targetWorkspaceId)
            const existing = await pb.collection('predictions')
                .getFirstListItem(`workspace="${ew}" && user="${ep}" && match="${em}"`).catch(() => null)
            if (existing) return pb.collection('predictions').update(existing.id, {pick})
            return pb.collection('predictions').create({
                workspace: targetWorkspaceId,
                user: playerId,
                match: matchId,
                pick,
            })
        },
        createMatchRequest: (match) => pb.collection('matches').create(match),
        updateMatchRequest: ({matchId, patch}) => pb.collection('matches').update(matchId, patch),
        deleteMatchRequest: (matchId) => pb.collection('matches').delete(matchId),
    })
    const matches = useMemo(() => sortMatches(effectiveData.matches), [effectiveData.matches])
    const leaderboard = useMemo(() => effectiveData.leaderboard, [effectiveData.leaderboard])
    const playerStats = useMemo(
        () => calculatePlayerStats(player, matches, effectiveData.predictions),
        [effectiveData.predictions, matches, player],
    )
    const playerPredictions = useMemo(() => {
        if (!player) return new Map()
        return new Map(
            effectiveData.predictions.filter((p) => p.player === player.id).map((p) => [p.match, p]),
        )
    }, [effectiveData.predictions, player])
    const completedMatches = matches.filter((m) => m.result).length
    const poolStartTime = matches.length ? new Date(matches[0].kickoff).getTime() : null
    const poolCountdown = poolStartTime ? calculateCountdown(poolStartTime, now) : null
    const adminAllowed = Boolean(player?.isAdmin || ['owner', 'admin'].includes(player?.role) || adminUnlocked)
    const theme = resolvedTheme(themePreference, systemTheme)
    const canJoinWorkspace = Boolean(activeWorkspace && authUser && !player)
    const [pageParent] = useAutoAnimate({duration: 180, easing: 'ease-out'})

    async function refreshUserPools(authRecord = pb.authStore.record) {
        if (!authRecord?.id) {
            setUserPools([])
            setUserPoolsLoading(false)
            return []
        }

        setUserPoolsLoading(true)
        try {
            const pools = await loadUserPools(authRecord.id)
            setUserPools(pools)
            return pools
        } catch {
            setUserPools([])
            return []
        } finally {
            setUserPoolsLoading(false)
        }
    }

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

    useEffect(() => {
        const interval = window.setInterval(() => setNow(Date.now()), 1000)
        return () => window.clearInterval(interval)
    }, [])

    // ---------------------------------------------------------------------------
    // Startup: resolve workspace + restore PocketBase session
    // ---------------------------------------------------------------------------
    useEffect(() => {
        let active = true

        async function init() {
            try {
                const workspace = await loadWorkspaceByName(workspaceName)
                if (!active) return
                setActiveWorkspace(workspace)

                if (!pb.authStore.isValid) {
                    setAuthUser(null)
                    setPlayer(null)
                    setUserPools([])
                    return
                }

                try {
                    await pb.collection('users').authRefresh()
                    if (!active) return
                    setAuthUser(normalizeUser(pb.authStore.record))
                    await refreshUserPools(pb.authStore.record)

                    if (!workspace) {
                        setPlayer(null)
                        return
                    }

                    const resolvedPlayer = await resolvePlayerForAuth(workspace.id)
                    if (!active) return
                    setPlayer(resolvedPlayer)
                } catch {
                    pb.authStore.clear()
                    setAuthUser(null)
                    setPlayer(null)
                    setUserPools([])
                }
            } catch {
                if (!active) return
                pb.authStore.clear()
                setAuthUser(null)
                setPlayer(null)
                setUserPools([])
            } finally {
                if (active) setAppLoading(false)
            }
        }

        init()
        return () => {
            active = false
        }
    }, [workspaceName])

    // ---------------------------------------------------------------------------
    // PocketBase auth actions
    // ---------------------------------------------------------------------------
    async function handleLogin(event) {
        event.preventDefault()
        setAuthLoading(true)
        setAuthError('')
        try {
            await pb.collection('users').authWithPassword(authEmail, authPassword)
            const resolvedAuthUser = normalizeUser(pb.authStore.record)
            setAuthUser(resolvedAuthUser)
            await refreshUserPools(pb.authStore.record)
            if (activeWorkspace) {
                const resolvedPlayer = await resolvePlayerForAuth(activeWorkspace.id)
                setPlayer(resolvedPlayer)
                await refreshWorkspaceData(activeWorkspace.id)
            } else {
                setPlayer(null)
            }
            setAuthModal(false)
        } catch (err) {
            setAuthError(friendlyAuthError(err))
        } finally {
            setAuthLoading(false)
        }
    }

    async function handleSignup(event) {
        event.preventDefault()
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
            setAuthUser(resolvedAuthUser)
            if (activeWorkspace) {
                const resolvedPlayer = await joinWorkspaceForAuth(activeWorkspace.id)
                setPlayer(resolvedPlayer)
                await refreshWorkspaceData(activeWorkspace.id)
            } else {
                setPlayer(null)
            }
            await refreshUserPools(pb.authStore.record)
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
        setUserPools([])
        setJoinModal(false)
        navigate('/')
        setAdminUnlocked(false)
        refreshWorkspaceData(activeWorkspace?.id).catch(() => {
        })
    }

    async function joinWorkspace() {
        if (!activeWorkspace || !authUser) return
        setJoinLoading(true)
        setJoinError('')
        try {
            const resolvedPlayer = await joinWorkspaceForAuth(activeWorkspace.id)
            setPlayer(resolvedPlayer)
            await refreshWorkspaceData(activeWorkspace.id)
            await refreshUserPools()
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

    async function createPool(name, plan = 'free') {
        const normalizedName = cleanName(name || '')
        if (!normalizedName || !authUser) {
            throw new Error('Invalid pool name.')
        }
        const authToken = pb.authStore.token
        if (!authToken) {
            throw new Error('Missing auth session.')
        }

        setCreatingPool(true)
        try {
            const response = await fetch('/api/pools/create', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    name: normalizedName,
                    plan,
                }),
            })

            const payload = await response.json().catch(() => ({}))
            if (!response.ok || !payload?.workspace?.id) {
                throw new Error(payload?.error || payload?.message || 'Could not create pool.')
            }

            await refreshUserPools()
            toast.success(`Pool "${normalizedName}" created (${plan === 'pro' ? 'Pro' : 'Free'}).`)
            return normalizeWorkspace(payload.workspace)
        } catch (err) {
            toast.error(friendlyAuthError(err))
            throw err
        } finally {
            setCreatingPool(false)
        }
    }

    // ---------------------------------------------------------------------------
    // PocketBase data mutations
    // ---------------------------------------------------------------------------

    async function savePrediction(match, pick) {
        if (isLocked(match)) return
        if (!player) {
            if (authUser && activeWorkspace) openJoinModal()
            else openAuth('signup')
            return
        }
        if (!activeWorkspace) {
            toast.error('Open a valid workspace URL before saving picks.')
            return
        }
        setSavingPick(`${match.id}-${pick}`)

        try {
            await savePredictionRequest({
                workspaceId: activeWorkspace.id,
                playerId: player.id,
                matchId: match.id,
                pick,
            })
            toast.success(`Saved: ${pickLabel(match, pick)} — ${match.home} vs ${match.away}`)
        } catch {
            toast.error('Could not save your pick. Please try again.')
        } finally {
            setSavingPick('')
        }
    }

    async function addMatch(event) {
        event.preventDefault()
        const match = {...newMatch, kickoff: new Date(newMatch.kickoff).toISOString(), status: 'scheduled', result: ''}
        try {
            await createMatchRequest(match)
            setNewMatch((c) => ({...c, home: '', away: '', venue: '', group: ''}))
            toast.success('Match added.')
        } catch {
            toast.error('Could not add the match. Check PocketBase collection rules.')
        }
    }

    async function updateMatch(match, patch) {
        try {
            await updateMatchRequest({matchId: match.id, patch})
            toast.success('Match updated.')
        } catch {
            toast.error('Could not update the match. Check PocketBase admin rules.')
        }
    }

    async function deleteMatch(match) {
        try {
            await deleteMatchRequest(match.id)
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
    if (appLoading) {
        return (
            <div className={`flex min-h-screen flex-col items-center justify-center ${HERO_SURFACE}`}
                 style={HERO_STYLE} data-theme={theme}>
                <div className="pointer-events-none absolute inset-0 opacity-45" style={HERO_PATTERN_STYLE}/>
                <div className="relative flex flex-col items-center">
                    <Sparkles size={28} className="mb-4 opacity-70"/>
                    <p className="text-sm font-semibold text-base-content/65">Connecting…</p>
                </div>
            </div>
        )
    }

    if (isHomeRoute) {
        return (
            <>
                <AuthModal
                    open={authModal}
                    onClose={() => setAuthModal(false)}
                    view={authView}
                    onViewChange={(nextView) => {
                        setAuthView(nextView)
                        setAuthError('')
                    }}
                    name={authName}
                    setName={setAuthName}
                    email={authEmail}
                    setEmail={setAuthEmail}
                    password={authPassword}
                    setPassword={setAuthPassword}
                    workspaceName={activeWorkspace?.name}
                    error={authError}
                    loading={authLoading}
                    onLogin={handleLogin}
                    onSignup={handleSignup}
                />
                <HomeLandingPage
                    theme={theme}
                    player={player || authUser}
                    themePreference={themePreference}
                    onThemeChange={changeThemePreference}
                    onLogin={() => openAuth('login')}
                    onLogout={logout}
                />
            </>
        )
    }

    if (createPoolRoute) {
        return (
            <div className="min-h-screen bg-base-200 text-base-content" data-theme={theme}>
                <AuthModal
                    open={authModal}
                    onClose={() => setAuthModal(false)}
                    view={authView}
                    onViewChange={(nextView) => {
                        setAuthView(nextView)
                        setAuthError('')
                    }}
                    name={authName}
                    setName={setAuthName}
                    email={authEmail}
                    setEmail={setAuthEmail}
                    password={authPassword}
                    setPassword={setAuthPassword}
                    workspaceName={activeWorkspace?.name}
                    error={authError}
                    loading={authLoading}
                    onLogin={handleLogin}
                    onSignup={handleSignup}
                />
                <header className={HERO_SURFACE} style={HERO_STYLE}>
                    <div className="pointer-events-none absolute inset-0 opacity-45" style={HERO_PATTERN_STYLE}/>
                    <div className="relative mx-auto flex max-w-7xl items-start justify-between gap-3 px-4 py-6 sm:px-6 lg:px-8">
                        <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold uppercase tracking-widest text-base-content/55">Setup</div>
                            <h1 className="mt-2 truncate text-3xl font-black leading-tight sm:text-4xl">Create Pool</h1>
                        </div>
                        <UserMenu
                            player={player || authUser}
                            themePreference={themePreference}
                            onThemeChange={changeThemePreference}
                            onLogin={() => openAuth('login')}
                            onLogout={logout}
                        />
                    </div>
                </header>
                <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
                    <CreatePoolPage
                        authUser={authUser}
                        creating={creatingPool}
                        onLogin={() => openAuth('login')}
                        onSignup={() => openAuth('signup')}
                        onCreatePool={createPool}
                        onOpenPool={(workspace) => navigate(workspacePath(workspace, 'predictions'))}
                        onOpenPools={() => navigate('/pools')}
                    />
                </main>
            </div>
        )
    }

    if (poolsRoute) {
        return (
            <div className="min-h-screen bg-base-200 text-base-content" data-theme={theme}>
                <AuthModal
                    open={authModal}
                    onClose={() => setAuthModal(false)}
                    view={authView}
                    onViewChange={(nextView) => {
                        setAuthView(nextView)
                        setAuthError('')
                    }}
                    name={authName}
                    setName={setAuthName}
                    email={authEmail}
                    setEmail={setAuthEmail}
                    password={authPassword}
                    setPassword={setAuthPassword}
                    workspaceName={activeWorkspace?.name}
                    error={authError}
                    loading={authLoading}
                    onLogin={handleLogin}
                    onSignup={handleSignup}
                />
                <header className={HERO_SURFACE} style={HERO_STYLE}>
                    <div className="pointer-events-none absolute inset-0 opacity-45" style={HERO_PATTERN_STYLE}/>
                    <div className="relative mx-auto flex max-w-7xl items-start justify-between gap-3 px-4 py-6 sm:px-6 lg:px-8">
                        <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold uppercase tracking-widest text-base-content/55">Account</div>
                            <h1 className="mt-2 truncate text-3xl font-black leading-tight sm:text-4xl">My Pools</h1>
                        </div>
                        <UserMenu
                            player={player || authUser}
                            themePreference={themePreference}
                            onThemeChange={changeThemePreference}
                            onLogin={() => openAuth('login')}
                            onLogout={logout}
                        />
                    </div>
                </header>
                <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
                    <MyPoolsPage
                        authUser={authUser}
                        pools={userPools}
                        loading={userPoolsLoading}
                        onLogin={() => openAuth('login')}
                        onSignup={() => openAuth('signup')}
                        onCreate={() => navigate('/create-pool')}
                        onOpenPool={(selectedWorkspace) => navigate(workspacePath(selectedWorkspace, 'predictions'))}
                    />
                </main>
            </div>
        )
    }

    // Main app — always shown (guests can browse; auth modal appears on demand)
    return (
        <div className="min-h-screen bg-base-200 text-base-content" data-theme={theme}>
            {/* Auth modal */}
            <AuthModal
                open={authModal}
                onClose={() => setAuthModal(false)}
                view={authView}
                onViewChange={(nextView) => {
                    setAuthView(nextView)
                    setAuthError('')
                }}
                name={authName}
                setName={setAuthName}
                email={authEmail}
                setEmail={setAuthEmail}
                password={authPassword}
                setPassword={setAuthPassword}
                workspaceName={activeWorkspace?.name}
                error={authError}
                loading={authLoading}
                onLogin={handleLogin}
                onSignup={handleSignup}
            />
            {joinModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setJoinModal(false)
                    }}
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
                <div className="pointer-events-none absolute inset-0 opacity-45" style={HERO_PATTERN_STYLE}/>
                <div className="relative mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div
                                className="truncate text-xs font-semibold uppercase tracking-widest text-base-content/55">
                                {activeWorkspace?.name || workspaceName || 'Prediction Pool'}
                            </div>
                            <h1 className="mt-2 truncate text-3xl font-black leading-tight sm:text-4xl">
                                World Cup 2026
                            </h1>
                        </div>
                        <UserMenu
                            player={player || authUser}
                            themePreference={themePreference}
                            onThemeChange={changeThemePreference}
                            onLogin={() => openAuth('login')}
                            onLogout={logout}
                        />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <T>
                            <nav className="flex flex-wrap gap-1">
                                <NavButton active={activePage === 'predictions'}
                                           onClick={() => navigate(workspacePath(workspaceName, 'predictions'))}
                                           icon={CircleDot}>Predictions</NavButton>
                                <NavButton active={activePage === 'leaderboard'}
                                           onClick={() => navigate(workspacePath(workspaceName, 'leaderboard'))}
                                           icon={Trophy}>Leaderboard</NavButton>
                                <NavButton active={activePage === 'activity'}
                                           onClick={() => navigate(workspacePath(workspaceName, 'activity'))}
                                           icon={Activity}>Activity</NavButton>
                                {/*<NavButton ctive={activePage === 'admin'}
                  onClick={() => setActivePage('admin')} icon={Settings}>Admin</NavButton>*/}
                            </nav>
                        </T>
                    </div>
                </div>
            </header>

            <main className={`mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8 ${
                activePage === 'predictions' ? 'lg:grid-cols-3' : 'lg:grid-cols-1'
            }`}>
                <section
                    ref={pageParent}
                    className={`min-w-0 ${
                        activePage === 'predictions'
                            ? 'lg:col-span-2'
                            : 'mx-auto w-full max-w-[53rem]'
                    }`}
                >
                    {activeWorkspace && pocketbaseQueryError && (
                        <Panel className="mb-5 border border-error/30">
                            <p className="text-sm font-semibold text-error">
                                {friendlyAuthError(pocketbaseQueryError)}
                            </p>
                        </Panel>
                    )}

                    {activeWorkspace && pocketbaseQueryLoading && !pocketbaseQueryError && (
                        <Panel className="mb-5">
                            <p className="text-sm font-semibold text-base-content/55"><T>Refreshing pool data…</T></p>
                        </Panel>
                    )}

                    {!activeWorkspace && (
                        <MissingWorkspaceCard workspaceName={workspaceName}/>
                    )}

                    {canJoinWorkspace && (
                        <JoinWorkspaceCard
                            workspaceName={activeWorkspace.name}
                            userName={authUser.name}
                            onJoin={openJoinModal}
                        />
                    )}

                    {activeWorkspace && activePage === 'predictions' && (
                        <PredictionsPage
                            matches={matches}
                            predictions={effectiveData.predictions}
                            players={effectiveData.players}
                            playerPredictions={playerPredictions}
                            savingPick={savingPick} onPick={savePrediction}
                            onShowAuth={!authUser ? () => openAuth('signup') : null}
                            onShowJoin={canJoinWorkspace ? openJoinModal : null}
                        />
                    )}
                    {activeWorkspace && activePage === 'leaderboard' && (
                        profilePlayerId ? (
                            <PlayerProfilePage
                                playerId={profilePlayerId}
                                leaderboard={leaderboard}
                                matches={matches}
                                predictions={effectiveData.predictions}
                                onBack={() => {
                                    if (location.state?.fromRoute) {
                                        navigate(-1)
                                        return
                                    }
                                    navigate(workspacePath(workspaceName, 'leaderboard'))
                                }}
                            />
                        ) : (
                            <LeaderboardPage
                                workspaceId={activeWorkspace.id}
                                leaderboard={leaderboard}
                                matches={matches}
                                loadWorkspaceLeaderboard={loadWorkspaceLeaderboard}
                                onOpenProfile={(selectedPlayerId) => {
                                    navigate(
                                        leaderboardProfilePath(workspaceName, selectedPlayerId),
                                        {state: {fromRoute: location.pathname}},
                                    )
                                }}
                            />
                        )
                    )}
                    {activeWorkspace && activePage === 'activity' && (
                        <ActivityFeedPage
                            workspaceId={activeWorkspace.id}
                            loadWorkspaceActivityEvents={loadWorkspaceActivityEvents}
                            leaderboard={leaderboard}
                            canViewActivity={Boolean(player)}
                            onOpenProfile={(selectedPlayerId) => {
                                navigate(
                                    leaderboardProfilePath(workspaceName, selectedPlayerId),
                                    {state: {fromRoute: location.pathname}},
                                )
                            }}
                        />
                    )}
                    {activePage === 'admin' && (
                        <AdminPage
                            adminPin={adminPin} adminUnlocked={adminAllowed}
                            setAdminPin={setAdminPin} unlockAdmin={unlockAdmin}
                            newMatch={newMatch} setNewMatch={setNewMatch}
                            addMatch={addMatch} matches={matches} updateMatch={updateMatch}
                            deleteMatch={deleteMatch}
                        />
                    )}
                </section>

                {activePage === 'predictions' && (
                    <aside className="space-y-4">
                        <UserStatsCard
                            player={player}
                            authUser={authUser}
                            stats={playerStats}
                            workspaceName={activeWorkspace?.name}
                            onJoin={activeWorkspace ? (authUser ? openJoinModal : () => openAuth('signup')) : null}
                        />

                        <PoolStatusCard
                            playersCount={effectiveData.players.length}
                            matchesCount={matches.length}
                            completedMatches={completedMatches}
                            totalPredictions={effectiveData.predictions.length}
                            countdown={poolCountdown}
                        />
                    </aside>
                )}
            </main>
        </div>
    )
}

function App() {
    return (
        <GTProvider config={gtConfig} loadTranslations={loadTranslations}>
            <AppContent/>
        </GTProvider>
    )
}

function JoinWorkspaceModal({workspaceName, userName, error, loading, onJoin, onClose}) {
    return (
        <div className="w-full max-w-sm rounded-2xl border border-base-200 bg-base-100 p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
                <div>
                    <h2 className="text-xl font-black">Join this pool?</h2>
                    <p className="mt-0.5 text-xs text-base-content/50">
                        {userName || 'You'} can browse {workspaceName || 'this workspace'} without joining, but picks
                        require membership.
                    </p>
                </div>
                <button type="button" onClick={onClose}
                        className="ml-4 rounded-lg p-1 text-base-content/30 hover:text-base-content/60">✕
                </button>
            </div>

            {error && (
                <div
                    className="mb-3 flex items-center gap-2 rounded-xl border border-error/30 bg-error/10 px-3 py-2.5 text-xs font-semibold text-error">
                    <XCircle size={14} className="shrink-0"/>
                    {error}
                </div>
            )}

            <div className="grid gap-2">
                <button type="button" disabled={loading} className="btn btn-primary w-full rounded-xl font-black"
                        onClick={onJoin}>
                    {loading && <span className="loading loading-spinner loading-sm"/>}
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
function NavButton({active, onClick, icon: Icon, children}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`cursor-pointer flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                active ? 'border border-primary/35 bg-base-100/70 text-primary shadow-xs' : 'text-base-content/60 hover:bg-base-100/70 hover:text-base-content'
            }`}
        >
            <Icon size={16}/>
            {children}
        </button>
    )
}

function JoinWorkspaceCard({workspaceName, userName, onJoin}) {
    return (
        <Panel className="mb-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <T>
                        <div
                            className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                            <UserPlus size={13}/>
                            Not a member yet
                        </div>
                    </T>
                    <h3 className="text-lg font-black">
                        <T context="Sports prediction pool app">
                            Join <Var>{workspaceName}</Var> to submit picks
                        </T>
                    </h3>
                    <p className="mt-1 text-sm text-base-content/55">
                        <T context="Sports prediction pool app">
                            Signed in as <Var>{userName || 'a user'}</Var>. You can keep browsing, or join this pool
                            when you are ready.
                        </T>
                    </p>
                </div>
                <T>
                    <button type="button" className="btn btn-primary rounded-xl font-black" onClick={onJoin}>
                        Join
                    </button>
                </T>
            </div>
        </Panel>
    )
}

function MissingWorkspaceCard({workspaceName}) {
    return (
        <Panel>
            <div className="py-8 text-center">
                <Trophy className="mx-auto mb-3 text-primary/40" size={32}/>
                <h3 className="text-lg font-black">
                    {workspaceName ? <T>Workspace not found</T> : <T>Open a workspace URL</T>}
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
function PredictionsPage({
    matches,
    predictions,
    players,
    playerPredictions,
    savingPick,
    onPick,
    onShowAuth,
    onShowJoin,
}) {
    const [activeStage, setActiveStage] = useState(STAGE_TABS[0].id)
    const [showPastMatches, setShowPastMatches] = useState(false)
    const [showPredictedMatches, setShowPredictedMatches] = useState(true)
    const [groupMode, setGroupMode] = useState('round')
    const [collapsedGroups, setCollapsedGroups] = useState({})
    const [scoringOpen, setScoringOpen] = useState(false)
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [matchesParent] = useAutoAnimate({duration: 220, easing: 'ease-out'})
    const activeStageInfo = STAGE_TABS.find((s) => s.id === activeStage) || STAGE_TABS[0]
    const collapseScope = useMemo(
        () => `${activeStage}:${groupMode}:${showPastMatches ? 1 : 0}:${showPredictedMatches ? 1 : 0}`,
        [activeStage, groupMode, showPastMatches, showPredictedMatches],
    )
    const stageMatches = matches.filter((m) => m.stage === activeStageInfo.stage)
    const visibleMatches = stageMatches.filter((match) => {
        const isPastMatch = match.status === 'final' || Boolean(match.result)
        const alreadyPicked = playerPredictions.has(match.id)
        if (!showPastMatches && isPastMatch) return false
        if (!showPredictedMatches && alreadyPicked) return false
        return true
    })

    const inferredRounds = useMemo(() => inferGroupRounds(stageMatches), [stageMatches])
    const playerNameById = useMemo(
        () => new Map((players || []).map((poolPlayer) => [poolPlayer.id, poolPlayer.name || 'Player'])),
        [players],
    )
    const picksByMatchId = useMemo(() => {
        const grouped = new Map()
        ;(predictions || []).forEach((poolPrediction) => {
            if (!poolPrediction?.match || !poolPrediction?.pick) return
            const existing = grouped.get(poolPrediction.match) || []
            existing.push({
                id: poolPrediction.id,
                playerId: poolPrediction.player,
                playerName: playerNameById.get(poolPrediction.player) || 'Player',
                pick: poolPrediction.pick,
                createdAt: poolPrediction.createdAt || '',
            })
            grouped.set(poolPrediction.match, existing)
        })

        grouped.forEach((matchPicks, matchId) => {
            grouped.set(matchId, [...matchPicks].sort((a, b) => a.playerName.localeCompare(b.playerName)))
        })

        return grouped
    }, [playerNameById, predictions])

    const groupedMatches = useMemo(() => {
        if (groupMode === 'none') return []
        const groups = new Map()
        visibleMatches.forEach((match) => {
            let key = ''
            let label = ''
            if (groupMode === 'date') {
                key = kickoffDateKey(match.kickoff)
                label = kickoffDateLabel(match.kickoff)
            } else if (groupMode === 'group') {
                key = match.group || 'ungrouped'
                label = match.group || 'Ungrouped'
            } else if (groupMode === 'round') {
                const roundNumber = match.matchday || inferredRounds.get(match.id)
                if (roundNumber) {
                    key = `round-${roundNumber}`
                    label = `${ordinal(roundNumber)} round`
                } else {
                    key = match.group || match.stage || 'ungrouped'
                    label = match.group || match.stage || 'Ungrouped'
                }
            }

            const existing = groups.get(key)
            if (existing) {
                existing.matches.push(match)
            } else {
                groups.set(key, {key, label, matches: [match]})
            }
        })
        return [...groups.values()]
    }, [groupMode, inferredRounds, visibleMatches])


    function toggleGroup(groupKey) {
        const scopedKey = `${collapseScope}:${groupKey}`
        setCollapsedGroups((current) => ({...current, [scopedKey]: !(current[scopedKey] ?? false)}))
    }

    function isGroupCollapsed(groupKey) {
        return collapsedGroups[`${collapseScope}:${groupKey}`] ?? false
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-black sm:text-3xl"><T>Predictions</T></h2>
                    <p className="mt-0.5 text-sm text-base-content/60"><T>Pick the result before kickoff to score
                        points.</T></p>
                </div>
                <div className="flex items-center gap-2">
                    <ScoringPopover
                        open={scoringOpen}
                        onOpenChange={(nextOpen) => {
                            setScoringOpen(nextOpen)
                            if (nextOpen) setFiltersOpen(false)
                        }}
                    />
                    <FiltersPopover
                        open={filtersOpen}
                        onOpenChange={(nextOpen) => {
                            setFiltersOpen(nextOpen)
                            if (nextOpen) setScoringOpen(false)
                        }}
                        showPastMatches={showPastMatches}
                        onShowPastMatchesChange={setShowPastMatches}
                        showPredictedMatches={showPredictedMatches}
                        onShowPredictedMatchesChange={setShowPredictedMatches}
                        groupMode={groupMode}
                        onGroupModeChange={setGroupMode}
                    />
                </div>
            </div>

            <StageTabs activeStage={activeStage} matches={matches} onChange={setActiveStage}/>

            <div ref={matchesParent} className="grid gap-3">
                {visibleMatches.length === 0 && (
                    <Panel>
                        <div className="py-10 text-center">
                            <CircleDot className="mx-auto mb-3 text-primary/40" size={32}/>
                            <h3 className="text-lg font-black">No {activeStageInfo.label} matches yet</h3>
                            <p className="mt-1 text-sm text-base-content/50">Add fixtures from the admin panel to open
                                this round.</p>
                        </div>
                    </Panel>
                )}
                {groupMode !== 'none'
                    ? groupedMatches.map((group) => (
                        <div key={group.key} className="space-y-1">
                            <button
                                type="button"
                                onClick={() => toggleGroup(group.key)}
                                aria-expanded={!isGroupCollapsed(group.key)}
                                className="flex w-full cursor-pointer items-center gap-2 px-1 py-1"
                            >
                                <div className="h-px flex-1 bg-base-300"/>
                                <T>
                                    <div
                                        className="shrink-0 text-xs font-bold uppercase tracking-wide text-base-content/45">
                                        <Var>
                                            {group.label} · {group.matches.length} {group.matches.length === 1 ? 'match' : 'matches'}
                                        </Var>
                                    </div>
                                </T>
                                <ChevronDown
                                    size={14}
                                    className={`shrink-0 text-base-content/35 transition-transform duration-200 ${
                                        isGroupCollapsed(group.key) ? '-rotate-90' : 'rotate-0'
                                    }`}
                                />
                                <div className="h-px flex-1 bg-base-300"/>
                            </button>
                            <div
                                className={`grid transition-[grid-template-rows,opacity] duration-250 ease-out ${
                                    isGroupCollapsed(group.key) ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
                                }`}
                            >
                                <div className="overflow-hidden">
                                    <div className="grid gap-3 pt-2">
                                        {group.matches.map((match) => (
                                            <MatchPredictionCard
                                                key={match.id}
                                                match={match}
                                                prediction={playerPredictions.get(match.id)}
                                                poolPicks={picksByMatchId.get(match.id) || []}
                                                savingPick={savingPick}
                                                onPick={onPick}
                                                onShowAuth={onShowAuth}
                                                onShowJoin={onShowJoin}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                    : visibleMatches.map((match) => (
                        <MatchPredictionCard
                            key={match.id}
                            match={match}
                            prediction={playerPredictions.get(match.id)}
                            poolPicks={picksByMatchId.get(match.id) || []}
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

function StageTabs({activeStage, matches, onChange}) {
    const [tabsParent] = useAutoAnimate({duration: 180, easing: 'ease-out'})

    return (
        <div ref={tabsParent} className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Prediction rounds">
            {STAGE_TABS.map((stage) => {
                const count = matches.filter((m) => m.stage === stage.stage).length
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
                        <span
                            className={`rounded-lg px-1.5 py-0.5 text-xs font-black ${active ? 'bg-primary/10 text-primary' : 'bg-base-200'}`}>
              {count}
            </span>
                    </button>
                )
            })}
        </div>
    )
}

export default App
