/**
 * Agent Enforcement Skill — MCP tool implementations
 * Executes onchain enforcement actions via smart contracts on Base.
 * All actions are publicly auditable.
 */

import { ethers } from "ethers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  REPUTATION_CORE_ABI,
  SAFETY_STAKING_ABI,
  SAFETY_BADGE_ABI,
} from "./contract-abis.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ──────────────────────────────────────────────────────────────────

interface ContractAddresses {
  AgentRegistry: string;
  ReputationCore: string;
  SafetyStaking: string;
  SafetyBadge: string;
}

function loadContractAddresses(): ContractAddresses {
  const path = join(__dirname, "../../config/contract-addresses.json");
  return JSON.parse(readFileSync(path, "utf-8"));
}

function getWallet(): ethers.Wallet {
  const rpcUrl = process.env.BASE_RPC_URL;
  const privateKey = process.env.AGENT_PRIVATE_KEY;
  if (!rpcUrl) throw new Error("BASE_RPC_URL not set");
  if (!privateKey) throw new Error("AGENT_PRIVATE_KEY not set");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return new ethers.Wallet(privateKey, provider);
}

// ─── Retry logic ─────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt === MAX_RETRIES) {
        throw new Error(
          `${label} failed after ${MAX_RETRIES} attempts: ${error.message}`
        );
      }
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

// ─── Gas check helper ────────────────────────────────────────────────────────

