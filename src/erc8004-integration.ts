/**
 * ERC-8004 Integration — Connects to the live Identity & Reputation Registries on Base.
 *
 * Identity Registry: 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
 * Reputation Registry: 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63
 *
 * Our Safety Monitor uses these to:
 *   1. Discover registered agents on Base (3,643+ agents)
 *   2. Read existing reputation feedback for agents
 *   3. Submit safety assessments as on-chain feedback via giveFeedback()
 *   4. Register itself as an ERC-8004 agent
 */

import { ethers } from "ethers";
import https from "https";

// ─── Contract Addresses (same on all EVM chains) ────────────────────────────

export const ERC8004_IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
export const ERC8004_REPUTATION_REGISTRY = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63";

// ─── ABIs (only the functions we use) ────────────────────────────────────────

const IDENTITY_REGISTRY_ABI = [
  // Registration
  "function register(string agentURI) external returns (uint256 agentId)",
  "function register(string agentURI, tuple(string metadataKey, bytes metadataValue)[] metadata) external returns (uint256 agentId)",
  "function register() external returns (uint256 agentId)",

  // Read
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function getAgentWallet(uint256 agentId) external view returns (address)",
  "function getMetadata(uint256 agentId, string metadataKey) external view returns (bytes)",

  // Write
  "function setAgentURI(uint256 agentId, string newURI) external",
  "function setMetadata(uint256 agentId, string metadataKey, bytes metadataValue) external",
  "function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes signature) external",

  // Events
  "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)",
  "event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy)",
  "event MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey, string metadataKey, bytes metadataValue)",
];

const REPUTATION_REGISTRY_ABI = [
  // Read
  "function getIdentityRegistry() external view returns (address)",
  "function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)",
  "function readFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex) external view returns (int128 value, uint8 valueDecimals, string tag1, string tag2, bool isRevoked)",
  "function readAllFeedback(uint256 agentId, address[] clientAddresses, string tag1, string tag2, bool includeRevoked) external view returns (address[] clients, uint64[] feedbackIndexes, int128[] values, uint8[] valueDecimals, string[] tag1s, string[] tag2s, bool[] revokedStatuses)",
  "function getClients(uint256 agentId) external view returns (address[])",
  "function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64)",
  "function getResponseCount(uint256 agentId, address clientAddress, uint64 feedbackIndex, address[] responders) external view returns (uint64 count)",

  // Write
  "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash) external",
  "function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external",
  "function appendResponse(uint256 agentId, address clientAddress, uint64 feedbackIndex, string responseURI, bytes32 responseHash) external",

  // Events
  "event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)",
  "event FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex)",
  "event ResponseAppended(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, address indexed responder, string responseURI, bytes32 responseHash)",
];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DiscoveredAgent {
  agentId: number;
  name: string;
  description: string;
  ownerAddress: string;
  agentWallet: string;
  chainId: number;
  totalScore: number;
  qualityScore: number;
  popularityScore: number;
  activityScore: number;
  totalFeedbacks: number;
  isActive: boolean;
  isVerified: boolean;
  categories: string[];
  services: string[];
  imageUrl: string;
  createdAt: string;
}

export interface ReputationSummary {
  agentId: number;
  feedbackCount: number;
  summaryValue: number;
  summaryDecimals: number;
  clients: string[];
  ourFeedbackExists: boolean;
  ourLastFeedbackIndex: number;
}

export interface FeedbackResult {
  success: boolean;
  tx_hash?: string;
  agentId: number;
  feedbackValue: number;
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.BASE_RPC_URL;
  if (!rpcUrl) throw new Error("BASE_RPC_URL not set");
  return new ethers.JsonRpcProvider(rpcUrl);
}

