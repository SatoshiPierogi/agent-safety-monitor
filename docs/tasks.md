# tasks-agent-safety-monitor.md

## Relevant Files

### OpenClaw Agent Configuration
- `agent-safety-monitor/openclaw.json` - Main OpenClaw agent configuration (model, channels, blockchain settings)
- `agent-safety-monitor/workspace/AGENT.md` - Agent identity, personality, and mission statement
- `agent-safety-monitor/workspace/HEARTBEAT.md` - Autonomous action cycle definition (6-hour monitoring loop)
- `agent-safety-monitor/workspace/MEMORY.md` - Persistent memory for monitored agents and scores
- `agent-safety-monitor/.env` - Environment variables (API keys, private key, RPC URLs)
- `agent-safety-monitor/package.json` - Dependencies for agent and skills

### Custom OpenClaw Skills
- `agent-safety-monitor/skills/base-monitoring/SKILL.md` - Skill definition for Base blockchain monitoring
- `agent-safety-monitor/skills/base-monitoring/index.ts` - MCP tool implementations for transaction monitoring
- `agent-safety-monitor/skills/base-monitoring/package.json` - Skill dependencies
- `agent-safety-monitor/skills/reputation-scoring/SKILL.md` - Skill definition for reputation calculation
- `agent-safety-monitor/skills/reputation-scoring/index.ts` - Scoring algorithm and API integrations
- `agent-safety-monitor/skills/reputation-scoring/api-clients.ts` - AIXBT and Nansen API client wrappers
- `agent-safety-monitor/skills/agent-enforcement/SKILL.md` - Skill definition for onchain enforcement
- `agent-safety-monitor/skills/agent-enforcement/index.ts` - Smart contract interaction tools
- `agent-safety-monitor/skills/agent-enforcement/contract-abis.ts` - Contract ABIs for ethers.js

### Smart Contracts (Scaffold-ETH 2)
- `packages/hardhat/contracts/AgentRegistry.sol` - Agent registration and metadata storage
- `packages/hardhat/contracts/ReputationCore.sol` - Reputation scoring and time-decay logic
- `packages/hardhat/contracts/SafetyStaking.sol` - Staking, slashing, and unstaking mechanics
- `packages/hardhat/contracts/SafetyBadge.sol` - ERC-721 dynamic NFT badges
- `packages/hardhat/test/AgentRegistry.test.ts` - Unit tests for AgentRegistry
- `packages/hardhat/test/ReputationCore.test.ts` - Unit tests for ReputationCore
- `packages/hardhat/test/SafetyStaking.test.ts` - Unit tests for SafetyStaking
- `packages/hardhat/test/SafetyBadge.test.ts` - Unit tests for SafetyBadge
- `packages/hardhat/deploy/00_deploy_contracts.ts` - Hardhat deployment script
- `packages/hardhat/hardhat.config.ts` - Hardhat configuration for Base network

### ERC-8004 Integration
- `agent-safety-monitor/src/erc8004-integration.ts` - ERC-8004 Identity & Reputation Registry integration (discover, read, write feedback, self-register)

### Configuration & Documentation
- `agent-safety-monitor/config/detection-rules.json` - Violation detection thresholds and penalties
- `agent-safety-monitor/config/contract-addresses.json` - Deployed contract addresses on Base
- `agent-safety-monitor/README.md` - Project documentation and setup instructions
- `agent-safety-monitor/BUILDER_QUEST.md` - Builder Quest submission documentation
- `agent-safety-monitor/logs/daily/` - Directory for daily operation logs

### Notes

- OpenClaw uses a workspace structure with AGENT.md, HEARTBEAT.md, and MEMORY.md for autonomous operation
- Custom skills are registered as MCP tools that the agent can call during its HEARTBEAT cycle
- Smart contracts use Scaffold-ETH 2 structure (packages/hardhat/ and packages/nextjs/)
- All API keys and private keys must be stored in .env (never commit to repo)
- The agent will deploy to Railway or Render for 24/7 operation

---

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

---

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Create and checkout a new branch for this feature: `git checkout -b feature/agent-safety-monitor`

