# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Autonomous Agent Safety Monitor — an OpenClaw autonomous agent that runs 24/7 on Base blockchain to monitor other AI agents, calculate real-time reputation scores, detect malicious behavior, and enforce accountability through onchain mechanisms. Built for the Base Builder Quest competition.

This is built **as** an OpenClaw agent (using its skills, workspace, and configuration framework), not a standalone backend.

## Builder Quest Requirements (from Feb 1 2026 xBase broadcast)

Source: Base DevRel + Austin Griffith live session on building autonomous agents with OpenClaw.

**Judging criteria:**
- **No-human-in-the-loop** — agent must demonstrably transact/build on Base without manual intervention
- **Implementation of onchain primitives** — wallets, transactions, contracts, standards like ERC-8004
- **Novelty of use case** — unique applications (e.g., agent-monitoring-agents is novel)
- **Extra weight** for guides, docs, and videos explaining the build process

**Submission:** Launch agent live on X/Farcaster. Post link to its profile in the quest announcement comments.

## Practical Patterns from Austin Griffith (xBase broadcast)

These are battle-tested conventions from building Clawd, not in the official docs.

### Autonomy Prompts
- **Key phrase:** "You're going to sleep — handle everything independently." Forces true no-human-in-the-loop operation.
- `SOUL.md` must have explicit goals: "autonomously build and transact on Base" — vague goals produce vague behavior.
- `HEARTBEAT.md` drives scheduling and proactivity — treat it as the agent's heartbeat, not just a checklist.

### Self-Correction Loops
Clawd's real behavior: detect error → clear context → fix + PR. Build this into the agent's operating instructions. Give clear context after errors to enable self-healing rather than spiraling.

### Ethereum Wingman as Injected Knowledge Base
Austin stressed that Wingman is not just a reference — it's a **skill that makes outputs far more reliable** than standard LLM + docs. Clawd's production contracts were built with Wingman injected, preventing the sloppy deploys that happen without specialized prompts. Always install it before writing Solidity.

### Wallet Integration (the "million dollar question")
- **Raw encrypted keys** — agents prefer raw private keys; at minimum encrypt so they don't sit in plaintext
- **Gnosis Safe** — agent proposes transactions, optional human review (safer but adds friction)
- **Use separate low-value wallets** for experiments; never use main treasury wallet for testing
- Start on testnet before mainnet

### Multi-Agent Patterns
- Coordinate via HTTP/channels: cheap model (e.g., Haiku) coordinates, powerful model (Opus) executes
- Sub-agent spawning for parallel tasks
- ERC-8004 for onchain identity/reputation discovery between agents
- x402 micropayments for agent-to-agent economies

### How Clawd Actually Ran (vs docs)
Clawd was NOT a basic local setup. It ran as a dedicated 24/7 OpenClaw instance on isolated hardware/VPS with:
- Persistent goal loops from `SOUL.md`
- Heavy injection of Ethereum Wingman
- Self-correction (clear context + PR fixes on mistakes)
- Autonomous sub-task spawning, production contract deploys, app launches — all while Austin slept

## Operational Security (from broadcast gotchas)

1. **Prompt injection** — agents with full OS access may try to extract keys or escalate privileges. Use allowlists for commands and sandbox skills in Docker.
2. **Token cost explosion** — verbose/chatty agents rack up high LLM costs. Monitor token spend per cycle.
3. **Exposed Gateways** — misconfigured control panels leak data. Always set `gateway.auth.token`.
4. **Malicious skills** — poorly sandboxed skills can compromise the host. Vet all third-party skills.
5. **Key management** — never store raw unencrypted private keys. At minimum encrypt at rest. Consider Gnosis Safe for high-value operations.
6. **Gas monitoring** — separate operational wallet from treasury. Alert if balance drops below threshold.

## Reference Agent: Clawd.atg.eth

