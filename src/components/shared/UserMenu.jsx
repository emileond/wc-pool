import { useEffect, useRef, useState } from 'react'
import { LocaleSelector } from 'gt-react'
import { ChevronDown, LogOut, Monitor, Moon, Sun } from 'lucide-react'

function initials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

export default function UserMenu({
  player,
  themePreference,
  onThemeChange,
  onLogin,
  onLogout,
  myPoolsHref = '/pools',
  createPoolHref = '/create-pool',
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

  if (!player) {
    return (
      <>
        <button
          type="button"
          onClick={onLogin}
          className="btn btn-ghost btn-sm hidden font-semibold text-base-content/60 sm:flex"
        >
          Log in
        </button>
        <a href={createPoolHref} className="btn btn-primary btn-sm sm:btn-md font-bold">
          Start a Pool
        </a>
      </>
    )
  }

  return (
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
            <a href={myPoolsHref} className="font-semibold">My pools</a>
          </li>
          <li>
            <a href={createPoolHref}>Create pool</a>
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
  )
}
