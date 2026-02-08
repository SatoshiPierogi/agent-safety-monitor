/**
 * Contract ABIs for the Agent Safety Monitor smart contracts.
 * Only includes the functions we call from the enforcement skill.
 *
 * ERC-8004 Registry ABIs are in src/erc8004-integration.ts — those are
 * the live protocol contracts, while these are our custom contracts.
 */

export const REPUTATION_CORE_ABI = [
  "function updateScore(address agent, uint16 newScore, string reason) external",
  "function getScore(address agent) external view returns (uint16 effectiveScore, uint16 rawScore, uint16 activePenalty)",
  "function isScored(address agent) external view returns (bool)",
  "function applyDecay(address agent) external",
  "event ScoreUpdated(address indexed agent, uint16 oldScore, uint16 newScore, string reason)",
  "event PenaltyApplied(address indexed agent, uint16 penaltyPoints, string reason)",
  "event PenaltyDecayed(address indexed agent, uint16 decayedPoints, uint16 remaining)",
];

export const SAFETY_STAKING_ABI = [
  "function slash(address agent, uint256 bps, string reason) external",
  "function getStakeInfo(address agent) external view returns (uint256 amount, uint256 stakedAt, bool unstakePending, uint256 unstakeAvailableAt)",
  "function totalStaked() external view returns (uint256)",
  "function totalSlashed() external view returns (uint256)",
  "event Slashed(address indexed agent, uint256 amount, string reason)",
];

export const SAFETY_BADGE_ABI = [
  "function mintBadge(address agent, uint8 tier, uint16 score) external returns (uint256 tokenId)",
  "function revokeBadge(address agent, string reason) external",
  "function upgradeBadge(address agent, uint8 newTier, uint16 newScore) external",
  "function getBadge(address agent) external view returns (uint256 tokenId, tuple(address agent, uint8 tier, uint256 mintedAt, uint16 scoreAtMint) info)",
  "function totalBadges() external view returns (uint256)",
  "event BadgeMinted(uint256 indexed tokenId, address indexed agent, uint8 tier, uint16 score)",
  "event BadgeRevoked(uint256 indexed tokenId, address indexed agent, string reason)",
  "event BadgeUpgraded(uint256 indexed tokenId, uint8 oldTier, uint8 newTier)",
];

export const AGENT_REGISTRY_ABI = [
  "function registerAgent(address agentAddress, string metadataURI) external returns (uint256 tokenId)",
  "function getAgentInfo(uint256 tokenId) external view returns (tuple(address agentAddress, string metadataURI, uint256 registeredAt, bool active))",
  "function getAgentByAddress(address agentAddress) external view returns (uint256 tokenId, tuple(address agentAddress, string metadataURI, uint256 registeredAt, bool active) info)",
  "function totalAgents() external view returns (uint256)",
  "event AgentRegistered(uint256 indexed tokenId, address indexed agentAddress, string metadataURI)",
];
