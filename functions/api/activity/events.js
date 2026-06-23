function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  })
}

function errorResponse(message, status = 400, details = undefined) {
  return jsonResponse(details ? { error: message, details } : { error: message }, status)
}

function activityError(message, status = 400) {
  const error = new Error(message)
  error.status = status
  return error
}

function pocketbaseError(payload, fallbackMessage, fallbackStatus = 500) {
  const error = new Error(payload?.message || fallbackMessage)
  error.status = payload?.status || fallbackStatus
  error.details = payload?.data || payload?.response || payload || null
  return error
}

async function parseJson(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

async function pocketbaseRequest(baseUrl, path, options = {}) {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`
  const response = await fetch(url, options)
  let payload
  try {
    payload = await response.json()
  } catch {
    payload = null
  }
  return { response, payload }
}

async function resolveAuthUser(pbUrl, userToken) {
  if (!userToken) return null

  const { response, payload } = await pocketbaseRequest(
    pbUrl,
    '/api/collections/users/auth-refresh',
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${userToken}`,
        'content-type': 'application/json',
      },
      body: '{}',
    },
  )

  if (!response.ok || !payload?.record?.id) {
    return null
  }

  return payload.record
}

async function authenticateService(pbUrl, env) {
  const primaryIdentity = env.POCKETBASE_ADMIN_EMAIL
  const primaryPassword = env.POCKETBASE_ADMIN_PASSWORD
  const primaryCollection = env.POCKETBASE_AUTH_COLLECTION || 'users'
  const fallbackIdentity = env.POCKETBASE_SUPERUSER_EMAIL
  const fallbackPassword = env.POCKETBASE_SUPERUSER_PASSWORD

  if (!primaryIdentity || !primaryPassword) {
    throw new Error('Missing PocketBase service credentials.')
  }

  const attempts = [
    { identity: primaryIdentity, password: primaryPassword, collection: primaryCollection },
  ]
  if (fallbackIdentity && fallbackPassword) {
    attempts.push({ identity: fallbackIdentity, password: fallbackPassword, collection: '_superusers' })
  }

  for (const attempt of attempts) {
    const { response, payload } = await pocketbaseRequest(
      pbUrl,
      `/api/collections/${encodeURIComponent(attempt.collection)}/auth-with-password`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identity: attempt.identity, password: attempt.password }),
      },
    )
    if (response.ok && payload?.token) {
      return payload.token
    }
  }

  throw new Error('Failed to authenticate service account.')
}

function escapePbFilterValue(value) {
  return String(value || '').replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}

function relationId(value) {
  return typeof value === 'string' ? value : value?.id
}

function cleanName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ') || 'Player'
}

function optionalScore(value) {
  if (value === null || value === undefined || value === '') return null
  const score = Number(value)
  return Number.isFinite(score) ? score : null
}

function occurredAt(value) {
  const date = value ? new Date(value) : new Date()
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString()
}

function pickSummary(match, pick) {
  if (pick === 'home') return { kind: 'home-win', team: match.home || 'Home' }
  if (pick === 'away') return { kind: 'away-win', team: match.away || 'Away' }
  return { kind: 'draw' }
}

function resultSummary(match) {
  if (match.result === 'home') return { kind: 'home-win', team: match.home || 'Home' }
  if (match.result === 'away') return { kind: 'away-win', team: match.away || 'Away' }
  return { kind: 'draw' }
}

async function getRecord(pbUrl, collection, id, headers) {
  const { response, payload } = await pocketbaseRequest(
    pbUrl,
    `/api/collections/${encodeURIComponent(collection)}/records/${encodeURIComponent(id)}`,
    { headers },
  )
  if (!response.ok || !payload?.id) {
    throw new Error(`${collection} record not found.`)
  }
  return payload
}

async function getFirstRecord(pbUrl, collection, filter, headers) {
  const params = new URLSearchParams({
    page: '1',
    perPage: '1',
    filter,
  })
  const { response, payload } = await pocketbaseRequest(
    pbUrl,
    `/api/collections/${encodeURIComponent(collection)}/records?${params.toString()}`,
    { headers },
  )
  if (!response.ok) {
    throw new Error(`Could not query ${collection}.`)
  }
  return payload?.items?.[0] || null
}

