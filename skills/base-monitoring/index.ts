/**
 * Base Monitoring Skill — MCP tool implementations
 * Monitors AI agent transactions on Base blockchain, detects violations, analyzes activity.
 */

import { ethers } from "ethers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load detection rules
const detectionRules = JSON.parse(
  readFileSync(join(__dirname, "../../config/detection-rules.json"), "utf-8")
);

// Base RPC provider
function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.BASE_RPC_URL;
  if (!rpcUrl) throw new Error("BASE_RPC_URL not set in environment");
  return new ethers.JsonRpcProvider(rpcUrl);
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface TransactionSummary {
  hash: string;
  from: string;
  to: string | null;
  value: string; // ETH
  status: "success" | "fail";
  timestamp: number;
  blockNumber: number;
  gasUsed: string;
  methodId: string;
}

interface Violation {
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  evidence: string[];
  recommended_action: string;
  score_penalty: number;
}

interface ActivitySummary {
  address: string;
  total_txs: number;
  successful_txs: number;
  failed_txs: number;
  failure_rate: number;
  total_value_eth: number;
  unique_counterparties: number;
  most_active_hour: number;
  is_active: boolean;
  scan_hours: number;
}

// ─── Tool: monitor_agent_transactions ────────────────────────────────────────

export async function monitor_agent_transactions(
  address: string,
  hours: number = 6
): Promise<TransactionSummary[]> {
  const provider = getProvider();
  const currentBlock = await provider.getBlockNumber();
  const currentBlockData = await provider.getBlock(currentBlock);
  if (!currentBlockData) throw new Error("Failed to fetch current block");

  const cutoffTime = currentBlockData.timestamp - hours * 3600;

  // Base has ~2s block time, so estimate blocks to scan
  const blocksToScan = Math.ceil((hours * 3600) / 2);
  const startBlock = Math.max(0, currentBlock - blocksToScan);

  const transactions: TransactionSummary[] = [];

  // Use eth_getLogs to find transactions involving this address
  // We scan for both outgoing and incoming transfers
  const normalizedAddress = address.toLowerCase();

  // Batch scan in chunks to avoid RPC limits
  const CHUNK_SIZE = 2000;
  for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
    const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);

    try {
      // Get logs where the address appears in topics (covers ERC20 transfers, etc.)
      const logs = await provider.getLogs({
        fromBlock,
        toBlock,
        topics: [
          null, // any event
          ethers.zeroPadValue(normalizedAddress, 32), // from topic
        ],
      });

      // Also check as recipient
      const logsTo = await provider.getLogs({
        fromBlock,
        toBlock,
        topics: [
          null,
          null,
          ethers.zeroPadValue(normalizedAddress, 32), // to topic
        ],
      });

      // Collect unique tx hashes from logs
      const txHashes = new Set<string>();
      for (const log of [...logs, ...logsTo]) {
        txHashes.add(log.transactionHash);
      }

      // Fetch transaction details
      for (const txHash of txHashes) {
        try {
          const [tx, receipt] = await Promise.all([
            provider.getTransaction(txHash),
            provider.getTransactionReceipt(txHash),
          ]);
          if (!tx || !receipt) continue;

          const block = await provider.getBlock(receipt.blockNumber);
          if (!block || block.timestamp < cutoffTime) continue;

          transactions.push({
            hash: tx.hash,
            from: tx.from.toLowerCase(),
            to: tx.to?.toLowerCase() ?? null,
            value: ethers.formatEther(tx.value),
            status: receipt.status === 1 ? "success" : "fail",
            timestamp: block.timestamp,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            methodId: tx.data.slice(0, 10),
          });
        } catch {
          // Skip individual tx fetch errors
        }
      }
    } catch {
      // Skip chunk errors (RPC rate limits, etc.)
    }
  }

  // Sort by timestamp descending
  transactions.sort((a, b) => b.timestamp - a.timestamp);
  return transactions;
}

// ─── Tool: detect_violations ─────────────────────────────────────────────────

