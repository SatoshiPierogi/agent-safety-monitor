/**
 * Decision Engine — Validates enforcement decisions using 2/3 data source agreement.
 * Determines what actions to take based on score changes and violations.
 */

import type { MonitoredAgent } from "./memory-manager.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScoreData {
  score: number;
  confidence: number;
  data_sources_used: string[];
  violations_found: number;
  degraded_mode: boolean;
  breakdown: {
    onchain_score: number;
    aixbt_score: number;
    nansen_score: number;
  };
  reason: string;
}

export interface ViolationData {
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  evidence: string[];
  recommended_action: string;
  score_penalty: number;
}

export type ActionType =
  | "update_score"
  | "slash_stake"
  | "mint_badge"
  | "revoke_badge"
  | "upgrade_badge"
  | "watch"
  | "none";

export interface EnforcementAction {
  type: ActionType;
  address: string;
  params: Record<string, any>;
  reason: string;
  severity: string;
  confidence: number;
  validated: boolean; // true if 2/3 sources agree
}

export interface DecisionResult {
  address: string;
  previousScore: number;
  newScore: number;
  scoreChange: number;
  flagged: boolean;
  actions: EnforcementAction[];
  watchOnly: boolean;
  details: string;
}

// ─── Badge thresholds ────────────────────────────────────────────────────────

const BADGE_THRESHOLDS = {
  Bronze: { minDays: 30, minScore: 700, minStakeEth: 0.01 },
  Silver: { minDays: 90, minScore: 850, minStakeEth: 0.05 },
  Gold: { minDays: 180, minScore: 950, minStakeEth: 0.1 },
};

// ─── Main decision function ──────────────────────────────────────────────────

