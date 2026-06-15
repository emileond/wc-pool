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
  updated?: string;
};

type LeaderboardRow = {
  workspace: string;
  user: string;
  name: string;
  points: number;
  correct: number;
  predictions: number;
  accuracy: number;
  rank: number;
};

type UpsertResult = "created" | "updated" | "skipped";

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

function calculateRows(workspaceId: string, memberships: MembershipRecord[], matches: MatchRecord[], predictions: PredictionRecord[]) {
  const finals = new Map(matches.filter((m) => m.result).map((m) => [m.id, m]));
  const predictionsByUser = new Map<string, PredictionRecord[]>();

  for (const prediction of predictions) {
    const userId = relationId(prediction.user ?? prediction.player);
    if (!userId) continue;

    const userPredictions = predictionsByUser.get(userId) || [];
    userPredictions.push(prediction);
    predictionsByUser.set(userId, userPredictions);
  }

  return memberships
    .map(membershipUser)
    .filter((user): user is UserRecord => Boolean(user?.id))
    .map((user) => {
      const userPredictions = predictionsByUser.get(user.id) || [];
      const correct = userPredictions.filter((prediction) => {
        const matchId = relationId(prediction.match);
        const match = matchId ? finals.get(matchId) : undefined;
        return match?.result && match.result === prediction.pick;
      }).length;
      const predictionsCount = userPredictions.length;

      return {
        workspace: workspaceId,
        user: user.id,
        name: cleanName(user.name),
        points: correct * 3,
        correct,
        predictions: predictionsCount,
        accuracy: predictionsCount ? Math.round((correct / predictionsCount) * 100) : 0,
        rank: 0,
      };
    })
    .sort((a, b) => b.points - a.points || b.correct - a.correct || b.predictions - a.predictions)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

async function upsertLeaderboardRow(
  pb: PocketBase,
  row: LeaderboardRow,
  existingByUser: Map<string, LeaderboardRecord>,
): Promise<UpsertResult> {
  const existing = existingByUser.get(row.user);
  if (existing) {
    const unchanged =
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
    if (spots >= 2) {
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

  const rows = calculateRows(workspace.id, memberships, matches, predictions);
  const userIds = new Set(rows.map((row) => row.user));
  const existingByUser = new Map(
    leaderboardRecords
      .map((record) => [relationId(record.user), record] as const)
      .filter((entry): entry is [string, LeaderboardRecord] => Boolean(entry[0])),
  );
  const totals: Record<UpsertResult, number> = { created: 0, updated: 0, skipped: 0 };
  let deleted = 0;

  for (const row of rows) {
    const result = await upsertLeaderboardRow(pb, row, existingByUser);
    totals[result] += 1;
  }

  for (const [userId, record] of existingByUser) {
    if (!userIds.has(userId)) {
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