async function getAllRecords(pbUrl, collection, options, headers) {
  const params = new URLSearchParams({
    page: '1',
    perPage: String(options?.perPage || 500),
  })
  if (options?.filter) params.set('filter', options.filter)
  if (options?.sort) params.set('sort', options.sort)

  const { response, payload } = await pocketbaseRequest(
    pbUrl,
    `/api/collections/${encodeURIComponent(collection)}/records?${params.toString()}`,
    { headers },
  )
  if (!response.ok) {
    throw new Error(`Could not query ${collection}.`)
  }
  return payload?.items || []
}

function matchPayload(match) {
  return {
    home: match.home || '',
    away: match.away || '',
    homeCrest: match.home_crest || '',
    awayCrest: match.away_crest || '',
    homeScore: optionalScore(match.home_score),
    awayScore: optionalScore(match.away_score),
  }
}

async function upsertActivityEvent(pbUrl, headers, event) {
  const existing = await getFirstRecord(
    pbUrl,
    'activity_events',
    `dedupe_key="${escapePbFilterValue(event.dedupe_key)}"`,
    headers,
  )

  const body = JSON.stringify(event)
  if (existing?.id) {
    const { response, payload } = await pocketbaseRequest(
      pbUrl,
      `/api/collections/activity_events/records/${encodeURIComponent(existing.id)}`,
      {
        method: 'PATCH',
        headers,
        body,
      },
    )
    if (!response.ok) {
      throw pocketbaseError(payload, 'Could not update activity event.', response.status)
    }
    return { action: 'updated', event: payload }
  }

  const created = await pocketbaseRequest(
    pbUrl,
    '/api/collections/activity_events/records',
    {
      method: 'POST',
      headers,
      body,
    },
  )
  if (created.response.ok) {
    return { action: 'created', event: created.payload }
  }

  const fallback = await getFirstRecord(
    pbUrl,
    'activity_events',
    `dedupe_key="${escapePbFilterValue(event.dedupe_key)}"`,
    headers,
  )
  if (fallback?.id) {
    const { response, payload } = await pocketbaseRequest(
      pbUrl,
      `/api/collections/activity_events/records/${encodeURIComponent(fallback.id)}`,
      {
        method: 'PATCH',
        headers,
        body,
      },
    )
    if (response.ok) return { action: 'updated', event: payload }
  }

  throw pocketbaseError(created.payload, 'Could not create activity event.', created.response.status)
}

async function buildPredictionEvents(pbUrl, headers, body, authUser, isService) {
  const prediction = body.predictionId
    ? await getRecord(pbUrl, 'predictions', body.predictionId, headers)
    : await getFirstRecord(
      pbUrl,
      'predictions',
      [
        `workspace="${escapePbFilterValue(body.workspaceId)}"`,
        `user="${escapePbFilterValue(body.userId || authUser?.id)}"`,
        `match="${escapePbFilterValue(body.matchId)}"`,
      ].join(' && '),
      headers,
    )

  if (!prediction?.id) {
    throw new Error('Prediction not found.')
  }

  const userId = relationId(prediction.user ?? prediction.player)
  if (!isService && authUser?.id !== userId) {
    throw activityError('Forbidden.', 403)
  }

  const workspaceId = relationId(prediction.workspace)
  const matchId = relationId(prediction.match)
  const [user, match] = await Promise.all([
    getRecord(pbUrl, 'users', userId, headers),
    getRecord(pbUrl, 'matches', matchId, headers),
  ])

  return [{
    workspace: workspaceId,
    user: userId,
    match: matchId,
    type: 'prediction',
    dedupe_key: `prediction:${prediction.id}`,
    occurred_at: occurredAt(prediction.updated || prediction.created),
    payload: {
      playerId: userId,
      playerName: cleanName(user.name),
      ...matchPayload(match),
      pick: pickSummary(match, prediction.pick),
    },
  }]
}

