# agent-enforcement

OpenClaw MCP skill for executing on-chain enforcement actions via smart contracts on Base.

## What It Does

Interacts with four deployed Solidity contracts to enforce safety decisions. All actions are on-chain and publicly auditable. Includes retry logic (3 attempts, exponential backoff) and gas balance checking.

## Tools

### `update_reputation_onchain(address, score, reason)`

Update an agent's reputation score on the ReputationCore contract.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | string | yes | Agent's Ethereum address |
| `score` | number | yes | New score (0-1000) |
| `reason` | string | yes | Human-readable reason |

**Returns:** `{ success, tx_hash, old_score, new_score, gas_used }`

### `slash_agent_stake(address, bps, reason)`

Slash a percentage of an agent's staked ETH.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | string | yes | Agent to slash |
| `bps` | number | yes | Basis points (100 = 1%, max 5000 = 50%) |
| `reason` | string | yes | Human-readable reason |

**Returns:** `{ success, tx_hash, slash_amount_eth, remaining_stake_eth, gas_used }`

### `mint_safety_badge(address, tier, score)`

Mint a safety badge NFT (ERC-721 with on-chain SVG) for a qualifying agent.

**Badge Tiers:**
| Tier | Value | Requirements |
|------|-------|-------------|
| Bronze | 1 | 30+ days, score >700, 0.01 ETH staked |
| Silver | 2 | 90+ days, score >850, 0.05 ETH staked |
| Gold | 3 | 180+ days, score >950, 0.1 ETH staked |

**Returns:** `{ success, tx_hash, token_id, tier_name, gas_used }`

### `revoke_safety_badge(address, reason)`

Revoke (burn) an agent's safety badge for misconduct.

**Returns:** `{ success, tx_hash, revoked_token_id, gas_used }`

## Smart Contracts

| Contract | Purpose |
|----------|---------|
| **AgentRegistry** | ERC-721 identity with metadata |
| **ReputationCore** | Scores 0-1000, time-decay penalties |
| **SafetyStaking** | ETH staking, slashing, 7-day timelock |
| **SafetyBadge** | Dynamic ERC-721 badges with on-chain SVG |

Contract addresses are loaded from `config/contract-addresses.json`. ABIs are defined in `contract-abis.ts`.

## Retry Logic

All on-chain operations use exponential backoff:
- Attempt 1: immediate
- Attempt 2: 1 second delay
- Attempt 3: 2 second delay
- Failure after 3 attempts: throws error

## Requirements

- `BASE_RPC_URL` — Base RPC endpoint
- `AGENT_PRIVATE_KEY` — Wallet private key with SCORE_UPDATER/SLASHER/MINTER roles
- Minimum 0.001 ETH balance for gas

## Usage in Other Projects

```typescript
import { update_reputation_onchain, mint_safety_badge } from "./skills/agent-enforcement/index.js";

// Update a score
const result = await update_reputation_onchain("0x1234...", 750, "Good behavior");

// Mint a Bronze badge
const badge = await mint_safety_badge("0x1234...", 1, 750);
```
