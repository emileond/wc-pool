import { flip, offset, shift, useFloating } from '@floating-ui/react'
import { T } from 'gt-react'
import { CheckCircle2, CircleHelp, Lock } from 'lucide-react'
import { useEffect } from 'react'

function eventHitsNode(event, node) {
  if (!node) return false
  if (node.contains(event.target)) return true
  if (typeof event.composedPath === 'function') {
    return event.composedPath().includes(node)
  }
  return false
}

export default function ScoringPopover({ open, onOpenChange }) {
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
        <T>Scoring</T>
        <CircleHelp size={16} />
      </button>
      {open && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className="z-30 w-72 max-w-[calc(100vw-1rem)] rounded-box border border-base-300 bg-base-100 p-4 shadow-xl"
        >
          <h3 className="font-black"><T>Scoring system</T></h3>
          <ul className="mt-3 space-y-2 text-sm text-base-content/70">
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={16} />
              <span><T>Correctly picking the match result earns 3 points.</T></span>
            </li>
            <li className="flex gap-2">
              <Lock className="mt-0.5 shrink-0 text-warning" size={16} />
              <span><T>Picks lock at kickoff and cannot be changed afterward.</T></span>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
