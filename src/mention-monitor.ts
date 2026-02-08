/**
 * Mention Monitor — Checks X mentions hourly and responds to safety queries.
 * Recognized patterns:
 *   "is @agent safe?" / "is 0x... safe?"
 *   "report @agent" / "report 0x..."
 *   "score 0x..."
 */

import { XClient, type Tweet } from "./social/x-client.js";
import { FarcasterClient, type Cast } from "./social/farcaster-client.js";
import { readMemory, type MonitoredAgent } from "./memory-manager.js";
import { RateLimiter } from "./social-poster.js";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MentionQuery {
  type: "safety_check" | "report" | "score" | "unknown";
  targetAddress?: string;
  targetHandle?: string;
  sourceId: string; // tweet ID or cast hash
  sourcePlatform: "x" | "farcaster";
}

// ─── State ───────────────────────────────────────────────────────────────────

let lastXMentionId: string | undefined;
let lastFarcasterCursor: string | undefined;

// ─── Address pattern ─────────────────────────────────────────────────────────

const ETH_ADDRESS_RE = /0x[a-fA-F0-9]{40}/;

function extractAddress(text: string): string | undefined {
  const match = text.match(ETH_ADDRESS_RE);
  return match ? match[0].toLowerCase() : undefined;
}

function extractHandle(text: string): string | undefined {
  // Look for @handle patterns (not our own)
  const mentions = text.match(/@(\w+)/g);
  if (!mentions) return undefined;
  // Filter out our own handle
  const handles = mentions
    .map((m) => m.slice(1).toLowerCase())
    .filter((h) => h !== "agentsafetybase" && h !== "agentsafety");
  return handles[0];
}

function classifyMention(text: string): MentionQuery["type"] {
  const lower = text.toLowerCase();
  if (lower.includes("safe?") || lower.includes("is") && lower.includes("safe")) {
    return "safety_check";
  }
  if (lower.includes("report")) {
    return "report";
  }
  if (lower.includes("score")) {
    return "score";
  }
  return "unknown";
}

// ─── Lookup agent ────────────────────────────────────────────────────────────

function findAgent(
  query: MentionQuery,
  agents: MonitoredAgent[]
): MonitoredAgent | null {
  if (query.targetAddress) {
    return (
      agents.find(
        (a) => a.address.toLowerCase() === query.targetAddress!.toLowerCase()
      ) || null
    );
  }
  if (query.targetHandle) {
    return (
      agents.find(
        (a) => a.name.toLowerCase().includes(query.targetHandle!.toLowerCase())
      ) || null
    );
  }
  return null;
}

// ─── Response formatting ─────────────────────────────────────────────────────

function formatSafetyResponse(agent: MonitoredAgent): string {
  const shortAddr = `${agent.address.slice(0, 6)}...${agent.address.slice(-4)}`;
  const safetyLevel =
    agent.score >= 850
      ? "LOW RISK"
      : agent.score >= 700
        ? "MODERATE"
        : agent.score >= 500
          ? "ELEVATED"
          : "HIGH RISK";

  return [
    `Safety Report for ${agent.name} [${shortAddr}]:`,
    `Score: ${agent.score}/1000 (${safetyLevel})`,
    `Badge: ${agent.badge || "None"}`,
    `Stake: ${agent.stake || "0"} ETH`,
    `Last updated: ${agent.lastUpdated}`,
  ].join("\n");
}

function formatNotFoundResponse(query: MentionQuery): string {
  const target = query.targetAddress
    ? `${query.targetAddress.slice(0, 10)}...`
    : query.targetHandle || "that agent";
  return `I don't currently monitor ${target}. If you think this agent should be tracked, please submit its address for review.`;
}

// ─── Main check function ─────────────────────────────────────────────────────

export async function checkMentions(
  rateLimiter: RateLimiter
): Promise<{ checked: number; responded: number }> {
  const memory = readMemory();
  let checked = 0;
  let responded = 0;

  // ── Check X mentions ───────────────────────────────────────────────────
  const xClient = new XClient();
  if (xClient.isConfigured()) {
    try {
      const mentions = await xClient.getMentions(lastXMentionId);
      checked += mentions.length;

      for (const tweet of mentions) {
        // Track latest ID for pagination
        if (!lastXMentionId || tweet.id > lastXMentionId) {
          lastXMentionId = tweet.id;
        }

        // Rate limit check
        if (!rateLimiter.canPost()) {
          console.log("[MENTIONS] Rate limit reached, skipping remaining mentions");
          break;
        }

        const query: MentionQuery = {
          type: classifyMention(tweet.text),
          targetAddress: extractAddress(tweet.text),
          targetHandle: extractHandle(tweet.text),
          sourceId: tweet.id,
          sourcePlatform: "x",
        };

        if (query.type === "unknown") continue;

        const agent = findAgent(query, memory.agents);
        const responseText = agent
          ? formatSafetyResponse(agent)
          : formatNotFoundResponse(query);

        const result = await xClient.replyToTweet(responseText, tweet.id);
        if (result.success) {
          rateLimiter.recordPost();
          responded++;
          console.log(`[MENTIONS] Replied to X mention ${tweet.id}`);
        }
      }
    } catch (err: any) {
      console.error(`[MENTIONS] X check failed: ${err.message}`);
    }
  }

  // ── Check Farcaster mentions ───────────────────────────────────────────
  const fcClient = new FarcasterClient();
  if (fcClient.isConfigured()) {
    const fid = parseInt(process.env.FARCASTER_FID || "0", 10);
    if (fid > 0) {
      try {
        const casts = await fcClient.getNotifications(fid, lastFarcasterCursor);
        checked += casts.length;

        for (const cast of casts) {
          if (!rateLimiter.canPost()) break;

          const query: MentionQuery = {
            type: classifyMention(cast.text),
            targetAddress: extractAddress(cast.text),
            targetHandle: extractHandle(cast.text),
            sourceId: cast.hash,
            sourcePlatform: "farcaster",
          };

          if (query.type === "unknown") continue;

          const agent = findAgent(query, memory.agents);
          const responseText = agent
            ? formatSafetyResponse(agent)
            : formatNotFoundResponse(query);

          const result = await fcClient.replyCast(responseText, cast.hash);
          if (result.success) {
            rateLimiter.recordPost();
            responded++;
            console.log(`[MENTIONS] Replied to Farcaster cast ${cast.hash}`);
          }
        }
      } catch (err: any) {
        console.error(`[MENTIONS] Farcaster check failed: ${err.message}`);
      }
    }
  }

  return { checked, responded };
}
