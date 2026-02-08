# Product Requirements Document: Autonomous Agent Safety Monitor (OpenClaw Agent)

## 1. Introduction/Overview

The Autonomous Agent Safety Monitor is an **OpenClaw autonomous agent** that operates 24/7 on Base blockchain to monitor other AI agents, calculate real-time reputation scores, detect malicious behavior, and enforce accountability through onchain mechanisms.

**Problem Statement:** Recent OpenClaw agent incidents (wallet draining, spam bans) have exposed a critical trust gap. Users have no reliable way to assess which agents are safe to interact with.

**Solution:** An autonomous OpenClaw "watchdog" agent that:
- Uses its own wallet to execute onchain transactions on Base
- Combines onchain analysis with AIXBT (market intelligence) and Nansen (wallet intelligence)
- Registers itself via ERC-8004 for transparent identity
- Posts autonomously to X/Farcaster
- Operates through custom Skills (SKILL.md) and MCP tools

**Architecture Approach:** This is built AS an OpenClaw agent, not a standalone backend monitoring OpenClaw agents. The agent uses OpenClaw's framework (skills, workspace, agent configuration) to achieve autonomous monitoring and enforcement.

**Primary Goal:** Submit to Base Builder Quest within 10 days showcasing novel "agent monitoring agents" use case with sophisticated onchain activity.

---

## 2. Goals

### Primary Goals (Contest Submission - Day 10)
1. **Deploy Functional OpenClaw Agent:** Agent runs autonomously via OpenClaw framework with own Base wallet
2. **Novel Use Case:** First OpenClaw agent that monitors and scores other agents (meta-layer security)
3. **Heavy Onchain Activity:** Smart contract deployments, reputation updates, slashing transactions, NFT minting (target: 50+ transactions in 7 days)
4. **Multi-Source Intelligence:** Integrate AIXBT + Nansen APIs via custom OpenClaw skills
5. **ERC-8004 Registration:** Agent registers itself onchain for transparency and trust
6. **Active Social Presence:** X/Farcaster posting via OpenClaw's communication channels
7. **Demonstrate True Autonomy:** No human-in-the-loop for 7+ consecutive days

### Secondary Goals (Post-Contest)
8. Expand to Ethos Network and Elfa AI intelligence layers
9. Build public API for reputation score queries
10. Scale to 100+ monitored agents
11. Community governance for detection rules

---

## 3. User Stories

### Primary Users: Crypto Community & Other Agents

**Story 1: User Checking Agent Safety**
> "As a DeFi user, I want to ask @AgentSafetyBase on X if an agent is safe, so that I receive an immediate reputation score before connecting my wallet."

**Story 2: Agent Developer Earning Trust**
> "As an OpenClaw agent developer, I want my agent to earn a verified safety badge NFT, so that users can see onchain proof of my clean track record."

**Story 3: Other Agents Querying Reputation**
> "As an autonomous trading agent, I want to check another agent's reputation score before executing a trade collaboration, so I avoid malicious actors."

**Story 4: Security Researcher Monitoring**
> "As a security researcher, I want real-time X alerts when agents exhibit wallet-draining patterns, so I can investigate and warn the community quickly."

### Tertiary Users: Builder Quest Judges

**Story 5: Contest Evaluation**
> "As a judge, I want to see an OpenClaw agent with continuous autonomous onchain activity demonstrating novel intelligence integration and no human intervention."

---

## 4. Functional Requirements

### Phase 1: Core System (Days 1-10, Contest Submission)

#### 4.1 OpenClaw Agent Setup & Configuration

**FR-1.1: Agent Identity & Workspace**
- MUST create OpenClaw agent with dedicated workspace directory structure:
  ```
  agent-safety-monitor/
  ├── openclaw.json          # Agent config (model, channels, Base RPC)
  ├── workspace/
  │   ├── AGENT.md          # Agent identity, personality, mission
  │   ├── HEARTBEAT.md      # Autonomous action cycle (every 6 hours)
  │   ├── MEMORY.md         # Persistent memory (monitored agents, scores)
  │   └── logs/daily/       # Daily activity logs
  └── skills/
      ├── base-monitoring/  # Custom skill for Base monitoring
      ├── reputation-scoring/ # Custom skill for score calculation
      └── agent-enforcement/ # Custom skill for onchain actions
  ```

