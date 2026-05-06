import type { CodexClient } from "../../integrations/codex/codexClient.js";
import { logger } from "../../shared/logger.js";
import { appSpecSchema, type AppSpec } from "./specSchema.js";

function inferAppType(request: string): AppSpec["appType"] {
  const normalized = request.toLowerCase();
  if (normalized.includes("book") || normalized.includes("appointment")) {
    return "booking_app";
  }
  if (normalized.includes("dashboard") || normalized.includes("admin")) {
    return "crud_dashboard";
  }
  if (normalized.includes("internal")) {
    return "internal_tool";
  }
  return "landing_page";
}

function normalizeAppName(rawRequest: string, appType: AppSpec["appType"]): string {
  const firstSentence = rawRequest
    .replace(/\s+/g, " ")
    .trim()
    .split(/[.!?]/)[0]
    ?.trim();

  if (firstSentence) {
    const candidate = firstSentence
      .replace(/^build\s+(me\s+)?/i, "")
      .replace(/^create\s+(me\s+)?/i, "")
      .replace(/^make\s+(me\s+)?/i, "")
      .replace(/^an?\s+/i, "")
      .replace(/^app\s+(for|that|to)\s+/i, "")
      .trim();

    if (candidate.length > 0 && candidate.length <= 50) {
      return candidate
        .split(/\s+/)
        .slice(0, 5)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
  }

  switch (appType) {
    case "booking_app":
      return "Booking Hub";
    case "crud_dashboard":
      return "Operations Dashboard";
    case "internal_tool":
      return "Internal Ops Tool";
    default:
      return "RIClaw App";
  }
}

function extractJsonObject(text: string): string | null {
  const trimmed = text.trim();

  if (trimmed.startsWith("{")) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < trimmed.length; i += 1) {
      const char = trimmed[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === "\"") {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          return trimmed.slice(0, i + 1);
        }
      }
    }
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    return extractJsonObject(fenceMatch[1].trim());
  }

  const start = trimmed.indexOf("{");
  if (start >= 0) {
    return extractJsonObject(trimmed.slice(start));
  }

  return null;

}

function buildFallbackSpec(rawRequest: string): AppSpec {
  const appType = inferAppType(rawRequest);
  const authRequired = /\blogin\b|\bauth\b|\baccount\b|\bsign in\b/i.test(rawRequest);
  const dataNeeds = /\bdatabase\b|\bstore\b|\btrack\b|\bmanage\b|\brecord\b/i.test(rawRequest)
    ? "basic_persistence"
    : "mock";

  return {
    appName: normalizeAppName(rawRequest, appType),
    appType,
    summary: rawRequest.trim(),
    targetUsers: authRequired ? ["signed-in users", "operators"] : ["end users"],
    features: ["responsive UI", "core workflow from user request", authRequired ? "authentication flow" : "clear call to action"],
    pages:
      appType === "booking_app"
        ? ["home", "book", "confirmation"]
        : appType === "crud_dashboard"
          ? ["dashboard", "records", "settings"]
          : appType === "internal_tool"
            ? ["home", "queue", "review"]
            : ["home", "features", "contact"],
    authRequired,
    dataNeeds,
    stylingNotes: [
      "clean layout",
      appType === "landing_page" ? "warm marketing feel" : "clear operational UX"
    ],
    assumptions: [
      "The request was converted with fallback planning because Codex planning was unavailable or invalid.",
      "The generated app should stay within a lightweight Vercel-friendly first version."
    ]
  };
}

export class SpecExtractor {
  constructor(private readonly codexClient: CodexClient) {}

  async extract(rawRequest: string): Promise<AppSpec> {
    try {
      const response = await this.codexClient.planSpec({ rawRequest });
      const json = extractJsonObject(response);
      if (!json) {
        throw new Error("Codex planner did not return a JSON object.");
      }

      const parsed = JSON.parse(json) as unknown;
      return appSpecSchema.parse(parsed);
    } catch (error) {
      logger.error("Falling back to heuristic spec extraction.", {
        error: error instanceof Error ? error.message : String(error)
      });
      return buildFallbackSpec(rawRequest);
    }
  }
}
