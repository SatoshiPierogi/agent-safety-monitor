# HEARTBEAT.md — 6-Hour Monitoring Cycle

Execute these phases in order every 6 hours. Log results to `logs/daily/YYYY-MM-DD.md` after each cycle.

## Phase 1: Scan
- For each agent in MEMORY.md "Monitored Agents" table:
  - Call `monitor_agent_transactions(address, 6)` to fetch last 6 hours of transactions
  - Call `detect_violations(address, transactions)` to check against detection rules
  - Call `get_agent_activity(address, transactions, 6)` to get activity summary
- Record: total txs, success/failure rates, flagged patterns per agent
- If scan fails for an agent: log error, continue to next agent

## Phase 2: Analysis
- For each scanned agent:
  - Call `calculate_score(address, onchain_data)` — weighted formula: onchain 40% + AIXBT 30% + Nansen 30%
  - Note data sources used and confidence level
  - If degraded mode activated (API down): log which source(s) unavailable
- For agents with existing penalties older than 1 day:
  - Call `apply_time_decay(penalty_points, age_days)` to calculate recovered score
- Record API availability status

## Phase 3: Decision
- Compare new scores against previous scores in MEMORY.md
- **Flag** agents with: score change > 50 points OR any CRITICAL/HIGH violation
- For flagged agents: **verify 2/3 data source agreement** before proceeding
  - Sources: onchain (always available), AIXBT, Nansen
  - Need at least 2 sources agreeing to enforce
- If only 1 source flags an issue: mark as WATCH, do not enforce
- Determine actions: update_score, slash_stake, mint_badge, revoke_badge, or watch

## Phase 4: Execution
- **Score updates**: Call `update_reputation_onchain(address, score, reason)` for each flagged agent
- **Slashing**: For CRITICAL violations with staked agents: call `slash_agent_stake(address, 5000, reason)` (50%)
- **Slashing**: For HIGH violations with staked agents: call `slash_agent_stake(address, 2000, reason)` (20%)
- **Badge minting**: For agents meeting thresholds: call `mint_safety_badge(address, tier, score)`
  - Bronze: 30d registered, score > 700, stake >= 0.01 ETH
  - Silver: 90d registered, score > 850, stake >= 0.05 ETH
  - Gold: 180d registered, score > 950, stake >= 0.1 ETH
- **Badge revocation**: For agents falling below tier threshold: call `revoke_safety_badge(address, reason)`
- All contract calls use retry logic (3 attempts, exponential backoff)

## Phase 5: Communication
- For CRITICAL/HIGH actions: post immediate alert via `criticalAlert()` to X and Farcaster
- Compile 6-hour checkpoint summary: agents scanned, violations, actions taken
- If 8am UTC cycle: generate and post daily leaderboard via `dailySummary()`
- Check X mentions (hourly) and respond to safety queries via `mentionResponse()`

## Phase 6: Memory
- Update MEMORY.md: new scores, badge status, violation history, notes
- Append cycle summary to `logs/daily/YYYY-MM-DD.md`
- Update API availability status table
- Increment operational stats (cycles, violations, actions)
- If wallet balance < 0.1 ETH: flag in memory for next cycle alert