**FR-1.2: Base Wallet Integration**
- MUST configure agent with dedicated Base wallet (private key in secure env)
- MUST fund wallet with 0.5 ETH for gas operations
- MUST implement wallet balance monitoring (alert if <0.1 ETH)
- SHOULD use OpenClaw's built-in wallet management tools

**FR-1.3: AGENT.md Definition**
- MUST define agent personality as "Security-focused watchdog for AI agent ecosystem"
- MUST include mission statement: "Monitor, score, and enforce accountability for AI agents on Base"
- MUST specify communication style: "Direct, data-driven security alerts; no crypto clichés"
- MUST define boundaries: "Never take control of other agents' wallets; only observe and report"

**FR-1.4: HEARTBEAT.md Autonomous Cycle**
- MUST implement 6-hour cycle with these phases:
  1. **Scan Phase:** Check registered agents for new transactions
  2. **Analysis Phase:** Calculate reputation scores using multi-source data
  3. **Decision Phase:** Determine if onchain actions needed (slashing, badge updates)
  4. **Execution Phase:** Execute smart contract transactions
  5. **Communication Phase:** Post updates to X/Farcaster
  6. **Memory Phase:** Update MEMORY.md with findings
- MUST run autonomously without requiring human commands

#### 4.2 Custom OpenClaw Skills

**FR-2.1: base-monitoring Skill (SKILL.md)**
- MUST create custom skill at `skills/base-monitoring/SKILL.md`
- MUST register MCP tools:
  - `monitor_agent_transactions(agent_address, hours)` - Fetch Base transactions
  - `detect_violations(transactions)` - Run detection rules
  - `get_agent_activity(agent_address)` - Get transaction summary
- MUST integrate with Base RPC endpoint
- MUST implement detection rules:
  - CRITICAL: >3 wallet drains in 1 hour
  - HIGH: >30% tx failure rate in 24h
  - MEDIUM: >20% tx failure rate
  - LOW: >10% tx failure rate
- MUST cache transaction data in agent's MEMORY.md

**FR-2.2: reputation-scoring Skill (SKILL.md)**
- MUST create custom skill at `skills/reputation-scoring/SKILL.md`
- MUST register MCP tools:
  - `calculate_score(agent_address)` - Compute composite score (0-1000)
  - `query_aixbt_sentiment(token_symbol)` - Get AIXBT market data
  - `query_nansen_labels(agent_address)` - Get Nansen wallet intelligence
  - `apply_time_decay(penalties, age_days)` - Decay old violations
- MUST implement scoring algorithm:
  ```
  Onchain Score (40%):
    - Base 250 for registration
    - +100 if success rate >95%
    - Subtract time-decayed penalties
    - Add age bonus (max +100 after 180 days)
  
  AIXBT Score (30%):
    - Start 150 (neutral)
    - -150 if promoting token during pump signal
    - -50 if trading against AIXBT momentum
    - +30 if aligned with positive sentiment
  
  Nansen Score (30%):
    - Start 100 (neutral)
    - +150 for "Smart Money" label
    - +50 for clean money flow
    - Instant 0 if "Sanctioned" or "Known Exploiter"
  
  Final = (Onchain * 0.4) + (AIXBT * 0.3) + (Nansen * 0.3)
  ```
- MUST cache API responses (AIXBT: 1hr, Nansen: 6hr) to respect rate limits
- MUST implement degraded mode: if API fails, increase onchain weight and mark score as "partial confidence"

**FR-2.3: agent-enforcement Skill (SKILL.md)**
- MUST create custom skill at `skills/agent-enforcement/SKILL.md`
- MUST register MCP tools:
  - `update_reputation_onchain(agent_address, new_score, reason)` - Call ReputationCore.sol
  - `slash_agent_stake(agent_address, percentage, reason)` - Call SafetyStaking.sol
  - `mint_safety_badge(agent_address, tier)` - Call SafetyBadge.sol
  - `revoke_safety_badge(agent_address, reason)` - Burn badge NFT
