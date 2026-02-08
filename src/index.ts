/**
 * Agent Safety Monitor — Main entry point
 * Runs the HEARTBEAT cycle on a 6-hour schedule.
 */

import "dotenv/config";
import { executeHeartbeat } from "./heartbeat-executor.js";
import { checkMentions } from "./mention-monitor.js";
import { rateLimiter } from "./social-poster.js";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

// ─── Health check state ──────────────────────────────────────────────────────

const healthState = {
  startedAt: new Date().toISOString(),
  lastCycleAt: "never",
  lastCycleSuccess: false,
  totalCycles: 0,
  errors: [] as string[],
};

// ─── Scheduled runner ────────────────────────────────────────────────────────

async function runCycle(): Promise<void> {
  console.log(`\n[${new Date().toISOString()}] Starting HEARTBEAT cycle #${healthState.totalCycles + 1}...\n`);

  try {
    const result = await executeHeartbeat();
    healthState.lastCycleAt = new Date().toISOString();
    healthState.lastCycleSuccess = result.success;
    healthState.totalCycles++;
    healthState.errors = result.errors;

    if (!result.success) {
      console.error(`[WARN] Cycle completed with ${result.errors.length} error(s):`);
      for (const err of result.errors) {
        console.error(`  - ${err}`);
      }
    }
  } catch (err: any) {
    console.error(`[ERROR] Heartbeat cycle failed:`, err.message);
    healthState.lastCycleAt = new Date().toISOString();
    healthState.lastCycleSuccess = false;
    healthState.errors = [err.message];
  }
}

function scheduleNextCycle(): void {
  setTimeout(async () => {
    await runCycle();
    scheduleNextCycle();
  }, SIX_HOURS_MS);
}

// ─── Mention monitoring (hourly) ─────────────────────────────────────────────

async function runMentionCheck(): Promise<void> {
  try {
    const result = await checkMentions(rateLimiter);
    if (result.checked > 0 || result.responded > 0) {
      console.log(`[MENTIONS] Checked ${result.checked} mentions, responded to ${result.responded}`);
    }
  } catch (err: any) {
    console.error(`[MENTIONS] Check failed: ${err.message}`);
  }
}

function scheduleMentionChecks(): void {
  setInterval(async () => {
    await runMentionCheck();
  }, ONE_HOUR_MS);
}

// ─── Health check endpoint (for Railway/Render) ──────────────────────────────

async function startHealthServer(): Promise<void> {
  // Lightweight HTTP health check — no external deps needed
  const { createServer } = await import("http");
  const port = parseInt(process.env.PORT || "3001", 10);

  const server = createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "running",
          uptime: process.uptime(),
          ...healthState,
        })
      );
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  server.listen(port, () => {
    console.log(`[HEALTH] Health check server running on port ${port}`);
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║   Agent Safety Monitor — Starting Up                 ║");
  console.log("║   Autonomous AI Agent Watchdog on Base               ║");
  console.log("╚═══════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`  Schedule: Every 6 hours`);
  console.log(`  Started:  ${healthState.startedAt}`);
  console.log("");

  // Check critical env vars
  const requiredVars = ["BASE_RPC_URL", "AGENT_PRIVATE_KEY"];
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.warn(`[WARN] Missing env vars: ${missing.join(", ")}`);
    console.warn("  Some features will be unavailable.\n");
  }

  // Start health check server
  await startHealthServer();

  // Run first cycle immediately
  await runCycle();

  // Schedule subsequent cycles and mention checks
  console.log(`\n[SCHEDULER] Next heartbeat in 6 hours. Mention checks every 1 hour.`);
  scheduleNextCycle();
  scheduleMentionChecks();
}

// Handle CLI arguments
const args = process.argv.slice(2);

if (args.includes("--once")) {
  // Single cycle mode (for testing)
  console.log("[MODE] Single cycle mode (--once)\n");
  import("dotenv/config").then(() => {
    runCycle().then(() => {
      console.log("\n[DONE] Single cycle complete. Exiting.");
      process.exit(0);
    });
  });
} else {
  main().catch((err) => {
    console.error("[FATAL]", err);
    process.exit(1);
  });
}
