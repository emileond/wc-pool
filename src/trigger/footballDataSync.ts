import { logger, schedules } from "@trigger.dev/sdk/v3";
import PocketBase from "pocketbase";

const FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4";
const WORLD_CUP_COMPETITION_CODE = "WC";
const WORLD_CUP_SEASON = process.env.FOOTBALL_DATA_SEASON || "2026";
const FOOTBALL_DATA_TIMEOUT_MS = 15_000;
const FOOTBALL_DATA_RETRIES = 1;

type FootballDataTeam = {
  name?: string | null;
};

type FootballDataScore = {
  winner?: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
};

type FootballDataMatch = {
  id: number;
  utcDate: string;
  status:
    | "SCHEDULED"
    | "TIMED"
    | "IN_PLAY"
    | "PAUSED"
    | "FINISHED"
    | "SUSPENDED"
    | "POSTPONED"
    | "CANCELLED"
    | "AWARDED";
  stage?: string | null;
  group?: string | null;
  venue?: string | null;
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  score?: FootballDataScore | null;
};

type FootballDataMatchesResponse = {
  matches: FootballDataMatch[];
};

type FootballDataJson = Record<string, unknown>;

type MatchRecord = {
  id: string;
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function stageLabel(stage?: string | null) {
  const stages: Record<string, string> = {
    GROUP_STAGE: "Group Stage",
    LAST_32: "Round of 32",
    LAST_16: "Round of 16",
    QUARTER_FINALS: "Quarterfinal",
    SEMI_FINALS: "Semifinal",
    THIRD_PLACE: "Third Place",
    FINAL: "Final",
  };

  if (!stage) return "Group Stage";
  return stages[stage] || stage.toLowerCase().split("_").map(capitalize).join(" ");
}

function groupLabel(group?: string | null) {
  if (!group) return "";
  return group.replace("GROUP_", "Group ");
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function appStatus(status: FootballDataMatch["status"]) {
  if (status === "IN_PLAY" || status === "PAUSED") return "live";
  if (status === "FINISHED" || status === "AWARDED") return "final";
  return "scheduled";
}

function appResult(match: FootballDataMatch) {
  if (appStatus(match.status) !== "final") return "";

  if (match.score?.winner === "HOME_TEAM") return "home";
  if (match.score?.winner === "AWAY_TEAM") return "away";
  if (match.score?.winner === "DRAW") return "draw";
  return "";
}

function normalizeTeamName(name?: string | null) {
  if (!name) return "TBD";
  if (name === "United States") return "USA";
  return name;
}

function matchPayload(match: FootballDataMatch) {
  return {
    external_id: String(match.id),
    stage: stageLabel(match.stage),
    group: groupLabel(match.group),
    home: normalizeTeamName(match.homeTeam.name),
    away: normalizeTeamName(match.awayTeam.name),
    venue: match.venue || "",
    kickoff: match.utcDate,
    status: appStatus(match.status),
    result: appResult(match),
  };
}

function escapePbFilterValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function errorDetails(err: unknown) {
  if (!(err instanceof Error)) return { message: String(err) };

  const clientError = err as Error & {
    status?: number;
    url?: string;
    data?: unknown;
    response?: unknown;
  };

  const cause = err.cause as
    | {
        code?: string;
        errno?: number;
        hostname?: string;
        syscall?: string;
        message?: string;
      }
    | undefined;

  return {
    name: err.name,
    message: err.message,
    status: clientError.status,
    url: clientError.url,
    data: clientError.data,
    response: clientError.response,
    cause: cause
      ? {
          code: cause.code,
          errno: cause.errno,
          hostname: cause.hostname,
          syscall: cause.syscall,
          message: cause.message,
        }
      : undefined,
  };
}

function responseStatus(err: unknown) {
  return typeof err === "object" && err && "status" in err && typeof err.status === "number"
    ? err.status
    : undefined;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchFootballDataJson(path: string) {
  const token = requiredEnv("FOOTBALL_DATA_API_TOKEN");
  const url = `${FOOTBALL_DATA_BASE_URL}${path}`;
  let lastError: unknown;

  for (let attempt = 1; attempt <= FOOTBALL_DATA_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "X-Auth-Token": token,
          "User-Agent": "wc-pool-trigger-sync/1.0",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(FOOTBALL_DATA_TIMEOUT_MS),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`football-data.org returned ${response.status}: ${body}`);
      }

      return response.json();
    } catch (err) {
      lastError = err;
      logger.warn("football-data.org request failed", {
        url,
        attempt,
        maxAttempts: FOOTBALL_DATA_RETRIES,
        error: errorDetails(err),
      });

      if (attempt < FOOTBALL_DATA_RETRIES) {
        await wait(1_000 * attempt);
      }
    }
  }

  throw new Error("football-data.org request failed after retries", {
    cause: lastError,
  });
}

