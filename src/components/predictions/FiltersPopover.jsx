import { useEffect, useRef } from 'react'
import { T } from 'gt-react'
import { Filter } from 'lucide-react'

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
  const popoverRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    function closeOnOutsidePointer(event) {
      if (eventHitsNode(event, popoverRef.current)) return
      onOpenChange(false)
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open, onOpenChange])

  return (
    <div ref={popoverRef} className="dropdown dropdown-end shrink-0">
      <button
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
        <div className="dropdown-content z-20 mt-2 w-64 rounded-box border border-base-300 bg-base-100 p-3 shadow-xl">
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
