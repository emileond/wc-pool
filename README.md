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

Use PocketBase's built-in `users` auth collection for player accounts. A user can join multiple pools through `memberships`; each pool is a row in `workspaces`.

Workspace routing is URL-driven. The first path segment must match `workspaces.name` exactly after URL decoding:

```txt
https://your-domain.com/Family%20Pool
https://your-domain.com/OfficePool
```

When a user signs up from that URL, the app joins them to that workspace. When an existing signed-in user opens a workspace they have not joined, they can browse public data and will see a join CTA before submitting picks.

Configure your host to serve the React app for workspace paths. For static hosting, `/Family%20Pool` and other workspace URLs should fall back to `index.html`.

### users

- `email` auth identity field
- `password` auth field
- `name` text, required
- `is_admin` bool, default `false` for global fixture sync/admin access

### workspaces

- `name` text, required, unique

Create one row per pool/team. `name` is also the public URL segment, so avoid duplicate names and prefer URL-friendly names when possible.

### memberships

- `workspace` relation to `workspaces`, required
- `user` relation to `users`, required
- `role` select: `owner`, `admin`, `member`, default `member`

Add a unique index for one membership per user per workspace:

```sql
CREATE UNIQUE INDEX idx_memberships_workspace_user ON memberships (workspace, user);
```

### matches

- `external_id` text, required, unique
- `stage` text
- `group` text
- `matchday` number (optional, group-stage round from football-data.org)
- `home` text, required
- `away` text, required
- `home_crest` url
- `away_crest` url
- `venue` text
- `kickoff` date, required
- `minute` number (optional, live minute from football-data.org)
- `status` select: `scheduled`, `live`, `final`
- `result` select: empty, `home`, `draw`, `away`
- `home_score` number
- `away_score` number

### predictions

- `workspace` relation to `workspaces`, required
- `user` relation to `users`, required
- `match` relation to `matches`, required
- `pick` select: `home`, `draw`, `away`

Add a unique index so each player has one pick per match per workspace:

```sql
CREATE UNIQUE INDEX idx_predictions_workspace_user_match ON predictions (workspace, user, match);
```

### leaderboard

- `workspace` relation to `workspaces`, required
- `user` relation to `users`, required
- `name` text, required
- `points` number
- `correct` number
- `predictions` number
- `accuracy` number
- `rank` number
- `previous_rank` number (required for activity feed rank-climb events)

Add a unique index for one leaderboard row per user per workspace:

```sql
CREATE UNIQUE INDEX idx_leaderboard_workspace_user ON leaderboard (workspace, user);
```

### activity_events

- `workspace` relation to `workspaces`, required
- `user` relation to `users` (optional; present for prediction and rank-climb events)
- `match` relation to `matches` (optional; present for prediction and result events)
- `type` select: `prediction`, `result`, `rank-climb`
- `dedupe_key` text, required
- `occurred_at` date, required
- `payload` json, required

Add a unique index so retries and scheduled jobs upsert the same logical event instead of duplicating feed items:

```sql
CREATE UNIQUE INDEX idx_activity_events_dedupe_key ON activity_events (dedupe_key);
```

## PocketBase API Rules

The app signs users in through the built-in `users` auth collection. The leaderboard and prediction ownership both use the auth user record directly, and workspace participation is tracked through `memberships`.

The frontend filters every workspace-scoped query by the workspace resolved from the URL. The public read rules below preserve guest browsing. For private pools, replace public reads with stricter membership-based rules or PocketBase hooks before launch.

### users

- List/Search rule: empty string/public
- View rule: empty string/public
- Create rule: `@request.body.is_admin:isset = false || @request.body.is_admin = false`
- Update rule: `@request.auth.id = id && @request.body.is_admin:changed = false`
- Delete rule: leave locked/null for superusers only

Set `is_admin` manually from the PocketBase admin dashboard for users or service accounts that should manage global fixtures. Do not let users update their own `is_admin` value from the app.

### workspaces

- List/Search rule: empty string/public
- View rule: empty string/public
- Create rule: leave locked/null for superusers only
- Update rule: leave locked/null for superusers only
- Delete rule: leave locked/null for superusers only

### memberships

- List/Search rule: empty string/public
- View rule: empty string/public
- Create rule: `@request.auth.id != "" && user = @request.auth.id && (@request.body.role:isset = false || @request.body.role = "member")`
- Update rule: `@request.auth.id != "" && user = @request.auth.id && @request.body.role:changed = false && @request.body.workspace:changed = false && @request.body.user:changed = false`
- Delete rule: `@request.auth.id != "" && user = @request.auth.id`

Create owner/admin memberships manually in PocketBase, or with a trusted server-side action. The app creates a `member` membership only when a user explicitly joins a workspace or signs up from that workspace URL.

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
- Update rule: `@request.auth.id != "" && user = @request.auth.id && @request.body.workspace:changed = false && @request.body.user:changed = false && @request.body.match:changed = false`
- Delete rule: `@request.auth.id != "" && user = @request.auth.id`

### leaderboard

- List/Search rule: empty string/public
- View rule: empty string/public
- Create rule: `@request.auth.is_admin = true`
- Update rule: `@request.auth.is_admin = true`
- Delete rule: `@request.auth.is_admin = true`

