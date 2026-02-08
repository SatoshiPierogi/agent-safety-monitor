/**
 * X (Twitter) API v2 Client
 * Uses OAuth 1.0a User Context for posting tweets and reading mentions.
 * Docs: https://developer.x.com/en/docs/x-api/tweets
 */

import crypto from "crypto";
import https from "https";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface XCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}

export interface Tweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  in_reply_to_user_id?: string;
}

export interface PostResult {
  success: boolean;
  tweet_id?: string;
  error?: string;
}

// ─── OAuth 1.0a signing ──────────────────────────────────────────────────────

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  creds: XCredentials
): string {
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join("&");

  const signingKey = `${percentEncode(creds.apiSecret)}&${percentEncode(creds.accessSecret)}`;

  return crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");
}

function buildAuthHeader(
  method: string,
  url: string,
  creds: XCredentials,
  extraParams: Record<string, string> = {}
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.accessToken,
    oauth_version: "1.0",
    ...extraParams,
  };

  const signature = generateOAuthSignature(method, url, oauthParams, creds);
  oauthParams.oauth_signature = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");

  return `OAuth ${headerParts}`;
}

// ─── HTTP helper (no external deps) ──────────────────────────────────────────

function request(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        ...headers,
        "Content-Type": "application/json",
        ...(body ? { "Content-Length": Buffer.byteLength(body).toString() } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode || 0, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode || 0, data });
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

// ─── X Client ────────────────────────────────────────────────────────────────

export class XClient {
  private creds: XCredentials;
  private userId: string | null = null;

  constructor(creds?: XCredentials) {
    this.creds = creds || {
      apiKey: process.env.TWITTER_API_KEY || "",
      apiSecret: process.env.TWITTER_API_SECRET || "",
      accessToken: process.env.TWITTER_ACCESS_TOKEN || "",
      accessSecret: process.env.TWITTER_ACCESS_SECRET || "",
    };
  }

  isConfigured(): boolean {
    return !!(
      this.creds.apiKey &&
      this.creds.apiSecret &&
      this.creds.accessToken &&
      this.creds.accessSecret
    );
  }

  /** Post a tweet */
  async postTweet(text: string): Promise<PostResult> {
    if (!this.isConfigured()) {
      return { success: false, error: "X credentials not configured" };
    }

    const url = "https://api.x.com/2/tweets";
    const auth = buildAuthHeader("POST", url, this.creds);
    const body = JSON.stringify({ text });

    try {
      const res = await request("POST", url, { Authorization: auth }, body);

      if (res.status === 201 || res.status === 200) {
        const tweetId = res.data?.data?.id;
        console.log(`[X] Tweet posted: ${tweetId}`);
        return { success: true, tweet_id: tweetId };
      } else {
        const errMsg = res.data?.detail || res.data?.title || JSON.stringify(res.data);
        console.error(`[X] Post failed (${res.status}): ${errMsg}`);
        return { success: false, error: `HTTP ${res.status}: ${errMsg}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /** Reply to a tweet */
  async replyToTweet(text: string, replyToId: string): Promise<PostResult> {
    if (!this.isConfigured()) {
      return { success: false, error: "X credentials not configured" };
    }

    const url = "https://api.x.com/2/tweets";
    const auth = buildAuthHeader("POST", url, this.creds);
    const body = JSON.stringify({
      text,
      reply: { in_reply_to_tweet_id: replyToId },
    });

    try {
      const res = await request("POST", url, { Authorization: auth }, body);

      if (res.status === 201 || res.status === 200) {
        return { success: true, tweet_id: res.data?.data?.id };
      } else {
        const errMsg = res.data?.detail || JSON.stringify(res.data);
        return { success: false, error: `HTTP ${res.status}: ${errMsg}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /** Get authenticated user's ID */
  async getMyUserId(): Promise<string | null> {
    if (this.userId) return this.userId;
    if (!this.isConfigured()) return null;

    const url = "https://api.x.com/2/users/me";
    const auth = buildAuthHeader("GET", url, this.creds);

    try {
      const res = await request("GET", url, { Authorization: auth });
      if (res.status === 200) {
        this.userId = res.data?.data?.id || null;
        return this.userId;
      }
    } catch {
      // Silently fail
    }
    return null;
  }

  /** Get recent mentions */
  async getMentions(sinceId?: string): Promise<Tweet[]> {
    if (!this.isConfigured()) return [];

    const userId = await this.getMyUserId();
    if (!userId) return [];

    let url = `https://api.x.com/2/users/${userId}/mentions?tweet.fields=created_at,author_id,in_reply_to_user_id&max_results=20`;
    if (sinceId) {
      url += `&since_id=${sinceId}`;
    }

    const auth = buildAuthHeader("GET", url, this.creds);

    try {
      const res = await request("GET", url, { Authorization: auth });
      if (res.status === 200) {
        return (res.data?.data || []) as Tweet[];
      }
    } catch {
      // Silently fail
    }
    return [];
  }
}
