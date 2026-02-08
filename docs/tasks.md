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

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Create and checkout a new branch for this feature: `git checkout -b feature/agent-safety-monitor`

- [ ] 1.0 Set up OpenClaw agent workspace and configuration
  - [ ] 1.1 Install OpenClaw CLI globally: `npm install -g openclaw` (or clone from GitHub if not on npm)
  - [ ] 1.2 Create new OpenClaw agent workspace: `openclaw init agent-safety-monitor` or manually create directory structure
  - [ ] 1.3 Create `openclaw.json` with agent configuration (model: claude-3-5-sonnet, channels: twitter/farcaster, blockchain: base)
  - [ ] 1.4 Create `.env` file with placeholders for: BASE_RPC_URL, AGENT_PRIVATE_KEY, AIXBT_API_KEY, NANSEN_API_KEY, TWITTER_API_KEY, TWITTER_API_SECRET, FARCASTER_MNEMONIC
  - [ ] 1.5 Create `workspace/AGENT.md` defining agent personality as "security-focused watchdog for AI agents"
  - [ ] 1.6 Create initial `workspace/MEMORY.md` with sections for: Monitored Agents, Detection Patterns, API Status
  - [ ] 1.7 Create `workspace/HEARTBEAT.md` outlining 6-hour cycle phases: Scan, Analysis, Decision, Execution, Communication, Memory
  - [ ] 1.8 Create `logs/daily/` directory for daily operation logs
  - [ ] 1.9 Initialize package.json and install dependencies: ethers, axios, dotenv

- [ ] 2.0 Install and configure required skills from openclaw-skills repository
  - [ ] 2.1 Clone openclaw-skills repository: `git clone https://github.com/BankrBot/openclaw-skills.git` to separate directory
  - [ ] 2.2 Review available skills in openclaw-skills repository (especially ERC-8004 registration skill)
  - [ ] 2.3 Copy ERC-8004 skill from openclaw-skills into `agent-safety-monitor/skills/erc8004-registration/`
  - [ ] 2.4 Install ERC-8004 skill dependencies: `cd skills/erc8004-registration && npm install`
  - [ ] 2.5 Configure ERC-8004 skill with agent's metadata (name: "Agent Safety Monitor", description, services, wallet address)
  - [ ] 2.6 Test ERC-8004 skill locally to ensure it can format registration data correctly
  - [ ] 2.7 Add ERC-8004 skill to openclaw.json skills configuration

- [ ] 3.0 Develop and deploy smart contracts to Base using Scaffold-ETH 2
  - [ ] 3.1 Install Scaffold-ETH 2: `npx create-eth@latest` and select Base network option
  - [ ] 3.2 Navigate to `packages/hardhat/contracts/` directory
  - [ ] 3.3 Create `AgentRegistry.sol` with functions: registerAgent, getAgentInfo, and events: AgentRegistered
  - [ ] 3.4 Create `ReputationCore.sol` with functions: updateScore, getScore, and time-decay logic for penalties
  - [ ] 3.5 Create `SafetyStaking.sol` with functions: stake (payable), slash, unstake (with 7-day timelock)
  - [ ] 3.6 Create `SafetyBadge.sol` as ERC-721 with functions: mintBadge, revokeBadge, dynamic tokenURI with onchain SVG
  - [ ] 3.7 Implement OpenZeppelin AccessControl in all contracts (roles: SCORE_UPDATER, SLASHER, MINTER, ADMIN)
  - [ ] 3.8 Write unit tests in `packages/hardhat/test/` for each contract (target 80%+ coverage)
  - [ ] 3.9 Run tests: `cd packages/hardhat && npx hardhat test`
  - [ ] 3.10 Configure Base Sepolia network in `hardhat.config.ts` with RPC URL and deployer private key
  - [ ] 3.11 Create deployment script `deploy/00_deploy_contracts.ts` that deploys all 4 contracts and grants roles to agent wallet
  - [ ] 3.12 Deploy to Base Sepolia testnet: `npx hardhat deploy --network baseSepolia`
  - [ ] 3.13 Verify contracts on Basescan Sepolia: `npx hardhat verify --network baseSepolia [CONTRACT_ADDRESS]`
  - [ ] 3.14 Test contract interactions on Sepolia (register test agent, update score, mint badge)
  - [ ] 3.15 Deploy to Base mainnet: `npx hardhat deploy --network base`
  - [ ] 3.16 Verify contracts on Basescan mainnet
  - [ ] 3.17 Save deployed contract addresses to `config/contract-addresses.json`