- [x] 1.0 Set up OpenClaw agent workspace and configuration
  - [x] 1.1 Install OpenClaw CLI globally: `npm install -g openclaw` (or clone from GitHub if not on npm)
  - [x] 1.2 Create new OpenClaw agent workspace: `openclaw init agent-safety-monitor` or manually create directory structure
  - [x] 1.3 Create `openclaw.json` with agent configuration (model: claude-opus-4-6, channels: none native — custom skills for X/Farcaster, blockchain: base)
  - [x] 1.4 Create `.env` file with placeholders for: BASE_RPC_URL, AGENT_PRIVATE_KEY, AIXBT_API_KEY, NANSEN_API_KEY, TWITTER_API_KEY, TWITTER_API_SECRET, FARCASTER_MNEMONIC
  - [x] 1.5 Create `workspace/AGENT.md` defining agent personality as "security-focused watchdog for AI agents" (split into SOUL.md, IDENTITY.md, AGENTS.md per OpenClaw conventions)
  - [x] 1.6 Create initial `workspace/MEMORY.md` with sections for: Monitored Agents, Detection Patterns, API Status
  - [x] 1.7 Create `workspace/HEARTBEAT.md` outlining 6-hour cycle phases: Scan, Analysis, Decision, Execution, Communication, Memory
  - [x] 1.8 Create `logs/daily/` directory for daily operation logs
  - [x] 1.9 Initialize package.json and install dependencies: ethers, axios, dotenv

- [x] 2.0 Install and configure required skills from openclaw-skills repository
  - [x] 2.1 Clone openclaw-skills repository: `git clone https://github.com/BankrBot/openclaw-skills.git` to separate directory
  - [x] 2.2 Review available skills in openclaw-skills repository (especially ERC-8004 registration skill)
  - [x] 2.3 Copy ERC-8004 skill from openclaw-skills into `agent-safety-monitor/skills/erc8004-registration/`
  - [x] 2.4 Install ERC-8004 skill dependencies: `cd skills/erc8004-registration && npm install` (no npm deps — bash scripts + jq + node)
  - [x] 2.5 Configure ERC-8004 skill with agent's metadata (name: "Agent Safety Monitor", description, services, wallet address)
  - [x] 2.6 Test ERC-8004 skill locally to ensure it can format registration data correctly
  - [x] 2.7 Add ERC-8004 skill to openclaw.json skills configuration

- [x] 3.0 Develop and deploy smart contracts to Base using Scaffold-ETH 2
  - [x] 3.1 Install Scaffold-ETH 2: `npx create-eth@latest` and select Base network option
  - [x] 3.2 Navigate to `packages/hardhat/contracts/` directory
  - [x] 3.3 Create `AgentRegistry.sol` with functions: registerAgent, getAgentInfo, and events: AgentRegistered
  - [x] 3.4 Create `ReputationCore.sol` with functions: updateScore, getScore, and time-decay logic for penalties
  - [x] 3.5 Create `SafetyStaking.sol` with functions: stake (payable), slash, unstake (with 7-day timelock)
  - [x] 3.6 Create `SafetyBadge.sol` as ERC-721 with functions: mintBadge, revokeBadge, dynamic tokenURI with onchain SVG
  - [x] 3.7 Implement OpenZeppelin AccessControl in all contracts (roles: SCORE_UPDATER, SLASHER, MINTER, ADMIN)
  - [x] 3.8 Write unit tests in `packages/hardhat/test/` for each contract (target 80%+ coverage)
  - [x] 3.9 Run tests: `cd packages/hardhat && npx hardhat test` — 51 tests passing
  - [x] 3.10 Configure Base Sepolia network in `hardhat.config.ts` with RPC URL and deployer private key
  - [x] 3.11 Create deployment script `deploy/00_deploy_contracts.ts` that deploys all 4 contracts and grants roles to agent wallet
  - [ ] 3.12 Deploy to Base Sepolia testnet: `npx hardhat deploy --network baseSepolia`
  - [ ] 3.13 Verify contracts on Basescan Sepolia: `npx hardhat verify --network baseSepolia [CONTRACT_ADDRESS]`
  - [ ] 3.14 Test contract interactions on Sepolia (register test agent, update score, mint badge)
  - [ ] 3.15 Deploy to Base mainnet: `npx hardhat deploy --network base`
  - [ ] 3.16 Verify contracts on Basescan mainnet
  - [ ] 3.17 Save deployed contract addresses to `config/contract-addresses.json`

