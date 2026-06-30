export default function usePoolWrapped({ players, matches, predictions, leaderboard }) {
  if (!players?.length || !matches?.length) return null

  const completedMatches = matches.filter((m) => m.result)
  const totalMatches = completedMatches.length
  const totalPredictions = predictions.length
  const overallLb = leaderboard
    .filter((l) => l.scopeType === 'overall')
    .sort((a, b) => a.rank - b.rank)
  const winner = overallLb[0]
  const lastPlace = overallLb[overallLb.length - 1]
  const top3 = overallLb.slice(0, 3)

  const matchesById = new Map(matches.map((m) => [m.id, m]))
  const matchOrder = completedMatches
    .filter((m) => m.kickoff)
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))

  const predictionsByPlayer = new Map()
  for (const p of predictions) {
    const list = predictionsByPlayer.get(p.player) || []
    list.push(p)
    predictionsByPlayer.set(p.player, list)
  }

  function playerName(id) {
    const found = players.find((pl) => pl.id === id)
    return found?.name || 'Player'
  }

  const playerStats = players.map((pl) => {
    const pp = predictionsByPlayer.get(pl.id) || []
    let correct = 0
    let wrong = 0
    const correctMatchIds = new Set()
    for (const p of pp) {
      const m = matchesById.get(p.match)
      if (!m?.result) continue
      if (m.result === p.pick) {
        correct++
        correctMatchIds.add(m.id)
      } else {
        wrong++
      }
    }
    const total = correct + wrong
    const accuracy = total ? Math.round((correct / total) * 100) : 0
    const points = correct * 3
    return { playerId: pl.id, name: playerName(pl.id), correct, wrong, total, accuracy, points }
  })

  const playerStatsById = new Map(playerStats.map((s) => [s.playerId, s]))

  const topAccuracy = [...playerStats].filter((s) => s.total >= 3).sort((a, b) => b.accuracy - a.accuracy)[0] || null
  const darkHorse = [...playerStats]
    .filter((s) => {
      const rank = overallLb.find((l) => l.player === s.playerId)?.rank
      return rank && rank > 1 && rank < overallLb.length && s.total >= 5
    })
    .sort((a, b) => b.accuracy - a.accuracy)[0] || null

  const stageMatches = new Map()
  for (const m of completedMatches) {
    const stage = m.stage || 'Group Stage'
    if (!stageMatches.has(stage)) stageMatches.set(stage, [])
    stageMatches.get(stage).push(m)
  }

  let bestGroupPlayer = null
  let bestGroupScore = -1
  let bestKnockoutPlayer = null
  let bestKnockoutScore = -1

  for (const pl of players) {
    const pp = predictionsByPlayer.get(pl.id) || []
    let groupCorrect = 0
    let groupTotal = 0
    let knockoutCorrect = 0
    let knockoutTotal = 0
    for (const p of pp) {
      const m = matchesById.get(p.match)
      if (!m?.result) continue
      if (m.stage === 'Group Stage') {
        groupTotal++
        if (m.result === p.pick) groupCorrect++
      } else {
        knockoutTotal++
        if (m.result === p.pick) knockoutCorrect++
      }
    }
    const groupAcc = groupTotal ? groupCorrect / groupTotal : 0
    const knockoutAcc = knockoutTotal ? knockoutCorrect / knockoutTotal : 0
    if (groupTotal >= 3 && groupAcc > bestGroupScore) {
      bestGroupScore = groupAcc
      bestGroupPlayer = { playerId: pl.id, name: playerName(pl.id), correct: groupCorrect, total: groupTotal }
    }
    if (knockoutTotal >= 2 && knockoutAcc > bestKnockoutScore) {
      bestKnockoutScore = knockoutAcc
      bestKnockoutPlayer = { playerId: pl.id, name: playerName(pl.id), correct: knockoutCorrect, total: knockoutTotal }
    }
  }

  let bestStreak = { playerId: '', name: '', length: 0, type: 'win' }
  let worstStreak = { playerId: '', name: '', length: 0, type: 'lose' }

  for (const pl of players) {
    const pp = predictionsByPlayer.get(pl.id) || []
    const ordered = matchOrder
      .map((m) => {
        const pred = pp.find((p) => p.match === m.id)
        if (!pred || !m.result) return null
        return { matchId: m.id, correct: m.result === pred.pick }
      })
      .filter(Boolean)

    let currentWin = 0
    let currentLose = 0
    for (const o of ordered) {
      if (o.correct) {
        currentWin++
        currentLose = 0
        if (currentWin > bestStreak.length) bestStreak = { playerId: pl.id, name: playerName(pl.id), length: currentWin, type: 'win' }
      } else {
        currentLose++
        currentWin = 0
        if (currentLose > worstStreak.length) worstStreak = { playerId: pl.id, name: playerName(pl.id), length: currentLose, type: 'lose' }
      }
    }
  }

  const matchPredictionCounts = new Map()
  for (const p of predictions) {
    const count = matchPredictionCounts.get(p.match) || { home: 0, draw: 0, away: 0, total: 0 }
    count[p.pick]++
    count.total++
    matchPredictionCounts.set(p.match, count)
  }

  let mostDividedMatch = null
  let mostDividedDiff = 0
  let boldestMatch = null
  let boldestWrongPct = 0

  for (const m of completedMatches) {
    const counts = matchPredictionCounts.get(m.id)
    if (!counts || counts.total < 2) continue
    const picks = [counts.home, counts.draw, counts.away]
    const sorted = [...picks].sort((a, b) => b - a)
    const maxPicks = sorted[0]
    const minPicks = sorted[sorted.length - 1]
    const diff = maxPicks - minPicks
    if (maxPicks > 0) {
      const correctCount = counts[m.result] || 0
      const wrongPct = Math.round(((counts.total - correctCount) / counts.total) * 100)
      if (wrongPct > boldestWrongPct) {
        boldestWrongPct = wrongPct
        boldestMatch = { match: m, wrongPct, correctCount, totalVotes: counts.total }
      }
    }
    if (diff < mostDividedDiff || mostDividedDiff === 0) {
      mostDividedDiff = diff
      mostDividedMatch = { match: m, home: counts.home, draw: counts.draw, away: counts.away }
    }
  }

  const isOver = completedMatches.length === matches.length && matches.length > 0

  return {
    isOver,
    poolName: '',
    totalPlayers: players.length,
    totalMatches,
    totalPredictions,
    overallLb,
    winner,
    lastPlace,
    top3,
    topAccuracy,
    darkHorse,
    bestGroupPlayer,
    bestKnockoutPlayer,
    bestStreak,
    worstStreak,
    mostDividedMatch,
    boldestMatch,
    playerStats,
    playerStatsById,
    matchPredictionCounts,
  }
}
