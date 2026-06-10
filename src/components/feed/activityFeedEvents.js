function timeValue(input) {
  if (!input) return 0
  const value = new Date(input).getTime()
  return Number.isFinite(value) ? value : 0
}

function toPlayerName(playerId, playersById, leaderboardById) {
  return playersById.get(playerId) || leaderboardById.get(playerId) || 'Player'
}

function pickSummary(match, pick) {
  if (pick === 'home') return { kind: 'home-win', team: match.home }
  if (pick === 'away') return { kind: 'away-win', team: match.away }
  return { kind: 'draw' }
}

function resultSummary(match) {
  if (match.result === 'home') return { kind: 'home-win', team: match.home }
  if (match.result === 'away') return { kind: 'away-win', team: match.away }
  return { kind: 'draw' }
}

function sortByTimeDesc(list, getTime) {
  return [...list].sort((a, b) => getTime(b) - getTime(a))
}

export function createActivityFeedCursor({
  players,
  matches,
  predictions,
  leaderboard,
}) {
  const playersById = new Map(players.map((player) => [String(player.id), player.name]))
  const leaderboardById = new Map(leaderboard.map((row) => [String(row.player), row.name]))
  const matchesById = new Map(matches.map((match) => [String(match.id), match]))

  const predictionRows = sortByTimeDesc(predictions, (prediction) => timeValue(prediction.createdAt || prediction.updatedAt))
  const resultRows = sortByTimeDesc(
    matches.filter((match) => Boolean(match.result)),
    (match) => timeValue(match.updatedAt || match.createdAt),
  )
  const rankRows = sortByTimeDesc(
    leaderboard.filter((row) => {
      if (!row.previousRank || !row.rank) return false
      if (row.previousRank <= row.rank) return false
      return (row.previousRank - row.rank) >= 2
    }),
    (row) => timeValue(row.updatedAt || row.createdAt),
  )

  let predictionIndex = 0
  let resultIndex = 0
  let rankIndex = 0

  function nextPredictionCandidate() {
    while (predictionIndex < predictionRows.length) {
      const prediction = predictionRows[predictionIndex]
      const match = matchesById.get(String(prediction.match))
      const at = timeValue(prediction.createdAt || prediction.updatedAt)
      if (!match || !at) {
        predictionIndex += 1
        continue
      }
      return { type: 'prediction', at, prediction, match }
    }
    return null
  }

  function nextResultCandidate() {
    while (resultIndex < resultRows.length) {
      const match = resultRows[resultIndex]
      const at = timeValue(match.updatedAt || match.createdAt)
      if (!at) {
        resultIndex += 1
        continue
      }
      return { type: 'result', at, match }
    }
    return null
  }

  function nextRankCandidate() {
    while (rankIndex < rankRows.length) {
      const row = rankRows[rankIndex]
      const at = timeValue(row.updatedAt || row.createdAt)
      if (!at) {
        rankIndex += 1
        continue
      }
      return { type: 'rank-climb', at, row }
    }
    return null
  }

  function buildPredictionEvent(candidate) {
    const { prediction, match, at } = candidate
    const createdAt = prediction.createdAt || prediction.updatedAt
    return {
      id: `prediction-${prediction.id}`,
      type: 'prediction',
      at,
      createdAt,
      playerId: String(prediction.player),
      playerName: toPlayerName(String(prediction.player), playersById, leaderboardById),
      home: match.home,
      away: match.away,
      homeCrest: match.homeCrest || '',
      awayCrest: match.awayCrest || '',
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      pick: pickSummary(match, prediction.pick),
    }
  }

  function buildResultEvent(candidate) {
    const { match, at } = candidate
    const createdAt = match.updatedAt || match.createdAt
    return {
      id: `result-${match.id}-${match.result}-${at}`,
      type: 'result',
      at,
      createdAt,
      home: match.home,
      away: match.away,
      homeCrest: match.homeCrest || '',
      awayCrest: match.awayCrest || '',
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      summary: resultSummary(match),
    }
  }

  function buildRankEvent(candidate) {
    const { row, at } = candidate
    const createdAt = row.updatedAt || row.createdAt
    return {
      id: `leaderboard-${row.id}-${row.rank}-${at}`,
      type: 'rank-climb',
      at,
      createdAt,
      playerId: String(row.player),
      playerName: toPlayerName(String(row.player), playersById, leaderboardById),
      rank: row.rank,
      spots: row.previousRank - row.rank,
    }
  }

  function nextPage(pageSize = 20) {
    const events = []

    while (events.length < pageSize) {
      const predictionCandidate = nextPredictionCandidate()
      const resultCandidate = nextResultCandidate()
      const rankCandidate = nextRankCandidate()
      const candidates = [predictionCandidate, resultCandidate, rankCandidate].filter(Boolean)
      if (candidates.length === 0) break

      let winner = candidates[0]
      for (let index = 1; index < candidates.length; index += 1) {
        if (candidates[index].at > winner.at) winner = candidates[index]
      }

      if (winner.type === 'prediction') {
        events.push(buildPredictionEvent(winner))
        predictionIndex += 1
      } else if (winner.type === 'result') {
        events.push(buildResultEvent(winner))
        resultIndex += 1
      } else {
        events.push(buildRankEvent(winner))
        rankIndex += 1
      }
    }

    const hasMore = Boolean(nextPredictionCandidate() || nextResultCandidate() || nextRankCandidate())
    return { events, hasMore }
  }

  return {
    nextPage,
  }
}
