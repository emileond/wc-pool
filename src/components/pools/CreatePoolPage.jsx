import { ArrowRight, CheckCircle2, Copy, Link as LinkIcon, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import Panel from '../shared/Panel'
import PricingPlanCards from './PricingPlanCards'

function StepItem({ done, active, label }) {
  const cls = done || active ? 'step-primary' : ''
  return <li className={`step text-xs sm:text-sm ${cls}`}>{label}</li>
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
    const origin = window.location.origin
    return `${origin}/${encodeURIComponent(createdWorkspace.name)}`
  }, [createdWorkspace?.name])

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
      <Panel>
        <div className="py-6 text-center">
          <Sparkles className="mx-auto mb-3 text-primary/60" size={30} />
          <h2 className="text-2xl font-black">Create a Pool</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-base-content/60">
            Sign in or create your account to start the 3-step pool setup.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button type="button" className="btn btn-primary" onClick={onLogin}>Log in</button>
            <button type="button" className="btn btn-outline" onClick={onSignup}>Create account</button>
          </div>
        </div>
      </Panel>
    )
  }

  return (
    <div className="space-y-5">
      <Panel>
        <div className="space-y-4">
          <h2 className="text-2xl font-black sm:text-3xl">Create a New Pool</h2>
          <ul className="steps steps-vertical w-full sm:steps-horizontal">
            <StepItem done={step > 1} active={step === 1} label="Pool Name" />
            <StepItem done={step > 2} active={step === 2} label="Plan" />
            <StepItem done={step >= 3} active={step === 3} label="Ready to Share" />
          </ul>
        </div>
      </Panel>

      {step === 1 && (
        <Panel>
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-black">Name your pool</h3>
              <p className="mt-1 text-sm text-base-content/60">Use a name your group will recognize instantly.</p>
            </div>
            <label className="form-control">
              <div className="label pb-1">
                <span className="label-text text-xs font-semibold uppercase tracking-wide text-base-content/50">Pool name</span>
              </div>
              <input
                autoFocus
                type="text"
                className="input input-bordered w-full"
                placeholder="e.g. Weekend Rivalry Pool"
                value={poolName}
                onChange={(event) => setPoolName(event.target.value)}
              />
            </label>
            <div className="flex justify-end">
              <button
                type="button"
                className="btn btn-primary gap-2"
                onClick={() => setStep(2)}
                disabled={!poolName.trim()}
              >
                Continue
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </Panel>
      )}

      {step === 2 && (
        <Panel>
          <div className="space-y-5">
            <div>
              <h3 className="text-xl font-black">Select your plan</h3>
              <p className="mt-1 text-sm text-base-content/60">Choose a plan now. You can continue with Free anytime.</p>
            </div>
            <PricingPlanCards
              selectable
              selectedPlan={selectedPlan}
              onSelect={setSelectedPlan}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary gap-2"
                onClick={completeCreate}
                disabled={creating}
              >
                {creating ? <span className="loading loading-spinner loading-sm" /> : null}
                Create Pool
              </button>
            </div>
          </div>
        </Panel>
      )}

      {step === 3 && createdWorkspace && (
        <Panel>
          <div className="space-y-5">
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-2 text-success" size={34} />
              <h3 className="text-2xl font-black">Pool Ready</h3>
              <p className="mt-1 text-sm text-base-content/60">
                <strong>{createdWorkspace.name}</strong> was created on the <strong>{selectedPlan === 'pro' ? 'Pro' : 'Free'}</strong> plan.
              </p>
            </div>

            <div className="rounded-xl border border-base-300 bg-base-200 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-base-content/50">
                <LinkIcon size={13} />
                Share URL
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="flex-1 overflow-x-auto rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-xs">
                  {shareUrl}
                </code>
                <button type="button" className="btn btn-outline btn-sm gap-1.5" onClick={copyShareUrl}>
                  <Copy size={14} />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button type="button" className="btn btn-primary" onClick={() => onOpenPool(createdWorkspace.name)}>
                Go to My Pool
              </button>
              <button type="button" className="btn btn-outline" onClick={onOpenPools}>
                Go to My Pools
              </button>
            </div>
          </div>
        </Panel>
      )}
    </div>
  )
}