export function detect_violations(
  address: string,
  transactions: TransactionSummary[]
): Violation[] {
  const violations: Violation[] = [];
  const normalizedAddress = address.toLowerCase();

  if (transactions.length === 0) return violations;

  // 1. Drain pattern detection — large outflows in short windows
  const outflows = transactions.filter(
    (tx) => tx.from === normalizedAddress && parseFloat(tx.value) > 0
  );
  const drainRule = detectionRules.violation_types.DRAIN_PATTERN;
  const windowMs = drainRule.window_hours * 3600;

  // Check sliding windows for drain patterns
  for (let i = 0; i < outflows.length; i++) {
    const windowStart = outflows[i].timestamp;
    const windowTxs = outflows.filter(
      (tx) => tx.timestamp >= windowStart - windowMs && tx.timestamp <= windowStart
    );

    if (windowTxs.length >= drainRule.min_outflows) {
      violations.push({
        type: "DRAIN_PATTERN",
        severity: "CRITICAL",
        description: `${windowTxs.length} large outflows detected within ${drainRule.window_hours}h window`,
        evidence: windowTxs.map((tx) => tx.hash),
        recommended_action: "slash",
        score_penalty: detectionRules.severity_levels.CRITICAL.score_penalty,
      });
      break; // Don't double-count
    }
  }

  // 2. Failure rate detection
  const failedTxs = transactions.filter((tx) => tx.status === "fail");
  const failureRate = transactions.length > 0 ? failedTxs.length / transactions.length : 0;

  const failureThresholds = detectionRules.violation_types.HIGH_FAILURE_RATE.severity_thresholds;

  if (failureRate >= failureThresholds.CRITICAL) {
    violations.push({
      type: "HIGH_FAILURE_RATE",
      severity: "CRITICAL",
      description: `Transaction failure rate ${(failureRate * 100).toFixed(1)}% exceeds CRITICAL threshold`,
      evidence: failedTxs.slice(0, 5).map((tx) => tx.hash),
      recommended_action: "slash",
      score_penalty: detectionRules.severity_levels.CRITICAL.score_penalty,
    });
  } else if (failureRate >= failureThresholds.HIGH) {
    violations.push({
      type: "HIGH_FAILURE_RATE",
      severity: "HIGH",
      description: `Transaction failure rate ${(failureRate * 100).toFixed(1)}% exceeds HIGH threshold`,
      evidence: failedTxs.slice(0, 5).map((tx) => tx.hash),
      recommended_action: "score_update",
      score_penalty: detectionRules.severity_levels.HIGH.score_penalty,
    });
  } else if (failureRate >= failureThresholds.MEDIUM) {
    violations.push({
      type: "HIGH_FAILURE_RATE",
      severity: "MEDIUM",
      description: `Transaction failure rate ${(failureRate * 100).toFixed(1)}% exceeds MEDIUM threshold`,
      evidence: failedTxs.slice(0, 3).map((tx) => tx.hash),
      recommended_action: "score_update",
      score_penalty: detectionRules.severity_levels.MEDIUM.score_penalty,
    });
  } else if (failureRate >= failureThresholds.LOW) {
    violations.push({
      type: "HIGH_FAILURE_RATE",
      severity: "LOW",
      description: `Transaction failure rate ${(failureRate * 100).toFixed(1)}% exceeds LOW threshold`,
      evidence: failedTxs.slice(0, 2).map((tx) => tx.hash),
      recommended_action: "log_only",
      score_penalty: detectionRules.severity_levels.LOW.score_penalty,
    });
  }

  // 3. Wash trading detection — repeated back-and-forth with same counterparty
  const washRule = detectionRules.violation_types.WASH_TRADING;
  const counterpartyPairs = new Map<string, number>();

  for (const tx of transactions) {
    const counterparty = tx.from === normalizedAddress ? tx.to : tx.from;
    if (!counterparty) continue;
    const pair = [normalizedAddress, counterparty].sort().join("-");
    counterpartyPairs.set(pair, (counterpartyPairs.get(pair) || 0) + 1);
  }

  for (const [pair, count] of counterpartyPairs) {
    if (count >= washRule.min_round_trips * 2) {
      // *2 because each round trip is 2 txs
      const otherAddress = pair.replace(normalizedAddress, "").replace("-", "");
      violations.push({
        type: "WASH_TRADING",
        severity: "MEDIUM",
        description: `${count} transactions with same counterparty ${otherAddress.slice(0, 10)}... suggests wash trading`,
        evidence: transactions
          .filter((tx) => tx.from === otherAddress || tx.to === otherAddress)
          .slice(0, 5)
          .map((tx) => tx.hash),
        recommended_action: "score_update",
        score_penalty: detectionRules.severity_levels.MEDIUM.score_penalty,
      });
    }
  }

  return violations;
}

// ─── Tool: get_agent_activity ────────────────────────────────────────────────

export function get_agent_activity(
  address: string,
  transactions: TransactionSummary[],
  hours: number = 24
): ActivitySummary {
  const normalizedAddress = address.toLowerCase();

  const successfulTxs = transactions.filter((tx) => tx.status === "success");
  const failedTxs = transactions.filter((tx) => tx.status === "fail");

  const totalValue = transactions.reduce(
    (sum, tx) => sum + parseFloat(tx.value),
    0
  );

  // Count unique counterparties
  const counterparties = new Set<string>();
  for (const tx of transactions) {
    if (tx.from !== normalizedAddress && tx.from) counterparties.add(tx.from);
    if (tx.to !== normalizedAddress && tx.to) counterparties.add(tx.to);
  }

  // Find most active hour
  const hourCounts = new Map<number, number>();
  for (const tx of transactions) {
    const hour = new Date(tx.timestamp * 1000).getUTCHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  }

  let mostActiveHour = 0;
  let maxCount = 0;
  for (const [hour, count] of hourCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostActiveHour = hour;
    }
  }

  return {
    address: normalizedAddress,
    total_txs: transactions.length,
    successful_txs: successfulTxs.length,
    failed_txs: failedTxs.length,
    failure_rate:
      transactions.length > 0 ? failedTxs.length / transactions.length : 0,
    total_value_eth: totalValue,
    unique_counterparties: counterparties.size,
    most_active_hour: mostActiveHour,
    is_active: transactions.length > 0,
    scan_hours: hours,
  };
}
