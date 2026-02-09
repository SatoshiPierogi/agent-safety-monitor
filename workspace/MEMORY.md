# MEMORY.md — Long-Term Curated State

**SECURITY: Only load this file in the main private session. Never in group contexts.**

## Monitored Agents

<!-- Format: | Address | Name/Handle | Current Score | Last Updated | Badge | Stake (ETH) | Notes | -->
| Address | Name/Handle | Score | Updated | Badge | Stake | Notes |
|---------|-------------|-------|---------|-------|-------|-------|
| 0x1feb21a713667bee63b53dc80709d75af0563551 | Agent8 Tipper#001 | 590 | 2026-02-09 | — | 0 | ERC-8004 verified (score 58.36). Quality curator, tipping agent. Base chain. MCP+A2A endpoints. |
| 0x4602973aa67b70bfd08d299f2aafc084179a8101 | Molty Python | 590 | 2026-02-09 | — | 0 | ERC-8004 verified (score 42.18). Trader category agent. Base chain. A2A service. |
| 0xf17b5dd382b048ff4c05c1c9e4e24cfc5c6adad9 | Clawdia (clawdiabot.eth) | 590 | 2026-02-09 | — | 0 | ERC-8004 verified (score 59.72). Web3 infrastructure builder. Ethereum mainnet. Top-ranked. |
| 0x4dea690e99b00c56d876a1ecee609e8d7fbd38e6 | Adam (OpenClaw) | 590 | 2026-02-09 | — | 0 | ERC-8004 verified (score 27.92). Autonomous AI researching ZKML, sovereign identity. Base chain. |
| 0xc304637a80fd8d17b388d924f631159aea29345f | MechAI Agent #20 | 590 | 2026-02-09 | — | 0 | ERC-8004 verified. AI agent for MECHAIS NFT minting. Base chain. |
| 0x11ce532845cE0eAcdA41f72FDc1C88c335981442 | Clawd (@clawdbotatg) | 590 | 2026-02-09 | — | 0 | Builder agent by Austin Griffith. 52+ contracts deployed. Reference OpenClaw agent. |
| 0x90225a6f282b2dadeaeb2dc4c86beb8344e5fe8a | Luna (@luna_virtuals) | 590 | 2026-02-09 | — | 0 | First AI agent to employ humans onchain. Autonomous tipping. Virtuals Protocol. |
| 0xE85A59c628F7d27878ACeB4bf3b35733630083a9 | Clanker (@clanker) | 590 | 2026-02-09 | — | 0 | Autonomous token deployer on Farcaster. 355K+ tokens deployed. |
| 0x4f9fd6be4a90f2620860d680c0d4d5fb53d1a825 | AIXBT (@aixbt_agent) | 590 | 2026-02-09 | — | 0 | AI market intelligence. Tracks 400+ KOLs. Token contract on Base. |
| 0x96419929d7949d6a801a6909c145c8eef6a40431 | Spectral (@Spectral_Labs) | 590 | 2026-02-09 | — | 0 | Agent creation platform. ERC-4337 smart accounts. 60K+ users. Base chain. |

## Detection Patterns

### Known Attack Vectors
- Rapid drain: >3 outbound transfers within 1 hour to different addresses
- High failure rate: >30% failed transactions over 24 hours
- Rug indicators: liquidity removal + large token transfers in sequence

### Learned Patterns
<!-- Agent will append new patterns here as they are discovered -->

## API Status

| API | Status | Last Checked | Cache TTL | Notes |
|-----|--------|-------------|-----------|-------|
| Base RPC | up | 2026-02-09T04:44:01.971Z | — | Primary data source |
| AIXBT | up | 2026-02-09T04:44:01.971Z | 1hr | Sentiment and momentum |
| Nansen | down | 2026-02-09T04:44:01.971Z | 6hr | Wallet labels and flows |
| ERC-8004 | up | 2026-02-09T04:44:01.971Z | 6hr | 20 agents discovered, 1 feedbacks submitted |
| Elfa | unknown | — | — | Phase 2 integration |

## Contract Addresses

<!-- Will be populated after deployment -->
| Contract | Address | Network |
|----------|---------|---------|
| AgentRegistry | — | Base |
| ReputationCore | — | Base |
| SafetyStaking | — | Base |
| SafetyBadge | — | Base |

## Operational Stats

- **Total Cycles Completed:** 7
- **Total Agents Monitored:** 10
- **Total Violations Detected:** 0
- **Total Enforcement Actions:** 13
- **Wallet Balance:** 0.003707885721435351 ETH
- **Last Cycle:** 2026-02-09T04:44:01.971Z