async function buildResultEvents(pbUrl, headers, body) {
  const match = await getRecord(pbUrl, 'matches', body.matchId, headers)
  if (!match.result) return []

  const workspaceIds = body.workspaceId
    ? [body.workspaceId]
    : (await getAllRecords(pbUrl, 'workspaces', { sort: 'created' }, headers)).map((workspace) => workspace.id)

  return workspaceIds.map((workspaceId) => ({
    workspace: workspaceId,
    match: match.id,
    type: 'result',
    dedupe_key: `result:${workspaceId}:${match.id}`,
    occurred_at: occurredAt(match.updated || match.created),
    payload: {
      ...matchPayload(match),
      summary: resultSummary(match),
    },
  }))
}

async function buildRankClimbEvents(pbUrl, headers, body) {
  const workspaceId = relationId(body.workspaceId)
  const userId = relationId(body.userId)
  const rank = Number(body.rank)
  const spots = Number(body.spots || (Number(body.previousRank) - rank))

  if (!workspaceId || !userId || !Number.isFinite(rank) || !Number.isFinite(spots) || spots < 2) {
    return []
  }

  const user = await getRecord(pbUrl, 'users', userId, headers)

  return [{
    workspace: workspaceId,
    user: userId,
    type: 'rank-climb',
    dedupe_key: body.eventKey || `rank-climb:${workspaceId}:${userId}:${body.previousRank || ''}:${rank}`,
    occurred_at: occurredAt(body.occurredAt),
    payload: {
      playerId: userId,
      playerName: cleanName(user.name || body.playerName),
      rank,
      spots,
    },
  }]
}

export async function onRequestPost(context) {
  const { request, env } = context
  const pbUrl = env.POCKETBASE_URL

  if (!pbUrl) {
    return errorResponse('POCKETBASE_URL is not configured.', 500)
  }

  const serviceSecret = env.ACTIVITY_EVENTS_SECRET
  const requestSecret = request.headers.get('x-activity-events-secret') || ''
  const isService = Boolean(serviceSecret && requestSecret && requestSecret === serviceSecret)
  const authHeader = request.headers.get('authorization') || ''
  const userToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''
  const authUser = isService ? null : await resolveAuthUser(pbUrl, userToken)

  if (!isService && !authUser) {
    return errorResponse('Unauthorized.', 401)
  }

  const body = await parseJson(request)
  if (!body?.type) {
    return errorResponse('Activity event type is required.', 400)
  }

  const isAdmin = Boolean(authUser?.is_admin)
  const isAllowedUserEvent = body.type === 'prediction' || (isAdmin && body.type === 'result')

  if (!isService && !isAllowedUserEvent) {
    return errorResponse('Forbidden.', 403)
  }

  let serviceToken
  try {
    serviceToken = await authenticateService(pbUrl, env)
  } catch (error) {
    return errorResponse(error?.message || 'Service authentication failed.', 500)
  }

  const serviceHeaders = {
    authorization: `Bearer ${serviceToken}`,
    'content-type': 'application/json',
  }

  try {
    let events
    if (body.type === 'prediction') {
      events = await buildPredictionEvents(pbUrl, serviceHeaders, body, authUser, isService)
    } else if (body.type === 'result') {
      events = await buildResultEvents(pbUrl, serviceHeaders, body)
    } else if (body.type === 'rank-climb') {
      events = await buildRankClimbEvents(pbUrl, serviceHeaders, body)
    } else {
      return errorResponse('Unsupported activity event type.', 400)
    }

    const saved = []
    for (const event of events) {
      saved.push(await upsertActivityEvent(pbUrl, serviceHeaders, event))
    }

    return jsonResponse({
      ok: true,
      saved,
      skipped: events.length === 0,
    }, saved.some((entry) => entry.action === 'created') ? 201 : 200)
  } catch (error) {
    return errorResponse(
      error?.message || 'Could not save activity event.',
      error?.status || 500,
      error?.details,
    )
  }
}
