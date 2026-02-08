/**
 * Reputation Scoring Skill — MCP tool implementations
 * Calculates weighted reputation scores using onchain data, AIXBT sentiment, and Nansen labels.
 * Supports degraded mode when external APIs are unavailable.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  queryAixbtSentiment,
  queryNansenLabels,
  type AixbtSentimentResult,
  type NansenLabelsResult,
} from "./api-clients.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const detectionRules = JSON.parse(
  readFileSync(join(__dirname, "../../config/detection-rules.json"), "utf-8")
);

// ─── Types ───────────────────────────────────────────────────────────────────

interface OnchainData {
  failure_rate: number;
  total_txs: number;
  violations: Array<{
    type: string;
    severity: string;
    score_penalty: number;
  }>;
  total_value_eth?: number;
  unique_counterparties?: number;
  is_active?: boolean;
}

interface ScoreBreakdown {
  onchain_score: number;
  aixbt_score: number;
  nansen_score: number;
  onchain_weight: number;
  aixbt_weight: number;
  nansen_weight: number;
}

interface ScoreResult {
  score: number; // 0-1000
  confidence: number; // 0-1
  breakdown: ScoreBreakdown;
  data_sources_used: string[];
  reason: string;
  violations_found: number;
  degraded_mode: boolean;
}

interface DecayResult {
  remaining_penalty: number;
  recovered_points: number;
  decay_percentage: number;
}

// ─── Tool: calculate_score ───────────────────────────────────────────────────

export async function calculate_score(
  address: string,
  onchainData: OnchainData,
  forceRefresh: boolean = false
): Promise<ScoreResult> {
  const dataSources: string[] = ["onchain"];
  let degradedMode = false;

  // 1. Calculate onchain score (0-1000)
  const onchainScore = calculateOnchainScore(onchainData);

  // 2. Query AIXBT sentiment
  let aixbtResult: AixbtSentimentResult | null = null;
  let aixbtScore = 500; // Default neutral
  let aixbtAvailable = false;

  try {
    aixbtResult = await queryAixbtSentiment(address, forceRefresh);
    if (!aixbtResult.error) {
      aixbtScore = aixbtResult.sentiment_score;
      aixbtAvailable = true;
      dataSources.push("aixbt");
    }
  } catch {
    // AIXBT unavailable
  }

  // 3. Query Nansen labels
  let nansenResult: NansenLabelsResult | null = null;
  let nansenScore = 500; // Default neutral
  let nansenAvailable = false;

  try {
    nansenResult = await queryNansenLabels(address, forceRefresh);
    if (!nansenResult.error) {
      nansenScore = calculateNansenScore(nansenResult);
      nansenAvailable = true;
      dataSources.push("nansen");
    }
  } catch {
    // Nansen unavailable
  }

  // 4. Determine weights based on availability (degraded mode)
  let weights = { ...detectionRules.scoring_weights };
  let confidence = 1.0;

  if (!aixbtAvailable && !nansenAvailable) {
    weights = { onchain: 1.0, aixbt: 0, nansen: 0 };
    confidence = detectionRules.degraded_mode.both_apis_down.confidence;
    degradedMode = true;
  } else if (!aixbtAvailable) {
    weights = {
      onchain: detectionRules.degraded_mode.aixbt_down.onchain_weight,
      aixbt: 0,
      nansen: detectionRules.degraded_mode.aixbt_down.nansen_weight,
    };
    confidence = detectionRules.degraded_mode.aixbt_down.confidence;
    degradedMode = true;
  } else if (!nansenAvailable) {
    weights = {
      onchain: detectionRules.degraded_mode.nansen_down.onchain_weight,
      aixbt: detectionRules.degraded_mode.nansen_down.aixbt_weight,
      nansen: 0,
    };
    confidence = detectionRules.degraded_mode.nansen_down.confidence;
    degradedMode = true;
  }

  // 5. Calculate weighted score
  const weightedScore = Math.round(
    onchainScore * weights.onchain +
      aixbtScore * weights.aixbt +
      nansenScore * weights.nansen
  );

  const finalScore = Math.max(0, Math.min(1000, weightedScore));

  // 6. Build reason string
  const reasons: string[] = [];
  if (onchainData.violations.length > 0) {
    reasons.push(
      `${onchainData.violations.length} violation(s) detected`
    );
  }
  if (onchainData.failure_rate > 0.1) {
    reasons.push(`failure rate ${(onchainData.failure_rate * 100).toFixed(1)}%`);
  }
  if (nansenResult?.risk_flags.length) {
    reasons.push(`Nansen risk flags: ${nansenResult.risk_flags.join(", ")}`);
  }
  if (aixbtResult?.momentum && aixbtResult.momentum < -50) {
    reasons.push("Negative AIXBT momentum");
  }
  if (reasons.length === 0) {
    reasons.push("No significant issues detected");
  }

  return {
    score: finalScore,
    confidence,
    breakdown: {
      onchain_score: onchainScore,
      aixbt_score: aixbtScore,
      nansen_score: nansenScore,
      onchain_weight: weights.onchain,
      aixbt_weight: weights.aixbt,
      nansen_weight: weights.nansen,
    },
    data_sources_used: dataSources,
    reason: reasons.join("; "),
    violations_found: onchainData.violations.length,
    degraded_mode: degradedMode,
  };
}

// ─── Tool: apply_time_decay ──────────────────────────────────────────────────

export function apply_time_decay(
  penaltyPoints: number,
  ageDays: number
): DecayResult {
  const DECAY_PERIOD_DAYS = 90;

  if (penaltyPoints <= 0 || ageDays <= 0) {
    return {
      remaining_penalty: Math.max(0, penaltyPoints),
      recovered_points: 0,
      decay_percentage: 0,
    };
  }

  if (ageDays >= DECAY_PERIOD_DAYS) {
    return {
      remaining_penalty: 0,
      recovered_points: penaltyPoints,
      decay_percentage: 100,
    };
  }

  // Linear decay: remaining = penalty * (90 - age) / 90
  const remaining = Math.round(
    penaltyPoints * (DECAY_PERIOD_DAYS - ageDays) / DECAY_PERIOD_DAYS
  );
  const recovered = penaltyPoints - remaining;

  return {
    remaining_penalty: remaining,
    recovered_points: recovered,
    decay_percentage: Math.round((recovered / penaltyPoints) * 100),
  };
}

// ─── Helper: Calculate onchain score component ──────────────────────────────

function calculateOnchainScore(data: OnchainData): number {
  let score = 750; // Start with a good base score

  // Penalty for failure rate
  if (data.failure_rate > 0.5) {
    score -= 300;
  } else if (data.failure_rate > 0.3) {
    score -= 200;
  } else if (data.failure_rate > 0.2) {
    score -= 100;
  } else if (data.failure_rate > 0.1) {
    score -= 50;
  }

  // Penalty for violations
  for (const violation of data.violations) {
    score -= violation.score_penalty;
  }

  // Bonus for activity (active agents are generally better)
  if (data.is_active && data.total_txs > 10) {
    score += 50;
  }

  // Bonus for diversity (many counterparties = not wash trading)
  if (data.unique_counterparties && data.unique_counterparties > 10) {
    score += 50;
  }

  // Penalty for inactivity
  if (!data.is_active || data.total_txs === 0) {
    score -= 100;
  }

  return Math.max(0, Math.min(1000, score));
}

// ─── Helper: Calculate Nansen score component ────────────────────────────────

function calculateNansenScore(data: NansenLabelsResult): number {
  let score = 500; // Start neutral

  // Positive labels
  if (data.is_smart_money) {
    score += 200;
  }

  if (data.counterparty_quality === "high") {
    score += 100;
  } else if (data.counterparty_quality === "low") {
    score -= 200;
  }

  // Risk flags
  for (const flag of data.risk_flags) {
    const lower = flag.toLowerCase();
    if (lower.includes("exploit") || lower.includes("scam")) {
      score -= 300;
    } else if (lower.includes("mev")) {
      score -= 50;
    } else {
      score -= 100;
    }
  }

  // Having labels at all is slightly positive (known entity)
  if (data.labels.length > 0 && data.risk_flags.length === 0) {
    score += 50;
  }

  return Math.max(0, Math.min(1000, score));
}