function validateMatchesResponse(data: unknown): FootballDataMatchesResponse {
  if (!data || typeof data !== "object") {
    throw new Error("football-data.org returned an invalid response body");
  }

  const body = data as FootballDataJson;
  if (!Array.isArray(body.matches)) {
    throw new Error("football-data.org response did not include a matches array");
  }

  return { matches: body.matches as FootballDataMatch[] };
}

async function fetchWorldCupMatches() {
  const params = new URLSearchParams({ season: WORLD_CUP_SEASON });
  const data = validateMatchesResponse(await fetchFootballDataJson(
    `/competitions/${WORLD_CUP_COMPETITION_CODE}/matches?${params.toString()}`,
  ));

  if (data.matches.length === 0) {
    throw new Error("football-data.org returned 0 World Cup matches; refusing to mark sync as successful");
  }

  return data.matches;
}

async function pocketBaseClient() {
  const pb = new PocketBase(requiredEnv("POCKETBASE_URL"));
  await pb
    .collection("users")
    .authWithPassword(requiredEnv("POCKETBASE_ADMIN_EMAIL"), requiredEnv("POCKETBASE_ADMIN_PASSWORD"));
  return pb;
}

async function upsertMatch(pb: PocketBase, match: FootballDataMatch) {
  const payload = matchPayload(match);
  const externalId = escapePbFilterValue(payload.external_id);
  let existing: MatchRecord | null = null;

  try {
    existing = await pb
      .collection("matches")
      .getFirstListItem<MatchRecord>(`external_id="${externalId}"`);
  } catch (err) {
    if (responseStatus(err) !== 404) {
      logger.error("PocketBase match lookup failed", {
        externalId: payload.external_id,
        filter: `external_id="${externalId}"`,
        error: errorDetails(err),
      });
      throw new Error(
        `PocketBase could not query matches.external_id for football-data match ${payload.external_id}`,
        { cause: err },
      );
    }
  }

  if (existing) {
    try {
      await pb.collection("matches").update(existing.id, payload);
    } catch (err) {
      logger.error("PocketBase match update failed", {
        recordId: existing.id,
        externalId: payload.external_id,
        payload,
        error: errorDetails(err),
      });
      throw err;
    }
    return "updated";
  }

  try {
    await pb.collection("matches").create(payload);
  } catch (err) {
    logger.error("PocketBase match create failed", {
      externalId: payload.external_id,
      payload,
      error: errorDetails(err),
    });
    throw err;
  }

  return "created";
}

export const syncWorldCupMatches = schedules.task({
  id: "sync-world-cup-matches",
  cron: {
    pattern: "*/20 * * * *",
    timezone: "UTC",
  },
  retry: {
    maxAttempts: 1,
  },
  maxDuration: 300,
  run: async () => {
    try {
      const matches = await fetchWorldCupMatches();
      const pb = await pocketBaseClient();
      const totals = { created: 0, updated: 0 };

      for (const match of matches) {
        const result = await upsertMatch(pb, match);
        totals[result] += 1;
      }

      logger.log("World Cup match sync complete", {
        fetched: matches.length,
        ...totals,
      });

      return {
        fetched: matches.length,
        ...totals,
      };
    } catch (err) {
      logger.error("World Cup match sync failed", {
        error: errorDetails(err),
      });
      throw err;
    }
  },
});