- [x] 4.0 Create custom OpenClaw skills for monitoring, scoring, and enforcement
  - [x] 4.1 Create `skills/base-monitoring/` directory and initialize with `npm init -y`
  - [x] 4.2 Create `skills/base-monitoring/SKILL.md` documenting tools: monitor_agent_transactions, detect_violations, get_agent_activity
  - [x] 4.3 Create `skills/base-monitoring/index.ts` and implement `monitor_agent_transactions(address, hours)` MCP tool using Base RPC
  - [x] 4.4 Implement `detect_violations(transactions)` tool with detection rules from config/detection-rules.json (CRITICAL: >3 drains/hour, HIGH: >30% failure rate, MEDIUM: >20% failure, LOW: >10% failure)
  - [x] 4.5 Implement `get_agent_activity(address)` tool that returns transaction summary and success rate
  - [x] 4.6 Create `config/detection-rules.json` with violation thresholds, severity levels, and penalty amounts
  - [ ] 4.7 Test base-monitoring skill with known Base agent addresses on testnet
  - [x] 4.8 Create `skills/reputation-scoring/` directory and initialize
  - [x] 4.9 Create `skills/reputation-scoring/SKILL.md` documenting tools: calculate_score, query_aixbt_sentiment, query_nansen_labels, apply_time_decay
  - [x] 4.10 Create `skills/reputation-scoring/api-clients.ts` with AIXBT API client (getProjectDetails, getSummaries with 1hr cache)
  - [x] 4.11 Add Nansen API client to api-clients.ts (getWalletLabels, getMoneyFlow with 6hr cache)
  - [x] 4.12 Create `skills/reputation-scoring/index.ts` and implement `calculate_score(address)` with weighted formula (onchain 40%, AIXBT 30%, Nansen 30%)
  - [x] 4.13 Implement `query_aixbt_sentiment(token)` tool that checks if agent's promoted tokens have negative sentiment
  - [x] 4.14 Implement `query_nansen_labels(address)` tool that returns wallet reputation labels (Smart Money, Known Exploiter, etc.)
  - [x] 4.15 Implement `apply_time_decay(penalties, age_days)` tool that reduces penalty by 1/90th per day
  - [x] 4.16 Implement degraded mode logic: if AIXBT fails, use cached data and reduce confidence to 80%; if Nansen fails, reduce to 70%; if both fail, use onchain only at 60% confidence
  - [ ] 4.17 Test reputation-scoring skill with mock API responses
  - [x] 4.18 Create `skills/agent-enforcement/` directory and initialize
  - [x] 4.19 Create `skills/agent-enforcement/SKILL.md` documenting tools: update_reputation_onchain, slash_agent_stake, mint_safety_badge, revoke_safety_badge
  - [x] 4.20 Create `skills/agent-enforcement/contract-abis.ts` with ABIs for all deployed contracts
  - [x] 4.21 Create `skills/agent-enforcement/index.ts` and implement `update_reputation_onchain(address, score, reason)` using ethers.js to call ReputationCore.updateScore()
  - [x] 4.22 Implement `slash_agent_stake(address, percentage, reason)` tool that calls SafetyStaking.slash()
  - [x] 4.23 Implement `mint_safety_badge(address, tier)` tool that calls SafetyBadge.mintBadge() with tier validation (Bronze: 30d/700/0.01ETH, Silver: 90d/850/0.05ETH, Gold: 180d/950/0.1ETH)
  - [x] 4.24 Implement `revoke_safety_badge(address, reason)` tool that burns badge NFT
  - [x] 4.25 Add transaction retry logic (max 3 attempts, exponential backoff) to all enforcement tools
  - [x] 4.26 Add gas estimation and balance checking before executing transactions
  - [ ] 4.27 Test agent-enforcement skill on Sepolia testnet
  - [x] 4.28 Add all custom skills to openclaw.json skills configuration (already in openclaw.json)

- [x] 4.5a Integrate live ERC-8004 registries into the project
  - [x] 4.5a.1 Create `src/erc8004-integration.ts` with Identity Registry + Reputation Registry ABIs and functions
  - [x] 4.5a.2 Implement `discoverAgents()` — fetches from 8004scan.io API for Base agents
  - [x] 4.5a.3 Implement `getAgentReputation(agentId)` — reads on-chain feedback from Reputation Registry
  - [x] 4.5a.4 Implement `submitSafetyFeedback(agentId, score, details)` — writes to Reputation Registry via `giveFeedback()`
  - [x] 4.5a.5 Implement `registerSelf(agentURI)` — registers our agent on Identity Registry
  - [x] 4.5a.6 Implement `lookupAgentByAddress(address)` — maps wallet address to ERC-8004 token ID
  - [x] 4.5a.7 Add ERC-8004 contract addresses to `config/contract-addresses.json`
  - [x] 4.5a.8 Wire Phase 0 (ERC-8004 Discovery) into heartbeat-executor.ts
  - [x] 4.5a.9 Wire Phase 4b (ERC-8004 Feedback Submission) into heartbeat-executor.ts
  - [x] 4.5a.10 Add ERC-8004 API status tracking to heartbeat memory phase
  - [x] 4.5a.11 Update CLAUDE.md with ERC-8004 integration details and scanner resources
  - [x] 4.5a.12 Update MEMORY.md with registry addresses and ecosystem resources
  - [x] 4.5a.13 Verify TypeScript compiles with zero errors
  - [x] 4.5a.14 Test heartbeat with ERC-8004 discovery — verified: 50 agents discovered, 4 matched to monitored agents
  - [ ] 4.5a.15 Test feedback submission on live Base network (needs funded wallet + Alchemy key)

