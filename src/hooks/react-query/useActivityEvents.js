import { useInfiniteQuery } from '@tanstack/react-query'

export const ACTIVITY_PAGE_SIZE = 20

export function workspaceActivityEventsQueryKey(workspaceId) {
  return ['workspace-activity-events', workspaceId || 'none']
}

export default function useActivityEvents({
  workspaceId,
  enabled = true,
  loadWorkspaceActivityEvents,
  pageSize = ACTIVITY_PAGE_SIZE,
}) {
  const queryEnabled = enabled && Boolean(workspaceId) && Boolean(loadWorkspaceActivityEvents)

  const query = useInfiniteQuery({
    queryKey: workspaceActivityEventsQueryKey(workspaceId),
    enabled: queryEnabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => loadWorkspaceActivityEvents(workspaceId, {
      page: pageParam,
      perPage: pageSize,
    }),
    getNextPageParam: (lastPage) => (lastPage?.hasMore ? lastPage.page + 1 : undefined),
    staleTime: 15000,
  })

  const events = query.data?.pages.flatMap((page) => page.events) || []

  return {
    ...query,
    events,
  }
}