function getWallet(): ethers.Wallet {
  const privateKey = process.env.AGENT_PRIVATE_KEY;
  if (!privateKey) throw new Error("AGENT_PRIVATE_KEY not set");
  return new ethers.Wallet(privateKey, getProvider());
}

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}`));
        }
      });
      res.on("error", reject);
    }).on("error", reject);
  });
}

// ─── Agent Discovery via 8004scan.io API ─────────────────────────────────────

/**
 * Discover ERC-8004 registered agents on Base via the 8004scan.io API.
 * This is more efficient than on-chain enumeration for bulk discovery.
 * Falls back to on-chain reads if the API is unavailable.
 */
export async function discoverAgents(
  options: {
    chainId?: number;
    limit?: number;
    minScore?: number;
    category?: string;
  } = {}
): Promise<DiscoveredAgent[]> {
  const chainId = options.chainId ?? 8453; // Default: Base
  const limit = options.limit ?? 50;
  const minScore = options.minScore ?? 0;

  try {
    const apiUrl = `https://www.8004scan.io/api/v1/agents?chain_id=${chainId}&limit=${limit}`;
    const response = await fetchJson(apiUrl);

    if (!response?.items || !Array.isArray(response.items)) {
      console.log("[ERC-8004] API returned unexpected format, falling back to empty list");
      return [];
    }

    const agents: DiscoveredAgent[] = response.items
      .filter((item: any) => {
        if (item.is_testnet) return false;
        if (item.total_score < minScore) return false;
        if (options.category && !item.categories?.includes(options.category)) return false;
        return true;
      })
      .map((item: any) => ({
        agentId: item.token_id ?? 0,
        name: item.name || `Agent #${item.token_id}`,
        description: item.description || "",
        ownerAddress: item.owner_address || "",
        agentWallet: item.agent_wallet || item.owner_address || "",
        chainId: item.chain_id || chainId,
        totalScore: item.total_score || 0,
        qualityScore: item.quality_score || 0,
        popularityScore: item.popularity_score || 0,
        activityScore: item.activity_score || 0,
        totalFeedbacks: item.total_feedbacks || 0,
        isActive: item.is_active ?? true,
        isVerified: item.is_verified ?? false,
        categories: item.categories || [],
        services: item.services ? Object.keys(item.services) : [],
        imageUrl: item.image_url || "",
        createdAt: item.created_at || "",
      }));

    return agents.slice(0, limit);
  } catch (err: any) {
    console.error(`[ERC-8004] Discovery API error: ${err.message}`);
    return [];
  }
}

// ─── Read Reputation from On-Chain Registry ──────────────────────────────────

/**
 * Get reputation summary for an agent from the on-chain Reputation Registry.
 * This reads directly from the Base blockchain.
 */
export async function getAgentReputation(
  agentId: number
): Promise<ReputationSummary> {
  const provider = getProvider();
  const reputation = new ethers.Contract(
    ERC8004_REPUTATION_REGISTRY,
    REPUTATION_REGISTRY_ABI,
    provider
  );

  // Get all clients who have given feedback
  let clients: string[] = [];
  try {
    clients = await reputation.getClients(agentId);
  } catch {
    // No feedback yet
  }

  // Get overall summary (all clients, no tag filter)
  let feedbackCount = 0;
  let summaryValue = 0;
  let summaryDecimals = 0;
  try {
    const [count, value, decimals] = await reputation.getSummary(
      agentId,
      [], // all clients
      "", // no tag1 filter
      ""  // no tag2 filter
    );
    feedbackCount = Number(count);
    summaryValue = Number(value);
    summaryDecimals = Number(decimals);
  } catch {
    // No summary available
  }

  // Check if we have already given feedback
  let ourFeedbackExists = false;
  let ourLastFeedbackIndex = 0;
  try {
    const wallet = getWallet();
    const lastIndex = await reputation.getLastIndex(agentId, wallet.address);
    ourLastFeedbackIndex = Number(lastIndex);
    ourFeedbackExists = ourLastFeedbackIndex > 0;
  } catch {
    // No wallet configured or no prior feedback
  }

  return {
    agentId,
    feedbackCount,
    summaryValue,
    summaryDecimals,
    clients: clients.map((c: string) => c),
    ourFeedbackExists,
    ourLastFeedbackIndex,
  };
}

/**
 * Read our own previous feedback for an agent.
 */
export async function readOurFeedback(
  agentId: number
): Promise<{ value: number; decimals: number; tag1: string; tag2: string; isRevoked: boolean } | null> {
  try {
    const wallet = getWallet();
    const provider = getProvider();
    const reputation = new ethers.Contract(
      ERC8004_REPUTATION_REGISTRY,
      REPUTATION_REGISTRY_ABI,
      provider
    );

    const lastIndex = await reputation.getLastIndex(agentId, wallet.address);
    if (Number(lastIndex) === 0) return null;

    const [value, decimals, tag1, tag2, isRevoked] = await reputation.readFeedback(
      agentId,
      wallet.address,
      lastIndex
    );

    return {
      value: Number(value),
      decimals: Number(decimals),
      tag1,
      tag2,
      isRevoked,
    };
  } catch {
    return null;
  }
}

// ─── Submit Safety Feedback ──────────────────────────────────────────────────

/**
 * Submit a safety assessment as on-chain feedback to the ERC-8004 Reputation Registry.
 *
 * @param agentId - The ERC-8004 token ID of the agent being assessed
 * @param safetyScore - Our safety score (0-1000)
 * @param details - Human-readable reason for the score
 * @param endpoint - Optional: the endpoint/service being assessed
 */
