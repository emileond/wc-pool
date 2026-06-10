import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { MessageCircleMore } from 'lucide-react'
import { T } from 'gt-react'
import Panel from '../shared/Panel'
import { createActivityFeedCursor } from './activityFeedEvents'
import ActivityFeedItem from './ActivityFeedItem'

const PAGE_SIZE = 20
const MIN_LOADING_DWELL_MS = 280

function maxTime(list, primaryField, fallbackField = '') {
  let max = 0
  list.forEach((entry) => {
    const raw = entry?.[primaryField] || (fallbackField ? entry?.[fallbackField] : '')
    const value = raw ? new Date(raw).getTime() : 0
    if (Number.isFinite(value) && value > max) max = value
  })
  return max
}

function ActivityFeedList({
  cursor,
  initialEvents,
  initialHasMore,
  onOpenProfile,
  leaderboardByPlayer,
}) {
  const [feedParent] = useAutoAnimate({ duration: 220, easing: 'ease-out' })
  const [events, setEvents] = useState(initialEvents)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loadingMoreRef = useRef(false)
  const sentinelRef = useRef(null)
  const loadTimerRef = useRef(null)

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || !hasMore) return

    const loadStartedAt = Date.now()
    loadingMoreRef.current = true
    setIsLoadingMore(true)
    const page = cursor.nextPage(PAGE_SIZE)
    const remainingDwell = Math.max(MIN_LOADING_DWELL_MS - (Date.now() - loadStartedAt), 0)

    loadTimerRef.current = window.setTimeout(() => {
      setEvents((current) => [...current, ...page.events])
      setHasMore(page.hasMore)
      setIsLoadingMore(false)
      loadingMoreRef.current = false
    }, remainingDwell)
  }, [cursor, hasMore])

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
  players,
  matches,
  predictions,
  leaderboard,
  onOpenProfile,
}) {
  const cursorState = useMemo(() => {
    const cursor = createActivityFeedCursor({ players, matches, predictions, leaderboard })
    const firstPage = cursor.nextPage(PAGE_SIZE)
    const version = [
      players.length,
      matches.length,
      predictions.length,
      leaderboard.length,
      maxTime(matches, 'updatedAt', 'createdAt'),
      maxTime(predictions, 'updatedAt', 'createdAt'),
      maxTime(leaderboard, 'updatedAt', 'createdAt'),
    ].join(':')

    return {
      key: version,
      cursor,
      initialEvents: firstPage.events,
      initialHasMore: firstPage.hasMore,
    }
  }, [leaderboard, matches, players, predictions])

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
        <ActivityFeedList
          key={cursorState.key}
          cursor={cursorState.cursor}
          initialEvents={cursorState.initialEvents}
          initialHasMore={cursorState.initialHasMore}
          onOpenProfile={onOpenProfile}
          leaderboardByPlayer={leaderboardByPlayer}
        />
      </Panel>
    </div>
  )
}
