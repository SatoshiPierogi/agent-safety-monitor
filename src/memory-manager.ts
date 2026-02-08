/**
 * Memory Manager — Reads/writes MEMORY.md and daily log files.
 * Handles persistent state for the agent across heartbeat cycles.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const WORKSPACE_DIR = join(process.cwd(), "workspace");
const MEMORY_PATH = join(WORKSPACE_DIR, "MEMORY.md");
const LOGS_DIR = join(process.cwd(), "logs", "daily");

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MonitoredAgent {
  address: string;
  name: string;
  score: number;
  lastUpdated: string;
  badge: string;
  stake: string;
  notes: string;
}

export interface ApiStatus {
  name: string;
  status: "up" | "down" | "unknown";
  lastChecked: string;
  cacheTtl: string;
  notes: string;
}

export interface OperationalStats {
  totalCycles: number;
  totalAgentsMonitored: number;
  totalViolationsDetected: number;
  totalEnforcementActions: number;
  walletBalance: string;
  lastCycle: string;
}

export interface MemoryState {
  agents: MonitoredAgent[];
  apiStatus: ApiStatus[];
  stats: OperationalStats;
}

// ─── Parse MEMORY.md ─────────────────────────────────────────────────────────

export function readMemory(): MemoryState {
  if (!existsSync(MEMORY_PATH)) {
    return {
      agents: [],
      apiStatus: [],
      stats: {
        totalCycles: 0,
        totalAgentsMonitored: 0,
        totalViolationsDetected: 0,
        totalEnforcementActions: 0,
        walletBalance: "Unknown",
        lastCycle: "Never",
      },
    };
  }

  const content = readFileSync(MEMORY_PATH, "utf-8");
  const agents = parseAgentsTable(content);
  const apiStatus = parseApiStatusTable(content);
  const stats = parseOperationalStats(content);

  return { agents, apiStatus, stats };
}

function parseAgentsTable(content: string): MonitoredAgent[] {
  const agents: MonitoredAgent[] = [];
  const lines = content.split("\n");
  let inTable = false;
  let headerPassed = false;

  for (const line of lines) {
    if (line.includes("| Address") && line.includes("Name/Handle")) {
      inTable = true;
      continue;
    }
    if (inTable && line.startsWith("|---")) {
      headerPassed = true;
      continue;
    }
    if (inTable && headerPassed && line.startsWith("|")) {
      const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 7 && cells[0] !== "—") {
        agents.push({
          address: cells[0],
          name: cells[1],
          score: parseInt(cells[2]) || 500,
          lastUpdated: cells[3],
          badge: cells[4],
          stake: cells[5],
          notes: cells[6],
        });
      }
    }
    if (inTable && headerPassed && !line.startsWith("|") && line.trim() !== "") {
      break;
    }
  }

  return agents;
}

function parseApiStatusTable(content: string): ApiStatus[] {
  const statuses: ApiStatus[] = [];
  const lines = content.split("\n");
  let inTable = false;
  let headerPassed = false;

  for (const line of lines) {
    if (line.includes("| API") && line.includes("Status")) {
      inTable = true;
      continue;
    }
    if (inTable && line.startsWith("|---")) {
      headerPassed = true;
      continue;
    }
    if (inTable && headerPassed && line.startsWith("|")) {
      const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 5) {
        statuses.push({
          name: cells[0],
          status: (cells[1]?.toLowerCase() as "up" | "down" | "unknown") || "unknown",
          lastChecked: cells[2],
          cacheTtl: cells[3],
          notes: cells[4],
        });
      }
    }
    if (inTable && headerPassed && !line.startsWith("|") && line.trim() !== "") {
      break;
    }
  }

  return statuses;
}

function parseOperationalStats(content: string): OperationalStats {
  const stats: OperationalStats = {
    totalCycles: 0,
    totalAgentsMonitored: 0,
    totalViolationsDetected: 0,
    totalEnforcementActions: 0,
    walletBalance: "Unknown",
    lastCycle: "Never",
  };

  const extract = (label: string): string => {
    const regex = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, "i");
    const match = content.match(regex);
    return match ? match[1].trim() : "";
  };

  stats.totalCycles = parseInt(extract("Total Cycles Completed")) || 0;
  stats.totalAgentsMonitored = parseInt(extract("Total Agents Monitored")) || 0;
  stats.totalViolationsDetected = parseInt(extract("Total Violations Detected")) || 0;
  stats.totalEnforcementActions = parseInt(extract("Total Enforcement Actions")) || 0;
  stats.walletBalance = extract("Wallet Balance") || "Unknown";
  stats.lastCycle = extract("Last Cycle") || "Never";

  return stats;
}

// ─── Write MEMORY.md ─────────────────────────────────────────────────────────

export function writeMemory(state: MemoryState): void {
  const agentRows =
    state.agents.length > 0
      ? state.agents
          .map(
            (a) =>
              `| ${a.address} | ${a.name} | ${a.score} | ${a.lastUpdated} | ${a.badge} | ${a.stake} | ${a.notes} |`
          )
          .join("\n")
      : "| — | — | — | — | — | — | No agents registered yet |";

  const apiRows = state.apiStatus
    .map(
      (a) =>
        `| ${a.name} | ${a.status} | ${a.lastChecked} | ${a.cacheTtl} | ${a.notes} |`
    )
    .join("\n");

  const content = `# MEMORY.md — Long-Term Curated State

**SECURITY: Only load this file in the main private session. Never in group contexts.**

## Monitored Agents

<!-- Format: | Address | Name/Handle | Current Score | Last Updated | Badge | Stake (ETH) | Notes | -->
| Address | Name/Handle | Score | Updated | Badge | Stake | Notes |
|---------|-------------|-------|---------|-------|-------|-------|
${agentRows}

## Detection Patterns

### Known Attack Vectors
- Rapid drain: >3 outbound transfers within 1 hour to different addresses
- High failure rate: >30% failed transactions over 24 hours
- Rug indicators: liquidity removal + large token transfers in sequence

### Learned Patterns
<!-- Agent will append new patterns here as they are discovered -->

## API Status

| API | Status | Last Checked | Cache TTL | Notes |
|-----|--------|-------------|-----------|-------|
${apiRows}

## Contract Addresses

<!-- Will be populated after deployment -->
| Contract | Address | Network |
|----------|---------|---------|
| AgentRegistry | — | Base |
| ReputationCore | — | Base |
| SafetyStaking | — | Base |
| SafetyBadge | — | Base |

## Operational Stats

- **Total Cycles Completed:** ${state.stats.totalCycles}
- **Total Agents Monitored:** ${state.stats.totalAgentsMonitored}
- **Total Violations Detected:** ${state.stats.totalViolationsDetected}
- **Total Enforcement Actions:** ${state.stats.totalEnforcementActions}
- **Wallet Balance:** ${state.stats.walletBalance}
- **Last Cycle:** ${state.stats.lastCycle}
`;

  writeFileSync(MEMORY_PATH, content, "utf-8");
}

// ─── Daily Log ───────────────────────────────────────────────────────────────

export interface CycleLog {
  timestamp: string;
  phase: string;
  agentsScanned: number;
  violationsDetected: number;
  actionsExecuted: number;
  postsPublished: number;
  apiStatus: Record<string, string>;
  errors: string[];
  details: string;
}

export function appendDailyLog(log: CycleLog): void {
  if (!existsSync(LOGS_DIR)) {
    mkdirSync(LOGS_DIR, { recursive: true });
  }

  const date = new Date().toISOString().split("T")[0];
  const logPath = join(LOGS_DIR, `${date}.md`);

  const entry = `
## Cycle — ${log.timestamp}

- **Agents Scanned:** ${log.agentsScanned}
- **Violations Detected:** ${log.violationsDetected}
- **Actions Executed:** ${log.actionsExecuted}
- **Posts Published:** ${log.postsPublished}
- **API Status:** ${Object.entries(log.apiStatus).map(([k, v]) => `${k}=${v}`).join(", ")}
${log.errors.length > 0 ? `- **Errors:** ${log.errors.join("; ")}` : ""}

${log.details}

---
`;

  if (existsSync(logPath)) {
    const existing = readFileSync(logPath, "utf-8");
    writeFileSync(logPath, existing + entry, "utf-8");
  } else {
    const header = `# Daily Log — ${date}\n\n` + entry;
    writeFileSync(logPath, header, "utf-8");
  }
}
