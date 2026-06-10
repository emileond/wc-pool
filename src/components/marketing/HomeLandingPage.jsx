import {
  ArrowRight,
  BellRing,
  Check,
  ChevronDown,
  Globe,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Shield,
  Sparkles,
  Sun,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { LocaleSelector } from 'gt-react'

const steps = [
  {
    title: 'Create your account',
    description: 'Sign up in seconds — no credit card needed.',
    emoji: '👤',
  },
  {
    title: 'Name your pool & invite friends',
    description: 'Pick World Cup 2026, set your group name, and share the link.',
    emoji: '🔗',
  },
  {
    title: 'Make your picks',
    description: 'Predict match outcomes before kickoff and watch the leaderboard move.',
    emoji: '⚽',
  },
  {
    title: 'Win bragging rights',
    description: 'Live leaderboards and a Wrapped recap determine the champion.',
    emoji: '🏆',
  },
]

const featureCards = [
  {
    title: 'Fully Automatic',
    description: 'Live scores, bracket progressions, and leaderboards update in real time — zero manual work.',
    icon: Zap,
    accent: 'text-primary',
    bg: 'bg-primary/12',
  },
  {
    title: 'Group Banter',
    description: 'Activity feed, reactions, and personal profiles keep the trash talk alive all tournament.',
    icon: Users,
    accent: 'text-secondary',
    bg: 'bg-secondary/12',
  },
  {
    title: 'Tournament Wrapped',
    description: 'Every player gets a Spotify-style recap: best picks, biggest misses, win streaks, and stats.',
    icon: Sparkles,
    accent: 'text-accent',
    bg: 'bg-accent/12',
  },
  {
    title: 'Smart Reminders',
    description: 'Automated email nudges before kickoff so nobody misses a pick window.',
    icon: BellRing,
    accent: 'text-success',
    bg: 'bg-success/12',
  },
  {
    title: 'Multi-Language',
    description: "Your pool speaks everyone's language. Full internationalization built in.",
    icon: Globe,
    accent: 'text-info',
    bg: 'bg-info/12',
  },
  {
    title: 'Private & Secure',
    description: 'Invite-only pools. Your picks and group data stay between you and your friends.',
    icon: Shield,
    accent: 'text-warning',
    bg: 'bg-warning/12',
  },
]

const freeFeatures = [
  'Up to 10 participants',
  'Live leaderboards',
  'Automatic score tracking',
  'Activity feed & reactions',
  'Multi-language support',
  'Tournament Wrapped recap',
]

const proFeatures = [
  'Unlimited participants',
  'Pick trends (see group bets)',
  'Advanced stats & analytics',
  'Custom pool branding',
  'Detailed stage summaries',
  'Priority email support',
]

const stats = [
  { value: '2,400+', label: 'Pools created' },
  { value: '18,000+', label: 'Players competing' },
  { value: '60 sec', label: 'Avg. setup time' },
]

function initials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function FeatureList({ items }) {
  return (
    <ul className="mt-5 space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-base-content/80">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Check size={10} strokeWidth={3} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function HeroVisual() {
  const [mounted, setMounted] = useState(false)
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60)
    const iv = setInterval(() => setPulse((p) => (p + 1) % 5), 2600)
    return () => { clearTimeout(t); clearInterval(iv) }
  }, [])

  const players = [
    { name: 'Carlos M.', pts: 47, pct: 82, initials: 'CM', avatarBg: 'bg-green-600' },
    { name: 'Sarah K.',  pts: 44, pct: 76, initials: 'SK', avatarBg: 'bg-blue-600' },
    { name: 'João F.',   pts: 41, pct: 71, initials: 'JF', avatarBg: 'bg-purple-600' },
    { name: 'Aisha R.',  pts: 38, pct: 65, initials: 'AR', avatarBg: 'bg-pink-600' },
    { name: 'Mike T.',   pts: 35, pct: 59, initials: 'MT', avatarBg: 'bg-amber-600' },
  ]

  const medals = ['🥇', '🥈', '🥉']
  const podiumRow = [
    'border-yellow-500/25 bg-yellow-500/10',
    'border-slate-400/20 bg-slate-400/10',
    'border-orange-500/20 bg-orange-500/10',
  ]

  const feed = [
    { emoji: '⚡', text: 'Carlos → Brazil',       time: '2m ago',  cls: 'border-primary/25 bg-primary/10' },
    { emoji: '📈', text: 'Sarah climbed to 2nd',  time: '5m ago',  cls: 'border-emerald-500/20 bg-emerald-500/10' },
    { emoji: '⏱', text: 'France 2–1 Germany FT', time: '18m ago', cls: 'border-base-300 bg-base-100' },
    { emoji: '⚡', text: 'Aisha → Spain',          time: '21m ago', cls: 'border-primary/25 bg-primary/10' },
  ]

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-2xl">
      {/* Window chrome */}
      <div className="flex items-center gap-3 border-b border-base-300 bg-base-200 px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
        </div>
        <div className="flex-1">
          <div className="mx-auto w-fit rounded-md border border-base-300 bg-base-100 px-3 py-1 text-[11px] font-medium text-base-content/65">
            wcpool.app · My Squad 🔥
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Live
        </div>
      </div>

      <div className="space-y-3 p-4">
        {/* Leaderboard */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Trophy size={13} className="text-yellow-400" />
              <span className="text-[11px] font-black tracking-tight text-base-content/80">Leaderboard</span>
            </div>
            <span className="text-[10px] text-base-content/50">12 players</span>
          </div>

          <div className="space-y-1.5">
            {players.map((p, i) => (
              <div
                key={p.name}
                style={{
                  transform: mounted ? 'translateX(0)' : 'translateX(24px)',
                  opacity: mounted ? 1 : 0,
                  transition: `transform 0.45s ease ${i * 60}ms, opacity 0.45s ease ${i * 60}ms, background-color 0.35s ease, border-color 0.35s ease`,
                }}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${
                  pulse === i
                    ? 'border-primary/35 bg-primary/10'
                    : i < 3
                    ? podiumRow[i]
                    : 'border-base-300 bg-base-100'
                }`}
              >
                {/* Rank */}
                {i < 3 ? (
                  <span className="w-6 shrink-0 text-center text-base leading-none">{medals[i]}</span>
                ) : (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-base-200 text-[10px] font-black text-base-content/60">
                    {i + 1}
                  </span>
                )}

                {/* Avatar */}
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${p.avatarBg} text-[9px] font-black text-white`}>
                  {p.initials}
                </div>

                {/* Name + progress */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 truncate text-[11px] font-black text-base-content">{p.name}</div>
                  <div className="h-1 overflow-hidden rounded-full bg-base-300">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: mounted ? `${p.pct}%` : '0%',
                        transition: `width 0.9s ease ${i * 80 + 500}ms`,
                      }}
                    />
                  </div>
                </div>

                {/* Points */}
                <div className="shrink-0 text-right">
                  <span className="text-sm font-black tabular-nums text-base-content/90">{p.pts}</span>
                  <span className="ml-0.5 text-[9px] font-semibold text-base-content/50">pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row: match card + activity */}
        <div className="grid grid-cols-2 gap-3">
          {/* Mini prediction card */}
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(14px)',
              transition: 'opacity 0.5s ease 700ms, transform 0.5s ease 700ms',
            }}
            className="overflow-hidden rounded-xl border border-base-300 bg-base-100"
          >
            <div className="border-b border-base-300 bg-base-200 px-2.5 py-1.5">
              <div className="text-[9px] font-bold uppercase tracking-widest text-base-content/50">Group Stage</div>
            </div>
            <div className="p-2.5">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 text-center">
                <div>
                  <div className="mx-auto mb-1 flex h-4 w-6 items-center justify-center rounded-sm bg-green-700/35 text-[7px] font-black text-green-300">BRA</div>
                  <div className="text-[10px] font-black text-base-content/90">Brazil</div>
                </div>
                <span className="rounded border border-base-300 px-1 py-0.5 text-[9px] font-black text-base-content/55">VS</span>
                <div>
                  <div className="mx-auto mb-1 flex h-4 w-6 items-center justify-center rounded-sm bg-sky-700/35 text-[7px] font-black text-sky-300">ARG</div>
                  <div className="text-[10px] font-black text-base-content/90">Argentina</div>
                </div>
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-1">
                {[{ l: 'BRA', active: true }, { l: 'Draw', active: false }, { l: 'ARG', active: false }].map(({ l, active }) => (
                  <div
                    key={l}
                    className={`rounded-lg border py-1.5 text-center text-[9px] font-black ${
                      active
                        ? 'border-primary/50 bg-primary/80 text-primary-content'
                        : 'border-base-300 bg-base-100 text-base-content/60'
                    }`}
                  >
                    {l}
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[9px] font-semibold text-emerald-400">✓ Pick: BRA</span>
                <span className="text-[9px] text-base-content/45">🔒 Locked</span>
              </div>
            </div>
          </div>

          {/* Activity feed */}
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(14px)',
              transition: 'opacity 0.5s ease 800ms, transform 0.5s ease 800ms',
            }}
          >
            <div className="mb-2 text-[9px] font-bold uppercase tracking-widest text-base-content/50">Activity</div>
            <div className="space-y-1.5">
              {feed.map((item, i) => (
                <div
                  key={i}
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? 'translateX(0)' : 'translateX(10px)',
                    transition: `opacity 0.4s ease ${0.85 + i * 0.08}s, transform 0.4s ease ${0.85 + i * 0.08}s`,
                  }}
                  className={`flex items-center gap-1.5 rounded-lg border p-1.5 ${item.cls}`}
                >
                  <span className="shrink-0 text-[11px] leading-none">{item.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[10px] font-bold text-base-content/80">{item.text}</div>
                    <div className="text-[8px] text-base-content/45">{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomeLandingPage({
  theme,
  player,
  themePreference,
  onThemeChange,
  onLogin,
  onSignup,
  onLogout,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const displayName = player?.name || player?.username || player?.email || ''
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

    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsidePointer)
    document.addEventListener('touchstart', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsidePointer)
      document.removeEventListener('touchstart', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  return (
    <div className="min-h-screen bg-base-100 text-base-content antialiased" data-theme={theme}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-base-300/80 bg-base-100/95 backdrop-blur-md">
        <div className="navbar mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="navbar-start">
            <a href="/" className="flex items-center gap-2">
              <span className="text-xl">⚽</span>
              <span className="text-lg font-black tracking-tight">WC Pool</span>
            </a>
          </div>
          <div className="navbar-center hidden md:flex">
            <ul className="menu menu-horizontal gap-1 px-1 text-sm font-semibold text-base-content/60">
              <li><a href="#how-it-works" className="hover:text-base-content">How It Works</a></li>
              <li><a href="#features" className="hover:text-base-content">Features</a></li>
              <li><a href="#pricing" className="hover:text-base-content">Pricing</a></li>
            </ul>
          </div>
          <div className="navbar-end gap-2">
            {player ? (
              /* ── Logged-in user menu ── */
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="btn btn-ghost h-auto min-h-0 cursor-pointer rounded-full border border-base-content/10 bg-base-100/70 py-1 pl-1 pr-2.5 shadow-xs hover:border-primary/25 hover:bg-base-100"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-content">
                    {initials(displayName) || '?'}
                  </span>
                  <span className="hidden max-w-36 truncate text-xs font-bold normal-case sm:inline">
                    {displayName}
                  </span>
                  <ChevronDown size={13} className="shrink-0 text-base-content/40" />
                </button>
                {menuOpen && (
                  <ul className="menu absolute right-0 top-full z-50 mt-2 w-60 rounded-box border border-base-300 bg-base-100 p-2 text-base-content shadow-xl">
                    <li className="menu-title">
                      <span className="truncate">{displayName}</span>
                    </li>
                    <li>
                      <a href="/pools" className="font-semibold">My pools</a>
                    </li>
                    <li className="menu-title mt-1">
                      <span>Theme</span>
                    </li>
                    <li className="px-2 pb-1">
                      <div className="flex items-center gap-2 rounded-lg bg-base-100 py-1.5">
                        {themeOptions.map(({ value, icon: Icon }) => (
                          value === themePreference ? (
                            <Icon key={value} size={15} className="shrink-0 text-base-content/50" />
                          ) : null
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
                    <li className="menu-title mt-1">
                      <span>Language</span>
                    </li>
                    <li className="px-2 pb-1">
                      <div className="rounded-lg bg-base-100 px-1 py-1.5">
                        <LocaleSelector />
                      </div>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="text-error"
                        onClick={() => {
                          setMenuOpen(false)
                          onLogout()
                        }}
                      >
                        <LogOut size={14} />
                        Sign out
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            ) : (
              /* ── Guest buttons ── */
              <>
                <button
                  type="button"
                  onClick={onLogin}
                  className="btn btn-ghost btn-sm hidden font-semibold text-base-content/60 sm:flex"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={onSignup}
                  className="btn btn-primary btn-sm sm:btn-md font-bold"
                >
                  Start a Pool
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>

        {/* ── Hero ────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-base-300 bg-base-100">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_60%_-10%,rgba(34,197,94,0.18),transparent)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(ellipse_60%_80%_at_100%_50%,rgba(59,130,246,0.10),transparent)]"
          />

          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">

            {/* Copy */}
            <div className="flex flex-col justify-center">
              <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-base-300 bg-base-200 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-base-content/80">
                <Globe size={12} />
                FIFA World Cup 2026 — USA · Canada · Mexico
              </div>

              <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-base-content sm:text-5xl lg:text-6xl">
                The Smartest Way to Run Your{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  World Cup Pool.
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-base leading-7 text-base-content/70 sm:text-lg">
                Ditch the spreadsheets. Set up your private group in 60 seconds, invite your squad,
                and let us handle every score, bracket update, and leaderboard automatically.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {player ? (
                  <a href="/pools" className="btn btn-primary btn-lg gap-2 font-bold shadow-lg shadow-primary/30">
                    Go to My Pools
                    <ArrowRight size={18} />
                  </a>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={onSignup}
                      className="btn btn-primary btn-lg gap-2 font-bold shadow-lg shadow-primary/30"
                    >
                      Start a Free Pool
                      <ArrowRight size={18} />
                    </button>
                    <a
                      href="#how-it-works"
                      className="btn btn-outline btn-lg border-base-300 font-semibold text-base-content"
                    >
                      See How It Works
                    </a>
                  </>
                )}
              </div>

              {!player && (
                <p className="mt-4 text-sm font-medium text-base-content/50">
                  <Check size={13} className="mr-1.5 inline text-emerald-400" />
                  Free to start · No credit card required
                </p>
              )}
            </div>

            {/* Hero visual */}
            <div className="relative flex items-center justify-center lg:pl-4">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/10 blur-2xl" aria-hidden />
              <div className="relative w-full">
                <HeroVisual />
                {/* Floating badges */}
                <div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-xl border border-base-300 bg-base-100 px-3.5 py-2.5 shadow-xl">
                  <Trophy size={16} className="text-yellow-500" />
                  <div>
                    <p className="text-xs font-bold leading-none text-base-content">Live Leaderboard</p>
                    <p className="mt-0.5 text-[10px] text-base-content/50">Updates in real time</p>
                  </div>
                </div>
                <div className="absolute -right-4 -top-4 flex items-center gap-2 rounded-xl border border-base-300 bg-base-100 px-3.5 py-2.5 shadow-xl">
                  <span className="text-base">⚡</span>
                  <div>
                    <p className="text-xs font-bold leading-none text-base-content">Auto Tracking</p>
                    <p className="mt-0.5 text-[10px] text-base-content/50">Zero admin work</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats bar ───────────────────────────────────────────── */}
        <section className="border-b border-base-300 bg-base-200">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid grid-cols-3 divide-x divide-base-300">
              {stats.map(({ value, label }) => (
                <div key={label} className="px-4 text-center first:pl-0 last:pr-0 sm:px-8">
                  <p className="text-2xl font-black text-base-content sm:text-3xl">{value}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-base-content/50 sm:text-sm">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ────────────────────────────────────────── */}
        <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">Simple Process</p>
            <h2 className="text-3xl font-black text-base-content sm:text-4xl">Up and running in minutes</h2>
            <p className="mx-auto mt-3 max-w-xl text-base-content/60">
              No complex setup. No manual tracking. Just invite your crew and start competing.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.title} className="relative">
                {index < steps.length - 1 && (
                  <div
                    aria-hidden
                    className="absolute left-[calc(50%+2.5rem)] top-8 hidden h-0.5 w-full bg-gradient-to-r from-base-content/15 to-base-content/5 lg:block"
                  />
                )}
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-base-300 bg-base-200 text-3xl shadow-md">
                    {step.emoji}
                    <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-content shadow">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-base-content">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-base-content/60">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ────────────────────────────────────────────── */}
        <section id="features" className="bg-base-200">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">Everything You Need</p>
              <h2 className="text-3xl font-black text-base-content sm:text-4xl">Built for zero friction</h2>
              <p className="mx-auto mt-3 max-w-xl text-base-content/60">
                From first whistle to final recap, the platform handles the heavy lifting.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featureCards.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-base-300 bg-base-100 p-6 transition-all hover:border-base-content/20 hover:bg-base-100/95"
                >
                  <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${feature.bg}`}>
                    <feature.icon size={20} className={feature.accent} />
                  </div>
                  <h3 className="text-base font-bold text-base-content">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-base-content/60">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ─────────────────────────────────────────────── */}
        <section id="pricing" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">Pricing</p>
            <h2 className="text-3xl font-black text-base-content sm:text-4xl">Simple, fair pricing</h2>
            <p className="mx-auto mt-3 max-w-xl text-base-content/60">
              Start free with your friend group. One-time upgrade if you want the full experience — organizer pays, everyone enjoys.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:gap-8">
            {/* Free */}
            <article className="flex flex-col rounded-2xl border border-base-300 bg-base-200 p-8">
              <div>
                <h3 className="text-xl font-black text-base-content">Free</h3>
                <p className="mt-1 text-sm text-base-content/60">Perfect for small groups, zero commitment.</p>
              </div>
              <div className="mt-6 flex items-end gap-1">
                <span className="text-5xl font-black text-base-content">$0</span>
                <span className="mb-1.5 text-sm text-base-content/50">forever</span>
              </div>
              <FeatureList items={freeFeatures} />
              <button
                type="button"
                onClick={player ? undefined : onSignup}
                className="btn btn-outline mt-8 w-full font-bold"
              >
                {player ? <a href="/pools">Go to My Pools</a> : 'Start for Free'}
              </button>
            </article>

            {/* Pro */}
            <article className="relative flex flex-col rounded-2xl border-2 border-primary bg-base-100 p-8 shadow-xl shadow-primary/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1 text-xs font-black uppercase tracking-wide text-primary-content shadow-md">
                  ⭐ Most Popular
                </span>
              </div>
              <div>
                <h3 className="text-xl font-black text-base-content">Pro Pool</h3>
                <p className="mt-1 text-sm text-base-content/60">One-time per pool. Organizer pays, everyone benefits.</p>
              </div>
              <div className="mt-6 flex items-end gap-1">
                <span className="text-5xl font-black text-base-content">$9</span>
                <span className="mb-1.5 text-sm text-base-content/50">one-time / pool</span>
              </div>
              <FeatureList items={proFeatures} />
              <button
                type="button"
                onClick={player ? undefined : onSignup}
                className="btn btn-primary mt-8 w-full gap-2 font-bold shadow-lg shadow-primary/30"
              >
                {player ? <a href="/pools">Go to My Pools</a> : <>Get Pro <ArrowRight size={16} /></>}
              </button>
            </article>
          </div>
        </section>

        {/* ── Tournament spotlight ─────────────────────────────────── */}
        <section className="border-y border-base-300 bg-base-200">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm lg:grid lg:grid-cols-2">
              {/* Left: info */}
              <div className="p-8 sm:p-10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black uppercase tracking-widest text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Now Available
                </span>
                <h2 className="mt-4 text-2xl font-black text-base-content sm:text-3xl">
                  FIFA World Cup 2026
                </h2>
                <p className="mt-2 text-base-content/60">
                  June 11 – July 19, 2026 · USA, Canada & Mexico
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-4">
                  {[
                    { flag: '🇺🇸', name: 'USA' },
                    { flag: '🇨🇦', name: 'Canada' },
                    { flag: '🇲🇽', name: 'Mexico' },
                  ].map(({ flag, name }) => (
                    <div key={name} className="flex items-center gap-1.5 rounded-lg border border-base-300 bg-base-200 px-3 py-2">
                      <span className="text-xl">{flag}</span>
                      <span className="text-sm font-bold text-base-content">{name}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-6">
                  {[
                    { value: '48', label: 'Teams' },
                    { value: '104', label: 'Matches' },
                    { value: '3', label: 'Host nations' },
                  ].map(({ value, label }) => (
                    <div key={label}>
                      <p className="text-2xl font-black text-base-content">{value}</p>
                      <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: CTA */}
              <div className="flex flex-col items-start justify-center gap-4 border-t border-base-300 bg-base-200 p-8 sm:p-10 lg:border-l lg:border-t-0">
                <Trophy size={32} className="text-primary" />
                <h3 className="text-xl font-black text-base-content">
                  Start your World Cup pool today
                </h3>
                <p className="text-sm leading-6 text-base-content/60">
                  The tournament is already underway. Set up your group, lock in your picks, and battle it out until the final whistle.
                </p>
                <button
                  type="button"
                  onClick={player ? undefined : onSignup}
                  className="btn btn-primary gap-2 font-bold"
                >
                  {player
                    ? <a href="/pools" className="flex items-center gap-2">Go to My Pools <ArrowRight size={16} /></a>
                    : <><span>Create a Free Pool</span><ArrowRight size={16} /></>
                  }
                </button>
                {!player && (
                  <p className="text-xs text-base-content/40">
                    Free to start · No credit card required
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ───────────────────────────────────────────── */}
        <section id="final-cta" className="relative overflow-hidden bg-base-200">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_120%,rgba(34,197,94,0.20),transparent)]"
          />
          <div className="relative mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
            <div className="mb-4 text-5xl">🏆</div>
            <h2 className="text-3xl font-black text-base-content sm:text-4xl lg:text-5xl">
              Ready to claim bragging rights?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-base-content/60 sm:text-lg">
              Launch your World Cup 2026 pool in 60 seconds. No spreadsheets, no chasing picks, no manual updates — ever.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {player ? (
                <a href="/pools" className="btn btn-primary btn-lg gap-2 font-bold shadow-xl shadow-primary/30">
                  Go to My Pools
                  <ArrowRight size={18} />
                </a>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onSignup}
                    className="btn btn-primary btn-lg gap-2 font-bold shadow-xl shadow-primary/30"
                  >
                    Start a Free Pool
                    <ArrowRight size={18} />
                  </button>
                  <a
                    href="#pricing"
                    className="btn btn-outline btn-lg border-base-300 font-semibold text-base-content"
                  >
                    View Pricing
                  </a>
                </>
              )}
            </div>
            {!player && (
              <p className="mt-5 text-sm text-base-content/40">
                Free to start · No credit card required · Takes 60 seconds
              </p>
            )}
          </div>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-base-300 bg-base-100">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span>⚽</span>
              <span className="text-sm font-black text-base-content">WC Pool</span>
              <span className="text-sm text-base-content/40">· © 2026 All rights reserved.</span>
            </div>
            <div className="flex flex-wrap items-center gap-5 text-sm text-base-content/50">
              <a href="#" className="transition-colors hover:text-base-content">Terms</a>
              <a href="#" className="transition-colors hover:text-base-content">Privacy</a>
              <a href="#" className="inline-flex items-center gap-1.5 transition-colors hover:text-base-content">
                <Mail size={13} />
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
