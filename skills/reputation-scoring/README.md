# reputation-scoring

OpenClaw MCP skill for calculating weighted reputation scores from multiple independent data sources.

## What It Does

Combines on-chain behavioral data (40%), AIXBT market sentiment (30%), and Nansen wallet intelligence (30%) into a single 0-1000 reputation score. Supports degraded mode when external APIs are unavailable.

## Tools

### `calculate_score(address, onchainData, forceRefresh?)`

Calculate a composite reputation score using the weighted formula.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | string | yes | Agent's Ethereum address |
| `onchainData` | object | yes | Activity data from base-monitoring skill |
| `forceRefresh` | boolean | no | Bypass cache for API calls |

**`onchainData` shape:**
```typescript
{
  failure_rate: number;      // 0-1
  total_txs: number;
  violations: Array<{ type: string; severity: string; score_penalty: number }>;
  total_value_eth: number;
  unique_counterparties: number;
  is_active: boolean;
}
```

**Returns:**
```typescript
{
  score: number;              // 0-1000
  confidence: number;         // 0-1 (reduced in degraded mode)
  breakdown: {
    onchain_score: number;
    aixbt_score: number;
    nansen_score: number;
  };
  data_sources_used: string[];
  reason: string;
}
```

### `apply_time_decay(penaltyPoints, ageDays)`

Reduce a penalty linearly over 90 days. After 90 days, the penalty fully expires.

**Returns:** `{ remaining_penalty, recovered_points, decay_percentage }`

## Degraded Mode

| Available Sources | Confidence | Behavior |
|-------------------|------------|----------|
| All 3 (on-chain + AIXBT + Nansen) | 100% | Full weighted calculation |
| On-chain + AIXBT | 80% | Nansen weight redistributed |
| On-chain + Nansen | 80% | AIXBT weight redistributed |
| On-chain only | 60% | On-chain gets 100% weight |

## API Caching

| API | Cache TTL | Auth Header |
|-----|-----------|-------------|
| AIXBT | 1 hour | `x-api-key` |
| Nansen | 6 hours | `apikey` |

## Requirements

- `BASE_RPC_URL` — For on-chain data
- `AIXBT_API_KEY` — Optional, degrades gracefully
- `NANSEN_API_KEY` — Optional, degrades gracefully

## Usage in Other Projects

```typescript
import { calculate_score, apply_time_decay } from "./skills/reputation-scoring/index.js";

const score = await calculate_score("0x1234...", {
  failure_rate: 0.05,
  total_txs: 150,
  violations: [],
  total_value_eth: 2.5,
  unique_counterparties: 30,
  is_active: true,
});

console.log(`Score: ${score.score}/1000 (confidence: ${score.confidence})`);
```
