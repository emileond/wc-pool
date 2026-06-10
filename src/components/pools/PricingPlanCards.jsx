import { ArrowRight, Check } from 'lucide-react'

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

function planCardClass(baseClass, selected, selectable) {
  if (!selectable) return baseClass
  return selected
    ? `${baseClass} ring-2 ring-primary/40`
    : `${baseClass} cursor-pointer hover:border-primary/35`
}

export default function PricingPlanCards({
  selectedPlan,
  selectable = false,
  onSelect,
  freeAction,
  proAction,
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
      <article
        className={planCardClass(
          'flex flex-col rounded-2xl border border-base-300 bg-base-200 p-8 transition-all',
          selectedPlan === 'free',
          selectable,
        )}
        onClick={selectable ? () => onSelect?.('free') : undefined}
      >
        <div>
          <h3 className="text-xl font-black text-base-content">Free</h3>
          <p className="mt-1 text-sm text-base-content/60">Perfect for small groups, zero commitment.</p>
        </div>
        <div className="mt-6 flex items-end gap-1">
          <span className="text-5xl font-black text-base-content">$0</span>
          <span className="mb-1.5 text-sm text-base-content/50">forever</span>
        </div>
        <FeatureList items={freeFeatures} />
        {freeAction ? (
          <div className="mt-8">{freeAction}</div>
        ) : selectable ? (
          <button
            type="button"
            className={`btn mt-8 w-full font-bold ${selectedPlan === 'free' ? 'btn-primary' : 'btn-outline'}`}
            onClick={(event) => {
              event.stopPropagation()
              onSelect?.('free')
            }}
          >
            {selectedPlan === 'free' ? 'Selected' : 'Choose Free'}
          </button>
        ) : null}
      </article>

      <article
        className={planCardClass(
          'relative flex flex-col rounded-2xl border-2 border-primary bg-base-100 p-8 shadow-xl shadow-primary/10 transition-all',
          selectedPlan === 'pro',
          selectable,
        )}
        onClick={selectable ? () => onSelect?.('pro') : undefined}
      >
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
        {proAction ? (
          <div className="mt-8">{proAction}</div>
        ) : selectable ? (
          <button
            type="button"
            className={`btn mt-8 w-full gap-2 font-bold ${selectedPlan === 'pro' ? 'btn-primary' : 'btn-outline'}`}
            onClick={(event) => {
              event.stopPropagation()
              onSelect?.('pro')
            }}
          >
            {selectedPlan === 'pro' ? 'Selected' : <>Choose Pro <ArrowRight size={16} /></>}
          </button>
        ) : null}
      </article>
    </div>
  )
}
