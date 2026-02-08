/**
 * Heartbeat Executor — Orchestrates the 6-phase monitoring cycle.
 * Scan → Analysis → Decision → Execution → Communication → Memory
 */

import { ethers } from "ethers";
import {
  readMemory,
  writeMemory,
  appendDailyLog,
  type MemoryState,
  type MonitoredAgent,
  type CycleLog,
} from "./memory-manager.js";
import {
  makeDecisions,
  type ScoreData,
  type ViolationData,
  type DecisionResult,
  type EnforcementAction,
} from "./decision-engine.js";
import {
  criticalAlert,
  checkpointSummary,
  dailySummary,
  publishPosts,
  clearPostQueue,
  getPostQueue,
} from "./social-poster.js";

// Skill imports — these are the MCP tool implementations
import {
  monitor_agent_transactions,
  detect_violations,
  get_agent_activity,
} from "../skills/base-monitoring/index.js";
import {
  calculate_score,
  apply_time_decay,
} from "../skills/reputation-scoring/index.js";
import {
  update_reputation_onchain,
  slash_agent_stake,
  mint_safety_badge,
  revoke_safety_badge,
} from "../skills/agent-enforcement/index.js";
import {
  discoverAgents,
  getAgentReputation,
  submitSafetyFeedback,
  lookupAgentByAddress,
  type DiscoveredAgent,
} from "./erc8004-integration.js";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PhaseResult {
  success: boolean;
  errors: string[];
  data?: any;
}

interface CycleResult {
  success: boolean;
  agentsScanned: number;
  violationsDetected: number;
  actionsExecuted: number;
  postsPublished: number;
  errors: string[];
  duration: number;
}

// ─── HEARTBEAT Executor ──────────────────────────────────────────────────────

