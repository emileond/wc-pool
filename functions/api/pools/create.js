function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  })
}

function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status)
}

function cleanName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ')
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
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({identity: attempt.identity, password: attempt.password}),
      },
    )
    if (response.ok && payload?.token) {
      return payload.token
    }
  }

  throw new Error('Failed to authenticate service account.')
}

export async function onRequestPost(context) {
  const { request, env } = context
  const pbUrl = env.POCKETBASE_URL

  if (!pbUrl) {
    return errorResponse('POCKETBASE_URL is not configured.', 500)
  }

  const authHeader = request.headers.get('authorization') || ''
  const userToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''
  if (!userToken) {
    return errorResponse('Unauthorized.', 401)
  }

  const authUser = await resolveAuthUser(pbUrl, userToken)
  if (!authUser) {
    return errorResponse('Invalid session.', 401)
  }

  const body = await parseJson(request)
  const name = cleanName(body?.name)
  const plan = body?.plan === 'pro' ? 'pro' : 'free'
  if (!name) {
    return errorResponse('Pool name is required.', 400)
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

  const createWorkspace = await pocketbaseRequest(
    pbUrl,
    '/api/collections/workspaces/records',
    {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({name}),
    },
  )

  if (!createWorkspace.response.ok || !createWorkspace.payload?.id) {
    const message = createWorkspace.payload?.message || 'Could not create workspace.'
    const status = createWorkspace.response.status === 400 ? 400 : 500
    return errorResponse(message, status)
  }

  const workspace = createWorkspace.payload
  const createMembership = await pocketbaseRequest(
    pbUrl,
    '/api/collections/memberships/records',
    {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({
        workspace: workspace.id,
        user: authUser.id,
        role: 'owner',
      }),
    },
  )

  if (!createMembership.response.ok || !createMembership.payload?.id) {
    const message = createMembership.payload?.message || 'Could not create owner membership.'
    return errorResponse(message, 500)
  }

  return jsonResponse({
    workspace: {
      id: workspace.id,
      name: name,
    },
    plan,
  }, 201)
}
