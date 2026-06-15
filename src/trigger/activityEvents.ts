import { logger } from "@trigger.dev/sdk/v3";

type ActivityEventRequest = {
  type: "prediction" | "result" | "rank-climb";
  workspaceId?: string;
  userId?: string;
  matchId?: string;
  rank?: number;
  previousRank?: number;
  spots?: number;
  points?: number;
  correct?: number;
  predictions?: number;
  playerName?: string;
  occurredAt?: string;
  eventKey?: string;
};

function activityEventsEndpoint() {
  if (process.env.ACTIVITY_EVENTS_API_URL) return process.env.ACTIVITY_EVENTS_API_URL;
  if (process.env.PUBLIC_APP_URL) {
    return `${process.env.PUBLIC_APP_URL.replace(/\/$/, "")}/api/activity/events`;
  }
  return "";
}

export async function recordActivityEvent(event: ActivityEventRequest, context: string) {
  const endpoint = activityEventsEndpoint();
  const secret = process.env.ACTIVITY_EVENTS_SECRET;

  if (!endpoint || !secret) {
    logger.warn("Activity event endpoint is not configured; skipping event write", {
      context,
      type: event.type,
    });
    return false;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-activity-events-secret": secret,
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.error("Activity event endpoint failed", {
      context,
      status: response.status,
      body,
      type: event.type,
    });
    return false;
  }

  return true;
}