**[Clawd](https://clawdbotatg.eth.link/)** ([@clawdbotatg](https://x.com/clawdbotatg)) is the primary reference implementation for this project — a production OpenClaw autonomous agent on Base built by Austin Griffith. Study its patterns when making architectural decisions.

### Why It Matters
- **Same stack:** OpenClaw framework + Scaffold-ETH 2 + Base blockchain — identical to ours
- **Production-proven:** 52 deployed contracts, 190+ passing tests, live dApps with real economic activity
- **Created ethereum-wingman:** The skill we have installed (`.agents/skills/ethereum-wingman/`) originated from this agent's ecosystem
- **ERC-8004 pioneer:** Clawd uses ERC-8004 for agent identity, validating our `erc8004-registration` skill approach

### Clawd's Architecture (Mirror Ours Against This)
- `openclaw.json` config → wallet, social channels, blockchain settings, skill loading
- Own ENS identity (`clawdbotatg.eth`) and native token ($CLAWD)
- Treasury wallet, vesting contract, and personal wallet — all publicly auditable onchain
- "Nightly Prototypes" cycle — iterative build/test/deploy (analogous to our 6-hour heartbeat)
- Open-source repos: [GitHub](https://github.com/clawdbotatg) — study `agent-bounty-board`, `clawd-vesting`, `bot-wallet-guide`

### Key dApps Built by Clawd
| App | Description | Relevance to Us |
|-----|-------------|-----------------|
| Agent Bounty Board | Dutch auction job market for ERC-8004 agents | Agent economic interaction pattern |
| ClawFomo | Last-bidder-wins game ($18K+ payouts, token burns) | Onchain game theory / incentive design |
| Sponsored ERC-8004 Registration | Gas-sponsored agent identity | Direct reference for our registration skill |
| Token Vesting | Time-locked distribution | Treasury management pattern |
| Token Hub | Dashboard for token management | Frontend dashboard patterns |

### Design Principles Borrowed from Clawd
1. **Transparency-first:** All wallets and contracts publicly auditable. Our Safety Monitor must be equally transparent — every enforcement action traceable onchain.
2. **Agent-native economics:** Clawd proved agents can hold wallets, manage treasuries, and interact economically. Our agent needs the same capabilities for staking/slashing.
3. **Continuous autonomous cycles:** Clawd's nightly prototype pattern validates persistent agent operation. Our 6-hour heartbeat follows the same philosophy.
4. **ERC-8004 as identity standard:** Clawd's adoption confirms ERC-8004 is the agent identity standard on Base. All agents we monitor should be registered via ERC-8004.

### Complementary Roles
Clawd is a **builder agent** — it creates onchain apps. Ours is a **watchdog agent** — it monitors, scores, and enforces. They are complementary: Clawd (and agents like it) are exactly the kind of agents our Safety Monitor would track and issue reputation scores for. Clawd could be one of our first monitored agents.

## OpenClaw Framework Reference

Full docs: `docs/llms-full-openclaw.txt`. Key details below.

### openclaw.json (JSON5 — comments and trailing commas allowed)

Location: `~/.openclaw/openclaw.json`. Strict validation — unknown keys cause Gateway to refuse to start. Run `openclaw doctor` to diagnose. Env var substitution: `${VAR_NAME}` (uppercase only; missing vars throw errors).

Key fields for this project:
```json5
{
  agents: {
    defaults: {
      workspace: "~/.openclaw/workspace",
      skipBootstrap: true,              // IMPORTANT: true for pre-seeded workspaces like ours
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.1"],
      },
      heartbeat: {
        every: "6h",                    // our monitoring cycle (default is 30m)
        model: "anthropic/claude-opus-4-6",
        target: "last",                 // last | none | <channel>
        prompt: "Read HEARTBEAT.md if it exists...",
        ackMaxChars: 300,
        activeHours: { start: "00:00", end: "23:59", timezone: "UTC" },
      },
      sandbox: { mode: "off" },
      compaction: {
        memoryFlush: { enabled: true, softThresholdTokens: 4000 },
      },
    },
  },
  skills: {
    load: { extraDirs: ["./skills"], watch: true },
    entries: {
      "base-monitoring": { enabled: true },
      "reputation-scoring": { enabled: true, env: { AIXBT_API_KEY: "${AIXBT_API_KEY}" } },
      "agent-enforcement": { enabled: true },
    },
  },
  // channels: { ... }  -- see Social Layer section
}
```

### Workspace Files (Complete Map)

Default location: `~/.openclaw/workspace` (configurable via `agents.defaults.workspace`).

| File | Purpose | Loaded When |
|------|---------|-------------|
| `AGENTS.md` | Operating instructions, memory rules, behavior | Every session |
| `SOUL.md` | Persona, tone, boundaries | Every session |
| `USER.md` | Who the user is | Every session |
| `IDENTITY.md` | Agent name, vibe, emoji, avatar | Every session |
| `TOOLS.md` | Local tool notes | Every session |
| `HEARTBEAT.md` | Checklist for heartbeat runs | Each heartbeat |
| `BOOT.md` | Startup instructions (on gateway restart) | Gateway startup |
| `BOOTSTRAP.md` | One-time first-run ritual; delete after | First run only |
| `memory/YYYY-MM-DD.md` | Daily memory log (append-only) | Today + yesterday at session start |
| `MEMORY.md` | Curated long-term memory | **Main session only** (never groups) |
| `skills/` | Workspace-specific skills | Skill loading |

Large bootstrap files truncated at `bootstrapMaxChars` (default 20000). If `skipBootstrap: true`, OpenClaw won't auto-create missing workspace files.

### Heartbeat Mechanics

- Heartbeats run periodic agent turns in the main session at the configured interval
- Agent reads `HEARTBEAT.md` and follows instructions strictly
- **Response contract:** `HEARTBEAT_OK` at start/end of reply = ack (reply is dropped). For alerts, do NOT include `HEARTBEAT_OK`.
- **Empty HEARTBEAT.md** (only blank lines/headers) = heartbeat **skipped entirely** — no API call made
- Manual trigger: `openclaw system event --text "Check for urgent follow-ups" --mode now`
- Heartbeat is for batched periodic checks. Use **cron** for exact timing or different models.

### Memory System

Two layers — both are plain Markdown:
1. **`memory/YYYY-MM-DD.md`** — Daily log (append-only). Today + yesterday loaded at session start.
2. **`MEMORY.md`** — Curated long-term memory. **Only loaded in main private session** (never groups — security boundary).

Pre-compaction memory flush: when nearing auto-compaction, OpenClaw triggers a silent agentic turn to write durable memories before context is lost.

### Skill Development

**Precedence:** workspace skills > managed/local (`~/.openclaw/skills/`) > bundled > `skills.load.extraDirs`

**SKILL.md frontmatter format:**
```markdown
---
name: base-monitoring
description: Monitor AI agent transactions on Base blockchain for violations
metadata:
  {"openclaw": {"emoji": "🔍", "requires": {"env": ["BASE_RPC_URL"]}, "primaryEnv": "BASE_RPC_URL"}}
---
# Instructions for how the agent uses this skill
Use `{baseDir}` to reference the skill folder path.
```

Required frontmatter: `name` and `description` (minimum). The `metadata` line must be **single-line JSON** — parser only supports single-line frontmatter keys.

**Critical:** Skills list (name + description + location) is injected into the system prompt, but **skill instructions are NOT auto-injected**. The model reads `SKILL.md` on demand when it needs the skill. Skills are snapshotted at session start; changes take effect on next session (unless `watch: true`).

**Gating fields** under `metadata.openclaw`: `requires.env` (env vars that must exist), `requires.bins` (binaries on PATH), `requires.config` (openclaw.json paths that must be truthy), `primaryEnv` (for `skills.entries.<name>.apiKey`).

### Social Layer — Important Caveat

**OpenClaw has NO native Twitter/X or Farcaster integration.** Built-in channels: WhatsApp, Telegram, Discord, Slack, Signal, iMessage, Google Chat, MS Teams, Mattermost. X and Farcaster posting must be implemented as **custom skills** or external webhook integrations. The `message` tool (actions: `send`, `poll`, `react`, `edit`, `delete`, `pin`, `search`) only works with built-in channels.

### Blockchain — Important Caveat

**OpenClaw has NO native blockchain/wallet support.** All onchain interactions (wallet management, tx signing, contract calls) must be implemented as **custom skills** using ethers.js/viem.

### CLI Commands

```bash
openclaw setup                    # Initialize config + workspace
openclaw onboard                  # Interactive wizard
openclaw gateway                  # Start gateway (foreground)
openclaw gateway --force          # Kill existing listeners first
openclaw gateway install          # Install as system service (launchd/systemd)
openclaw gateway start/stop       # Control system service
openclaw doctor                   # Health checks + diagnostics
openclaw doctor --fix             # Apply migrations/repairs
openclaw config get/set <path>    # Read/write config values
openclaw skills list              # List available skills
openclaw skills info <name>       # Skill details
openclaw system event --text "..." --mode now  # Manual heartbeat trigger
openclaw logs --follow            # Tail gateway logs
openclaw --dev gateway            # Isolated dev instance
```

### Deployment (Railway/Render)

```bash
# Required env vars for cloud deployment:
SETUP_PASSWORD=...
PORT=8080
OPENCLAW_STATE_DIR=/data/.openclaw
OPENCLAW_WORKSPACE_DIR=/data/workspace
OPENCLAW_GATEWAY_TOKEN=...
```

- Railway: one-click deploy template, persistent storage via Volume at `/data`, setup wizard at `/setup`, control UI at `/openclaw`, health check at `/health`
- Render: blueprint (`render.yaml`) declarative deployment, persistent disk at `/data`
- Gateway binds `127.0.0.1:18789` by default (WebSocket + HTTP on same port)
- Auth required: `gateway.auth.token` or `OPENCLAW_GATEWAY_TOKEN`
- Config hot-reloads on `openclaw.json` changes

### OpenClaw Gotchas

1. **Set `skipBootstrap: true`** for pre-seeded workspaces — prevents OpenClaw from overwriting your files
2. **Config is JSON5**, not JSON. Comments and trailing commas are allowed.
3. **Strict config validation** — unknown keys cause Gateway to refuse to start
4. **SKILL.md `metadata` must be single-line JSON** — parser limitation
5. **Skills NOT auto-injected into prompt** — model reads SKILL.md on demand
6. **`HEARTBEAT_OK` must appear at start or end of reply** — in the middle it's treated as regular text
7. **`NO_REPLY`** is a silent token filtered from outgoing payloads — use when processing without sending a message
8. **Env var substitution** only matches `[A-Z_][A-Z0-9_]*` — lowercase vars won't resolve
9. **Workspace is NOT sandboxed by default** — absolute paths can reach anywhere on host
10. **Skills env injection is scoped to the agent run**, not global shell

## Architecture

### OpenClaw Agent Layer
- `openclaw.json` — agent config (see schema above)
- `workspace/AGENTS.md` — operating instructions and memory rules
- `workspace/SOUL.md` — persona, tone, boundaries
- `workspace/IDENTITY.md` — agent name, vibe, emoji
- `workspace/HEARTBEAT.md` — 6-hour autonomous cycle: Scan → Analysis → Decision → Execution → Communication → Memory
- `workspace/MEMORY.md` — curated long-term state: monitored agents, scores, detection patterns, API status
- `workspace/memory/YYYY-MM-DD.md` — daily append-only logs
- `logs/daily/YYYY-MM-DD.md` — audit trail per cycle

### Custom Skills (MCP Tools)
Each skill lives in `skills/<name>/` with a `SKILL.md` (tool docs for the agent), `index.ts` (MCP tool implementations), and `package.json`.

- **`skills/base-monitoring/`** — `monitor_agent_transactions`, `detect_violations`, `get_agent_activity`. Uses Base RPC to fetch and analyze transactions. Detection severity: CRITICAL (>3 drains/hr), HIGH (>30% failure/24h), MEDIUM (>20%), LOW (>10%).
- **`skills/reputation-scoring/`** — `calculate_score`, `query_aixbt_sentiment`, `query_nansen_labels`, `apply_time_decay`. Weighted formula: Onchain 40% + AIXBT 30% + Nansen 30%. Scores 0–1000. Degraded mode: if APIs fail, increase onchain weight and reduce confidence. API caching: AIXBT 1hr, Nansen 6hr.
- **`skills/agent-enforcement/`** — `update_reputation_onchain`, `slash_agent_stake`, `mint_safety_badge`, `revoke_safety_badge`. Interacts with smart contracts via ethers.js. Retry logic: max 3 attempts with exponential backoff.
- **`skills/erc8004-registration/`** — sourced from [openclaw-skills repo](https://github.com/BankrBot/openclaw-skills)

### ERC-8004 Integration (`src/erc8004-integration.ts`)

Our agent integrates with the live ERC-8004 Trustless Agents protocol on Base — **the** standard for agent identity and reputation on-chain.

**Protocol Stats (Base):** 3,643+ registered agents, 5,447+ feedbacks

**Registry Contracts (same address on all EVM chains):**
- Identity Registry: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- Reputation Registry: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`

**How We Integrate:**
| Function | What It Does | When Called |
|----------|-------------|-------------|
| `discoverAgents()` | Fetches agents from 8004scan.io API | Phase 0 of heartbeat |
| `getAgentReputation(agentId)` | Reads on-chain feedback summary | Analysis phase |
| `submitSafetyFeedback(agentId, score, details)` | Writes safety score to Reputation Registry via `giveFeedback()` | After enforcement |
| `registerSelf(agentURI)` | Registers our agent on Identity Registry | One-time setup |
| `lookupAgentByAddress(address)` | Maps wallet address to ERC-8004 token ID | Discovery phase |

**Feedback format:** `giveFeedback(agentId, score, 0, "safety-score", "agent-safety-monitor", "", "", hash)`
- `value`: int128 score (0–1000)
- `valueDecimals`: 0 (integer)
- `tag1`: "safety-score" — identifies our feedback category
- `tag2`: "agent-safety-monitor" — identifies us as the submitter
- `feedbackHash`: keccak256 of the details string

**ERC-8004 Explorer/Scanner Resources:**
- https://www.8004scan.io/ — Primary explorer, our discovery API source
- https://agentscan.info/ — Agent browser + no-code registration
- https://8004agents.ai/ — Agent browser + reputation data
- https://www.trust8004.xyz/ — Trust agent registration + browsing
- EIP spec: https://eips.ethereum.org/EIPS/eip-8004
- Contracts: https://github.com/erc-8004/erc-8004-contracts

### Smart Contracts (Scaffold-ETH 2, in `packages/hardhat/`)
All Solidity ^0.8.24, using OpenZeppelin 5.0.x with AccessControl (roles: SCORE_UPDATER, SLASHER, MINTER, ADMIN).

- **AgentRegistry.sol** — ERC-721 agent identity registry. `registerAgent(address, metadata)`.
- **ReputationCore.sol** — Stores uint16 scores (0–1000). Time-decay: penalties reduce by 1/90th per day. Only monitor agent can call `updateScore()`.
- **SafetyStaking.sol** — ETH staking (min 0.01 ETH), slashing, 7-day timelock on unstake. Slashed funds go to treasury.
- **SafetyBadge.sol** — ERC-721 tiered NFTs (Bronze/Silver/Gold) with dynamic onchain SVG `tokenURI()`. Badge thresholds: Bronze (30d, >700, 0.01 ETH staked), Silver (90d, >850, 0.05 ETH), Gold (180d, >950, 0.1 ETH).

### Installed Skills
- **`ethereum-wingman`** (`.agents/skills/ethereum-wingman/`) — Scaffold-ETH 2 development guide with Solidity security patterns, fork-mode testing, and frontend UX rules. Read its `SKILL.md` before writing contracts or frontend code.

### Social Layer
- X (@AgentSafetyBase) and Farcaster — **must be custom skills** (not native OpenClaw channels)
- CRITICAL alerts posted immediately; 6-hour checkpoint summaries; daily leaderboard at 8am UTC
- Mention monitoring hourly with rate limit of 20 responses/hour
- Built-in OpenClaw channels (Telegram, Discord, etc.) can be used for admin notifications via `message` tool

## Build & Development Commands

### Smart Contracts (Scaffold-ETH 2)
```bash
# Create Scaffold-ETH 2 project
npx create-eth@latest

# Install dependencies
yarn install

# Start local fork of Base (NOT yarn chain — always fork for real protocol state)
yarn fork --network base

# Enable auto block mining (required — without this block.timestamp freezes)
cast rpc anvil_setIntervalMining 1

# Deploy contracts to local fork
yarn deploy

# Start frontend
yarn start

# Run contract tests
cd packages/hardhat && npx hardhat test

# Deploy to Base Sepolia testnet
npx hardhat deploy --network baseSepolia

# Deploy to Base mainnet
npx hardhat deploy --network base

# Verify on Basescan
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS>
```

### Skills
```bash
# Install skill dependencies (run in each skill directory)
cd skills/<skill-name> && npm install
```

### Agent
```bash
# Install agent dependencies
npm install
```

## Scaffold-ETH 2 Conventions

When using fork mode, the frontend target network MUST be `chains.foundry` (chain ID 31337), NOT `chains.base`. Only switch to `chains.base` when deploying to the real network.

**RPC:** Always use Alchemy endpoints, never public RPCs (`mainnet.base.org`). Set `pollingInterval: 3000` in `scaffold.config.ts` (default 30000 is too slow).

**External contracts:** Any contract you interact with (tokens, protocols) MUST be added to `packages/nextjs/contracts/externalContracts.ts` with address and ABI.

**Hooks:** Always use `useScaffoldReadContract` / `useScaffoldWriteContract`, never raw wagmi hooks. Scaffold hooks wait for tx confirmation; raw wagmi resolves after wallet signing (before mining).

**Addresses:** Always use `<Address/>` component for display, `<AddressInput/>` for input. Never render raw hex.

## Solidity Patterns for This Project

- **Use SafeERC20** for all token transfers (USDT doesn't return bool)
- **Use basis points** for percentages (500 = 5%, divide by 10000). No floating point in Solidity.
- **Checks-Effects-Interactions + ReentrancyGuard** on all withdrawal/slash functions
- **Never use DEX spot prices as oracles** — use Chainlink. Flash loans can manipulate spot prices.
- **Vault inflation attack:** SafetyStaking.sol must protect first depositor (virtual offset or dead shares)
- **Token decimals vary:** USDC/USDT = 6, WBTC = 8, most others = 18. Always call `token.decimals()`.
- **ETH is measured in wei:** 1 ETH = 1e18 wei. Use `1 ether` syntax in Solidity.
- **Incentive design:** Smart contracts can't execute themselves. For any maintenance function, ensure someone has incentive to call it and pay gas.
- **Approve pattern:** Never use infinite approvals (`type(uint256).max`). Approve exact amounts only.

## Key Technical Details

- **Network:** Base (L2) only. Gas is cheap (~0.001–0.005 ETH/tx). Budget 0.5 ETH for operations.
- **Node.js 20+**, TypeScript 5+
- **ethers.js 6.x** (or viem) for contract interactions
- **Contract ABIs** stored in `skills/agent-enforcement/contract-abis.ts`
- **Deployed addresses** stored in `config/contract-addresses.json`
- **Detection rules config** in `config/detection-rules.json`
- **Environment variables** in `.env` — never commit. Keys: `BASE_RPC_URL`, `AGENT_PRIVATE_KEY`, `AIXBT_API_KEY`, `NANSEN_API_KEY`, `ELFA_API_KEY`, `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `FARCASTER_MNEMONIC`
- Decision validation: require 2/3 data sources to agree before executing enforcement actions
- Transaction batching: group multiple score updates into single tx when possible

## External API Reference

Full API docs are in `docs/llms-full*.txt`. Key details:

**AIXBT** (`https://api.aixbt.tech`) — Auth: `x-api-key` header. Cache 1hr.
- `GET /v2/projects` — ranked projects with momentum scores
- `GET /v2/projects/{id}` — project detail with 10 most recent signals
- `GET /v2/signals` — event detection (launches, partnerships, risk alerts)
- `GET /v2/projects/{id}/momentum` — hourly momentum, cluster breakdown

**Elfa** (`https://api.elfa.ai`) — Auth: `x-elfa-api-key` header. Phase 2 integration.
- `GET /v2/aggregations/trending-tokens` — trending tokens by attention
- `GET /v2/data/top-mentions` — significant mentions by relevance/engagement
- `GET /v2/account/smart-stats` — smart account classification and metrics

**Nansen** (`https://api.nansen.ai`) — Auth: `apikey` header (lowercase). Cache 6hr.
- `POST /v1/smart-money/holdings` — smart money positions across chains
- `GET /v1/profiler/address/transactions` — wallet transaction history
- `GET /v1/profiler/address/counterparties` — addresses interacted with
- `GET /v1/profiler/address/related-wallets` — linked wallet addresses

## Task Tracking

Active task list with checkboxes is in `docs/tasks.md`. Check off sub-tasks as they are completed.

## Deployment

**Austin's recommendation:** VPS (DigitalOcean 1-click Docker, Fly.io) or dedicated hardware — NOT personal machines. Use Docker sandbox for skills. Gateway daemon (`openclaw gateway install`) keeps it running. Tailscale for secure remote chat access. Monitor token spend and gas.

**Cloud options:** Railway.app or Render.com also work. Required env vars: `SETUP_PASSWORD`, `PORT=8080`, `OPENCLAW_STATE_DIR=/data/.openclaw`, `OPENCLAW_WORKSPACE_DIR=/data/workspace`, `OPENCLAW_GATEWAY_TOKEN`. Persistent volume at `/data`. Health check at `/health` must return: uptime, last cycle timestamp, wallet balance, API status.