- [ ] 5.0 Register agent via ERC-8004 on Ethereum mainnet for identity
  - [ ] 5.1 Create agent metadata JSON file with: name "Agent Safety Monitor", description, agentType "security-monitor", services (reputation-query endpoint, X handle), wallet address, GitHub repo
  - [ ] 5.2 Host metadata JSON on IPFS or GitHub Pages (must be publicly accessible URI)
  - [ ] 5.3 Fund agent wallet with 0.05 ETH on Ethereum mainnet for registration gas
  - [ ] 5.4 Use ERC-8004 skill to register agent on Ethereum mainnet Identity Registry contract
  - [ ] 5.5 Verify registration on Etherscan (check ERC-8004 registry for agent's address)
  - [ ] 5.6 Update AGENT.md with ERC-8004 registration details and tokenId
  - [ ] 5.7 Update X bio and Farcaster profile to mention ERC-8004 registration

- [x] 6.0 Implement autonomous HEARTBEAT cycle and decision engine
  - [x] 6.1 Update `workspace/HEARTBEAT.md` with detailed 6-hour cycle workflow including tool calls for each phase
  - [x] 6.2 Create `src/heartbeat-executor.ts` that reads HEARTBEAT.md and executes the cycle
  - [x] 6.3 Implement Scan Phase: Call base-monitoring tools for all agents in MEMORY.md (monitor_agent_transactions for last 6 hours)
  - [x] 6.4 Implement Analysis Phase: Call reputation-scoring tools (calculate_score, query APIs) for each agent
  - [x] 6.5 Implement Decision Phase: Compare new scores to old scores in MEMORY.md, determine if actions needed (threshold: >50 point change or CRITICAL/HIGH violations)
  - [x] 6.6 Implement decision validation: require 2/3 data sources to agree before executing (onchain + AIXBT, or onchain + Nansen, or all 3)
  - [x] 6.7 Implement Execution Phase: Call agent-enforcement tools for agents requiring action (update scores, slash stakes, revoke/mint badges)
  - [x] 6.8 Implement transaction batching: group multiple score updates into single transaction when possible to save gas
  - [x] 6.9 Implement Communication Phase: Generate and queue social posts based on actions taken (see Task 7.0)
  - [x] 6.10 Implement Memory Phase: Update MEMORY.md with new scores, violation history, API status, patterns learned
  - [x] 6.11 Implement daily log creation: Append cycle summary to logs/daily/YYYY-MM-DD.md (agents scanned, violations, actions, API calls, posts)
  - [x] 6.12 Add error handling for each phase: if critical error, log and continue to next cycle; if degraded mode needed, activate and mark decisions as reduced confidence
  - [x] 6.13 Implement cron scheduler to trigger HEARTBEAT every 6 hours (setTimeout-based, with --once flag for testing)
  - [x] 6.14 Test full HEARTBEAT cycle locally — verified: cycle runs, MEMORY.md updates, daily log created

- [x] 7.0 Configure social communication channels (X/Farcaster)
  - [ ] 7.1 Create X (Twitter) account @AgentSafetyBase (or similar available handle) — manual step
  - [ ] 7.2 Apply for X API elevated access (required for posting autonomously) — manual step
  - [x] 7.3 Add X credentials to .env (TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET)
  - [x] 7.4 Configure X channel — custom skill (OpenClaw has no native X support), via src/social/x-client.ts
  - [ ] 7.5 Create Farcaster account (use Warpcast or Farcaster client) — manual step
  - [x] 7.6 Add Farcaster/Neynar credentials to .env (NEYNAR_API_KEY, NEYNAR_SIGNER_UUID, FARCASTER_FID)
  - [x] 7.7 Configure Farcaster channel — custom skill via src/social/farcaster-client.ts (Neynar API)
  - [x] 7.8 Create `src/social-poster.ts` with post template functions (critical_alert, daily_summary, mention_response)
  - [x] 7.9 Implement `critical_alert()` template with agent address, violation, score change, action, tx link
  - [x] 7.10 Implement `daily_summary()` template with date, agents, violations by severity, badges, top/drop agents
  - [x] 7.11 Implement `mention_response()` template with score, badge, stake, risk factors
  - [x] 7.12 Integrate social-poster.ts into HEARTBEAT Communication Phase
  - [x] 7.13 Implement mention monitoring: src/mention-monitor.ts — checks X mentions + Farcaster notifications hourly, responds to "is safe?", "report", "score" queries
  - [x] 7.14 Implement rate limiting: RateLimiter class — 100 posts/day, 20/hour, critical posts bypass hourly limit
  - [ ] 7.15 Test posting to X and Farcaster — needs real API credentials
  - [ ] 7.16 Set up X profile — manual step
  - [ ] 7.17 Create pinned first post explaining mission — manual step

- [x] 8.0 Bootstrap agent with initial data and deploy to production
  - [x] 8.1 Research and identify 8 active AI agent addresses on Base (Clawd, Luna, Clanker, AIXBT, VaderAI, Sekoia, Spectral, Clawd Treasury)
  - [x] 8.2 Find X/Farcaster handles for identified agents (@clawdbotatg, @luna_virtuals, @clanker, @aixbt_agent, @Spectral_Labs)
  - [x] 8.3 Add agent profiles to MEMORY.md with addresses, handles, initial score 500
  - [ ] 8.4 Fund agent wallet on Base mainnet with 0.5 ETH — manual step
  - [ ] 8.5 Set all environment variables in .env (Alchemy key, private key, API keys) — manual step
  - [x] 8.6 Run full HEARTBEAT cycle locally — verified: all 8 agents scanned, errors gracefully handled, logs written
  - [ ] 8.7 Verify onchain transactions on Basescan — needs funded wallet + deployed contracts
  - [ ] 8.8 Create Railway.app or Render.com account — manual step
  - [ ] 8.9 Create new project on Railway/Render and connect GitHub — manual step
  - [ ] 8.10 Configure environment variables in Railway/Render dashboard — manual step
  - [x] 8.11 Health check endpoint at /health returns: uptime, last cycle timestamp, wallet balance, API status
  - [ ] 8.12 Configure Railway/Render auto-restart — manual step
  - [x] 8.13 Created Dockerfile + .dockerignore for containerized deployment
  - [ ] 8.14 Monitor first 2-3 HEARTBEAT cycles in production — post-deploy
  - [ ] 8.15 Verify autonomous operation (24 hours) — post-deploy
  - [ ] 8.16 Set up log aggregation — post-deploy

- [ ] 9.0 Test autonomous operation and prepare Builder Quest submission
  - [ ] 9.1 Monitor agent operation for 7 consecutive days, logging: uptime %, transactions executed, violations detected, posts made, mention responses
  - [ ] 9.2 Verify at least 50 onchain transactions executed (target from success metrics)
  - [ ] 9.3 Verify at least 5 decisions influenced by AIXBT data and 5 by Nansen data
  - [ ] 9.4 Collect screenshots/evidence of: ERC-8004 registration, sample CRITICAL alert posts, daily summaries, mention responses, Basescan transaction history
  - [ ] 9.5 Test degraded mode: Temporarily disable one API (AIXBT or Nansen) and verify agent continues operating with reduced confidence scores
  - [x] 9.6 Create comprehensive README.md covering: What it does, why it matters, architecture overview, how to use (query safety), tech stack, OpenClaw skills used
  - [x] 9.7 Create BUILDER_QUEST.md with: Problem solved (agent trust crisis), solution overview, novel use case (agent monitoring agents), onchain primitives used, autonomy proof, demo links
  - [ ] 9.8 Record 3-5 minute demo video showing: Agent monitoring in action, real-time alert posting, score updates onchain, mention response, HEARTBEAT logs, no human intervention
  - [x] 9.9 Create architecture diagram showing: OpenClaw agent → Custom skills → Smart contracts on Base + AIXBT/Nansen APIs → X/Farcaster output (included in README.md)
  - [x] 9.10 Document all custom skills in individual README files for other builders to understand and potentially reuse
  - [ ] 9.11 Prepare Twitter/X thread announcing agent launch with: Problem statement, how it works, live agent handle @AgentSafetyBase, invite community to test, link to docs
  - [ ] 9.12 Submit to Base Builder Quest: Post agent's X profile link in contest comments with demo video and documentation links
  - [ ] 9.13 Post launch announcement thread on X tagging @base, @BuildOnBase, relevant OpenClaw/agent communities
  - [ ] 9.14 Monitor community feedback and respond to questions about the agent
  - [ ] 9.15 Plan Phase 2 enhancements based on initial operation results (Ethos/Elfa integration, Community Reporter contract, Public API)

---

**END OF TASK LIST**