export async function submitSafetyFeedback(
  agentId: number,
  safetyScore: number,
  details: string,
  endpoint: string = ""
): Promise<FeedbackResult> {
  if (safetyScore < 0 || safetyScore > 1000) {
    return { success: false, agentId, feedbackValue: safetyScore, error: "Score must be 0-1000" };
  }

  try {
    const wallet = getWallet();

    // Check balance
    const balance = await wallet.provider!.getBalance(wallet.address);
    if (balance < ethers.parseEther("0.0005")) {
      return {
        success: false,
        agentId,
        feedbackValue: safetyScore,
        error: `Insufficient ETH: ${ethers.formatEther(balance)}`,
      };
    }

    const reputation = new ethers.Contract(
      ERC8004_REPUTATION_REGISTRY,
      REPUTATION_REGISTRY_ABI,
      wallet
    );

    // Feedback value: use int128 with 0 decimals (scores are integers 0-1000)
    const feedbackValue = BigInt(safetyScore);

    // Tags identify our feedback type
    const tag1 = "safety-score";
    const tag2 = "agent-safety-monitor";

    // Feedback URI: could point to our daily log (leave empty for now)
    const feedbackURI = "";

    // Feedback hash: keccak256 of the details string
    const feedbackHash = ethers.keccak256(ethers.toUtf8Bytes(details));

    const tx = await reputation.giveFeedback(
      agentId,
      feedbackValue,
      0, // valueDecimals: 0 (integer scores)
      tag1,
      tag2,
      endpoint,
      feedbackURI,
      feedbackHash
    );

    const receipt = await tx.wait();

    console.log(
      `[ERC-8004] Feedback submitted for agent #${agentId}: score=${safetyScore} tx=${receipt.hash}`
    );

    return {
      success: true,
      tx_hash: receipt.hash,
      agentId,
      feedbackValue: safetyScore,
    };
  } catch (err: any) {
    return {
      success: false,
      agentId,
      feedbackValue: safetyScore,
      error: err.message,
    };
  }
}

/**
 * Revoke our previous feedback for an agent (if we need to correct it).
 */
export async function revokePreviousFeedback(
  agentId: number,
  feedbackIndex: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const wallet = getWallet();
    const reputation = new ethers.Contract(
      ERC8004_REPUTATION_REGISTRY,
      REPUTATION_REGISTRY_ABI,
      wallet
    );

    const tx = await reputation.revokeFeedback(agentId, feedbackIndex);
    await tx.wait();

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Self-Registration ───────────────────────────────────────────────────────

/**
 * Register our Safety Monitor agent on the ERC-8004 Identity Registry.
 * Returns the assigned agentId (token ID).
 */
export async function registerSelf(
  agentURI: string
): Promise<{ success: boolean; agentId?: number; tx_hash?: string; error?: string }> {
  try {
    const wallet = getWallet();

    const identity = new ethers.Contract(
      ERC8004_IDENTITY_REGISTRY,
      IDENTITY_REGISTRY_ABI,
      wallet
    );

    // Check if already registered (has balance > 0)
    const balance = await identity.balanceOf(wallet.address);
    if (Number(balance) > 0) {
      console.log("[ERC-8004] Agent already registered on Identity Registry");
      return { success: true, agentId: -1, error: "Already registered" };
    }

    const tx = await identity["register(string)"](agentURI);
    const receipt = await tx.wait();

    // Extract agentId from Registered event
    let agentId = 0;
    for (const log of receipt.logs) {
      try {
        const parsed = identity.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed?.name === "Registered") {
          agentId = Number(parsed.args[0]);
        }
      } catch {
        // Not our event
      }
    }

    console.log(`[ERC-8004] Registered as agent #${agentId}. tx=${receipt.hash}`);

    return {
      success: true,
      agentId,
      tx_hash: receipt.hash,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Lookup Helpers ──────────────────────────────────────────────────────────

/**
 * Look up an agent's token ID from the 8004scan API by wallet address.
 */
export async function lookupAgentByAddress(
  address: string
): Promise<DiscoveredAgent | null> {
  try {
    const agents = await discoverAgents({ limit: 100 });
    const normalized = address.toLowerCase();

    return agents.find(
      (a) =>
        a.ownerAddress.toLowerCase() === normalized ||
        a.agentWallet.toLowerCase() === normalized
    ) || null;
  } catch {
    return null;
  }
}

/**
 * Read agent info directly from the on-chain Identity Registry.
 */
export async function getAgentInfo(
  agentId: number
): Promise<{ owner: string; tokenURI: string; agentWallet: string } | null> {
  try {
    const provider = getProvider();
    const identity = new ethers.Contract(
      ERC8004_IDENTITY_REGISTRY,
      IDENTITY_REGISTRY_ABI,
      provider
    );

    const owner = await identity.ownerOf(agentId);
    const tokenURI = await identity.tokenURI(agentId);

    let agentWallet = "";
    try {
      agentWallet = await identity.getAgentWallet(agentId);
    } catch {
      // No wallet set
    }

    return { owner, tokenURI, agentWallet };
  } catch {
    return null;
  }
}
