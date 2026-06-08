# World Cup 2026 Pool

A modern private prediction pool for friends, built with React, Tailwind CSS, and PocketBase.

## Run

```bash
npm install
npm run dev
```

Optional environment variables:

```bash
VITE_POCKETBASE_URL=http://127.0.0.1:8090
VITE_ADMIN_PIN=2026
```

If PocketBase is not available, the app uses local demo storage so the interface can still be tested.

## PocketBase Collections

Use PocketBase's built-in `users` auth collection for pool players. Add a required `name` text field to `users`, then create these collections:

### users

- `email` auth identity field
- `password` auth field
- `name` text, required
- `is_admin` bool, default `false`

### matches

- `external_id` text, required, unique
- `stage` text
- `group` text
- `home` text, required
- `away` text, required
- `venue` text
- `kickoff` date, required
- `status` select: `scheduled`, `live`, `final`
- `result` select: empty, `home`, `draw`, `away`

### predictions

- `user` relation to `users`, required
- `match` relation to `matches`, required
- `pick` select: `home`, `draw`, `away`

## PocketBase API Rules

The app signs users in through the built-in `users` auth collection. The leaderboard and prediction ownership both use the auth user record directly, so there is no separate `players` collection.

Guests can browse fixtures and the leaderboard before signing in, so pool data needs public read access. In PocketBase, set public read rules to an empty string rule, not locked/null. Locked/null means superuser-only.

### users

- List/Search rule: empty string/public
- View rule: empty string/public
- Create rule: `@request.body.is_admin:isset = false || @request.body.is_admin = false`
- Update rule: `@request.auth.id = id && @request.body.is_admin:changed = false`
- Delete rule: leave locked/null for superusers only

Set `is_admin` manually from the PocketBase admin dashboard for users who should manage fixtures. Do not let users update their own `is_admin` value from the app.

### matches

- List/Search rule: empty string/public
- View rule: empty string/public
- Create rule: `@request.auth.is_admin = true`
- Update rule: `@request.auth.is_admin = true`
- Delete rule: `@request.auth.is_admin = true`

### predictions

- List/Search rule: empty string/public
- View rule: empty string/public
- Create rule: `@request.auth.id != "" && user = @request.auth.id`
- Update rule: `@request.auth.id != "" && user = @request.auth.id`
- Delete rule: `@request.auth.id != "" && user = @request.auth.id`

The in-app admin PIN is only a local fallback UI unlock. PocketBase authorization is enforced by the `matches` rules above, so a user must have `is_admin = true` to create, update, or delete fixtures in live mode.

## Automated Match Sync

Match fixtures and results are synced by Trigger.dev from football-data.org.

The scheduled task is in `src/trigger/footballDataSync.ts`. It runs every 20 minutes, calls:

```bash
https://api.football-data.org/v4/competitions/WC/matches?season=2026
```

It upserts PocketBase `matches` by `external_id`, which is the football-data.org match ID. Add `external_id` as a unique text field before running the task.

If PocketBase returns `400` during `PocketBase match lookup failed`, confirm the `matches` collection has an exact `external_id` field. The sync queries `external_id="..."`; a missing or misspelled field makes PocketBase reject the filter before it can create or update a record.

Set these environment variables in Trigger.dev:

```bash
FOOTBALL_DATA_API_TOKEN=your_football_data_token
FOOTBALL_DATA_SEASON=2026
POCKETBASE_URL=https://your-pocketbase-instance.example
POCKETBASE_ADMIN_EMAIL=admin-user@example.com
POCKETBASE_ADMIN_PASSWORD=admin-user-password
```

`FOOTBALL_DATA_SEASON` is optional and defaults to `2026`.

The free football-data.org tier allows 100 requests/day. A 20-minute schedule uses 72 planned requests/day, leaving margin for manual testing or occasional failed runs. The task disables Trigger-level retries and does not internally retry football-data.org requests by default so scheduled usage stays predictable.

`POCKETBASE_ADMIN_EMAIL` should be a normal `users` auth account with `is_admin = true`, not necessarily a PocketBase superuser. The `matches` create/update/delete API rules above authorize that account to sync fixtures.

Run locally:

```bash
npm run trigger:dev
```

Deploy:

```bash
npm run trigger:deploy
```

If the task fails with `TypeError: fetch failed`, the request did not reach football-data.org. Check DNS/network access from the Trigger.dev runtime or from the machine running `npm run trigger:dev`. HTTP errors such as `401`, `403`, or `429` mean the API was reached and the token, permissions, or rate limit should be checked instead.

The sync intentionally fails the Trigger.dev run if football-data.org cannot be reached, returns an invalid response shape, or returns zero matches. A successful run means at least one upstream match was fetched and every fetched match was upserted into PocketBase.

## Leaderboard Storage

The leaderboard is currently calculated in the browser from public `users`, `matches`, and `predictions` records. That is fine for a small private pool and avoids another collection to keep in sync.

Store leaderboard rows in PocketBase only if you want to hide raw predictions from public reads or if the pool becomes large enough that client-side calculation is slow. If you add stored standings, update them after both match syncs and prediction writes; recalculating only after the scheduled match sync would miss newly submitted picks.
