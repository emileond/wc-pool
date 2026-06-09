import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

function workspacePlayersQueryKey(workspaceId) {
  return ['workspace-players', workspaceId || 'none']
}

function matchesQueryKey() {
  return ['matches']
}

function workspacePredictionsQueryKey(workspaceId) {
  return ['workspace-predictions', workspaceId || 'none']
}

function workspaceLeaderboardQueryKey(workspaceId) {
  return ['workspace-leaderboard', workspaceId || 'none']
}

export default function useWorkspaceData({
  backend,
  workspaceId,
  fallbackData,
  loadWorkspacePlayers,
  loadWorkspaceMatches,
  loadWorkspacePredictions,
  loadWorkspaceLeaderboard,
  savePredictionRequest,
  createMatchRequest,
  updateMatchRequest,
  deleteMatchRequest,
}) {
  const queryClient = useQueryClient()
  const queryEnabled = backend === 'pocketbase' && Boolean(workspaceId)
  const playersKey = workspacePlayersQueryKey(workspaceId)
  const predictionsKey = workspacePredictionsQueryKey(workspaceId)
  const leaderboardKey = workspaceLeaderboardQueryKey(workspaceId)
  const matchesKey = matchesQueryKey()

  const playersQuery = useQuery({
    queryKey: playersKey,
    enabled: queryEnabled,
    queryFn: () => loadWorkspacePlayers(workspaceId),
    staleTime: 15000,
  })

  const matchesQuery = useQuery({
    queryKey: matchesKey,
    enabled: queryEnabled,
    queryFn: loadWorkspaceMatches,
    staleTime: 15000,
  })

  const predictionsQuery = useQuery({
    queryKey: predictionsKey,
    enabled: queryEnabled,
    queryFn: () => loadWorkspacePredictions(workspaceId),
    staleTime: 15000,
  })

  const leaderboardQuery = useQuery({
    queryKey: leaderboardKey,
    enabled: queryEnabled,
    queryFn: () => loadWorkspaceLeaderboard(workspaceId),
    staleTime: 15000,
  })

  const effectiveData = backend === 'pocketbase' && workspaceId
    ? {
        players: playersQuery.data || [],
        matches: matchesQuery.data || [],
        predictions: predictionsQuery.data || [],
        leaderboard: leaderboardQuery.data || [],
      }
    : fallbackData

  async function refreshWorkspaceData(targetWorkspaceId = workspaceId) {
    if (!targetWorkspaceId) {
      return { players: [], matches: [], predictions: [], leaderboard: [] }
    }

    const targetPlayersKey = workspacePlayersQueryKey(targetWorkspaceId)
    const targetPredictionsKey = workspacePredictionsQueryKey(targetWorkspaceId)
    const targetLeaderboardKey = workspaceLeaderboardQueryKey(targetWorkspaceId)

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: targetPlayersKey }),
      queryClient.invalidateQueries({ queryKey: matchesKey }),
      queryClient.invalidateQueries({ queryKey: targetPredictionsKey }),
      queryClient.invalidateQueries({ queryKey: targetLeaderboardKey }),
    ])

    const [players, matches, predictions, leaderboard] = await Promise.all([
      queryClient.fetchQuery({ queryKey: targetPlayersKey, queryFn: () => loadWorkspacePlayers(targetWorkspaceId) }),
      queryClient.fetchQuery({ queryKey: matchesKey, queryFn: loadWorkspaceMatches }),
      queryClient.fetchQuery({ queryKey: targetPredictionsKey, queryFn: () => loadWorkspacePredictions(targetWorkspaceId) }),
      queryClient.fetchQuery({ queryKey: targetLeaderboardKey, queryFn: () => loadWorkspaceLeaderboard(targetWorkspaceId) }),
    ])
    return { players, matches, predictions, leaderboard }
  }

  async function refreshLeaderboardAndPredictions(targetWorkspaceId = workspaceId) {
    if (!targetWorkspaceId) return
    const targetPredictionsKey = workspacePredictionsQueryKey(targetWorkspaceId)
    const targetLeaderboardKey = workspaceLeaderboardQueryKey(targetWorkspaceId)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: targetPredictionsKey }),
      queryClient.invalidateQueries({ queryKey: targetLeaderboardKey }),
      queryClient.fetchQuery({ queryKey: targetPredictionsKey, queryFn: () => loadWorkspacePredictions(targetWorkspaceId) }),
      queryClient.fetchQuery({ queryKey: targetLeaderboardKey, queryFn: () => loadWorkspaceLeaderboard(targetWorkspaceId) }),
    ])
  }

  async function refreshMatchesPredictionsAndLeaderboard(targetWorkspaceId = workspaceId) {
    if (!targetWorkspaceId) return
    const targetPredictionsKey = workspacePredictionsQueryKey(targetWorkspaceId)
    const targetLeaderboardKey = workspaceLeaderboardQueryKey(targetWorkspaceId)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: matchesKey }),
      queryClient.invalidateQueries({ queryKey: targetPredictionsKey }),
      queryClient.invalidateQueries({ queryKey: targetLeaderboardKey }),
      queryClient.fetchQuery({ queryKey: matchesKey, queryFn: loadWorkspaceMatches }),
      queryClient.fetchQuery({ queryKey: targetPredictionsKey, queryFn: () => loadWorkspacePredictions(targetWorkspaceId) }),
      queryClient.fetchQuery({ queryKey: targetLeaderboardKey, queryFn: () => loadWorkspaceLeaderboard(targetWorkspaceId) }),
    ])
  }

  const savePredictionMutation = useMutation({
    mutationFn: savePredictionRequest,
    onMutate: async ({ workspaceId: targetWorkspaceId, playerId, matchId, pick }) => {
      const targetPredictionsKey = workspacePredictionsQueryKey(targetWorkspaceId)
      await queryClient.cancelQueries({ queryKey: targetPredictionsKey })
      const previous = queryClient.getQueryData(targetPredictionsKey)

      queryClient.setQueryData(targetPredictionsKey, (current = []) => {
        const list = Array.isArray(current) ? current : []
        const existing = list.find((entry) => entry.player === playerId && entry.match === matchId)
        if (existing) {
          return list.map((entry) => (entry.id === existing.id ? { ...entry, pick } : entry))
        }
        return [...list, { id: `optimistic-${playerId}-${matchId}`, player: playerId, match: matchId, pick }]
      })

      return { targetPredictionsKey, previous }
    },
    onError: (_err, _variables, context) => {
      if (context?.targetPredictionsKey) {
        queryClient.setQueryData(context.targetPredictionsKey, context.previous)
      }
    },
    onSettled: async (_data, _error, variables) => {
      await refreshLeaderboardAndPredictions(variables.workspaceId)
    },
  })

  const createMatchMutation = useMutation({
    mutationFn: createMatchRequest,
    onSettled: async () => {
      await refreshMatchesPredictionsAndLeaderboard()
    },
  })

  const updateMatchMutation = useMutation({
    mutationFn: updateMatchRequest,
    onSettled: async () => {
      await refreshMatchesPredictionsAndLeaderboard()
    },
  })

  const deleteMatchMutation = useMutation({
    mutationFn: deleteMatchRequest,
    onSettled: async () => {
      await refreshMatchesPredictionsAndLeaderboard()
    },
  })

  const pocketbaseQueryLoading = queryEnabled
    && (playersQuery.isLoading || matchesQuery.isLoading || predictionsQuery.isLoading || leaderboardQuery.isLoading)
  const pocketbaseQueryError = queryEnabled
    ? (playersQuery.error || matchesQuery.error || predictionsQuery.error || leaderboardQuery.error)
    : null

  return {
    effectiveData,
    pocketbaseQueryLoading,
    pocketbaseQueryError,
    refreshWorkspaceData,
    savePrediction: (variables) => savePredictionMutation.mutateAsync(variables),
    createMatch: (variables) => createMatchMutation.mutateAsync(variables),
    updateMatch: (variables) => updateMatchMutation.mutateAsync(variables),
    deleteMatch: (variables) => deleteMatchMutation.mutateAsync(variables),
  }
}