### activity_events

- List/Search rule: empty string/public
- View rule: empty string/public
- Create rule: `@request.auth.is_admin = true`
- Update rule: `@request.auth.is_admin = true`
- Delete rule: `@request.auth.is_admin = true`

The in-app admin PIN is only a local fallback UI unlock. PocketBase authorization is enforced by the rules above, so live fixture and leaderboard writes require an admin/service account.

## Automated Match Sync

Match fixtures and results are synced by Trigger.dev from football-data.org.

The scheduled task is in `src/trigger/footballDataSync.ts`. It runs every 20 minutes, calls:

```bash
https://api.football-data.org/v4/competitions/WC/matches?season=2026
```

It upserts PocketBase `matches` by `external_id`, which is the football-data.org match ID. Add `external_id` as a unique text field before running the task.

The sync stores team crests from football-data.org `homeTeam.crest` and `awayTeam.crest` into `matches.home_crest` and `matches.away_crest`.

The sync stores football-data.org `matchday` into `matches.matchday` (optional). This is used by the UI to group group-stage fixtures by 1st/2nd/3rd round.

The sync stores football-data.org `minute` into `matches.minute` (optional). Live matches include this value and the UI uses it directly for the in-match clock label.

The sync stores the final score from football-data.org `score.fullTime.home` and `score.fullTime.away` into `matches.home_score` and `matches.away_score`. Keep both score fields optional because upcoming fixtures return `null` scores.

If PocketBase returns `400` during `PocketBase match lookup failed`, confirm the `matches` collection has an exact `external_id` field. The sync queries `external_id="..."`; a missing or misspelled field makes PocketBase reject the filter before it can create or update a record.

Set these environment variables in Trigger.dev:

```bash
FOOTBALL_DATA_API_TOKEN=your_football_data_token
FOOTBALL_DATA_SEASON=2026
POCKETBASE_URL=https://your-pocketbase-instance.example
POCKETBASE_ADMIN_EMAIL=admin-user@example.com
POCKETBASE_ADMIN_PASSWORD=admin-user-password
POCKETBASE_AUTH_COLLECTION=users
PUBLIC_APP_URL=https://your-app.example
ACTIVITY_EVENTS_SECRET=generate-a-long-random-secret
```

`FOOTBALL_DATA_SEASON` is optional and defaults to `2026`.
`POCKETBASE_AUTH_COLLECTION` is optional and defaults to `users`.
`PUBLIC_APP_URL` is used by Trigger.dev to call `/api/activity/events` after result and leaderboard changes.
`ACTIVITY_EVENTS_SECRET` must match the same environment variable in your app host so scheduled jobs can call the activity endpoint.

If your app host cannot be represented by `PUBLIC_APP_URL`, set `ACTIVITY_EVENTS_API_URL` in Trigger.dev to the full endpoint URL, for example `https://your-app.example/api/activity/events`.

For the recommended setup, `POCKETBASE_ADMIN_EMAIL` and `POCKETBASE_ADMIN_PASSWORD` should be a normal `users` auth account with `is_admin = true`. The `matches` and `leaderboard` create/update/delete API rules above authorize that account to sync fixtures and standings.

If you want Trigger.dev to authenticate with a PocketBase superuser instead, set:

```bash
POCKETBASE_AUTH_COLLECTION=_superusers
POCKETBASE_ADMIN_EMAIL=your-pocketbase-superuser@example.com
POCKETBASE_ADMIN_PASSWORD=your-pocketbase-superuser-password
```

Alternatively, keep `POCKETBASE_AUTH_COLLECTION=users` and set `POCKETBASE_SUPERUSER_EMAIL` plus `POCKETBASE_SUPERUSER_PASSWORD` as a fallback. The tasks will try the normal `users` service account first, then `_superusers` only if those fallback variables exist.

The free football-data.org tier allows 100 requests/day. A 20-minute schedule uses 72 planned requests/day, leaving margin for manual testing or occasional failed runs. The task disables Trigger-level retries and does not internally retry football-data.org requests by default so scheduled usage stays predictable.

After a successful match sync, Trigger.dev starts the `sync-leaderboard` task to refresh stored standings.
When a synced match newly receives a final result, the task also calls `/api/activity/events` to create one stored result event per workspace.

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

The leaderboard is stored in the `leaderboard` collection and loaded directly by the app. Rows are scoped by `workspace`, and Trigger.dev keeps each workspace updated in two ways:

- `sync-world-cup-matches` triggers `sync-leaderboard` after match results are synced.
- `scheduled-leaderboard-sync` runs every minute to pick up newly submitted predictions.

The one-minute leaderboard schedule does not call football-data.org, so it does not count against the 100/day football-data request limit.

Leaderboard sync writes `previous_rank` on every create/update:

- On create, `previous_rank` is initialized to `rank`.
- On update, `previous_rank` is set to the row's prior `rank` before applying the new one.

The Activity feed rank-climb item is shown only when `previous_rank - rank >= 2`.
Those rank-climb rows are now persisted through `/api/activity/events` instead of being generated on page load.
