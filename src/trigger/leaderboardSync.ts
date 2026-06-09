import { logger, schedules, task } from "@trigger.dev/sdk/v3";
import type PocketBase from "pocketbase";
import { pocketBaseClient } from "./pocketbaseClient.ts";

type UserRecord = {
  id: string;
  name?: string;
};

type MatchRecord = {
  id: string;
  result?: "home" | "draw" | "away" | "";
};

type PredictionRecord = {
  id: string;
  user?: string | { id: string };
  player?: string | { id: string };
  match?: string | { id: string };
  pick?: "home" | "draw" | "away";
};

type LeaderboardRecord = {
  id: string;
  user?: string | { id: string };
  name?: string;
  points?: number;
  correct?: number;
  predictions?: number;
  accuracy?: number;
  rank?: number;
};

type LeaderboardRow = {
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

function calculateRows(users: UserRecord[], matches: MatchRecord[], predictions: PredictionRecord[]) {
  const finals = new Map(matches.filter((m) => m.result).map((m) => [m.id, m]));
  const predictionsByUser = new Map<string, PredictionRecord[]>();

  for (const prediction of predictions) {
    const userId = relationId(prediction.user ?? prediction.player);
    if (!userId) continue;

    const userPredictions = predictionsByUser.get(userId) || [];
    userPredictions.push(prediction);
    predictionsByUser.set(userId, userPredictions);
  }

  return users
    .map((user) => {
      const userPredictions = predictionsByUser.get(user.id) || [];
      const correct = userPredictions.filter((prediction) => {
        const matchId = relationId(prediction.match);
        const match = matchId ? finals.get(matchId) : undefined;
        return match?.result && match.result === prediction.pick;
      }).length;
      const predictionsCount = userPredictions.length;

      return {
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

    await pb.collection("leaderboard").update(existing.id, row);
    return "updated";
  }

  await pb.collection("leaderboard").create(row);
  return "created";
}

async function syncLeaderboardRows(reason: string) {
  const pb = await pocketBaseClient(`leaderboard:${reason}`);
  const [users, matches, predictions, leaderboardRecords] = await Promise.all([
    pb.collection("users").getFullList<UserRecord>({ sort: "created" }),
    pb.collection("matches").getFullList<MatchRecord>({ sort: "kickoff" }),
    pb.collection("predictions").getFullList<PredictionRecord>({ sort: "created" }),
    pb.collection("leaderboard").getFullList<LeaderboardRecord>({ sort: "rank" }),
  ]);
  const rows = calculateRows(users, matches, predictions);
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

  logger.log("Leaderboard sync complete", {
    reason,
    rows: rows.length,
    deleted,
    ...totals,
  });

  return {
    ok: true,
    reason,
    rows: rows.length,
    deleted,
    ...totals,
  };
}

export const syncLeaderboard = task({
  id: "sync-leaderboard",
  retry: {
    maxAttempts: 1,
  },
  run: async (payload: { reason?: string } = {}) => {
    try {
      return await syncLeaderboardRows(payload.reason || "manual");
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
