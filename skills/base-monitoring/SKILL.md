---
name: base-monitoring
description: Monitor AI agent transactions on Base blockchain, detect violations, and analyze activity patterns.
version: 1.0.0
tools:
  - monitor_agent_transactions
  - detect_violations
  - get_agent_activity
---

# Base Monitoring Skill

Monitor AI agent transactions on the Base L2 blockchain using RPC calls. Fetches transaction history, analyzes patterns, and detects violations.

## Tools

### monitor_agent_transactions

Fetch recent transactions for an agent address on Base.

**Parameters:**
- `address` (string, required) — The agent's Ethereum address
- `hours` (number, optional, default: 6) — How many hours of history to scan

**Returns:** Array of transaction summaries with: hash, from, to, value, status (success/fail), timestamp, method signature.

### detect_violations

Analyze a set of transactions against detection rules to find violations.

**Parameters:**
- `address` (string, required) — The agent's address
- `transactions` (array, required) — Transaction array from monitor_agent_transactions

**Returns:** Array of detected violations with: type, severity (CRITICAL/HIGH/MEDIUM/LOW), description, evidence (tx hashes), recommended_action.

### get_agent_activity

Get a summary of an agent's onchain activity including success rate, volume, and patterns.

**Parameters:**
- `address` (string, required) — The agent's address
- `hours` (number, optional, default: 24) — How many hours of history

**Returns:** Object with: total_txs, successful_txs, failed_txs, failure_rate, total_value_eth, unique_counterparties, most_active_hour, is_active.
