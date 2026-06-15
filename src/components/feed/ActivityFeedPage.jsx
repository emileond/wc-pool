import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { MessageCircleMore } from 'lucide-react'
import { T } from 'gt-react'
import Panel from '../shared/Panel'
import useActivityEvents from '../../hooks/react-query/useActivityEvents'
import ActivityFeedItem from './ActivityFeedItem'

const MIN_LOADING_DWELL_MS = 280

function ActivityFeedList({
  events,
  hasMore,
  isLoading,
  isLoadingMore,
  error,
  onLoadMore,
  onOpenProfile,
  leaderboardByPlayer,
}) {
  const [feedParent] = useAutoAnimate({ duration: 220, easing: 'ease-out' })
  const loadingMoreRef = useRef(false)
  const sentinelRef = useRef(null)
  const loadTimerRef = useRef(null)

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || !hasMore) return

    const loadStartedAt = Date.now()
    loadingMoreRef.current = true
    Promise.resolve(onLoadMore()).finally(() => {
      const remainingDwell = Math.max(MIN_LOADING_DWELL_MS - (Date.now() - loadStartedAt), 0)
      loadTimerRef.current = window.setTimeout(() => {
        loadingMoreRef.current = false
      }, remainingDwell)
    })
  }, [hasMore, onLoadMore])

  useEffect(() => () => {
    if (loadTimerRef.current) window.clearTimeout(loadTimerRef.current)
  }, [])

  useEffect(() => {
    if (!hasMore) return undefined
    const node = sentinelRef.current
    if (!node) return undefined

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries
      if (entry?.isIntersecting) loadMore()
    }, {
      rootMargin: '360px 0px',
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <span className="loading loading-dots loading-md text-base-content/40" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <MessageCircleMore className="mx-auto mb-2 text-primary/40" size={24} />
        <p className="text-sm text-base-content/50">
          <T>Could not load activity right now.</T>
        </p>
      </div>
    )
  }

  return (
    <>
      <ul ref={feedParent} className="space-y-2">
        {events.map((event) => (
          <ActivityFeedItem
            key={event.id}
            event={event}
            onOpenProfile={onOpenProfile}
            leaderboardByPlayer={leaderboardByPlayer}
          />
        ))}
      </ul>
      {events.length === 0 && (
        <div className="pt-6 text-center">
          <MessageCircleMore className="mx-auto mb-2 text-primary/40" size={24} />
          <p className="text-sm text-base-content/50">
            <T context="Sports pool app empty activity feed state">Predictions and leaderboard updates will appear here automatically.</T>
          </p>
        </div>
      )}
      {events.length > 0 && hasMore && (
        <div ref={sentinelRef} className="pt-2 text-center">
          {isLoadingMore
            ? <span className="loading loading-dots loading-sm text-base-content/40" />
            : <span className="inline-block h-4 w-12 opacity-0">.</span>}
        </div>
      )}
    </>
  )
}

export default function ActivityFeedPage({
  workspaceId,
  loadWorkspaceActivityEvents,
  leaderboard,
  onOpenProfile,
  canViewActivity,
}) {
  const activityQuery = useActivityEvents({
    workspaceId,
    enabled: canViewActivity,
    loadWorkspaceActivityEvents,
  })
  const leaderboardByPlayer = useMemo(
    () => new Map(leaderboard.map((row, index) => [String(row.player), {
      rank: Number(row.rank) || index + 1,
      points: Number(row.points) || 0,
      correct: Number(row.correct) || 0,
      predictions: Number(row.predictions) || 0,
      accuracy: Number(row.accuracy) || 0,
    }])),
    [leaderboard],
  )

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black sm:text-3xl"><T>Activity</T></h2>
        <p className="mt-0.5 text-sm text-base-content/60">
          <T context="Sports pool app activity feed description">Live timeline of picks, ranking moves, and final results.</T>
        </p>
      </div>

      <Panel>
        {!canViewActivity ? (
          <div className="py-8 text-center">
            <MessageCircleMore className="mx-auto mb-2 text-primary/40" size={24} />
            <p className="text-sm text-base-content/50">
              <T>Join this workspace to see player activity.</T>
            </p>
          </div>
        ) : (
          <ActivityFeedList
            events={activityQuery.events}
            hasMore={activityQuery.hasNextPage}
            isLoading={activityQuery.isLoading}
            isLoadingMore={activityQuery.isFetchingNextPage}
            error={activityQuery.error}
            onLoadMore={activityQuery.fetchNextPage}
            onOpenProfile={onOpenProfile}
            leaderboardByPlayer={leaderboardByPlayer}
          />
        )}
      </Panel>
    </div>
  )
}
