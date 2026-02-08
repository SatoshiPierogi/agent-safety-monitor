---
name: agent-enforcement
description: Execute onchain enforcement actions — update reputation scores, slash stakes, mint/revoke safety badges via smart contracts on Base.
version: 1.0.0
tools:
  - update_reputation_onchain
  - slash_agent_stake
  - mint_safety_badge
  - revoke_safety_badge
---

# Agent Enforcement Skill

Interact with deployed smart contracts on Base to enforce safety decisions. All actions are onchain and publicly auditable.

## Tools

### update_reputation_onchain

Update an agent's reputation score on the ReputationCore contract.

**Parameters:**
- `address` (string, required) — The agent's Ethereum address
- `score` (number, required) — New score (0-1000)
- `reason` (string, required) — Human-readable reason for the update

**Returns:** Object with: success (boolean), tx_hash, old_score, new_score, gas_used.

### slash_agent_stake

Slash a percentage of an agent's staked ETH via SafetyStaking contract.

**Parameters:**
- `address` (string, required) — The agent to slash
- `bps` (number, required) — Basis points to slash (100 = 1%, max 5000 = 50%)
- `reason` (string, required) — Human-readable reason

**Returns:** Object with: success (boolean), tx_hash, slash_amount_eth, remaining_stake_eth, gas_used.

### mint_safety_badge

Mint a safety badge NFT for an agent that meets tier requirements.

**Parameters:**
- `address` (string, required) — The agent receiving the badge
- `tier` (number, required) — Badge tier: 1=Bronze, 2=Silver, 3=Gold
- `score` (number, required) — Agent's current score

**Returns:** Object with: success (boolean), tx_hash, token_id, tier_name, gas_used.

### revoke_safety_badge

Revoke (burn) an agent's safety badge.

**Parameters:**
- `address` (string, required) — The agent whose badge to revoke
- `reason` (string, required) — Human-readable reason

**Returns:** Object with: success (boolean), tx_hash, revoked_token_id, gas_used.