- MUST use ethers.js or viem for contract interactions
- MUST implement transaction retry logic (max 3 attempts, exponential backoff)
- MUST emit events for all onchain actions to agent's daily log

**FR-2.4: Scaffold-ETH Integration (Optional Enhancement)**
- SHOULD use Scaffold-ETH 2 for smart contract development UI
- SHOULD deploy contracts using Hardhat/Foundry via Scaffold-ETH
- MAY use ETH Wingman AI skill if available for dApp building guidance

#### 4.3 Smart Contract Infrastructure on Base

**FR-3.1: AgentRegistry.sol**
- MUST deploy ERC-721-compatible registry for agent identities
- MUST store: agent address, X/Farcaster handles, registration timestamp, agent type
- MUST implement `registerAgent(address, string metadata)` callable by monitor agent
- MUST emit `AgentRegistered(address, uint256 tokenId, string metadata)` event
- SHOULD follow ERC-8004 spec for compatibility with Base's identity layer

**FR-3.2: ReputationCore.sol**
- MUST store reputation scores (uint16, 0-1000) mapped to agent addresses
- MUST implement role-based access: only monitor agent can call `updateScore()`
- MUST implement time-decay logic: penalties reduce by 1/90th per day after initial violation
- MUST emit `ScoreUpdated(address agent, uint256 oldScore, uint256 newScore, string reason, uint8 confidence)` with confidence level (100=full data, <100=degraded mode)
- MUST provide public `getScore(address)` view function

**FR-3.3: SafetyStaking.sol**
- MUST accept ETH stakes (minimum 0.01 ETH)
- MUST implement `stake(address agent)` payable - other agents stake to prove commitment
- MUST implement `slash(address agent, uint8 percentage)` restricted to monitor agent
- MUST transfer slashed funds to treasury address
- MUST implement 7-day timelock on `unstake()`
- MUST emit `Staked`, `Slashed`, `Unstaked` events with amounts

**FR-3.4: SafetyBadge.sol (ERC-721)**
- MUST mint tiered NFT badges: Bronze, Silver, Gold
- MUST implement dynamic `tokenURI()` returning metadata with current score
- MUST include badge requirements:
  - Bronze: 30+ days, score >700, 0.01+ ETH staked
  - Silver: 90+ days, score >850, 0.05+ ETH staked
  - Gold: 180+ days, score >950, 0.1+ ETH staked
- MUST implement `mintBadge()` and `revokeBadge()` restricted to monitor agent
- SHOULD generate onchain SVG artwork reflecting tier and score

**FR-3.5: Contract Deployment**
- MUST deploy all contracts to Base Mainnet before Day 8
- MUST verify contracts on Basescan for transparency
- MUST grant monitor agent's wallet appropriate roles (SCORE_UPDATER, SLASHER, MINTER)
- SHOULD use Hardhat deployment scripts or Foundry scripts

#### 4.4 ERC-8004 Self-Registration

**FR-4.1: Monitor Agent Identity**
- MUST register monitor agent itself on Base's ERC-8004 Identity Registry
- MUST create agent registration JSON file hosted at public URI:
  ```json
  {
    "name": "Agent Safety Monitor",
    "description": "Autonomous watchdog monitoring AI agents on Base",
    "agentType": "security-monitor",
    "services": [
      {"type": "reputation-query", "endpoint": "https://..."},
      {"type": "x-mentions", "handle": "@AgentSafetyBase"}
    ],
    "wallet": "0x...",
    "codeRepository": "https://github.com/..."
  }
  ```
- MUST call Identity Registry's `register()` function from agent's wallet
- MUST update registration if agent capabilities change

**FR-4.2: Reputation Building**
- SHOULD participate in ERC-8004 Reputation Registry by accepting feedback
- MAY invite community to provide feedback on monitor agent's performance
- SHOULD display ERC-8004 registration in X bio and Farcaster profile

#### 4.5 Social Communication Channels

