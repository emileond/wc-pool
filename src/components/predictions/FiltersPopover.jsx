import { flip, offset, shift, useFloating } from '@floating-ui/react'
import { T } from 'gt-react'
import { Filter } from 'lucide-react'
import { useEffect } from 'react'

function eventHitsNode(event, node) {
  if (!node) return false
  if (node.contains(event.target)) return true
  if (typeof event.composedPath === 'function') {
    return event.composedPath().includes(node)
  }
  return false
}

export default function FiltersPopover({
  open,
  onOpenChange,
  showPastMatches,
  onShowPastMatchesChange,
  showPredictedMatches,
  onShowPredictedMatchesChange,
  groupMode,
  onGroupModeChange,
}) {
  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-end',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  })

  useEffect(() => {
    if (!open) return undefined

    function closeOnOutsidePointer(event) {
      if (
        eventHitsNode(event, refs.reference.current) ||
        eventHitsNode(event, refs.floating.current)
      ) return
      onOpenChange(false)
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') onOpenChange(false)
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open, onOpenChange, refs])

  return (
    <div className="shrink-0">
      <button
        ref={refs.setReference}
        type="button"
        className="btn btn-soft btn-sm rounded-xl"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <T>Filters</T>
        <Filter size={16} />
      </button>
      {open && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className="z-30 w-64 max-w-[calc(100vw-1rem)] rounded-box border border-base-300 bg-base-100 p-3 shadow-xl"
        >
          <div className="space-y-2">
            <label className="label cursor-pointer justify-start gap-2 rounded-lg px-2 py-1.5">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={showPastMatches}
                onChange={(event) => onShowPastMatchesChange(event.target.checked)}
              />
              <span className="text-sm font-semibold"><T>Show past matches</T></span>
            </label>
            <label className="label cursor-pointer justify-start gap-2 rounded-lg px-2 py-1.5">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={showPredictedMatches}
                onChange={(event) => onShowPredictedMatchesChange(event.target.checked)}
              />
              <span className="text-sm font-semibold"><T>Show predicted matches</T></span>
            </label>
            <div className="px-2 py-1.5">
              <div className="mb-1 text-xs font-bold uppercase tracking-wide text-base-content/45">
                <T>Grouping</T>
              </div>
              <select
                className="select select-bordered select-sm w-full text-sm font-semibold"
                value={groupMode}
                onChange={(event) => onGroupModeChange(event.target.value)}
              >
                <option value="date">By date</option>
                <option value="round">By round</option>
                <option value="group">By group</option>
                <option value="none">No grouping</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