async function checkBalance(wallet: ethers.Wallet, label: string): Promise<void> {
  const balance = await wallet.provider!.getBalance(wallet.address);
  const minBalance = ethers.parseEther("0.001"); // Need at least 0.001 ETH for gas
  if (balance < minBalance) {
    throw new Error(
      `Insufficient ETH balance for ${label}. Have ${ethers.formatEther(balance)} ETH, need at least 0.001 ETH`
    );
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface EnforcementResult {
  success: boolean;
  tx_hash?: string;
  gas_used?: string;
  error?: string;
}

interface ScoreUpdateResult extends EnforcementResult {
  old_score?: number;
  new_score?: number;
}

interface SlashResult extends EnforcementResult {
  slash_amount_eth?: string;
  remaining_stake_eth?: string;
}

interface BadgeMintResult extends EnforcementResult {
  token_id?: number;
  tier_name?: string;
}

interface BadgeRevokeResult extends EnforcementResult {
  revoked_token_id?: number;
}

// ─── Tool: update_reputation_onchain ─────────────────────────────────────────

export async function update_reputation_onchain(
  address: string,
  score: number,
  reason: string
): Promise<ScoreUpdateResult> {
  if (score < 0 || score > 1000) {
    return { success: false, error: "Score must be between 0 and 1000" };
  }

  return withRetry(async () => {
    const wallet = getWallet();
    await checkBalance(wallet, "update_reputation_onchain");

    const addresses = loadContractAddresses();
    const contract = new ethers.Contract(
      addresses.ReputationCore,
      REPUTATION_CORE_ABI,
      wallet
    );

    // Get old score
    let oldScore = 500;
    try {
      const [effective] = await contract.getScore(address);
      oldScore = Number(effective);
    } catch {
      // Agent not yet scored, use default
    }

    // Estimate gas first
    const gasEstimate = await contract.updateScore.estimateGas(
      address,
      score,
      reason
    );

    const tx = await contract.updateScore(address, score, reason, {
      gasLimit: gasEstimate * 120n / 100n, // 20% buffer
    });

    const receipt = await tx.wait();

    return {
      success: true,
      tx_hash: receipt.hash,
      old_score: oldScore,
      new_score: score,
      gas_used: receipt.gasUsed.toString(),
    };
  }, "update_reputation_onchain");
}

// ─── Tool: slash_agent_stake ─────────────────────────────────────────────────

export async function slash_agent_stake(
  address: string,
  bps: number,
  reason: string
): Promise<SlashResult> {
  if (bps < 1 || bps > 5000) {
    return { success: false, error: "BPS must be between 1 and 5000 (0.01% - 50%)" };
  }

  return withRetry(async () => {
    const wallet = getWallet();
    await checkBalance(wallet, "slash_agent_stake");

    const addresses = loadContractAddresses();
    const contract = new ethers.Contract(
      addresses.SafetyStaking,
      SAFETY_STAKING_ABI,
      wallet
    );

    // Check current stake
    const [stakeAmount] = await contract.getStakeInfo(address);
    if (stakeAmount === 0n) {
      return { success: false, error: "Agent has no stake to slash" };
    }

    const slashAmount = (stakeAmount * BigInt(bps)) / 10000n;

    const gasEstimate = await contract.slash.estimateGas(address, bps, reason);

    const tx = await contract.slash(address, bps, reason, {
      gasLimit: gasEstimate * 120n / 100n,
    });

    const receipt = await tx.wait();

    return {
      success: true,
      tx_hash: receipt.hash,
      slash_amount_eth: ethers.formatEther(slashAmount),
      remaining_stake_eth: ethers.formatEther(stakeAmount - slashAmount),
      gas_used: receipt.gasUsed.toString(),
    };
  }, "slash_agent_stake");
}

// ─── Tool: mint_safety_badge ─────────────────────────────────────────────────

const TIER_NAMES: Record<number, string> = {
  1: "Bronze",
  2: "Silver",
  3: "Gold",
};

export async function mint_safety_badge(
  address: string,
  tier: number,
  score: number
): Promise<BadgeMintResult> {
  if (tier < 1 || tier > 3) {
    return { success: false, error: "Tier must be 1 (Bronze), 2 (Silver), or 3 (Gold)" };
  }
  if (score < 0 || score > 1000) {
    return { success: false, error: "Score must be between 0 and 1000" };
  }

  return withRetry(async () => {
    const wallet = getWallet();
    await checkBalance(wallet, "mint_safety_badge");

    const addresses = loadContractAddresses();
    const contract = new ethers.Contract(
      addresses.SafetyBadge,
      SAFETY_BADGE_ABI,
      wallet
    );

    const gasEstimate = await contract.mintBadge.estimateGas(
      address,
      tier,
      score
    );

    const tx = await contract.mintBadge(address, tier, score, {
      gasLimit: gasEstimate * 120n / 100n,
    });

    const receipt = await tx.wait();

    // Extract tokenId from event
    let tokenId = 0;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed?.name === "BadgeMinted") {
          tokenId = Number(parsed.args[0]);
        }
      } catch {
        // Not our event
      }
    }

    return {
      success: true,
      tx_hash: receipt.hash,
      token_id: tokenId,
      tier_name: TIER_NAMES[tier] || "Unknown",
      gas_used: receipt.gasUsed.toString(),
    };
  }, "mint_safety_badge");
}

// ─── Tool: revoke_safety_badge ───────────────────────────────────────────────

export async function revoke_safety_badge(
  address: string,
  reason: string
): Promise<BadgeRevokeResult> {
  return withRetry(async () => {
    const wallet = getWallet();
    await checkBalance(wallet, "revoke_safety_badge");

    const addresses = loadContractAddresses();
    const contract = new ethers.Contract(
      addresses.SafetyBadge,
      SAFETY_BADGE_ABI,
      wallet
    );

    // Get existing badge tokenId
    let tokenId = 0;
    try {
      const [tid] = await contract.getBadge(address);
      tokenId = Number(tid);
    } catch {
      return { success: false, error: "Agent has no badge to revoke" };
    }

    const gasEstimate = await contract.revokeBadge.estimateGas(address, reason);

    const tx = await contract.revokeBadge(address, reason, {
      gasLimit: gasEstimate * 120n / 100n,
    });

    const receipt = await tx.wait();

    return {
      success: true,
      tx_hash: receipt.hash,
      revoked_token_id: tokenId,
      gas_used: receipt.gasUsed.toString(),
    };
  }, "revoke_safety_badge");
}