export function makeDecisions(
  agent: MonitoredAgent,
  scoreData: ScoreData,
  violations: ViolationData[],
  stakeEth: number,
  registeredDays: number
): DecisionResult {
  const previousScore = agent.score;
  const newScore = scoreData.score;
  const scoreChange = newScore - previousScore;
  const actions: EnforcementAction[] = [];

  // Flag if: score changed by > 50 points OR any CRITICAL/HIGH violation
  const hasCriticalViolation = violations.some(
    (v) => v.severity === "CRITICAL" || v.severity === "HIGH"
  );
  const significantScoreChange = Math.abs(scoreChange) > 50;
  const flagged = hasCriticalViolation || significantScoreChange;

  // Check 2/3 data source agreement for enforcement
  const sourcesUsed = scoreData.data_sources_used.length;
  const validated = sourcesUsed >= 2;

  // If flagged but not validated, watch only
  if (flagged && !validated) {
    return {
      address: agent.address,
      previousScore,
      newScore,
      scoreChange,
      flagged,
      actions: [
        {
          type: "watch",
          address: agent.address,
          params: {},
          reason: `Flagged but only ${sourcesUsed}/3 data sources available — watching`,
          severity: violations[0]?.severity || "LOW",
          confidence: scoreData.confidence,
          validated: false,
        },
      ],
      watchOnly: true,
      details: `Score ${previousScore} → ${newScore} (Δ${scoreChange}). Only ${sourcesUsed} source(s) — not enforcing.`,
    };
  }

  // Score update action (always if score changed significantly)
  if (flagged && validated && scoreChange !== 0) {
    actions.push({
      type: "update_score",
      address: agent.address,
      params: { score: newScore, reason: scoreData.reason },
      reason: `Score changed by ${scoreChange}: ${scoreData.reason}`,
      severity: hasCriticalViolation ? "CRITICAL" : "MEDIUM",
      confidence: scoreData.confidence,
      validated: true,
    });
  }

  // Slash action for CRITICAL violations on staked agents
  const criticalViolations = violations.filter((v) => v.severity === "CRITICAL");
  if (criticalViolations.length > 0 && stakeEth > 0 && validated) {
    actions.push({
      type: "slash_stake",
      address: agent.address,
      params: {
        bps: 5000, // 50% for CRITICAL
        reason: criticalViolations.map((v) => v.description).join("; "),
      },
      reason: `CRITICAL violation: ${criticalViolations[0].description}`,
      severity: "CRITICAL",
      confidence: scoreData.confidence,
      validated: true,
    });
  }

  // HIGH violation slash (lower amount)
  const highViolations = violations.filter((v) => v.severity === "HIGH");
  if (highViolations.length > 0 && criticalViolations.length === 0 && stakeEth > 0 && validated) {
    actions.push({
      type: "slash_stake",
      address: agent.address,
      params: {
        bps: 2000, // 20% for HIGH
        reason: highViolations.map((v) => v.description).join("; "),
      },
      reason: `HIGH violation: ${highViolations[0].description}`,
      severity: "HIGH",
      confidence: scoreData.confidence,
      validated: true,
    });
  }

  // Badge minting/upgrading (only for positive changes)
  if (newScore >= BADGE_THRESHOLDS.Gold.minScore && registeredDays >= BADGE_THRESHOLDS.Gold.minDays && stakeEth >= BADGE_THRESHOLDS.Gold.minStakeEth) {
    if (agent.badge !== "Gold") {
      actions.push({
        type: agent.badge === "—" || agent.badge === "None" ? "mint_badge" : "upgrade_badge",
        address: agent.address,
        params: { tier: 3, score: newScore },
        reason: `Agent qualifies for Gold badge (score=${newScore}, days=${registeredDays}, stake=${stakeEth})`,
        severity: "LOW",
        confidence: scoreData.confidence,
        validated: true,
      });
    }
  } else if (newScore >= BADGE_THRESHOLDS.Silver.minScore && registeredDays >= BADGE_THRESHOLDS.Silver.minDays && stakeEth >= BADGE_THRESHOLDS.Silver.minStakeEth) {
    if (agent.badge !== "Silver" && agent.badge !== "Gold") {
      actions.push({
        type: agent.badge === "—" || agent.badge === "None" ? "mint_badge" : "upgrade_badge",
        address: agent.address,
        params: { tier: 2, score: newScore },
        reason: `Agent qualifies for Silver badge (score=${newScore}, days=${registeredDays}, stake=${stakeEth})`,
        severity: "LOW",
        confidence: scoreData.confidence,
        validated: true,
      });
    }
  } else if (newScore >= BADGE_THRESHOLDS.Bronze.minScore && registeredDays >= BADGE_THRESHOLDS.Bronze.minDays && stakeEth >= BADGE_THRESHOLDS.Bronze.minStakeEth) {
    if (agent.badge === "—" || agent.badge === "None") {
      actions.push({
        type: "mint_badge",
        address: agent.address,
        params: { tier: 1, score: newScore },
        reason: `Agent qualifies for Bronze badge (score=${newScore}, days=${registeredDays}, stake=${stakeEth})`,
        severity: "LOW",
        confidence: scoreData.confidence,
        validated: true,
      });
    }
  }

  // Badge revocation (score dropped below threshold)
  if (agent.badge && agent.badge !== "—" && agent.badge !== "None") {
    const currentTier = agent.badge;
    const threshold = BADGE_THRESHOLDS[currentTier as keyof typeof BADGE_THRESHOLDS];
    if (threshold && newScore < threshold.minScore && validated) {
      actions.push({
        type: "revoke_badge",
        address: agent.address,
        params: { reason: `Score dropped to ${newScore}, below ${currentTier} threshold of ${threshold.minScore}` },
        reason: `Score ${newScore} below ${currentTier} minimum ${threshold.minScore}`,
        severity: "MEDIUM",
        confidence: scoreData.confidence,
        validated: true,
      });
    }
  }

  // If not flagged, no actions needed
  if (!flagged) {
    return {
      address: agent.address,
      previousScore,
      newScore,
      scoreChange,
      flagged: false,
      actions: [],
      watchOnly: false,
      details: `Score stable: ${previousScore} → ${newScore} (Δ${scoreChange}). No action needed.`,
    };
  }

  return {
    address: agent.address,
    previousScore,
    newScore,
    scoreChange,
    flagged,
    actions,
    watchOnly: false,
    details: `Score ${previousScore} → ${newScore} (Δ${scoreChange}). ${actions.length} action(s) queued.`,
  };
}
