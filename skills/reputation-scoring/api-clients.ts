/**
 * API Clients for AIXBT and Nansen with caching
 */

import axios, { AxiosInstance } from "axios";

// ─── Simple in-memory cache ─────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SimpleCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  clear(): void {
    this.store.clear();
  }
}

// ─── AIXBT API Client ────────────────────────────────────────────────────────
// Docs: https://api.aixbt.tech
// Auth: x-api-key header
// Cache: 1 hour

export interface AixbtSignal {
  type: string;
  content: string;
  timestamp: string;
  sentiment?: number;
}

export interface AixbtProjectData {
  id: string;
  name: string;
  momentum_score: number;
  signals: AixbtSignal[];
  risk_level?: string;
}

export interface AixbtSentimentResult {
  sentiment_score: number; // 0-1000 (500 = neutral)
  momentum: number;
  signals: AixbtSignal[];
  cached: boolean;
  error?: string;
}

const aixbtCache = new SimpleCache<AixbtSentimentResult>();
const AIXBT_CACHE_TTL = 3600 * 1000; // 1 hour

function getAixbtClient(): AxiosInstance {
  const apiKey = process.env.AIXBT_API_KEY;
  if (!apiKey) throw new Error("AIXBT_API_KEY not set");
  return axios.create({
    baseURL: "https://api.aixbt.tech",
    headers: { "x-api-key": apiKey },
    timeout: 10000,
  });
}

export async function queryAixbtSentiment(
  tokenOrProject: string,
  forceRefresh: boolean = false
): Promise<AixbtSentimentResult> {
  const cacheKey = `aixbt:${tokenOrProject.toLowerCase()}`;

  if (!forceRefresh) {
    const cached = aixbtCache.get(cacheKey);
    if (cached) return { ...cached, cached: true };
  }

  try {
    const client = getAixbtClient();

    // Search for the project
    const searchRes = await client.get("/v2/projects", {
      params: { search: tokenOrProject, limit: 1 },
    });

    const projects = searchRes.data?.data || searchRes.data || [];
    if (!projects.length) {
      return {
        sentiment_score: 500, // Neutral — no data
        momentum: 0,
        signals: [],
        cached: false,
        error: "Project not found on AIXBT",
      };
    }

    const project = projects[0];
    const projectId = project.id || project.slug;

    // Get detailed project info with signals
    const detailRes = await client.get(`/v2/projects/${projectId}`);
    const detail = detailRes.data?.data || detailRes.data;

    // Get momentum data
    let momentum = 0;
    try {
      const momentumRes = await client.get(`/v2/projects/${projectId}/momentum`);
      momentum = momentumRes.data?.data?.momentum || momentumRes.data?.momentum || 0;
    } catch {
      // Momentum endpoint optional
    }

    // Convert AIXBT sentiment to 0-1000 scale
    // AIXBT uses momentum scores and signal analysis
    const signals: AixbtSignal[] = (detail.signals || []).slice(0, 10);

    // Calculate sentiment from signals
    let positiveSignals = 0;
    let negativeSignals = 0;
    for (const signal of signals) {
      const type = (signal.type || "").toLowerCase();
      if (type.includes("risk") || type.includes("alert") || type.includes("warning")) {
        negativeSignals++;
      } else if (type.includes("launch") || type.includes("partnership") || type.includes("growth")) {
        positiveSignals++;
      }
    }

    // Base score starts at 500 (neutral)
    // Adjust based on momentum and signal sentiment
    let sentimentScore = 500;
    sentimentScore += Math.min(momentum * 2, 200); // Momentum bonus up to +200
    sentimentScore += (positiveSignals - negativeSignals) * 30; // Signal sentiment
    sentimentScore = Math.max(0, Math.min(1000, sentimentScore)); // Clamp 0-1000

    const result: AixbtSentimentResult = {
      sentiment_score: Math.round(sentimentScore),
      momentum,
      signals,
      cached: false,
    };

    aixbtCache.set(cacheKey, result, AIXBT_CACHE_TTL);
    return result;
  } catch (error: any) {
    return {
      sentiment_score: 500,
      momentum: 0,
      signals: [],
      cached: false,
      error: `AIXBT API error: ${error.message}`,
    };
  }
}

// ─── Nansen API Client ───────────────────────────────────────────────────────
// Docs: https://api.nansen.ai
// Auth: apikey header (lowercase)
// Cache: 6 hours

export interface NansenLabel {
  label: string;
  category: string;
}

export interface NansenLabelsResult {
  labels: string[];
  is_smart_money: boolean;
  risk_flags: string[];
  counterparty_quality: "high" | "medium" | "low" | "unknown";
  cached: boolean;
  error?: string;
}

const nansenCache = new SimpleCache<NansenLabelsResult>();
const NANSEN_CACHE_TTL = 6 * 3600 * 1000; // 6 hours

function getNansenClient(): AxiosInstance {
  const apiKey = process.env.NANSEN_API_KEY;
  if (!apiKey) throw new Error("NANSEN_API_KEY not set");
  return axios.create({
    baseURL: "https://api.nansen.ai",
    headers: { apikey: apiKey },
    timeout: 15000,
  });
}

export async function queryNansenLabels(
  address: string,
  forceRefresh: boolean = false
): Promise<NansenLabelsResult> {
  const cacheKey = `nansen:${address.toLowerCase()}`;

  if (!forceRefresh) {
    const cached = nansenCache.get(cacheKey);
    if (cached) return { ...cached, cached: true };
  }

  try {
    const client = getNansenClient();

    // Get wallet profile and labels
    const profileRes = await client.get("/v1/profiler/address/transactions", {
      params: { address, chain: "base" },
    });

    const profileData = profileRes.data?.data || profileRes.data;

    // Extract labels
    const labels: string[] = [];
    const riskFlags: string[] = [];
    let isSmartMoney = false;
    let counterpartyQuality: "high" | "medium" | "low" | "unknown" = "unknown";

    if (profileData?.labels) {
      for (const label of profileData.labels) {
        const labelStr = typeof label === "string" ? label : label.label || label.name;
        labels.push(labelStr);

        const lower = labelStr.toLowerCase();
        if (lower.includes("smart money") || lower.includes("whale")) {
          isSmartMoney = true;
          counterpartyQuality = "high";
        }
        if (lower.includes("exploit") || lower.includes("hack") || lower.includes("scam")) {
          riskFlags.push(labelStr);
          counterpartyQuality = "low";
        }
        if (lower.includes("mev") || lower.includes("bot")) {
          riskFlags.push(labelStr);
        }
      }
    }

    // Try to get related wallets for more context
    try {
      const relatedRes = await client.get("/v1/profiler/address/related-wallets", {
        params: { address },
      });
      const related = relatedRes.data?.data || [];
      if (related.length > 5) {
        labels.push("multi-wallet-cluster");
      }
    } catch {
      // Related wallets endpoint optional
    }

    const result: NansenLabelsResult = {
      labels,
      is_smart_money: isSmartMoney,
      risk_flags: riskFlags,
      counterparty_quality: counterpartyQuality,
      cached: false,
    };

    nansenCache.set(cacheKey, result, NANSEN_CACHE_TTL);
    return result;
  } catch (error: any) {
    return {
      labels: [],
      is_smart_money: false,
      risk_flags: [],
      counterparty_quality: "unknown",
      cached: false,
      error: `Nansen API error: ${error.message}`,
    };
  }
}
