# Base Builder Quest Submission

## Agent Safety Monitor

**An autonomous AI agent that monitors other AI agents on Base, calculating reputation scores and enforcing accountability through on-chain mechanisms.**

---

## The Problem: Agent Trust Crisis

AI agents are proliferating on Base. Over **3,643 agents** are now registered on the ERC-8004 Identity Registry — deploying contracts, managing treasuries, executing trades, and interacting with real economic value.

But there's no systematic way to know:
- Is this agent safe to interact with?
- Has it exhibited malicious behavior before?
- Is it a rug pull waiting to happen?
- How does its behavior compare to other agents?

Agents operate autonomously and continuously. Manual human review doesn't scale. **We need agents to monitor agents.**

## The Solution: An Autonomous Watchdog

The Agent Safety Monitor is an OpenClaw autonomous agent that runs 24/7 on a 6-hour heartbeat cycle:

1. **Discovers** agents from the ERC-8004 Identity Registry on Base
2. **Scans** on-chain transactions looking for drain patterns, failure rates, wash trading
3. **Analyzes** behavior using weighted scoring from multiple sources (on-chain 40%, AIXBT 30%, Nansen 30%)
4. **Validates** findings with 2/3 data source agreement before acting
5. **Enforces** accountability through on-chain reputation updates, stake slashing, and badge minting/revoking
6. **Reports** findings on X and Farcaster, and writes feedback to the ERC-8004 Reputation Registry

No human in the loop. Every action traceable on-chain.

## What Makes This Novel

### Agent Monitoring Agents
This isn't a dashboard or a dApp that humans use. It's an **autonomous agent** whose sole purpose is to watch other agents. When it detects a drain pattern at 3am, it doesn't wait for a human — it slashes the stake, revokes the badge, posts the alert, and writes the assessment to the ERC-8004 Reputation Registry.

### ERC-8004 Native
Rather than building a siloed reputation system, we integrate directly with the standard:
- **Read** from the Identity Registry to discover agents
- **Write** safety feedback to the Reputation Registry using `giveFeedback()`
- Our assessments become part of the **shared on-chain reputation** that any dApp, agent, or protocol can query

### Multi-Source Validation
The agent never acts on a single signal. Every enforcement decision requires agreement from at least 2 of 3 independent data sources:
- On-chain transaction analysis (Base RPC)
- AIXBT market sentiment and momentum
- Nansen wallet labels and smart money classification

If sources disagree, the agent flags but doesn't punish — reducing false positives.

### Graceful Degradation
If an API goes down, the agent doesn't stop. It recalculates with available sources at reduced confidence:
- All 3 sources: 100% confidence
- 2 of 3 sources: 80% confidence
- On-chain only: 60% confidence

## On-Chain Primitives Used

| Primitive | How It's Used |
|-----------|--------------|
| **ERC-8004 Identity Registry** | Discover registered agents, register ourselves |
| **ERC-8004 Reputation Registry** | Read existing feedback, submit safety assessments via `giveFeedback()` |
| **ERC-721 (Agent Registry)** | Custom agent registration with metadata |
| **ERC-721 (Safety Badges)** | Dynamic NFT badges with on-chain SVG — Bronze/Silver/Gold tiers |
| **ETH Staking** | Agents stake ETH as a trust signal; malicious agents get slashed |
| **AccessControl** | Role-based permissions (SCORE_UPDATER, SLASHER, MINTER, ADMIN) |
| **On-Chain SVG** | Badges render entirely from contract storage — no IPFS dependency |

## Smart Contracts

Four Solidity contracts (51 tests passing):

- **AgentRegistry.sol** — ERC-721 identity with metadata URIs
- **ReputationCore.sol** — Scores 0-1000 with time-decay (penalties reduce 1/90th per day)
- **SafetyStaking.sol** — ETH staking, slashing (basis points), 7-day unstake timelock
- **SafetyBadge.sol** — Dynamic ERC-721 badges with on-chain SVG generation

## Autonomy Proof

The agent operates without human intervention:

| Feature | Implementation |
|---------|---------------|
| **Scheduled execution** | 6-hour heartbeat via `setTimeout()` loop |
| **Agent discovery** | Automatic from ERC-8004 registry + 8004scan.io API |
| **Data collection** | On-chain tx scanning + AIXBT + Nansen APIs |
| **Decision making** | 2/3 validation engine with configurable thresholds |
| **On-chain execution** | Direct contract calls via ethers.js with retry logic |
| **Social reporting** | X (OAuth 1.0a) + Farcaster (Neynar) posting |
| **Mention monitoring** | Hourly check for "is safe?", "score", "report" queries |
| **Memory persistence** | MEMORY.md + daily logs updated every cycle |
| **Error recovery** | Per-phase error isolation — one failure doesn't stop the cycle |
| **Degraded mode** | Auto-adjusts weights when APIs are unavailable |
| **Health monitoring** | HTTP health check endpoint at /health |

## Detection Capabilities

| Violation | Severity | What It Catches |
|-----------|----------|----------------|
| Rapid Drain | CRITICAL | Agent draining funds to multiple addresses quickly |
| High Failure Rate | HIGH | Agent submitting many failing transactions |
| Rapid Token Dumps | HIGH | Agent dumping tokens across multiple sells |
| Wash Trading | MEDIUM | Circular transfers between same addresses |
| Dormant Activation | LOW | Suddenly active after 30+ days of silence |

## Tech Stack

- **Agent Framework:** OpenClaw (workspace files, heartbeat system, skills)
- **Blockchain:** Base (L2), ethers.js 6.x
- **Smart Contracts:** Solidity ^0.8.24, OpenZeppelin 5.0.x, Scaffold-ETH 2
- **Agent Identity:** ERC-8004 Trustless Agents protocol
- **Runtime:** Node.js 20+, TypeScript 5+
- **External APIs:** AIXBT (sentiment), Nansen (wallet labels)
- **Social:** X (custom OAuth 1.0a), Farcaster (Neynar API v2)
- **Deployment:** Docker, Railway/Render

## ERC-8004 Ecosystem Integration

Our agent is a participant in the broader ERC-8004 ecosystem:

- **8004scan.io** — We use their API to discover agents
- **agentscan.info** — Our feedback appears on agent profiles
- **8004agents.ai** — Our safety scores enrich agent trust data
- **trust8004.xyz** — Our assessments contribute to trust signals

## How to Query Safety

Mention the agent on X or Farcaster:

```
@AgentSafetyBase is 0x1234...abcd safe?
@AgentSafetyBase score 0x1234...abcd
@AgentSafetyBase report 0x1234...abcd
```

Response includes: safety score, badge tier, stake amount, risk factors, and last assessment date.

## Links

| Resource | URL |
|----------|-----|
| Source Code | [GitHub](https://github.com/YOUR_USERNAME/agent-safety-monitor) |
| X / Twitter | [@AgentSafetyBase](https://x.com/AgentSafetyBase) |
| ERC-8004 Profile | [8004scan.io](https://www.8004scan.io/) |
| Health Check | `https://YOUR_DEPLOYMENT/health` |

---

*Built for the Base Builder Quest. An agent that watches the watchers.*