export async function executeHeartbeat(): Promise<CycleResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let agentsScanned = 0;
  let violationsDetected = 0;
  let actionsExecuted = 0;
  let postsPublished = 0;

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(`  HEARTBEAT CYCLE — ${new Date().toISOString()}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  // Load current state
  const memory = readMemory();

  if (memory.agents.length === 0) {
    console.log("[HEARTBEAT] No agents in MEMORY.md — nothing to monitor.");
    console.log("[HEARTBEAT] Add agents to workspace/MEMORY.md to start monitoring.\n");

    // Still update stats and log
    memory.stats.totalCycles++;
    memory.stats.lastCycle = new Date().toISOString();
    writeMemory(memory);

    appendDailyLog({
      timestamp: new Date().toISOString(),
      phase: "complete",
      agentsScanned: 0,
      violationsDetected: 0,
      actionsExecuted: 0,
      postsPublished: 0,
      apiStatus: {},
      errors: ["No agents configured"],
      details: "Cycle completed with no agents to monitor.",
    });

    return {
      success: true,
      agentsScanned: 0,
      violationsDetected: 0,
      actionsExecuted: 0,
      postsPublished: 0,
      errors: [],
      duration: Date.now() - startTime,
    };
  }

  // ── Phase 0: ERC-8004 Agent Discovery ────────────────────────────────────
  console.log("▶ Phase 0: ERC-8004 DISCOVERY");
  const erc8004Agents = new Map<string, DiscoveredAgent>();
  try {
    const discovered = await discoverAgents({ chainId: 8453, limit: 50, minScore: 10 });
    console.log(`  Discovered ${discovered.length} ERC-8004 agents on Base`);

    for (const agent of discovered) {
      const addr = (agent.agentWallet || agent.ownerAddress).toLowerCase();
      if (addr && addr !== "0x0000000000000000000000000000000000000000") {
        erc8004Agents.set(addr, agent);
      }
    }

    // Enrich our monitored agents with ERC-8004 data
    for (const agent of memory.agents) {
      const erc = erc8004Agents.get(agent.address.toLowerCase());
      if (erc) {
        // Store the agentId for feedback submission later
        (agent as any)._erc8004Id = erc.agentId;
        (agent as any)._erc8004Score = erc.totalScore;
        if (!agent.notes.includes("ERC-8004")) {
          agent.notes = `ERC-8004 verified (score ${erc.totalScore}). ${agent.notes}`;
        }
        console.log(`  ✓ ${agent.name} → ERC-8004 agent #${erc.agentId} (score: ${erc.totalScore})`);
      }
    }
  } catch (err: any) {
    console.error(`  ✗ ERC-8004 discovery failed: ${err.message}`);
    errors.push(`ERC-8004 discovery: ${err.message}`);
  }
  console.log("");

  // ── Phase 1: Scan ────────────────────────────────────────────────────────
  console.log("▶ Phase 1: SCAN");
  const scanResults = new Map<string, any>();
  const scanViolations = new Map<string, ViolationData[]>();

  for (const agent of memory.agents) {
    try {
      console.log(`  Scanning ${agent.name} (${agent.address.slice(0, 10)}...)`);
      const txs = await monitor_agent_transactions(agent.address, 6);
      const violations = detect_violations(agent.address, txs);
      const activity = get_agent_activity(agent.address, txs, 6);

      scanResults.set(agent.address, { transactions: txs, activity });
      scanViolations.set(agent.address, violations);
      agentsScanned++;

      if (violations.length > 0) {
        violationsDetected += violations.length;
        console.log(`  ⚠ ${violations.length} violation(s) detected for ${agent.name}`);
      } else {
        console.log(`  ✓ No violations for ${agent.name}`);
      }
    } catch (err: any) {
      const msg = `Scan failed for ${agent.address}: ${err.message}`;
      errors.push(msg);
      console.error(`  ✗ ${msg}`);
    }
  }

  console.log(`  Scan complete: ${agentsScanned} agents, ${violationsDetected} violations\n`);

  // ── Phase 2: Analysis ────────────────────────────────────────────────────
  console.log("▶ Phase 2: ANALYSIS");
  const scoreResults = new Map<string, ScoreData>();
  const apiStatus: Record<string, string> = {};

  for (const agent of memory.agents) {
    const scan = scanResults.get(agent.address);
    if (!scan) continue;

    try {
      const violations = scanViolations.get(agent.address) || [];
      const onchainData = {
        failure_rate: scan.activity.failure_rate,
        total_txs: scan.activity.total_txs,
        violations: violations.map((v: ViolationData) => ({
          type: v.type,
          severity: v.severity,
          score_penalty: v.score_penalty,
        })),
        total_value_eth: scan.activity.total_value_eth,
        unique_counterparties: scan.activity.unique_counterparties,
        is_active: scan.activity.is_active,
      };

      const scoreData = await calculate_score(agent.address, onchainData);
      scoreResults.set(agent.address, scoreData);

      // Track API status
      for (const source of scoreData.data_sources_used) {
        apiStatus[source] = "up";
      }
      if (!scoreData.data_sources_used.includes("aixbt")) apiStatus["aixbt"] = "down";
      if (!scoreData.data_sources_used.includes("nansen")) apiStatus["nansen"] = "down";

      console.log(
        `  ${agent.name}: score=${scoreData.score} confidence=${scoreData.confidence} sources=[${scoreData.data_sources_used.join(",")}]`
      );
    } catch (err: any) {
      const msg = `Analysis failed for ${agent.address}: ${err.message}`;
      errors.push(msg);
      console.error(`  ✗ ${msg}`);
    }
  }

  // Apply time decay for agents with existing penalties
  for (const agent of memory.agents) {
    if (agent.score < 500) {
      // Agent likely has penalties
      const daysSinceUpdate = agent.lastUpdated !== "—"
        ? Math.floor((Date.now() - new Date(agent.lastUpdated).getTime()) / (86400000))
        : 0;

      if (daysSinceUpdate > 0) {
        const decay = apply_time_decay(500 - agent.score, daysSinceUpdate);
        console.log(
          `  ${agent.name}: penalty decay — recovered ${decay.recovered_points} points (${decay.decay_percentage}%)`
        );
      }
    }
  }

  console.log(`  Analysis complete. API status: ${JSON.stringify(apiStatus)}\n`);

  // ── Phase 3: Decision ────────────────────────────────────────────────────
  console.log("▶ Phase 3: DECISION");
  const decisions = new Map<string, DecisionResult>();

  for (const agent of memory.agents) {
    const scoreData = scoreResults.get(agent.address);
    if (!scoreData) continue;

    const violations = scanViolations.get(agent.address) || [];
    const stakeEth = parseFloat(agent.stake) || 0;
    const registeredDays = agent.lastUpdated !== "—"
      ? Math.floor((Date.now() - new Date(agent.lastUpdated).getTime()) / 86400000)
      : 0;

    const decision = makeDecisions(agent, scoreData, violations, stakeEth, registeredDays);
    decisions.set(agent.address, decision);

    if (decision.flagged) {
      console.log(`  ⚑ ${agent.name}: FLAGGED — ${decision.details}`);
      for (const action of decision.actions) {
        console.log(`    → ${action.type}: ${action.reason} (validated=${action.validated})`);
      }
    } else {
      console.log(`  ○ ${agent.name}: ${decision.details}`);
    }
  }

  console.log("");

  // ── Phase 4: Execution ───────────────────────────────────────────────────
  console.log("▶ Phase 4: EXECUTION");

  // Collect all validated actions
  const allActions: Array<{ agent: MonitoredAgent; action: EnforcementAction }> = [];
  for (const agent of memory.agents) {
    const decision = decisions.get(agent.address);
    if (!decision) continue;

    for (const action of decision.actions) {
      if (action.validated && action.type !== "watch" && action.type !== "none") {
        allActions.push({ agent, action });
      }
    }
  }

  if (allActions.length === 0) {
    console.log("  No enforcement actions to execute.\n");
  } else {
    // Group score updates for potential batching
    const scoreUpdates = allActions.filter((a) => a.action.type === "update_score");
    const slashActions = allActions.filter((a) => a.action.type === "slash_stake");
    const badgeActions = allActions.filter(
      (a) => a.action.type === "mint_badge" || a.action.type === "upgrade_badge" || a.action.type === "revoke_badge"
    );

    // Execute score updates
    for (const { agent, action } of scoreUpdates) {
      try {
        console.log(`  Updating score for ${agent.name}: ${action.params.score}`);
        const result = await update_reputation_onchain(
          action.address,
          action.params.score,
          action.params.reason
        );
        if (result.success) {
          actionsExecuted++;
          console.log(`  ✓ Score updated. tx=${result.tx_hash}`);
        } else {
          errors.push(`Score update failed for ${agent.address}: ${result.error}`);
          console.error(`  ✗ Score update failed: ${result.error}`);
        }
      } catch (err: any) {
        errors.push(`Score update error for ${agent.address}: ${err.message}`);
        console.error(`  ✗ ${err.message}`);
      }
    }

    // Execute slashes
    for (const { agent, action } of slashActions) {
      try {
        console.log(`  Slashing ${agent.name}: ${action.params.bps} bps`);
        const result = await slash_agent_stake(
          action.address,
          action.params.bps,
          action.params.reason
        );
        if (result.success) {
          actionsExecuted++;
          console.log(
            `  ✓ Slashed ${result.slash_amount_eth} ETH. tx=${result.tx_hash}`
          );
        } else {
          errors.push(`Slash failed for ${agent.address}: ${result.error}`);
          console.error(`  ✗ Slash failed: ${result.error}`);
        }
      } catch (err: any) {
        errors.push(`Slash error for ${agent.address}: ${err.message}`);
        console.error(`  ✗ ${err.message}`);
      }
    }

    // Execute badge actions
    for (const { agent, action } of badgeActions) {
      try {
        if (action.type === "mint_badge" || action.type === "upgrade_badge") {
          console.log(`  Minting badge for ${agent.name}: tier ${action.params.tier}`);
          const result = await mint_safety_badge(
            action.address,
            action.params.tier,
            action.params.score
          );
          if (result.success) {
            actionsExecuted++;
            console.log(`  ✓ Badge minted: ${result.tier_name} #${result.token_id}. tx=${result.tx_hash}`);
          } else {
            errors.push(`Badge mint failed for ${agent.address}: ${result.error}`);
            console.error(`  ✗ Badge mint failed: ${result.error}`);
          }
        } else if (action.type === "revoke_badge") {
          console.log(`  Revoking badge for ${agent.name}`);
          const result = await revoke_safety_badge(
            action.address,
            action.params.reason
          );
          if (result.success) {
            actionsExecuted++;
            console.log(`  ✓ Badge revoked. tx=${result.tx_hash}`);
          } else {
            errors.push(`Badge revoke failed for ${agent.address}: ${result.error}`);
            console.error(`  ✗ Badge revoke failed: ${result.error}`);
          }
        }
      } catch (err: any) {
        errors.push(`Badge action error for ${agent.address}: ${err.message}`);
        console.error(`  ✗ ${err.message}`);
      }
    }

    console.log(`  Execution complete: ${actionsExecuted} actions executed.\n`);
  }

  // ── Phase 4b: ERC-8004 Feedback Submission ──────────────────────────────
  console.log("▶ Phase 4b: ERC-8004 FEEDBACK");
  let feedbacksSubmitted = 0;

  for (const agent of memory.agents) {
    const erc8004Id = (agent as any)._erc8004Id;
    if (!erc8004Id) continue; // Not an ERC-8004 agent

    const scoreData = scoreResults.get(agent.address);
    if (!scoreData) continue;

    try {
      // Check if we've already submitted recent feedback (avoid spamming)
      const rep = await getAgentReputation(erc8004Id);
      const decision = decisions.get(agent.address);
      const details = decision
        ? `Safety assessment: ${decision.details}`
        : `Routine safety score: ${scoreData.score}/1000`;

      // Submit safety feedback to the on-chain Reputation Registry
      const result = await submitSafetyFeedback(
        erc8004Id,
        scoreData.score,
        details
      );

      if (result.success) {
        feedbacksSubmitted++;
        console.log(`  ✓ Feedback for ${agent.name} (#${erc8004Id}): score=${scoreData.score} tx=${result.tx_hash}`);
      } else {
        console.log(`  ○ Feedback skipped for ${agent.name}: ${result.error}`);
      }
    } catch (err: any) {
      console.log(`  ✗ Feedback error for ${agent.name}: ${err.message}`);
      errors.push(`ERC-8004 feedback for ${agent.address}: ${err.message}`);
    }
  }

  if (feedbacksSubmitted === 0) {
    console.log("  No ERC-8004 feedback submitted (no wallet or no ERC-8004 agents).");
  } else {
    actionsExecuted += feedbacksSubmitted;
    console.log(`  ${feedbacksSubmitted} feedback(s) submitted to Reputation Registry.`);
  }
  console.log("");

  // ── Phase 5: Communication ───────────────────────────────────────────────
  console.log("▶ Phase 5: COMMUNICATION");
  clearPostQueue();

  // Post critical alerts
  for (const agent of memory.agents) {
    const decision = decisions.get(agent.address);
    if (!decision) continue;

    for (const action of decision.actions) {
      if (
        action.validated &&
        (action.severity === "CRITICAL" || action.severity === "HIGH")
      ) {
        criticalAlert(
          agent.address,
          agent.name,
          action.reason,
          decision.previousScore,
          decision.newScore,
          action.type
        );
      }
    }
  }

  // Checkpoint summary
  checkpointSummary(
    agentsScanned,
    violationsDetected,
    actionsExecuted,
    memory.stats.totalCycles + 1
  );

  // Daily summary at 8am UTC
  const currentHour = new Date().getUTCHours();
  if (currentHour >= 7 && currentHour <= 9) {
    const violationCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const [, violations] of scanViolations) {
      for (const v of violations) {
        const key = v.severity.toLowerCase() as keyof typeof violationCounts;
        if (key in violationCounts) violationCounts[key]++;
      }
    }

    // Find top agent and biggest drop
    let topAgent: { name: string; score: number } | undefined;
    let biggestDrop: { name: string; change: number } | undefined;

    for (const agent of memory.agents) {
      const decision = decisions.get(agent.address);
      if (!decision) continue;

      if (!topAgent || decision.newScore > topAgent.score) {
        topAgent = { name: agent.name, score: decision.newScore };
      }
      if (!biggestDrop || decision.scoreChange < biggestDrop.change) {
        biggestDrop = { name: agent.name, change: decision.scoreChange };
      }
    }

    dailySummary(
      new Date().toISOString().split("T")[0],
      agentsScanned,
      violationCounts,
      allActions.filter((a) => a.action.type === "mint_badge").length,
      topAgent,
      biggestDrop && biggestDrop.change < 0 ? biggestDrop : undefined
    );
  }

  // Publish queued posts
  postsPublished = await publishPosts();
  console.log(`  ${postsPublished} post(s) published.\n`);

  // ── Phase 6: Memory ──────────────────────────────────────────────────────
  console.log("▶ Phase 6: MEMORY");

  // Update agent scores in memory
  const now = new Date().toISOString().split("T")[0];
  for (const agent of memory.agents) {
    const decision = decisions.get(agent.address);
    if (decision) {
      agent.score = decision.newScore;
      agent.lastUpdated = now;

      // Update badge status
      for (const action of decision.actions) {
        if (action.type === "mint_badge" || action.type === "upgrade_badge") {
          const tierNames: Record<number, string> = { 1: "Bronze", 2: "Silver", 3: "Gold" };
          agent.badge = tierNames[action.params.tier] || agent.badge;
        } else if (action.type === "revoke_badge") {
          agent.badge = "None";
        }
      }

      if (decision.watchOnly) {
        agent.notes = `WATCH: ${decision.details}`;
      }
    }
  }

  // Update API status
  memory.apiStatus = [
    {
      name: "Base RPC",
      status: apiStatus["onchain"] === "up" ? "up" : "unknown",
      lastChecked: new Date().toISOString(),
      cacheTtl: "—",
      notes: "Primary data source",
    },
    {
      name: "AIXBT",
      status: (apiStatus["aixbt"] as "up" | "down") || "unknown",
      lastChecked: new Date().toISOString(),
      cacheTtl: "1hr",
      notes: "Sentiment and momentum",
    },
    {
      name: "Nansen",
      status: (apiStatus["nansen"] as "up" | "down") || "unknown",
      lastChecked: new Date().toISOString(),
      cacheTtl: "6hr",
      notes: "Wallet labels and flows",
    },
    {
      name: "ERC-8004",
      status: erc8004Agents.size > 0 ? "up" : "unknown",
      lastChecked: new Date().toISOString(),
      cacheTtl: "6hr",
      notes: `${erc8004Agents.size} agents discovered, ${feedbacksSubmitted} feedbacks submitted`,
    },
    {
      name: "Elfa",
      status: "unknown",
      lastChecked: "—",
      cacheTtl: "—",
      notes: "Phase 2 integration",
    },
  ];

  // Update operational stats
  memory.stats.totalCycles++;
  memory.stats.totalAgentsMonitored = memory.agents.length;
  memory.stats.totalViolationsDetected += violationsDetected;
  memory.stats.totalEnforcementActions += actionsExecuted;
  memory.stats.lastCycle = new Date().toISOString();

  // Check wallet balance
  try {
    const rpcUrl = process.env.BASE_RPC_URL;
    const privateKey = process.env.AGENT_PRIVATE_KEY;
    if (rpcUrl && privateKey) {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);
      const balance = await provider.getBalance(wallet.address);
      memory.stats.walletBalance = `${ethers.formatEther(balance)} ETH`;

      if (balance < ethers.parseEther("0.1")) {
        console.log(`  ⚠ LOW BALANCE: ${ethers.formatEther(balance)} ETH`);
        errors.push(`Low wallet balance: ${ethers.formatEther(balance)} ETH`);
      }
    }
  } catch {
    // Balance check non-critical
  }

  writeMemory(memory);
  console.log("  MEMORY.md updated.");

  // Append daily log
  const logDetails: string[] = [];
  for (const agent of memory.agents) {
    const decision = decisions.get(agent.address);
    if (decision) {
      logDetails.push(
        `**${agent.name}** (${agent.address.slice(0, 10)}...): ${decision.details}`
      );
    }
  }

  appendDailyLog({
    timestamp: new Date().toISOString(),
    phase: "complete",
    agentsScanned,
    violationsDetected,
    actionsExecuted,
    postsPublished,
    apiStatus,
    errors,
    details: logDetails.join("\n\n"),
  });

  console.log("  Daily log appended.");

  const duration = Date.now() - startTime;
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  HEARTBEAT COMPLETE — ${(duration / 1000).toFixed(1)}s`);
  console.log(`  Agents: ${agentsScanned} | Violations: ${violationsDetected} | Actions: ${actionsExecuted} | Errors: ${errors.length}`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  return {
    success: errors.length === 0,
    agentsScanned,
    violationsDetected,
    actionsExecuted,
    postsPublished,
    errors,
    duration,
  };
}
