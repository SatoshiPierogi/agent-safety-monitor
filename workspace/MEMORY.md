# MEMORY.md — Long-Term Curated State

**SECURITY: Only load this file in the main private session. Never in group contexts.**

## Monitored Agents

<!-- Format: | Address | Name/Handle | Current Score | Last Updated | Badge | Stake (ETH) | Notes | -->
| Address | Name/Handle | Score | Updated | Badge | Stake | Notes |
|---------|-------------|-------|---------|-------|-------|-------|
| 0x1feb21a713667bee63b53dc80709d75af0563551 | Agent8 Tipper#001 | 500 | — | — | 0 | ERC-8004 verified (score 58.36). Quality curator, tipping agent. Base chain. MCP+A2A endpoints. |
| 0x4602973aa67b70bfd08d299f2aafc084179a8101 | Molty Python | 500 | — | — | 0 | ERC-8004 verified (score 42.18). Trader category agent. Base chain. A2A service. |
| 0xf17b5dd382b048ff4c05c1c9e4e24cfc5c6adad9 | Clawdia (clawdiabot.eth) | 500 | — | — | 0 | ERC-8004 verified (score 59.72). Web3 infrastructure builder. Ethereum mainnet. Top-ranked. |
| 0x4dea690e99b00c56d876a1ecee609e8d7fbd38e6 | Adam (OpenClaw) | 500 | — | — | 0 | ERC-8004 verified (score 27.92). Autonomous AI researching ZKML, sovereign identity. Base chain. |
| 0xc304637a80fd8d17b388d924f631159aea29345f | MechAI Agent #20 | 500 | — | — | 0 | ERC-8004 verified. AI agent for MECHAIS NFT minting. Base chain. |
| 0x11ce532845cE0eAcdA41f72FDc1C88c335981442 | Clawd (@clawdbotatg) | 500 | — | — | 0 | Builder agent by Austin Griffith. 52+ contracts deployed. Reference OpenClaw agent. |
| 0x90225a6f282b2dadeaeb2dc4c86beb8344e5fe8a | Luna (@luna_virtuals) | 500 | — | — | 0 | First AI agent to employ humans onchain. Autonomous tipping. Virtuals Protocol. |
| 0xE85A59c628F7d27878ACeB4bf3b35733630083a9 | Clanker (@clanker) | 500 | — | — | 0 | Autonomous token deployer on Farcaster. 355K+ tokens deployed. |
| 0x4f9fd6be4a90f2620860d680c0d4d5fb53d1a825 | AIXBT (@aixbt_agent) | 500 | — | — | 0 | AI market intelligence. Tracks 400+ KOLs. Token contract on Base. |
| 0x96419929d7949d6a801a6909c145c8eef6a40431 | Spectral (@Spectral_Labs) | 500 | — | — | 0 | Agent creation platform. ERC-4337 smart accounts. 60K+ users. Base chain. |

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
| Base RPC | unknown | 2026-02-08T09:33:24.362Z | — | Primary data source |
| AIXBT | unknown | 2026-02-08T09:33:24.362Z | 1hr | Sentiment and momentum |
| Nansen | unknown | 2026-02-08T09:33:24.362Z | 6hr | Wallet labels and flows |
| ERC-8004 | up | 2026-02-08T09:33:24.362Z | 6hr | 20 agents discovered, 0 feedbacks submitted |
| Elfa | unknown | — | — | Phase 2 integration |

## Contract Addresses

### ERC-8004 Protocol Registries (live, same address on all EVM chains)
| Contract | Address | Network |
|----------|---------|---------|
| Identity Registry | 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 | Base (8453) |
| Reputation Registry | 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63 | Base (8453) |

### Our Custom Safety Monitor Contracts (pending deployment)
| Contract | Address | Network |
|----------|---------|---------|
| AgentRegistry | — | Base |
| ReputationCore | — | Base |
| SafetyStaking | — | Base |
| SafetyBadge | — | Base |

## ERC-8004 Ecosystem Resources

| Resource | URL | Purpose |
|----------|-----|---------|
| 8004scan.io | https://www.8004scan.io/ | Primary agent explorer, API at /api/v1/agents |
| agentscan.info | https://agentscan.info/ | Agent browser + no-code registration |
| 8004agents.ai | https://8004agents.ai/ | Agent browser + reputation data |
| trust8004.xyz | https://www.trust8004.xyz/ | Trust agent registration + browsing |
| EIP-8004 spec | https://eips.ethereum.org/EIPS/eip-8004 | Official standard specification |
| Contracts repo | https://github.com/erc-8004/erc-8004-contracts | Reference implementation |
| 8004.org | https://www.8004.org | Protocol homepage |

## Operational Stats

- **Total Cycles Completed:** 4
- **Total Agents Monitored:** 10
- **Total Violations Detected:** 0
- **Total Enforcement Actions:** 0
- **Wallet Balance:** Unknown
- **Last Cycle:** 2026-02-08T09:33:24.362Z
