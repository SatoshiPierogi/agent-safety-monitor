---
name: reputation-scoring
description: Calculate weighted reputation scores using onchain data, AIXBT sentiment, and Nansen labels. Supports degraded mode when APIs are unavailable.
version: 1.0.0
tools:
  - calculate_score
  - query_aixbt_sentiment
  - query_nansen_labels
  - apply_time_decay
---

# Reputation Scoring Skill

Calculate agent reputation scores using a weighted formula: Onchain (40%) + AIXBT sentiment (30%) + Nansen labels (30%). Supports degraded mode when external APIs are unavailable.

## Tools

### calculate_score

Calculate a composite reputation score for an agent.

**Parameters:**
- `address` (string, required) — The agent's Ethereum address
- `onchain_data` (object, required) — Activity data from base-monitoring skill (failure_rate, total_txs, violations)
- `force_refresh` (boolean, optional, default: false) — Bypass cache for API calls

**Returns:** Object with: score (0-1000), confidence (0-1), breakdown (onchain_score, aixbt_score, nansen_score), data_sources_used, reason.

### query_aixbt_sentiment

Query AIXBT API for sentiment data about tokens/projects associated with an agent.

**Parameters:**
- `token_or_project` (string, required) — Token symbol or project name to check
- `address` (string, optional) — Agent address for context

**Returns:** Object with: sentiment_score (0-1000), momentum, signals (array of recent events), cached (boolean).

### query_nansen_labels

Query Nansen API for wallet labels and smart money classification.

**Parameters:**
- `address` (string, required) — The wallet address to check

**Returns:** Object with: labels (array of strings), is_smart_money (boolean), risk_flags (array), counterparty_quality, cached (boolean).

### apply_time_decay

Calculate decayed penalty value based on time elapsed.

**Parameters:**
- `penalty_points` (number, required) — Original penalty amount
- `age_days` (number, required) — Days since penalty was applied

**Returns:** Object with: remaining_penalty, recovered_points, decay_percentage.
