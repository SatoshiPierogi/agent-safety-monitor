/**
 * Farcaster Client via Neynar API
 * Posts casts and reads notifications.
 * Docs: https://docs.neynar.com/reference
 */

import https from "https";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FarcasterCredentials {
  neynarApiKey: string;
  signerUuid: string;
}

export interface Cast {
  hash: string;
  text: string;
  author_fid: number;
  author_username: string;
  timestamp: string;
}

export interface CastResult {
  success: boolean;
  cast_hash?: string;
  error?: string;
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

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

// ─── Farcaster Client ────────────────────────────────────────────────────────

export class FarcasterClient {
  private creds: FarcasterCredentials;
  private baseUrl = "https://api.neynar.com/v2/farcaster";

  constructor(creds?: FarcasterCredentials) {
    this.creds = creds || {
      neynarApiKey: process.env.NEYNAR_API_KEY || "",
      signerUuid: process.env.NEYNAR_SIGNER_UUID || "",
    };
  }

  isConfigured(): boolean {
    return !!(this.creds.neynarApiKey && this.creds.signerUuid);
  }

  /** Post a cast */
  async postCast(text: string, parentHash?: string): Promise<CastResult> {
    if (!this.isConfigured()) {
      return { success: false, error: "Farcaster/Neynar credentials not configured" };
    }

    const url = `${this.baseUrl}/cast`;
    const body: Record<string, any> = {
      signer_uuid: this.creds.signerUuid,
      text,
    };

    if (parentHash) {
      body.parent = parentHash;
    }

    try {
      const res = await request(
        "POST",
        url,
        { api_key: this.creds.neynarApiKey },
        JSON.stringify(body)
      );

      if (res.status === 200 || res.status === 201) {
        const hash = res.data?.cast?.hash;
        console.log(`[FARCASTER] Cast posted: ${hash}`);
        return { success: true, cast_hash: hash };
      } else {
        const errMsg = res.data?.message || JSON.stringify(res.data);
        console.error(`[FARCASTER] Post failed (${res.status}): ${errMsg}`);
        return { success: false, error: `HTTP ${res.status}: ${errMsg}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /** Get recent notifications/mentions */
  async getNotifications(fid: number, cursor?: string): Promise<Cast[]> {
    if (!this.isConfigured()) return [];

    let url = `${this.baseUrl}/notifications?fid=${fid}&type=mentions`;
    if (cursor) {
      url += `&cursor=${cursor}`;
    }

    try {
      const res = await request("GET", url, {
        api_key: this.creds.neynarApiKey,
      });

      if (res.status === 200) {
        const notifications = res.data?.notifications || [];
        return notifications.map((n: any) => ({
          hash: n.cast?.hash || "",
          text: n.cast?.text || "",
          author_fid: n.cast?.author?.fid || 0,
          author_username: n.cast?.author?.username || "",
          timestamp: n.cast?.timestamp || "",
        }));
      }
    } catch {
      // Silently fail
    }
    return [];
  }

  /** Reply to a cast */
  async replyCast(text: string, parentHash: string): Promise<CastResult> {
    return this.postCast(text, parentHash);
  }
}