**FR-5.1: X (Twitter) Integration**
- MUST configure X credentials in OpenClaw's `openclaw.json`:
  ```json
  {
    "channels": {
      "twitter": {
        "enabled": true,
        "handle": "@AgentSafetyBase",
        "credentials": { "apiKey": "...", "apiSecret": "..." }
      }
    }
  }
  ```
- MUST implement autonomous posting via HEARTBEAT.md:
  - **Real-time alerts (<5 min):** Post CRITICAL violations immediately
  - **Every 6 hours:** Safety checkpoint summary
  - **Daily (8am UTC):** Reputation leaderboard
- MUST respond to mentions within 1 hour:
  - "@AgentSafetyBase is @agent safe?" → Reply with score breakdown
  - "@AgentSafetyBase report @agent [issue]" → Acknowledge and investigate
- MUST tag mentioned agents to build social graph

**FR-5.2: Farcaster Integration**
- MUST configure Farcaster in `openclaw.json`
- MUST cross-post CRITICAL alerts to /base and /security channels
- MUST post daily summaries to /base channel
- SHOULD implement Farcaster Frame for interactive score lookup (Phase 2 if time permits)

**FR-5.3: Post Templates**
- MUST use consistent formatting:
  ```
  🚨 CRITICAL: Agent @handle [0xABC...]
  Violation: [description]
  Score: [new] (Δ[change])
  Action: Stake slashed [%]
  Evidence: [AIXBT/Nansen findings]
  Tx: [basescan link]
  #AgentSafety #BaseChain
  ```

#### 4.6 Autonomous Operation & Memory

**FR-6.1: MEMORY.md Structure**
- MUST maintain structured memory:
  ```markdown
  # Monitored Agents
  - 0xABC... (@agent1): Score 875, Silver badge, last checked 2026-02-08 10:00 UTC
  - 0xDEF... (@agent2): Score 340, slashed 50%, flagged for draining
  
  # Detection Patterns Learned
  - Agents promoting low-cap tokens often align with AIXBT pump signals (correlation: 0.78)
  - Nansen "Smart Money" label reduces violation probability by 85%
  
  # API Status
  - AIXBT: Operational, last query 2026-02-08 09:45 UTC
  - Nansen: Degraded mode since 2026-02-07 18:00 UTC (using cache)
  ```
- MUST update after each HEARTBEAT cycle
- MUST use for context in decision-making

**FR-6.2: Daily Logs**
- MUST append to `logs/daily/YYYY-MM-DD.md` after each cycle:
  ```markdown
  ## 2026-02-08 10:00 UTC - Monitoring Cycle #42
  
  Agents scanned: 8
  Violations detected: 1 (MEDIUM - agent 0xDEF...)
  Onchain actions: 1 (score update tx: 0x123...)
  API calls: AIXBT (5), Nansen (2)
  Social posts: 2 (1 alert, 1 response to mention)
  ```
- MUST keep logs for audit trail

**FR-6.3: Bootstrap Agent Seeding**
- MUST manually register 5-10 Base agents in MEMORY.md during initial deployment:
  - Include mix of agent types (trading, social, DeFi)
  - Include at least 1 known good agent and 1 questionable for demo contrast
  - Document addresses, social handles, initial scores
- MUST begin autonomous monitoring within 1 hour of seeding

#### 4.7 Infrastructure & Deployment

**FR-7.1: OpenClaw Hosting**
- MUST deploy OpenClaw agent to Railway.app or Render.com
- MUST configure environment variables:
  - `BASE_RPC_URL` - Base mainnet RPC endpoint
  - `AGENT_PRIVATE_KEY` - Agent wallet private key
  - `AIXBT_API_KEY`, `NANSEN_API_KEY` - API credentials
  - `CONTRACT_ADDRESSES` - JSON with deployed contract addresses
- MUST implement health check returning: uptime, last cycle time, wallet balance, API status
- MUST enable auto-restart on crash

**FR-7.2: Database (Optional)**
- MAY use PostgreSQL for caching API responses and transaction history
- ALTERNATIVE: Use OpenClaw's file-based memory system (MEMORY.md + daily logs)
- MUST NOT require database for core functionality (agent should work with file-based memory only)

