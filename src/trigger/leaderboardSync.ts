import { logger, schedules, task } from "@trigger.dev/sdk/v3";
import type PocketBase from "pocketbase";
import { recordActivityEvent } from "./activityEvents.ts";
import { pocketBaseClient } from "./pocketbaseClient.ts";

type UserRecord = {
  id: string;
  name?: string;
};

type WorkspaceRecord = {
  id: string;
  name?: string;
};

type MembershipRecord = {
  id: string;
  workspace?: string | { id: string };
  user?: string | UserRecord;
  role?: "owner" | "admin" | "member";
  expand?: {
    user?: UserRecord;
  };
};

type MatchRecord = {
  id: string;
  stage?: string;
  group?: string;
  kickoff?: string;
  matchday?: number;
  result?: "home" | "draw" | "away" | "";
};

type PredictionRecord = {
  id: string;
  workspace?: string | { id: string };
  user?: string | { id: string };
  player?: string | { id: string };
  match?: string | { id: string };
  pick?: "home" | "draw" | "away";
};

type LeaderboardRecord = {
  id: string;
  workspace?: string | { id: string };
  user?: string | { id: string };
  name?: string;
  points?: number;
  correct?: number;
  predictions?: number;
  accuracy?: number;
  rank?: number;
  previous_rank?: number;
  scope_type?: LeaderboardScopeType;
  scope_value?: string;
  scope_label?: string;
  updated?: string;
};

type LeaderboardScopeType = "overall" | "stage" | "group-round";

type LeaderboardScope = {
  type: LeaderboardScopeType;
  value: string;
  label: string;
  matches: MatchRecord[];
};

type LeaderboardRow = {
  workspace: string;
  user: string;
  scope_type: LeaderboardScopeType;
  scope_value: string;
  scope_label: string;
  name: string;
  points: number;
  correct: number;
  predictions: number;
  accuracy: number;
  rank: number;
};

type UpsertResult = "created" | "updated" | "skipped";

type LeaderboardScopeBackfillResult = {
  scanned: number;
  updated: number;
  skipped: number;
};

type ExistingLeaderboardIndex = {
  byKey: Map<string, LeaderboardRecord>;
  duplicateIds: string[];
};

function errorDetails(err: unknown) {
  if (!(err instanceof Error)) return { message: String(err) };

  const clientError = err as Error & {
    status?: number;
    url?: string;
    data?: unknown;
    response?: unknown;
  };

  return {
    name: err.name,
    message: err.message,
    status: clientError.status,
    url: clientError.url,
    data: clientError.data,
    response: clientError.response,
  };
}

function relationId(value: string | { id: string } | undefined) {
  return typeof value === "string" ? value : value?.id;
}

function cleanName(name?: string) {
  return name?.trim().replace(/\s+/g, " ") || "Player";
}

function membershipUser(membership: MembershipRecord) {
  const expandedUser = membership.expand?.user;
  if (expandedUser) return expandedUser;
  return typeof membership.user === "string" ? { id: membership.user } : membership.user;
}

