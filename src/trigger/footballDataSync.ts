import {logger, schedules, tasks} from "@trigger.dev/sdk/v3";
import type PocketBase from "pocketbase";
import type {syncLeaderboard} from "./leaderboardSync.ts";
import {recordActivityEvent} from "./activityEvents.ts";
import {pocketBaseClient} from "./pocketbaseClient.ts";

const FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4";
const WORLD_CUP_COMPETITION_CODE = "WC";
const WORLD_CUP_SEASON = process.env.FOOTBALL_DATA_SEASON || "2026";
const FOOTBALL_DATA_TIMEOUT_MS = 15_000;
const FOOTBALL_DATA_RETRIES = 1;

type FootballDataTeam = {
    name?: string | null;
    crest?: string | null;
};

type FootballDataScore = {
    winner?: string | null;
    fullTime?: FootballDataScorePair | null;
    regularTime?: FootballDataScorePair | null;
    extraTime?: FootballDataScorePair | null;
    penalties?: FootballDataScorePair | null;
    halfTime?: FootballDataScorePair | null;
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
    matchday?: number | null;
    venue?: string | null;
    lastUpdated?: string | null;
    homeTeam: FootballDataTeam;
    awayTeam: FootballDataTeam;
    score?: FootballDataScore | null;
};

type FootballDataScorePair = {
    home?: number | string | null;
    away?: number | string | null;
    homeTeam?: number | string | null;
    awayTeam?: number | string | null;
};

type FootballDataMatchesResponse = {
    matches: FootballDataMatch[];
};

type FootballDataJson = Record<string, unknown>;

type MatchRecord = {
    id: string;
    external_id?: string;
    stage?: string;
    group?: string;
    matchday?: number | null;
    home?: string;
    away?: string;
    home_crest?: string;
    away_crest?: string;
    venue?: string;
    kickoff?: string;
    status?: "scheduled" | "live" | "final" | "";
    result?: "home" | "draw" | "away" | "";
    home_score?: number | null;
    away_score?: number | null;
};

type UpsertResult = "created" | "updated" | "unchanged";
type MatchUpsertResult = {
    result: UpsertResult;
    recordId: string;
    shouldEmitResultEvent: boolean;
};
type AppResult = "home" | "draw" | "away" | null;

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
    switch (status) {
        case "IN_PLAY":
        case "PAUSED":
        case "SUSPENDED":
            return "live";
        case "FINISHED":
        case "AWARDED":
            return "final";
        case "SCHEDULED":
        case "TIMED":
        case "POSTPONED":
        case "CANCELLED":
            return "scheduled";
    }
}

function appResult(match: FootballDataMatch): AppResult {
    if (appStatus(match.status) !== "final") return null;

    const scorePair = matchScore(match);
    if (!isCompleteScorePair(scorePair)) return null;
    const [homeScore, awayScore] = scorePair;
    if (homeScore > awayScore) return "home";
    if (awayScore > homeScore) return "away";
    return "draw";
}

function scoreValue(value?: number | string | null) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const score = Number(value);
        if (Number.isFinite(score)) return score;
    }

    return null;
}

function scorePairValue(pair?: FootballDataScorePair | null): [number | null, number | null] {
    if (!pair) return [null, null];

    return [
        scoreValue(pair.home ?? pair.homeTeam),
        scoreValue(pair.away ?? pair.awayTeam),
    ];
}

function hasCompleteScore(homeScore: number | null, awayScore: number | null) {
    return homeScore !== null && awayScore !== null;
}

function isCompleteScorePair(pair: [number | null, number | null]): pair is [number, number] {
    return hasCompleteScore(pair[0], pair[1]);
}

function matchScore(match: FootballDataMatch): [number | null, number | null] {
    const score = match.score;
    if (!score) return [null, null];

    const candidates = [
        score.regularTime,
        score.fullTime,
        score.extraTime,
        score.penalties,
        score.halfTime,
    ];

    for (const candidate of candidates) {
        const pair = scorePairValue(candidate);
        if (isCompleteScorePair(pair)) return pair;
    }

    return [null, null];
}

function normalizeTeamName(name?: string | null) {
    if (!name) return "TBD";
    if (name === "United States") return "USA";
    return name;
}

function matchPayload(match: FootballDataMatch) {
    const [homeScore, awayScore] = matchScore(match);

    return {
        external_id: String(match.id),
        stage: stageLabel(match.stage),
        group: groupLabel(match.group),
        matchday: typeof match.matchday === "number" ? match.matchday : null,
        home: normalizeTeamName(match.homeTeam.name),
        away: normalizeTeamName(match.awayTeam.name),
        home_crest: match.homeTeam.crest || "",
        away_crest: match.awayTeam.crest || "",
        venue: match.venue || "",
        kickoff: match.utcDate,
        status: appStatus(match.status),
        result: appResult(match),
        home_score: homeScore,
        away_score: awayScore,
    };
}

function preserveFinalState(payload: ReturnType<typeof matchPayload>, existing: MatchRecord | null) {
    if (!existing) return payload;
    const existingIsFinal = existing.status === "final" || Boolean(existing.result);
    if (!existingIsFinal || payload.status === "final") return payload;

    logger.warn("Ignoring non-final upstream regression for final match", {
        recordId: existing.id,
        externalId: payload.external_id,
        existingStatus: existing.status,
        existingResult: existing.result,
        upstreamStatus: payload.status,
        upstreamResult: payload.result,
    });

    return {
        ...payload,
        status: "final",
        result: existing.result || payload.result,
        home_score: existing.home_score ?? payload.home_score,
        away_score: existing.away_score ?? payload.away_score,
    };
}

