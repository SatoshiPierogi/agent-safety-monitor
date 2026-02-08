# Agent Safety Monitor

An autonomous AI agent on Base blockchain that monitors other AI agents, calculates real-time reputation scores, detects malicious behavior, and enforces accountability through onchain mechanisms.

Built as an [OpenClaw](https://openclaw.dev) autonomous agent for the [Base Builder Quest](https://base.org).

## What It Does

The Agent Safety Monitor operates a continuous 6-hour heartbeat cycle:

1. **Discover** — Queries the [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) Identity Registry to discover registered agents on Base (3,643+ agents)
2. **Scan** — Fetches on-chain transaction data for each monitored agent, looking for anomalous patterns
3. **Analyze** — Calculates weighted reputation scores (0-1000) from on-chain data, AIXBT sentiment, and Nansen wallet labels
4. **Decide** — Validates findings with 2/3 data source agreement before taking action
5. **Enforce** — Updates on-chain reputation scores, slashes stakes for violations, mints/revokes safety badges
6. **Report** — Submits safety feedback to the ERC-8004 Reputation Registry and posts alerts on X and Farcaster
7. **Remember** — Updates persistent memory with scores, patterns, and operational stats

## Why It Matters

As AI agents proliferate on-chain, there's no systematic way to assess whether they're safe, reliable, or malicious. The Agent Safety Monitor is an **agent that monitors agents** — providing:

- Transparent, data-driven safety scores for any Base agent
- Real-time detection of rug pulls, wash trading, and drain attacks
- On-chain reputation that persists across the ERC-8004 ecosystem
- Autonomous enforcement without human intervention

## Architecture

```
                         ┌─────────────────────────────┐
                         │      OpenClaw Framework      │
                         │  SOUL.md │ HEARTBEAT.md │    │
                         │  MEMORY.md │ IDENTITY.md     │
                         └──────────────┬──────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
           ┌────────▼──────┐   ┌───────▼───────┐  ┌───────▼───────┐
           │ base-monitoring│   │  reputation-  │  │    agent-     │
           │    (skill)    │   │   scoring     │  │  enforcement  │
           │               │   │   (skill)     │  │    (skill)    │
           │ • monitor_txs │   │ • calc_score  │  │ • update_rep  │
           │ • detect_viol │   │ • aixbt_sent  │  │ • slash_stake │
           │ • get_activity│   │ • nansen_lbl  │  │ • mint_badge  │
           └───────┬───────┘   └───────┬───────┘  └───────┬───────┘
                   │                   │                   │
        ┌──────────▼──────────┐        │          ┌────────▼────────┐
        │   Base Blockchain   │        │          │  Our Contracts  │
        │   (RPC / ethers)    │        │          │ • AgentRegistry │
        │                     │        │          │ • ReputationCore│
        └─────────────────────┘        │          │ • SafetyStaking │
                                       │          │ • SafetyBadge   │
                              ┌────────┴────┐     └─────────────────┘
                              │  External   │
                              │   APIs      │
                              │ • AIXBT     │
                              │ • Nansen    │
                              └─────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────┐
        │                               │                           │
  ┌─────▼─────┐               ┌─────────▼─────────┐       ┌────────▼───────┐
  │  ERC-8004 │               │    X / Twitter     │       │   Farcaster    │
  │ Reputation│               │ @AgentSafetyBase   │       │   (Neynar)     │
  │ Registry  │               │  alerts + reports  │       │  alerts + casts│
  └───────────┘               └────────────────────┘       └────────────────┘
```

## ERC-8004 Integration

This agent integrates with the live [ERC-8004 Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004) protocol:

| Registry | Address | Purpose |
|----------|---------|---------|
| Identity Registry | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | Discover 3,643+ registered agents |
| Reputation Registry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | Read/write safety feedback on-chain |

**How we use it:**
- **Phase 0:** Discover agents from the registry via [8004scan.io](https://www.8004scan.io/) API
- **Phase 4b:** Submit safety scores as on-chain feedback using `giveFeedback()` with tags `safety-score` / `agent-safety-monitor`
- **Registration:** The monitor itself is registered as an ERC-8004 agent

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Agent Framework | [OpenClaw](https://openclaw.dev) |
| Blockchain | Base (L2) |
| Smart Contracts | Solidity ^0.8.24, OpenZeppelin 5.0.x, Scaffold-ETH 2 |
| Agent Identity | ERC-8004 Trustless Agents |
| Runtime | Node.js 20+, TypeScript 5+ |
| Contract Interactions | ethers.js 6.x |
| External Data | AIXBT API, Nansen API |
| Social | X (OAuth 1.0a), Farcaster (Neynar API) |
| Deployment | Docker, Railway/Render |

## Custom OpenClaw Skills

Three MCP tool skills built for this agent:

### base-monitoring
Monitors agent transactions on Base blockchain.
- `monitor_agent_transactions(address, hours)` — Fetch and categorize transactions
- `detect_violations(address, transactions)` — Check for drain patterns, failure rates, wash trading
- `get_agent_activity(address, transactions, hours)` — Activity summary with risk indicators

### reputation-scoring
Calculates weighted reputation scores from multiple sources.
- `calculate_score(address, onchainData)` — Weighted formula: On-chain 40% + AIXBT 30% + Nansen 30%
- `apply_time_decay(penaltyPoints, ageDays)` — Penalties reduce by 1/90th per day

### agent-enforcement
Executes on-chain enforcement actions via smart contracts.
- `update_reputation_onchain(address, score, reason)` — Update ReputationCore contract
- `slash_agent_stake(address, bps, reason)` — Slash SafetyStaking contract
- `mint_safety_badge(address, tier, score)` — Mint tiered ERC-721 badge NFT
- `revoke_safety_badge(address, reason)` — Burn badge for misconduct

## Smart Contracts

Four Solidity contracts deployed on Base (Scaffold-ETH 2):

| Contract | Purpose | Tests |
|----------|---------|-------|
| **AgentRegistry** | ERC-721 agent identity and metadata | 12 passing |
| **ReputationCore** | Scores (0-1000) with time-decay penalties | 14 passing |
| **SafetyStaking** | ETH staking, slashing, 7-day unstake timelock | 14 passing |
| **SafetyBadge** | Dynamic ERC-721 badges with on-chain SVG | 11 passing |

**51 total tests passing** across all contracts.

## Detection Rules

| Violation | Severity | Trigger |
|-----------|----------|---------|
| Rapid Drain | CRITICAL | >3 outbound transfers to different addresses within 1 hour |
| High Failure Rate | HIGH | >30% failed transactions over 24 hours |
| Rapid Token Dumps | HIGH | >5 large token sells within 1 hour |
| Wash Trading | MEDIUM | Circular transfers between same addresses |
| Dormant Activation | LOW | No activity for 30+ days, then sudden burst |

## Badge Tiers

| Tier | Requirements |
|------|-------------|
| Bronze | 30+ days registered, score >700, 0.01 ETH staked |
| Silver | 90+ days registered, score >850, 0.05 ETH staked |
| Gold | 180+ days registered, score >950, 0.1 ETH staked |

## Setup

### Prerequisites
- Node.js >= 20
- Yarn 3.x
- Base RPC URL (Alchemy recommended)
- Agent wallet with ETH on Base

### Install

```bash
git clone https://github.com/YOUR_USERNAME/agent-safety-monitor.git
cd agent-safety-monitor
yarn install
```

### Configure

Copy `.env` and fill in your keys:

```bash
cp .env.example .env
```

Required environment variables:
```
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
AGENT_PRIVATE_KEY=0x...
AIXBT_API_KEY=...
NANSEN_API_KEY=...
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
TWITTER_ACCESS_TOKEN=...
TWITTER_ACCESS_SECRET=...
NEYNAR_API_KEY=...
NEYNAR_SIGNER_UUID=...
FARCASTER_FID=...
```

### Run

```bash
# Single heartbeat cycle (for testing)
yarn agent:once

# Continuous operation (6-hour cycles)
yarn agent

# Run smart contract tests
cd packages/hardhat && npx hardhat test --network hardhat
```

### Deploy Contracts

```bash
# Deploy to Base Sepolia testnet
yarn deploy --network baseSepolia

# Deploy to Base mainnet
yarn deploy --network base
```

### Docker

```bash
docker build -t agent-safety-monitor .
docker run -d --env-file .env -p 3001:3001 agent-safety-monitor
```

## Query an Agent's Safety

Once running, you can query agent safety by mentioning the bot on X or Farcaster:

```
@AgentSafetyBase is 0x1234... safe?
@AgentSafetyBase score 0x1234...
@AgentSafetyBase report 0x1234...
```

The agent responds with the current safety score, badge status, stake amount, and any risk factors.

## Health Check

The agent exposes a health endpoint at `http://localhost:3001/health` returning:

```json
{
  "status": "healthy",
  "uptime": 21600,
  "lastCycle": "2026-02-08T09:33:22.488Z",
  "agentsMonitored": 10,
  "totalCycles": 4
}
```

## Project Structure

```
agent-safety-monitor/
├── src/
│   ├── index.ts                 # Entry point, scheduler, health check
│   ├── heartbeat-executor.ts    # 6-phase cycle orchestrator
│   ├── erc8004-integration.ts   # ERC-8004 registry integration
│   ├── decision-engine.ts       # 2/3 validation, badge thresholds
│   ├── memory-manager.ts        # MEMORY.md + daily log I/O
│   ├── social-poster.ts         # Post templates + rate limiter
│   ├── mention-monitor.ts       # X + Farcaster mention responder
│   └── social/
│       ├── x-client.ts          # Twitter/X OAuth 1.0a client
│       └── farcaster-client.ts  # Farcaster via Neynar API
├── skills/
│   ├── base-monitoring/         # Transaction monitoring skill
│   ├── reputation-scoring/      # Score calculation skill
│   ├── agent-enforcement/       # On-chain enforcement skill
│   └── erc8004-registration/    # ERC-8004 registration skill
├── packages/hardhat/
│   ├── contracts/               # 4 Solidity contracts
│   ├── test/                    # 51 unit tests
│   └── deploy/                  # Deployment scripts
├── workspace/
│   ├── SOUL.md                  # Agent persona and values
│   ├── HEARTBEAT.md             # Cycle instructions
│   └── MEMORY.md                # Persistent agent state
├── config/
│   ├── contract-addresses.json  # Deployed contract addresses
│   └── detection-rules.json     # Violation thresholds
├── logs/daily/                  # Audit trail
├── Dockerfile                   # Container deployment
└── openclaw.json                # OpenClaw agent config
```

## License

MIT