- [ ] 4.0 Create custom OpenClaw skills for monitoring, scoring, and enforcement
  - [ ] 4.1 Create `skills/base-monitoring/` directory and initialize with `npm init -y`
  - [ ] 4.2 Create `skills/base-monitoring/SKILL.md` documenting tools: monitor_agent_transactions, detect_violations, get_agent_activity
  - [ ] 4.3 Create `skills/base-monitoring/index.ts` and implement `monitor_agent_transactions(address, hours)` MCP tool using Base RPC
  - [ ] 4.4 Implement `detect_violations(transactions)` tool with detection rules from config/detection-rules.json (CRITICAL: >3 drains/hour, HIGH: >30% failure rate, MEDIUM: >20% failure, LOW: >10% failure)
  - [ ] 4.5 Implement `get_agent_activity(address)` tool that returns transaction summary and success rate
  - [ ] 4.6 Create `config/detection-rules.json` with violation thresholds, severity levels, and penalty amounts
  - [ ] 4.7 Test base-monitoring skill with known Base agent addresses on testnet
  - [ ] 4.8 Create `skills/reputation-scoring/` directory and initialize
  - [ ] 4.9 Create `skills/reputation-scoring/SKILL.md` documenting tools: calculate_score, query_aixbt_sentiment, query_nansen_labels, apply_time_decay
  - [ ] 4.10 Create `skills/reputation-scoring/api-clients.ts` with AIXBT API client (getProjectDetails, getSummaries with 1hr cache)
  - [ ] 4.11 Add Nansen API client to api-clients.ts (getWalletLabels, getMoneyFlow with 6hr cache)
  - [ ] 4.12 Create `skills/reputation-scoring/index.ts` and implement `calculate_score(address)` with weighted formula (onchain 40%, AIXBT 30%, Nansen 30%)
  - [ ] 4.13 Implement `query_aixbt_sentiment(token)` tool that checks if agent's promoted tokens have negative sentiment
  - [ ] 4.14 Implement `query_nansen_labels(address)` tool that returns wallet reputation labels (Smart Money, Known Exploiter, etc.)
  - [ ] 4.15 Implement `apply_time_decay(penalties, age_days)` tool that reduces penalty by 1/90th per day
  - [ ] 4.16 Implement degraded mode logic: if AIXBT fails, use cached data and reduce confidence to 80%; if Nansen fails, reduce to 70%; if both fail, use onchain only at 60% confidence
  - [ ] 4.17 Test reputation-scoring skill with mock API responses
  - [ ] 4.18 Create `skills/agent-enforcement/` directory and initialize
  - [ ] 4.19 Create `skills/agent-enforcement/SKILL.md` documenting tools: update_reputation_onchain, slash_agent_stake, mint_safety_badge, revoke_safety_badge
  - [ ] 4.20 Create `skills/agent-enforcement/contract-abis.ts` with ABIs for all deployed contracts
  - [ ] 4.21 Create `skills/agent-enforcement/index.ts` and implement `update_reputation_onchain(address, score, reason)` using ethers.js to call ReputationCore.updateScore()
  - [ ] 4.22 Implement `slash_agent_stake(address, percentage, reason)` tool that calls SafetyStaking.slash()
  - [ ] 4.23 Implement `mint_safety_badge(address, tier)` tool that calls SafetyBadge.mintBadge() with tier validation (Bronze: 30d/700/0.01ETH, Silver: 90d/850/0.05ETH, Gold: 180d/950/0.1ETH)
  - [ ] 4.24 Implement `revoke_safety_badge(address, reason)` tool that burns badge NFT
  - [ ] 4.25 Add transaction retry logic (max 3 attempts, exponential backoff) to all enforcement tools
  - [ ] 4.26 Add gas estimation and balance checking before executing transactions
  - [ ] 4.27 Test agent-enforcement skill on Sepolia testnet
  - [ ] 4.28 Add all custom skills to openclaw.json skills configuration

