import { ArrowLeft, ArrowRight, CheckCircle2, Copy, Link as LinkIcon, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import PricingPlanCards from './PricingPlanCards'

function StepDot({ number, done, active, label }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black transition-all ${
          done
            ? 'bg-primary text-primary-content shadow-md shadow-primary/30'
            : active
              ? 'bg-primary text-primary-content shadow-md shadow-primary/30 ring-4 ring-primary/20'
              : 'bg-base-300 text-base-content/40'
        }`}
      >
        {done ? <CheckCircle2 size={16} strokeWidth={2.5} /> : number}
      </div>
      <span
        className={`text-xs font-semibold ${active ? 'text-primary' : done ? 'text-base-content/70' : 'text-base-content/35'}`}
      >
        {label}
      </span>
    </div>
  )
}

function StepConnector({ done }) {
  return (
    <div className="mt-4 h-0.5 flex-1 rounded-full transition-colors">
      <div className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-primary' : 'bg-base-300'}`} />
    </div>
  )
}

export default function CreatePoolPage({
  authUser,
  creating,
  onLogin,
  onSignup,
  onCreatePool,
  onOpenPool,
  onOpenPools,
}) {
  const [step, setStep] = useState(1)
  const [poolName, setPoolName] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('free')
  const [createdWorkspace, setCreatedWorkspace] = useState(null)
  const [copied, setCopied] = useState(false)

  const shareUrl = useMemo(() => {
    if (!createdWorkspace?.name) return ''
    return `${window.location.origin}/${encodeURIComponent(createdWorkspace.name)}`
  }, [createdWorkspace?.name])

  const previewSlug = poolName.trim()
    ? `${window.location.origin}/${encodeURIComponent(poolName.trim())}`
    : null

  async function completeCreate() {
    const workspace = await onCreatePool(poolName, selectedPlan)
    setCreatedWorkspace(workspace)
    setStep(3)
  }

  async function copyShareUrl() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  if (!authUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 shadow-inner">
            <Sparkles className="text-primary" size={36} />
          </div>
          <h2 className="text-3xl font-black tracking-tight">Create a Pool</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-base-content/60">
            Sign in or create your account to start the guided 3-step setup.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" className="btn btn-primary btn-md" onClick={onLogin}>Log in</button>
            <button type="button" className="btn btn-outline btn-md" onClick={onSignup}>Create account</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div>
        <h2 className="mb-5 text-3xl font-black tracking-tight sm:text-4xl">Create a New Pool</h2>
        <div className="flex items-start gap-2">
          <StepDot number={1} done={step > 1} active={step === 1} label="Name" />
          <StepConnector done={step > 1} />
          <StepDot number={2} done={step > 2} active={step === 2} label="Plan" />
          <StepConnector done={step >= 3} />
          <StepDot number={3} done={step >= 3} active={step === 3} label="Share" />
        </div>
      </div>

      {/* Step 1 — Pool Name */}
      {step === 1 && (
        <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-xl font-black">Name your pool</h3>
            <p className="mt-1 text-sm text-base-content/55">Pick something your group will recognize instantly.</p>
          </div>

          <label className="form-control">
            <div className="label pb-1.5">
              <span className="label-text text-xs font-semibold uppercase tracking-wide text-base-content/45">Pool name</span>
            </div>
            <input
              autoFocus
              type="text"
              className="input input-bordered input-lg w-full text-base font-semibold"
              placeholder="e.g. Weekend Rivalry Pool"
              value={poolName}
              onChange={(event) => setPoolName(event.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && poolName.trim() && setStep(2)}
            />
          </label>

          {previewSlug && (
            <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-base-200 bg-base-200/60 px-3 py-2">
              <LinkIcon size={12} className="shrink-0 text-base-content/40" />
              <span className="truncate text-xs text-base-content/50">{previewSlug}</span>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className="btn btn-primary gap-2 px-6"
              onClick={() => setStep(2)}
              disabled={!poolName.trim()}
            >
              Continue
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Plan */}
      {step === 2 && (
        <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-xl font-black">Choose a plan</h3>
            <p className="mt-1 text-sm text-base-content/55">
              For <strong className="text-base-content">{poolName}</strong>. You can always start free and upgrade later.
            </p>
          </div>

          <PricingPlanCards
            selectable
            selectedPlan={selectedPlan}
            onSelect={setSelectedPlan}
          />

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button type="button" className="btn btn-ghost gap-1.5" onClick={() => setStep(1)}>
              <ArrowLeft size={15} />
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary gap-2 px-6"
              onClick={completeCreate}
              disabled={creating}
            >
              {creating ? <span className="loading loading-spinner loading-sm" /> : <Sparkles size={15} />}
              {creating ? 'Creating…' : 'Create Pool'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Success */}
      {step === 3 && createdWorkspace && (
        <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
          <div className="py-2 text-center">
            {/* Success ring */}
            <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-success/20" style={{ animationDuration: '2s', animationIterationCount: 3 }} />
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-success/20 to-emerald-400/20 shadow-lg shadow-success/20">
                <CheckCircle2 className="text-success" size={40} strokeWidth={1.5} />
              </div>
            </div>

            <h3 className="text-2xl font-black">Your pool is live! 🎉</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-base-content/60">
              <span className="font-bold text-base-content">{createdWorkspace.name}</span> is ready on the{' '}
              <span className="font-bold text-primary">{selectedPlan === 'pro' ? 'Pro' : 'Free'}</span> plan.
              Share the link below to invite your crew.
            </p>
          </div>

          {/* Share URL */}
          <div className="mt-6 rounded-2xl border border-base-200 bg-base-200/50 p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <LinkIcon size={12} className="text-base-content/40" />
              <span className="text-xs font-semibold uppercase tracking-wide text-base-content/40">Share Link</span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="flex-1 overflow-x-auto rounded-xl border border-base-300 bg-base-100 px-3 py-2.5 text-xs font-medium">
                {shareUrl}
              </code>
              <button
                type="button"
                className={`btn btn-sm gap-1.5 transition-all ${copied ? 'btn-success' : 'btn-outline'}`}
                onClick={copyShareUrl}
              >
                <Copy size={13} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              className="btn btn-primary gap-2"
              onClick={() => onOpenPool(createdWorkspace.name)}
            >
              Go to My Pool
              <ArrowRight size={15} />
            </button>
            <button type="button" className="btn btn-ghost" onClick={onOpenPools}>
              View all pools
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