function normalizedOptionalString(value?: string | null) {
    return value || "";
}

function sameOptionalNumber(a?: number | null, b?: number | null) {
    return (a ?? null) === (b ?? null);
}

function sameDateTime(a?: string | null, b?: string | null) {
    const normalizedA = normalizedOptionalString(a);
    const normalizedB = normalizedOptionalString(b);
    if (!normalizedA || !normalizedB) return normalizedA === normalizedB;

    const timeA = new Date(normalizedA).getTime();
    const timeB = new Date(normalizedB).getTime();
    if (!Number.isFinite(timeA) || !Number.isFinite(timeB)) {
        return normalizedA === normalizedB;
    }

    return timeA === timeB;
}

function matchPayloadChanged(payload: ReturnType<typeof matchPayload>, existing: MatchRecord) {
    return (
        normalizedOptionalString(existing.external_id) !== payload.external_id ||
        normalizedOptionalString(existing.stage) !== payload.stage ||
        normalizedOptionalString(existing.group) !== payload.group ||
        !sameOptionalNumber(existing.matchday, payload.matchday) ||
        normalizedOptionalString(existing.home) !== payload.home ||
        normalizedOptionalString(existing.away) !== payload.away ||
        normalizedOptionalString(existing.home_crest) !== payload.home_crest ||
        normalizedOptionalString(existing.away_crest) !== payload.away_crest ||
        normalizedOptionalString(existing.venue) !== payload.venue ||
        !sameDateTime(existing.kickoff, payload.kickoff) ||
        normalizedOptionalString(existing.status) !== payload.status ||
        normalizedOptionalString(existing.result) !== normalizedOptionalString(payload.result) ||
        !sameOptionalNumber(existing.home_score, payload.home_score) ||
        !sameOptionalNumber(existing.away_score, payload.away_score)
    );
}

function escapePbFilterValue(value: string) {
    return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function errorDetails(err: unknown) {
    if (!(err instanceof Error)) return {message: String(err)};

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

    return {matches: body.matches as FootballDataMatch[]};
}

async function fetchWorldCupMatches() {
    const params = new URLSearchParams({season: WORLD_CUP_SEASON});
    const data = validateMatchesResponse(await fetchFootballDataJson(
        `/competitions/${WORLD_CUP_COMPETITION_CODE}/matches?${params.toString()}`,
    ));

    if (data.matches.length === 0) {
        throw new Error("football-data.org returned 0 World Cup matches; refusing to mark sync as successful");
    }

    return data.matches;
}

async function upsertMatch(pb: PocketBase, match: FootballDataMatch): Promise<MatchUpsertResult> {
    const rawPayload = matchPayload(match);
    let payload = rawPayload;
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
                {cause: err},
            );
        }
    }

    if (existing) {
        payload = preserveFinalState(rawPayload, existing);
        if (!matchPayloadChanged(payload, existing)) {
            return {
                result: "unchanged",
                recordId: existing.id,
                shouldEmitResultEvent: false,
            };
        }

        if (payload.status === "final") {
            logger.log("Updating final football-data match", {
                recordId: existing.id,
                externalId: payload.external_id,
                providerStatus: match.status,
                providerWinner: match.score?.winner,
                providerScore: match.score,
                result: payload.result,
                homeScore: payload.home_score,
                awayScore: payload.away_score,
            });
        }

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
        return {
            result: "updated",
            recordId: existing.id,
            shouldEmitResultEvent: Boolean(payload.result && payload.result !== existing.result),
        };
    }

    try {
        const created = await pb.collection("matches").create<MatchRecord>(payload);
        return {
            result: "created",
            recordId: created.id,
            shouldEmitResultEvent: Boolean(payload.result),
        };
    } catch (err) {
        logger.error("PocketBase match create failed", {
            externalId: payload.external_id,
            payload,
            error: errorDetails(err),
        });
        throw err;
    }
}

export const syncWorldCupMatches = schedules.task({
    id: "sync-world-cup-matches",
    cron: {
        pattern: "*/10 * * * *",
        timezone: "UTC",
    },
    retry: {
        maxAttempts: 1,
    },
    maxDuration: 300,
    run: async () => {
        try {
            const matches = await fetchWorldCupMatches();
            const pb = await pocketBaseClient("matches-sync");
            const totals: Record<UpsertResult, number> = {created: 0, updated: 0, unchanged: 0};

            for (const match of matches) {
                const result = await upsertMatch(pb, match);
                totals[result.result] += 1;
                if (result.shouldEmitResultEvent) {
                    await recordActivityEvent({
                        type: "result",
                        matchId: result.recordId,
                    }, `matches-sync:${result.recordId}`);
                }
            }

            logger.log("World Cup match sync complete", {
                fetched: matches.length,
                ...totals,
            });

            if (totals.created > 0 || totals.updated > 0) {
                try {
                    await tasks.trigger<typeof syncLeaderboard>("sync-leaderboard", {reason: "matches-sync"});
                } catch (err) {
                    logger.error("Failed to trigger leaderboard sync after match sync", {
                        error: errorDetails(err),
                    });
                }
            }

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