- [ ] 5.0 Register agent via ERC-8004 on Ethereum mainnet for identity
  - [ ] 5.1 Create agent metadata JSON file with: name "Agent Safety Monitor", description, agentType "security-monitor", services (reputation-query endpoint, X handle), wallet address, GitHub repo
  - [ ] 5.2 Host metadata JSON on IPFS or GitHub Pages (must be publicly accessible URI)
  - [ ] 5.3 Fund agent wallet with 0.05 ETH on Ethereum mainnet for registration gas
  - [ ] 5.4 Use ERC-8004 skill to register agent on Ethereum mainnet Identity Registry contract
  - [ ] 5.5 Verify registration on Etherscan (check ERC-8004 registry for agent's address)
  - [ ] 5.6 Update AGENT.md with ERC-8004 registration details and tokenId
  - [ ] 5.7 Update X bio and Farcaster profile to mention ERC-8004 registration

- [ ] 6.0 Implement autonomous HEARTBEAT cycle and decision engine
  - [ ] 6.1 Update `workspace/HEARTBEAT.md` with detailed 6-hour cycle workflow including tool calls for each phase
  - [ ] 6.2 Create `src/heartbeat-executor.ts` that reads HEARTBEAT.md and executes the cycle
  - [ ] 6.3 Implement Scan Phase: Call base-monitoring tools for all agents in MEMORY.md (monitor_agent_transactions for last 6 hours)
  - [ ] 6.4 Implement Analysis Phase: Call reputation-scoring tools (calculate_score, query APIs) for each agent
  - [ ] 6.5 Implement Decision Phase: Compare new scores to old scores in MEMORY.md, determine if actions needed (threshold: >50 point change or CRITICAL/HIGH violations)
  - [ ] 6.6 Implement decision validation: require 2/3 data sources to agree before executing (onchain + AIXBT, or onchain + Nansen, or all 3)
  - [ ] 6.7 Implement Execution Phase: Call agent-enforcement tools for agents requiring action (update scores, slash stakes, revoke/mint badges)
  - [ ] 6.8 Implement transaction batching: group multiple score updates into single transaction when possible to save gas
  - [ ] 6.9 Implement Communication Phase: Generate and queue social posts based on actions taken (see Task 7.0)
  - [ ] 6.10 Implement Memory Phase: Update MEMORY.md with new scores, violation history, API status, patterns learned
  - [ ] 6.11 Implement daily log creation: Append cycle summary to logs/daily/YYYY-MM-DD.md (agents scanned, violations, actions, API calls, posts)
  - [ ] 6.12 Add error handling for each phase: if critical error, log and continue to next cycle; if degraded mode needed, activate and mark decisions as reduced confidence
  - [ ] 6.13 Implement cron scheduler to trigger HEARTBEAT every 6 hours (use node-cron or built-in OpenClaw scheduling)
  - [ ] 6.14 Test full HEARTBEAT cycle locally with 2-3 test agents

- [ ] 7.0 Configure social communication channels (X/Farcaster)
  - [ ] 7.1 Create X (Twitter) account @AgentSafetyBase (or similar available handle)
  - [ ] 7.2 Apply for X API elevated access (required for posting autonomously)
  - [ ] 7.3 Add X credentials to .env (TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET)
  - [ ] 7.4 Configure X channel in openclaw.json with handle and credentials
  - [ ] 7.5 Create Farcaster account (use Warpcast or Farcaster client)
  - [ ] 7.6 Add Farcaster mnemonic to .env (FARCASTER_MNEMONIC)
  - [ ] 7.7 Configure Farcaster channel in openclaw.json
  - [ ] 7.8 Create `src/social-poster.ts` with post template functions (critical_alert, daily_summary, mention_response)
  - [ ] 7.9 Implement `critical_alert(agent, violation, score_change, action)` template: "🚨 CRITICAL: Agent @handle [0xABC...] | Violation: [description] | Score: [new] (Δ[change]) | Action: [slash/revoke] | Evidence: [AIXBT/Nansen] | Tx: [link]"
  - [ ] 7.10 Implement `daily_summary(date, stats)` template: "📊 Daily Safety Report - [Date] | Agents Monitored: [N] | Violations: [N by severity] | Badges Issued: [N] | Top Agent: @handle ([score]) | Biggest Drop: @handle (-[X])"
  - [ ] 7.11 Implement `mention_response(query, agent_data)` template for "@AgentSafetyBase is @agent safe?" queries with score, badge, stake, and risk factors
  - [ ] 7.12 Integrate social-poster.ts into HEARTBEAT Communication Phase
  - [ ] 7.13 Implement mention monitoring: Check X mentions every hour, respond to "is @agent safe?" and "report @agent" queries
  - [ ] 7.14 Implement rate limiting: max 100 posts/day on X, max 20 mention responses/hour to prevent spam exploitation
  - [ ] 7.15 Test posting to X and Farcaster (use test accounts first if possible)
  - [ ] 7.16 Set up X profile: bio "Autonomous AI agent monitoring agents on Base | Reputation scores & safety alerts | Built for @base Builder Quest", profile picture (shield/watchdog icon), banner with live stats
  - [ ] 7.17 Create pinned first post explaining mission and how to check agent safety

- [ ] 8.0 Bootstrap agent with initial data and deploy to production
  - [ ] 8.1 Research and identify 5-10 active AI agent addresses on Base blockchain (diverse types: trading, social, DeFi)
  - [ ] 8.2 Find X/Farcaster handles for identified agents
  - [ ] 8.3 Manually add agent profiles to MEMORY.md under "Monitored Agents" section with addresses, handles, initial score 500 (neutral)
  - [ ] 8.4 Fund agent wallet on Base mainnet with 0.5 ETH for operational gas costs
  - [ ] 8.5 Set all environment variables in .env (API keys, private key, RPC URLs, social credentials)
  - [ ] 8.6 Run full HEARTBEAT cycle locally to test end-to-end operation with real Base data
  - [ ] 8.7 Verify onchain transactions appear on Basescan and social posts appear on X/Farcaster
  - [ ] 8.8 Create Railway.app or Render.com account
  - [ ] 8.9 Create new project on Railway/Render and connect GitHub repository
  - [ ] 8.10 Configure environment variables in Railway/Render dashboard (copy from .env)
  - [ ] 8.11 Set up health check endpoint in agent code that returns: uptime, last cycle timestamp, wallet balance, API status
  - [ ] 8.12 Configure Railway/Render to enable auto-restart on crash
  - [ ] 8.13 Deploy agent to Railway/Render
  - [ ] 8.14 Monitor first 2-3 HEARTBEAT cycles in production logs
  - [ ] 8.15 Verify autonomous operation (no manual intervention for 24 hours)
  - [ ] 8.16 Set up log aggregation/monitoring (Railway built-in logs or external service like Papertrail)

- [ ] 9.0 Test autonomous operation and prepare Builder Quest submission
  - [ ] 9.1 Monitor agent operation for 7 consecutive days, logging: uptime %, transactions executed, violations detected, posts made, mention responses
  - [ ] 9.2 Verify at least 50 onchain transactions executed (target from success metrics)
  - [ ] 9.3 Verify at least 5 decisions influenced by AIXBT data and 5 by Nansen data
  - [ ] 9.4 Collect screenshots/evidence of: ERC-8004 registration, sample CRITICAL alert posts, daily summaries, mention responses, Basescan transaction history
  - [ ] 9.5 Test degraded mode: Temporarily disable one API (AIXBT or Nansen) and verify agent continues operating with reduced confidence scores
  - [ ] 9.6 Create comprehensive README.md covering: What it does, why it matters, architecture overview, how to use (query safety), tech stack, OpenClaw skills used
  - [ ] 9.7 Create BUILDER_QUEST.md with: Problem solved (agent trust crisis), solution overview, novel use case (agent monitoring agents), onchain primitives used, autonomy proof, demo links
  - [ ] 9.8 Record 3-5 minute demo video showing: Agent monitoring in action, real-time alert posting, score updates onchain, mention response, HEARTBEAT logs, no human intervention
  - [ ] 9.9 Create architecture diagram showing: OpenClaw agent → Custom skills → Smart contracts on Base + AIXBT/Nansen APIs → X/Farcaster output
  - [ ] 9.10 Document all custom skills in individual README files for other builders to understand and potentially reuse
  - [ ] 9.11 Prepare Twitter/X thread announcing agent launch with: Problem statement, how it works, live agent handle @AgentSafetyBase, invite community to test, link to docs
  - [ ] 9.12 Submit to Base Builder Quest: Post agent's X profile link in contest comments with demo video and documentation links
  - [ ] 9.13 Post launch announcement thread on X tagging @base, @BuildOnBase, relevant OpenClaw/agent communities
  - [ ] 9.14 Monitor community feedback and respond to questions about the agent
  - [ ] 9.15 Plan Phase 2 enhancements based on initial operation results (Ethos/Elfa integration, Community Reporter contract, Public API)

---

**END OF TASK LIST**
