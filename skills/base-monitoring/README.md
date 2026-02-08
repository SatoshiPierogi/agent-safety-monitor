# base-monitoring

OpenClaw MCP skill for monitoring AI agent transactions on the Base L2 blockchain.

## What It Does

Fetches on-chain transaction data for agent wallet addresses via Base RPC (ethers.js), analyzes patterns, and detects violations against configurable detection rules.

## Tools

### `monitor_agent_transactions(address, hours)`

Fetch recent transactions for an agent address using `eth_getLogs` RPC calls.

**Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `address` | string | yes | — | Agent's Ethereum address |
| `hours` | number | no | 6 | Hours of history to scan |

**Returns:** Array of transaction summaries including hash, from, to, value, status, timestamp, and method signature.

### `detect_violations(address, transactions)`

Analyze transactions against detection rules defined in `config/detection-rules.json`.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | string | yes | Agent's address |
| `transactions` | array | yes | Output from `monitor_agent_transactions` |

**Returns:** Array of violations with type, severity, description, evidence (tx hashes), and recommended action.

**Detection Rules:**

| Violation | Severity | Trigger |
|-----------|----------|---------|
| `DRAIN_PATTERN` | CRITICAL | >3 outbound transfers to different addresses in 1 hour |
| `HIGH_FAILURE_RATE` | HIGH | >30% failed transactions in 24 hours |
| `RAPID_TOKEN_DUMPS` | HIGH | >5 large token sells in 1 hour |
| `WASH_TRADING` | MEDIUM | Circular transfers between same address pairs |
| `DORMANT_ACTIVATION` | LOW | Sudden activity after 30+ days dormant |

### `get_agent_activity(address, transactions, hours)`

Summarize an agent's on-chain activity patterns.

**Returns:** Object with `total_txs`, `successful_txs`, `failed_txs`, `failure_rate`, `total_value_eth`, `unique_counterparties`, `is_active`.

## Configuration

Detection thresholds are configurable in `config/detection-rules.json`. Modify severity levels, time windows, and trigger counts without changing code.

## Requirements

- `BASE_RPC_URL` environment variable (Alchemy recommended)
- ethers.js 6.x

## Usage in Other Projects

This skill can be reused for any Base monitoring use case:

```typescript
import { monitor_agent_transactions, detect_violations } from "./skills/base-monitoring/index.js";

const txs = await monitor_agent_transactions("0x1234...", 24);
const violations = detect_violations("0x1234...", txs);
```
