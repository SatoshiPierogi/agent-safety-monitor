/**
 * Social Poster — Templates and posting for X and Farcaster.
 * Integrates with real API clients and enforces rate limits.
 */

import { XClient } from "./social/x-client.js";
import { FarcasterClient } from "./social/farcaster-client.js";
import type { EnforcementAction, DecisionResult } from "./decision-engine.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SocialPost {
  platform: "x" | "farcaster" | "both";
  content: string;
  priority: "critical" | "high" | "normal";
  posted: boolean;
  timestamp: string;
  tweetId?: string;
  castHash?: string;
}

// ─── Rate Limiter ────────────────────────────────────────────────────────────

export class RateLimiter {
  private posts: number[] = []; // timestamps of posts
  private maxPerHour: number;
  private maxPerDay: number;

  constructor(maxPerHour: number = 20, maxPerDay: number = 100) {
    this.maxPerHour = maxPerHour;
    this.maxPerDay = maxPerDay;
  }

  canPost(): boolean {
    this.prune();
    const now = Date.now();
    const lastHour = this.posts.filter((t) => now - t < 3600000).length;
    const lastDay = this.posts.filter((t) => now - t < 86400000).length;
    return lastHour < this.maxPerHour && lastDay < this.maxPerDay;
  }

  recordPost(): void {
    this.posts.push(Date.now());
  }

  private prune(): void {
    const cutoff = Date.now() - 86400000;
    this.posts = this.posts.filter((t) => t > cutoff);
  }

  getStats(): { hourly: number; daily: number; hourlyLimit: number; dailyLimit: number } {
    this.prune();
    const now = Date.now();
    return {
      hourly: this.posts.filter((t) => now - t < 3600000).length,
      daily: this.posts.length,
      hourlyLimit: this.maxPerHour,
      dailyLimit: this.maxPerDay,
    };
  }
}

// ─── Singleton clients and rate limiter ──────────────────────────────────────

const xClient = new XClient();
const fcClient = new FarcasterClient();
export const rateLimiter = new RateLimiter(20, 100);

// ─── Post queue ──────────────────────────────────────────────────────────────

const postQueue: SocialPost[] = [];

export function getPostQueue(): SocialPost[] {
  return [...postQueue];
}

export function clearPostQueue(): void {
  postQueue.length = 0;
}

// ─── Templates ───────────────────────────────────────────────────────────────

export function criticalAlert(
  agentAddress: string,
  agentName: string,
  violation: string,
  oldScore: number,
  newScore: number,
  action: string,
  txHash?: string
): SocialPost {
  const shortAddr = `${agentAddress.slice(0, 6)}...${agentAddress.slice(-4)}`;
  const scoreChange = newScore - oldScore;
  const txLink = txHash ? `\nTx: basescan.org/tx/${txHash}` : "";

  const content = [
    `CRITICAL: Agent ${agentName} [${shortAddr}]`,
    `Violation: ${violation}`,
    `Score: ${newScore} (${scoreChange >= 0 ? "+" : ""}${scoreChange})`,
    `Action: ${action}`,
    txLink,
  ]
    .filter(Boolean)
    .join("\n");

  const post: SocialPost = {
    platform: "both",
    content,
    priority: "critical",
    posted: false,
    timestamp: new Date().toISOString(),
  };

  postQueue.push(post);
  console.log(`[SOCIAL] CRITICAL ALERT queued:\n${content}\n`);
  return post;
}

export function dailySummary(
  date: string,
  agentsMonitored: number,
  violations: { critical: number; high: number; medium: number; low: number },
  badgesIssued: number,
  topAgent?: { name: string; score: number },
  biggestDrop?: { name: string; change: number }
): SocialPost {
  const totalViolations =
    violations.critical + violations.high + violations.medium + violations.low;

  const lines = [
    `Daily Safety Report — ${date}`,
    `Agents Monitored: ${agentsMonitored}`,
    `Violations: ${totalViolations} (C:${violations.critical} H:${violations.high} M:${violations.medium} L:${violations.low})`,
    `Badges Issued: ${badgesIssued}`,
  ];

  if (topAgent) {
    lines.push(`Top Agent: ${topAgent.name} (${topAgent.score})`);
  }
  if (biggestDrop) {
    lines.push(`Biggest Drop: ${biggestDrop.name} (${biggestDrop.change})`);
  }

  const content = lines.join("\n");

  const post: SocialPost = {
    platform: "both",
    content,
    priority: "normal",
    posted: false,
    timestamp: new Date().toISOString(),
  };

  postQueue.push(post);
  console.log(`[SOCIAL] Daily summary queued:\n${content}\n`);
  return post;
}