function ordinal(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return `${value}st`;
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`;
  return `${value}th`;
}

function matchStage(match: MatchRecord) {
  return match.stage || "Group Stage";
}

function isGroupStageMatch(match: MatchRecord) {
  return matchStage(match) === "Group Stage";
}

function inferGroupRounds(matches: MatchRecord[]) {
  const byGroup = new Map<string, MatchRecord[]>();
  matches.forEach((match) => {
    if (!isGroupStageMatch(match)) return;
    const groupKey = match.group || "Ungrouped";
    const groupMatches = byGroup.get(groupKey) || [];
    groupMatches.push(match);
    byGroup.set(groupKey, groupMatches);
  });

  const rounds = new Map<string, number>();
  byGroup.forEach((groupMatches) => {
    const ordered = [...groupMatches].sort((a, b) => {
      const kickoffDiff = new Date(a.kickoff || 0).getTime() - new Date(b.kickoff || 0).getTime();
      if (kickoffDiff !== 0) return kickoffDiff;
      return String(a.id).localeCompare(String(b.id));
    });
    ordered.forEach((match, index) => {
      rounds.set(match.id, Math.floor(index / 2) + 1);
    });
  });

  return rounds;
}

function leaderboardScopes(matches: MatchRecord[]): LeaderboardScope[] {
  const scopes: LeaderboardScope[] = [{
    type: "overall",
    value: "",
    label: "All tournament",
    matches,
  }];

  const finalStageMatches = matches.filter((match) => !isGroupStageMatch(match));
  if (finalStageMatches.length > 0) {
    scopes.push({
      type: "stage",
      value: "Final Stage",
      label: "Final Stage",
      matches: finalStageMatches,
    });
  }

  const inferredRounds = inferGroupRounds(matches);
  const groupRounds = new Map<number, MatchRecord[]>();
  matches.forEach((match) => {
    if (!isGroupStageMatch(match)) return;
    const roundNumber = match.matchday || inferredRounds.get(match.id);
    if (!roundNumber) return;
    const roundMatches = groupRounds.get(roundNumber) || [];
    roundMatches.push(match);
    groupRounds.set(roundNumber, roundMatches);
  });

  [...groupRounds.entries()]
    .sort(([a], [b]) => a - b)
    .forEach(([roundNumber, roundMatches]) => {
      scopes.push({
        type: "group-round",
        value: String(roundNumber),
        label: `Group Stage - ${ordinal(roundNumber)} round`,
        matches: roundMatches,
      });
    });

  return scopes;
}

function scopeRecordKey(scopeType?: string, scopeValue?: string, userId?: string) {
  return `${scopeType || "overall"}:${scopeValue || ""}:${userId || ""}`;
}

function indexLeaderboardRecords(records: LeaderboardRecord[]): ExistingLeaderboardIndex {
  const byKey = new Map<string, LeaderboardRecord>();
  const duplicateIds: string[] = [];

  for (const record of records) {
    const key = scopeRecordKey(record.scope_type, record.scope_value, relationId(record.user));
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, record);
      continue;
    }

    const existingUpdated = new Date(existing.updated || 0).getTime();
    const recordUpdated = new Date(record.updated || 0).getTime();
    if (recordUpdated > existingUpdated) {
      duplicateIds.push(existing.id);
      byKey.set(key, record);
    } else {
      duplicateIds.push(record.id);
    }
  }

  return { byKey, duplicateIds };
}

function calculateRows(
  workspaceId: string,
  scope: LeaderboardScope,
  memberships: MembershipRecord[],
  predictions: PredictionRecord[],
) {
  const scopeMatchIds = new Set(scope.matches.map((match) => match.id));
  const finals = new Map(scope.matches.filter((m) => m.result).map((m) => [m.id, m]));
  const predictionsByUser = new Map<string, PredictionRecord[]>();

  for (const prediction of predictions) {
    const userId = relationId(prediction.user ?? prediction.player);
    if (!userId) continue;
    const matchId = relationId(prediction.match);
    if (!matchId || !scopeMatchIds.has(matchId)) continue;

    const userPredictions = predictionsByUser.get(userId) || [];
    userPredictions.push(prediction);
    predictionsByUser.set(userId, userPredictions);
  }

  return memberships
    .map(membershipUser)
    .filter((user): user is UserRecord => Boolean(user?.id))
    .map((user) => {
      const userPredictions = predictionsByUser.get(user.id) || [];
      const completedPredictions = userPredictions.filter((prediction) => {
        const matchId = relationId(prediction.match);
        return Boolean(matchId && finals.has(matchId));
      });
      const correct = userPredictions.filter((prediction) => {
        const matchId = relationId(prediction.match);
        const match = matchId ? finals.get(matchId) : undefined;
        return match?.result && match.result === prediction.pick;
      }).length;
      const completedPredictionsCount = completedPredictions.length;

      return {
        workspace: workspaceId,
        user: user.id,
        scope_type: scope.type,
        scope_value: scope.value,
        scope_label: scope.label,
        name: cleanName(user.name),
        points: correct * 3,
        correct,
        predictions: completedPredictionsCount,
        accuracy: completedPredictionsCount ? Math.round((correct / completedPredictionsCount) * 100) : 0,
        rank: 0,
      };
    })
    .sort((a, b) => b.points - a.points || b.correct - a.correct || b.predictions - a.predictions)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

async function upsertLeaderboardRow(
  pb: PocketBase,
  row: LeaderboardRow,
  existingByKey: Map<string, LeaderboardRecord>,
  emitActivity: boolean,
): Promise<UpsertResult> {
  const existing = existingByKey.get(scopeRecordKey(row.scope_type, row.scope_value, row.user));
  if (existing) {
    const unchanged =
      existing.scope_type === row.scope_type &&
      (existing.scope_value || "") === row.scope_value &&
      existing.scope_label === row.scope_label &&
      existing.name === row.name &&
      Number(existing.points) === row.points &&
      Number(existing.correct) === row.correct &&
      Number(existing.predictions) === row.predictions &&
      Number(existing.accuracy) === row.accuracy &&
      Number(existing.rank) === row.rank;

    if (unchanged) return "skipped";

    const previousRank = Number(existing.rank) || row.rank;
    const updated = await pb.collection("leaderboard").update<LeaderboardRecord>(existing.id, {
      ...row,
      previous_rank: previousRank,
    });
    const spots = previousRank - row.rank;
    if (emitActivity && spots >= 2) {
      await recordActivityEvent({
        type: "rank-climb",
        workspaceId: row.workspace,
        userId: row.user,
        rank: row.rank,
        previousRank,
        spots,
        points: row.points,
        correct: row.correct,
        predictions: row.predictions,
        playerName: row.name,
        occurredAt: updated.updated,
        eventKey: `rank-climb:${row.workspace}:${row.user}:${previousRank}:${row.rank}:${row.points}:${row.correct}:${row.predictions}`,
      }, `leaderboard:${row.workspace}:${row.user}`);
    }
    return "updated";
  }

  await pb.collection("leaderboard").create({
    ...row,
    previous_rank: row.rank,
  });
  return "created";
}

function escapePbFilterValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

async function backfillOverallLeaderboardScope(): Promise<LeaderboardScopeBackfillResult> {
  const pb = await pocketBaseClient("leaderboard-scope-backfill");
  const records = await pb.collection("leaderboard").getFullList<LeaderboardRecord>({
    sort: "created",
  });
  const totals: LeaderboardScopeBackfillResult = {
    scanned: records.length,
    updated: 0,
    skipped: 0,
  };

  for (const record of records) {
    const alreadyOverall =
      record.scope_type === "overall" &&
      (record.scope_value || "") === "" &&
      record.scope_label === "All tournament";
    const hasNonOverallScope = Boolean(record.scope_type && record.scope_type !== "overall");

    if (alreadyOverall || hasNonOverallScope) {
      totals.skipped += 1;
      continue;
    }

    await pb.collection("leaderboard").update(record.id, {
      scope_type: "overall",
      scope_value: "",
      scope_label: "All tournament",
    });
    totals.updated += 1;
  }

  logger.log("Leaderboard scope backfill complete", totals);
  return totals;
}

async function syncWorkspaceLeaderboard(
  pb: PocketBase,
  workspace: WorkspaceRecord,
  matches: MatchRecord[],
): Promise<Record<UpsertResult, number> & { rows: number; deleted: number }> {
  const workspaceId = escapePbFilterValue(workspace.id);
  const workspaceFilter = `workspace="${workspaceId}"`;
  const [memberships, predictions, leaderboardRecords] = await Promise.all([
    pb.collection("memberships").getFullList<MembershipRecord>({
      filter: workspaceFilter,
      sort: "created",
      expand: "user",
    }),
    pb.collection("predictions").getFullList<PredictionRecord>({
      filter: workspaceFilter,
      sort: "created",
    }),
    pb.collection("leaderboard").getFullList<LeaderboardRecord>({
      filter: workspaceFilter,
      sort: "rank",
    }),
  ]);

  const scopes = leaderboardScopes(matches);
  const rows = scopes.flatMap((scope) => calculateRows(workspace.id, scope, memberships, predictions));
  const expectedKeys = new Set(rows.map((row) => scopeRecordKey(row.scope_type, row.scope_value, row.user)));
  const { byKey: existingByKey, duplicateIds } = indexLeaderboardRecords(leaderboardRecords);
  const totals: Record<UpsertResult, number> = { created: 0, updated: 0, skipped: 0 };
  let deleted = duplicateIds.length;

  for (const duplicateId of duplicateIds) {
    await pb.collection("leaderboard").delete(duplicateId);
  }

  for (const row of rows) {
    const result = await upsertLeaderboardRow(pb, row, existingByKey, row.scope_type === "overall");
    totals[result] += 1;
  }

  for (const [key, record] of existingByKey) {
    if (!expectedKeys.has(key)) {
      await pb.collection("leaderboard").delete(record.id);
      deleted += 1;
    }
  }

  return {
    rows: rows.length,
    deleted,
    ...totals,
  };
}

async function syncLeaderboardRows(reason: string, workspaceId?: string) {
  const pb = await pocketBaseClient(`leaderboard:${reason}`);
  const workspaceFilter = workspaceId ? `id="${escapePbFilterValue(workspaceId)}"` : undefined;
  const [workspaces, matches] = await Promise.all([
    pb.collection("workspaces").getFullList<WorkspaceRecord>({
      filter: workspaceFilter,
      sort: "created",
    }),
    pb.collection("matches").getFullList<MatchRecord>({ sort: "kickoff" }),
  ]);
  const totals: Record<UpsertResult, number> & { rows: number; deleted: number } = {
    rows: 0,
    deleted: 0,
    created: 0,
    updated: 0,
    skipped: 0,
  };

  for (const workspace of workspaces) {
    const workspaceTotals = await syncWorkspaceLeaderboard(pb, workspace, matches);
    totals.rows += workspaceTotals.rows;
    totals.deleted += workspaceTotals.deleted;
    totals.created += workspaceTotals.created;
    totals.updated += workspaceTotals.updated;
    totals.skipped += workspaceTotals.skipped;
  }

  logger.log("Leaderboard sync complete", {
    reason,
    workspaces: workspaces.length,
    workspaceId,
    ...totals,
  });

  return {
    ok: true,
    reason,
    workspaces: workspaces.length,
    workspaceId,
    ...totals,
  };
}

export const syncLeaderboard = task({
  id: "sync-leaderboard",
  retry: {
    maxAttempts: 1,
  },
  run: async (payload: { reason?: string; workspaceId?: string } = {}) => {
    try {
      return await syncLeaderboardRows(payload.reason || "manual", payload.workspaceId);
    } catch (err) {
      logger.error("Leaderboard sync failed", {
        reason: payload.reason || "manual",
        error: errorDetails(err),
      });

      return {
        ok: false,
        reason: payload.reason || "manual",
        error: errorDetails(err),
      };
    }
  },
});

export const backfillLeaderboardOverallScope = task({
  id: "backfill-leaderboard-overall-scope",
  retry: {
    maxAttempts: 1,
  },
  run: async () => {
    try {
      const totals = await backfillOverallLeaderboardScope();
      return {
        ok: true,
        ...totals,
      };
    } catch (err) {
      logger.error("Leaderboard scope backfill failed", {
        error: errorDetails(err),
      });

      return {
        ok: false,
        error: errorDetails(err),
      };
    }
  },
});

export const cleanupDuplicateLeaderboardRows = task({
  id: "cleanup-duplicate-leaderboard-rows",
  retry: {
    maxAttempts: 1,
  },
  run: async (payload: { workspaceId?: string } = {}) => {
    try {
      return await syncLeaderboardRows("duplicate-cleanup", payload.workspaceId);
    } catch (err) {
      logger.error("Duplicate leaderboard cleanup failed", {
        workspaceId: payload.workspaceId,
        error: errorDetails(err),
      });

      return {
        ok: false,
        workspaceId: payload.workspaceId,
        error: errorDetails(err),
      };
    }
  },
});

export const scheduledLeaderboardSync = schedules.task({
  id: "scheduled-leaderboard-sync",
  cron: {
    pattern: "* * * * *",
    timezone: "UTC",
  },
  retry: {
    maxAttempts: 1,
  },
  maxDuration: 300,
  run: async () => {
    try {
      return await syncLeaderboardRows("scheduled");
    } catch (err) {
      logger.error("Scheduled leaderboard sync failed", {
        error: errorDetails(err),
      });

      return {
        ok: false,
        reason: "scheduled",
        error: errorDetails(err),
      };
    }
  },
});
