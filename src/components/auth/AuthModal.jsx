import { useAutoAnimate } from '@formkit/auto-animate/react'
import { T, useGT } from 'gt-react'
import { XCircle } from 'lucide-react'

export default function AuthModal({
  open,
  onClose,
  view,
  onViewChange,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  workspaceName,
  error,
  loading,
  onLogin,
  onSignup,
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <AuthCard
        view={view}
        onViewChange={onViewChange}
        name={name}
        setName={setName}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        workspaceName={workspaceName}
        error={error}
        loading={loading}
        onLogin={onLogin}
        onSignup={onSignup}
        onClose={onClose}
      />
    </div>
  )
}

function AuthCard({
  view,
  onViewChange,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  workspaceName,
  error,
  loading,
  onLogin,
  onSignup,
  onClose,
}) {
  const [formParent] = useAutoAnimate({ duration: 180, easing: 'ease-out' })
  const gt = useGT();

  return (
    <div className="w-full max-w-sm rounded-2xl border border-base-200 bg-base-100 p-6 shadow-2xl">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <T context="login/signup for a sports prediction pool app">
            <h2 className="text-xl font-black">{view === 'login' ? 'Welcome back' : 'Join the pool'}</h2>
            <p className="mt-0.5 text-xs text-base-content/50">
              {view === 'login'
                ? `Sign in to submit picks${workspaceName ? ` for ${workspaceName}` : ''}.`
                : `Create an account${workspaceName ? ` for ${workspaceName}` : ''}.`}
            </p>
          </T>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-4 rounded-lg p-1 text-base-content/30 hover:text-base-content/60"
        >
          ✕
        </button>
      </div>

      <div className="mb-5 flex rounded-xl border border-base-200 bg-base-200 p-1">
        {[['login', 'Sign in'], ['signup', 'Create account']].map(([tabView, label]) => (
          <button
            key={tabView}
            type="button"
            onClick={() => onViewChange(tabView)}
            className={`cursor-pointer flex-1 rounded-lg py-2 text-sm font-bold transition-colors ${
              view === tabView ? 'bg-base-100 text-base-content shadow-sm' : 'text-base-content/50 hover:text-base-content'
            }`}
          >
            <T>{label}</T>
          </button>
        ))}
      </div>

      <form ref={formParent} onSubmit={view === 'login' ? onLogin : onSignup} className="space-y-3">
        {view === 'signup' && (
          <AuthField
            label={gt("Name")}
            type="text"
            value={name}
            onChange={setName}
            placeholder="Your name"
            required
            autoComplete="name"
          />
        )}
        <AuthField
          label={gt("Email")}
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
        <AuthField
          label={gt("Password")}
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          required
          minLength={8}
          autoComplete={view === 'login' ? 'current-password' : 'new-password'}
        />

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
        <T>

        {view === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <button
          type="button"
          className="font-bold text-primary hover:underline"
          onClick={() => onViewChange(view === 'login' ? 'signup' : 'login')}
        >
          {view === 'login' ? 'Create one' : 'Sign in'}
        </button>
        </T>
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
        onChange={(event) => onChange(event.target.value)}
        className="input input-bordered w-full rounded-xl"
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
      />
    </div>
  )
}