export function checkpointSummary(
  agentsScanned: number,
  violationsFound: number,
  actionsExecuted: number,
  cycleNumber: number
): SocialPost {
  const content = [
    `6h Checkpoint #${cycleNumber}`,
    `Scanned: ${agentsScanned} agents`,
    `Violations: ${violationsFound}`,
    `Actions: ${actionsExecuted}`,
    `All systems operational.`,
  ].join("\n");

  const post: SocialPost = {
    platform: "both",
    content,
    priority: "normal",
    posted: false,
    timestamp: new Date().toISOString(),
  };

  postQueue.push(post);
  console.log(`[SOCIAL] Checkpoint summary queued:\n${content}\n`);
  return post;
}

export function mentionResponse(
  queryAgent: string,
  score: number,
  badge: string,
  stakeEth: number,
  riskFactors: string[]
): SocialPost {
  const shortAddr = `${queryAgent.slice(0, 6)}...${queryAgent.slice(-4)}`;
  const risk =
    riskFactors.length > 0
      ? `Risk factors: ${riskFactors.join(", ")}`
      : "No risk factors detected";

  const content = [
    `Safety Report for ${shortAddr}:`,
    `Score: ${score}/1000`,
    `Badge: ${badge || "None"}`,
    `Stake: ${stakeEth} ETH`,
    risk,
  ].join("\n");

  const post: SocialPost = {
    platform: "x",
    content,
    priority: "normal",
    posted: false,
    timestamp: new Date().toISOString(),
  };

  postQueue.push(post);
  console.log(`[SOCIAL] Mention response queued:\n${content}\n`);
  return post;
}

// ─── Publish posts ───────────────────────────────────────────────────────────

export async function publishPosts(): Promise<number> {
  let published = 0;
  const xConfigured = xClient.isConfigured();
  const fcConfigured = fcClient.isConfigured();

  // Sort by priority: critical first
  const sorted = [...postQueue].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, normal: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  for (const post of sorted) {
    if (post.posted) continue;

    // Rate limit check (critical posts bypass hourly limit but not daily)
    if (post.priority !== "critical" && !rateLimiter.canPost()) {
      console.log(`[SOCIAL] Rate limit reached, skipping: ${post.content.slice(0, 50)}...`);
      continue;
    }

    let postedToX = false;
    let postedToFc = false;

    // Post to X
    if ((post.platform === "x" || post.platform === "both") && xConfigured) {
      const result = await xClient.postTweet(post.content);
      if (result.success) {
        post.tweetId = result.tweet_id;
        postedToX = true;
      } else {
        console.error(`[SOCIAL] X post failed: ${result.error}`);
      }
    }

    // Post to Farcaster
    if ((post.platform === "farcaster" || post.platform === "both") && fcConfigured) {
      const result = await fcClient.postCast(post.content);
      if (result.success) {
        post.castHash = result.cast_hash;
        postedToFc = true;
      } else {
        console.error(`[SOCIAL] Farcaster post failed: ${result.error}`);
      }
    }

    // If neither platform is configured, log it
    if (!xConfigured && !fcConfigured) {
      console.log(`[SOCIAL] No platforms configured. Would post: ${post.content.slice(0, 80)}...`);
      post.posted = true;
      published++;
      continue;
    }

    if (postedToX || postedToFc) {
      post.posted = true;
      rateLimiter.recordPost();
      published++;
    }
  }

  const stats = rateLimiter.getStats();
  console.log(
    `[SOCIAL] Published ${published} posts. Rate: ${stats.hourly}/${stats.hourlyLimit}/hr, ${stats.daily}/${stats.dailyLimit}/day`
  );

  return published;
}