**FR-7.3: Monitoring & Alerts**
- MUST log to stdout/stderr for Railway/Render logging
- MUST implement ERROR level logs for: transaction failures, API total failures, wallet low balance
- SHOULD implement daily health report posted to X

---

### Phase 2: Post-Contest Enhancements (Days 11-30)

**FR-8.1: Additional Intelligence Skills**
- Create `skills/ethos-integration/` - Identity and vouch tracking
- Create `skills/elfa-prediction/` - Predictive risk analysis
- Expand scoring to 5-layer model

**FR-8.2: Community Reporter Skill**
- Create `skills/community-reports/` - Accept and validate human reports
- Deploy CommunityReporter.sol contract
- Integrate with X mentions for easy reporting

**FR-8.3: Autonomous Discovery**
- Implement pattern recognition for new agent deployments on Base
- Auto-register newly discovered agents
- Cross-reference with AIXBT mentions

**FR-8.4: Public API**
- Build REST API for reputation score queries
- Implement API key system
- Create developer documentation

---

## 5. Non-Goals (Out of Scope)

### Phase 1 (Contest Submission)
- ❌ **Multi-chain support:** Base only
- ❌ **Governance/DAO:** No voting or token
- ❌ **Appeals process:** No agent contesting of scores
- ❌ **Mobile app:** X/Farcaster only
- ❌ **Historical analysis:** Only monitor from deployment forward
- ❌ **Interactive Farcaster Frames:** Basic posting only in Phase 1
- ❌ **Native token:** No token launch
- ❌ **Whitelisting/Premium tiers:** All agents treated equally

### Phase 2 (Post-Contest)
- ❌ **Upgradeable contracts:** Use proxy patterns later
- ❌ **Cross-platform tracking:** Focus on onchain Base activity only

---

## 6. Design Considerations

### 6.1 OpenClaw Skill Design Pattern

**Skill File Structure:**
```
skills/base-monitoring/
├── SKILL.md              # Main skill definition (instructions for agent)
├── package.json          # Dependencies
├── scripts/
│   └── index.ts          # MCP tool registrations
└── README.md            # Developer documentation
```

**SKILL.md Format:**
```markdown
# Base Agent Monitoring

Monitor AI agents on Base blockchain for security violations.

## Tools Available

### monitor_agent_transactions
Fetch recent transactions for an agent address.

**Usage:**
monitor_agent_transactions("0xABC...", hours=24)

**Returns:**
{ transactions: [...], successRate: 0.95, totalGasUsed: ... }

### detect_violations
Analyze transactions for security violations.

**Usage:**
detect_violations([...transactions])

**Returns:**
{ severity: "CRITICAL"|"HIGH"|"MEDIUM"|"LOW", violations: [...] }

## When to Use
- Every 6 hours during HEARTBEAT cycle
- When community reports suspicious agent via X mention
- Before issuing safety badges
```

### 6.2 Smart Contract UI (Scaffold-ETH)

**Optional Development Tool:**
- MAY use Scaffold-ETH 2 for local contract testing UI
- Provides: Contract interaction UI, wallet connection via RainbowKit, transaction history
- NOT required for production (agent interacts programmatically)

### 6.3 Badge NFT Design

**Visual Identity:**
- Onchain SVG with shield icon
- Color-coded by tier: Bronze (#CD7F32), Silver (#C0C0C0), Gold (#FFD700)
- Dynamic score display updates when tokenURI queried
- Agent address truncated (0xABC...DEF)

---

## 7. Technical Considerations

### 7.1 OpenClaw Framework Dependencies

**Core:**
- OpenClaw runtime (latest stable version)
- Node.js 20+ for skill scripts
- TypeScript 5+ for type safety

**Skills:**
- ethers.js 6.x or viem for blockchain interactions
- axios for API calls
- MCP SDK for tool registration

**Smart Contracts:**
- Solidity ^0.8.24
- OpenZeppelin Contracts 5.0.x
- Hardhat or Foundry for deployment

### 7.2 API Integration Constraints

**AIXBT API:**
- Budget: ~1000 calls/day
- Strategy: 1hr cache, batch queries for multiple agents
- Degraded mode: Use cached data if API down, reduce score confidence to 80%

**Nansen API:**
- Budget: ~500 calls/day
- Strategy: 6hr cache, prioritize new/flagged agents
- Degraded mode: Continue with onchain + AIXBT only, confidence to 70%

**Base RPC:**
- Use Alchemy or Infura for reliability
- Implement exponential backoff on connection errors
- WebSocket for real-time monitoring (optional, HTTP polling acceptable)

### 7.3 Gas Optimization

**Contract Design:**
- Batch score updates when possible (update multiple agents in single tx)
- Use uint16 for scores (0-1000 fits in 16 bits)
- Pack struct fields to minimize storage
- Emit events instead of storing full history (use event logs + daily logs file)

**Transaction Strategy:**
- Prioritize CRITICAL violations (immediate execution)
- Batch MEDIUM/LOW updates every 6 hours
- Daily badge minting at off-peak hours (lower gas)
- Budget: 0.001-0.005 ETH per tx on Base (very cheap L2)

### 7.4 Security Considerations

**Agent Wallet:**
- Private key in environment variable (never commit to repo)
- Implement transaction signing in isolated module
- Monitor balance: alert via X post if <0.05 ETH
- Post-contest: migrate to hardware wallet or MPC

**Smart Contracts:**
- Use OpenZeppelin battle-tested implementations
- Implement emergency pause (admin multi-sig only)
- Role-based access control for all state-changing functions
- Internal audit focusing on reentrancy, access control, integer safety

**Skill Security:**
- Validate all external API responses before using in decisions
- Sanitize user input from X mentions
- Never expose API keys or private keys in logs/posts
- Rate limit mention responses (max 20/hour to prevent spam exploitation)

### 7.5 OpenClaw Configuration Best Practices

**openclaw.json:**
```json
{
  "agent": {
    "name": "Agent Safety Monitor",
    "model": "claude-3-5-sonnet-20241022",
    "personality": "security-focused, data-driven, direct"
  },
  "channels": {
    "twitter": { "enabled": true, "handle": "@AgentSafetyBase" },
    "farcaster": { "enabled": true, "username": "agentsafety" }
  },
  "heartbeat": {
    "enabled": true,
    "intervalHours": 6,
    "actions": ["monitor", "score", "enforce", "communicate"]
  },
  "skills": {
    "load": {
      "extraDirs": ["./skills"]
    },
    "entries": {
      "base-monitoring": { "enabled": true },
      "reputation-scoring": { "enabled": true },
      "agent-enforcement": { "enabled": true }
    }
  },
  "blockchain": {
    "network": "base",
    "rpcUrl": "{{env.BASE_RPC_URL}}",
    "wallet": "{{env.AGENT_PRIVATE_KEY}}"
  }
}
```

---

## 8. Success Metrics

### Contest Submission (Day 10) - Must Achieve:
1. **OpenClaw Agent Operational:** Agent runs autonomously for 7+ days via OpenClaw framework
2. **Onchain Transactions:** Minimum 50 transactions (score updates, slashing, badge minting)
3. **Multi-Source Decisions:** At least 5 decisions influenced by AIXBT, 5 by Nansen
4. **ERC-8004 Registered:** Monitor agent has onchain identity on Base
5. **Social Activity:** 100+ X followers, 50+ posts, 10+ mention responses
6. **Agents Monitored:** 5-10 agents with score history and daily logs
7. **Zero Human Intervention:** All decisions made autonomously per HEARTBEAT.md

### Post-Contest (Day 30):
8. **Scale:** 50+ agents monitored
9. **Security Impact:** 1+ legitimate violation detected and slashed
10. **Community Engagement:** 10+ organic reports via X mentions
11. **Developer Interest:** 3+ inquiries about reputation API integration
12. **Badge Distribution:** 5+ badges minted

### Key Performance Indicators (Ongoing):
- **Uptime:** >99% (max 2h downtime/week)
- **Detection Accuracy:** <10% false positive rate (community validation)
- **Response Time:** <5 min from CRITICAL violation to onchain action
- **API Reliability:** Degraded mode active <5% of time
- **Community Engagement:** >20% of mentions answered within 1 hour

---

## 9. Open Questions

### Pre-Development:
1. **OpenClaw Setup:** Do you have OpenClaw installed locally, or do we need setup instructions?
   
2. **API Credentials:** Confirmed AIXBT and Nansen API keys with rate limits?

3. **X Account:** Do you have @AgentSafetyBase account created with elevated API access?

4. **Base Agent List:** Can you provide 5-10 specific Base agent addresses for bootstrap seeding?

5. **Multi-sig Admin:** Do you have a multi-sig wallet for contract admin role, or should agent wallet hold it initially?

### During Development:
6. **Skill Testing:** How should we test custom skills locally before deploying agent?

7. **HEARTBEAT Frequency:** Is 6 hours the right cycle time, or should we do 12 hours for lower gas costs?

8. **Memory Strategy:** File-based (MEMORY.md) vs. PostgreSQL database for caching - preference?

### Post-Deployment:
9. **Threshold Tuning:** After 48h of monitoring, should detection thresholds be adjusted based on observed behavior?

10. **Badge Design:** Static or animated SVG for NFT badges?

11. **Phase 2 Priority:** Which post-contest feature first - Community Reporter, Ethos/Elfa, or Public API?

### Technical Clarifications:
12. **Nansen API Tier:** Which Nansen endpoints do you have access to (labels, money flow, portfolio)?

13. **Scaffold-ETH Usage:** Do you want to use Scaffold-ETH 2 for contract development, or pure Hardhat/Foundry?

14. **OpenClaw Version:** Which OpenClaw version should we target (any specific release requirements)?

---

## 10. Implementation Timeline

### Days 1-2: OpenClaw Setup & Smart Contracts
- Set up OpenClaw agent workspace structure
- Create AGENT.md, HEARTBEAT.md, MEMORY.md
- Write smart contracts (AgentRegistry, ReputationCore, SafetyStaking, SafetyBadge)
- Unit test contracts

### Days 3-4: Contract Deployment & Custom Skills
- Deploy contracts to Base Sepolia testnet
- Create `base-monitoring` skill with MCP tools
- Create `reputation-scoring` skill with AIXBT/Nansen integration
- Test skills locally with mock data

### Days 5-6: Agent Intelligence & Enforcement
- Create `agent-enforcement` skill for onchain actions
- Implement degraded mode logic for API failures
- Integrate all skills into agent's HEARTBEAT cycle
- End-to-end test on Sepolia

### Days 7-8: Social & Production Deployment
- Configure X/Farcaster channels in openclaw.json
- Implement posting templates and mention responses
- Deploy contracts to Base mainnet
- Deploy agent to Railway/Render

### Day 9: Bootstrap & Testing
- Seed 5-10 Base agents in MEMORY.md
- Register monitor agent via ERC-8004
- Run first autonomous cycles, monitor for issues
- Tune detection thresholds if needed

### Day 10: Documentation & Submission
- Create demo video showing autonomous operation
- Write comprehensive README explaining architecture
- Document OpenClaw skills for other builders
- Submit to Builder Quest with X/Farcaster profiles

### Days 11-14: Monitoring & Iteration
- Watch agent operation, fix critical bugs
- Collect community feedback
- Plan Phase 2 enhancements

---

## 11. Key Differentiators for Builder Quest

**Why This Wins:**

1. **True OpenClaw Agent:** Built using the framework as intended, not a standalone system
2. **Novel Meta-Layer:** First agent that monitors other agents (unprecedented use case)
3. **Heavy Onchain Primitives:** Reputation scoring, staking with slashing, dynamic NFTs, ERC-8004 registration
4. **Sophisticated Intelligence:** AIXBT + Nansen integration for multi-source decision-making
5. **True Autonomy:** HEARTBEAT-driven with no human intervention, degraded mode ensures uptime
6. **Composable Infrastructure:** Other agents/builders can query reputation scores
7. **Solves Real Problem:** Addresses recent OpenClaw security incidents (wallet draining, spam)
8. **Transparent & Verifiable:** ERC-8004 registration, daily logs, onchain audit trail

---

**END OF PRD**
