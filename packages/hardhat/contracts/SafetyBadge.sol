// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/// @title SafetyBadge — Dynamic ERC-721 NFT badges (Bronze/Silver/Gold)
/// @notice Tiered safety badges with onchain SVG. Minted when agents meet thresholds.
contract SafetyBadge is ERC721, AccessControl {
    using Strings for uint256;
    using Strings for uint16;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER");
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;

    enum Tier { None, Bronze, Silver, Gold }

    struct BadgeInfo {
        address agent;
        Tier tier;
        uint256 mintedAt;
        uint16 scoreAtMint;
    }

    uint256 private _nextTokenId;

    /// @notice tokenId => BadgeInfo
    mapping(uint256 => BadgeInfo) public badges;

    /// @notice agentAddress => tokenId (0 = no badge)
    mapping(address => uint256) public agentBadge;

    // Tier thresholds
    uint256 public constant BRONZE_MIN_DAYS = 30;
    uint16 public constant BRONZE_MIN_SCORE = 700;
    uint256 public constant BRONZE_MIN_STAKE = 0.01 ether;

    uint256 public constant SILVER_MIN_DAYS = 90;
    uint16 public constant SILVER_MIN_SCORE = 850;
    uint256 public constant SILVER_MIN_STAKE = 0.05 ether;

    uint256 public constant GOLD_MIN_DAYS = 180;
    uint16 public constant GOLD_MIN_SCORE = 950;
    uint256 public constant GOLD_MIN_STAKE = 0.1 ether;

    event BadgeMinted(uint256 indexed tokenId, address indexed agent, Tier tier, uint16 score);
    event BadgeRevoked(uint256 indexed tokenId, address indexed agent, string reason);
    event BadgeUpgraded(uint256 indexed tokenId, Tier oldTier, Tier newTier);

    error BadgeAlreadyExists(address agent);
    error NoBadgeFound(address agent);
    error InvalidTier();

    constructor(address admin, address minter) ERC721("Agent Safety Badge", "ASB") {
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
        _nextTokenId = 1;
    }

    /// @notice Mint a badge for an agent. Only MINTER role.
    /// @param agent The agent receiving the badge
    /// @param tier The badge tier (Bronze=1, Silver=2, Gold=3)
    /// @param score The agent's score at time of minting
    function mintBadge(address agent, Tier tier, uint16 score) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        if (tier == Tier.None) revert InvalidTier();
        if (agentBadge[agent] != 0) revert BadgeAlreadyExists(agent);

        tokenId = _nextTokenId++;
        _mint(agent, tokenId);

        badges[tokenId] = BadgeInfo({
            agent: agent,
            tier: tier,
            mintedAt: block.timestamp,
            scoreAtMint: score
        });
        agentBadge[agent] = tokenId;

        emit BadgeMinted(tokenId, agent, tier, score);
    }

    /// @notice Revoke (burn) a badge. Only MINTER role.
    function revokeBadge(address agent, string calldata reason) external onlyRole(MINTER_ROLE) {
        uint256 tokenId = agentBadge[agent];
        if (tokenId == 0) revert NoBadgeFound(agent);

        delete agentBadge[agent];
        _burn(tokenId);

        emit BadgeRevoked(tokenId, agent, reason);
    }

    /// @notice Upgrade a badge to a higher tier. Only MINTER role.
    function upgradeBadge(address agent, Tier newTier, uint16 newScore) external onlyRole(MINTER_ROLE) {
        uint256 tokenId = agentBadge[agent];
        if (tokenId == 0) revert NoBadgeFound(agent);
        if (newTier == Tier.None) revert InvalidTier();

        Tier oldTier = badges[tokenId].tier;
        badges[tokenId].tier = newTier;
        badges[tokenId].scoreAtMint = newScore;

        emit BadgeUpgraded(tokenId, oldTier, newTier);
    }

    /// @notice Dynamic onchain SVG tokenURI
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        BadgeInfo storage badge = badges[tokenId];
        if (badge.mintedAt == 0) revert NoBadgeFound(badge.agent);

        string memory tierName = _tierName(badge.tier);
        string memory tierColor = _tierColor(badge.tier);

        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="350" height="350" viewBox="0 0 350 350">',
            '<rect width="350" height="350" rx="20" fill="#1a1a2e"/>',
            '<circle cx="175" cy="120" r="60" fill="none" stroke="', tierColor, '" stroke-width="4"/>',
            '<text x="175" y="128" text-anchor="middle" fill="', tierColor, '" font-size="36" font-family="monospace">',
            _tierEmoji(badge.tier),
            '</text>',
            '<text x="175" y="210" text-anchor="middle" fill="#ffffff" font-size="22" font-family="monospace">',
            tierName, ' Badge</text>',
            '<text x="175" y="245" text-anchor="middle" fill="#888888" font-size="14" font-family="monospace">Score: ',
            badge.scoreAtMint.toString(),
            '/1000</text>',
            '<text x="175" y="275" text-anchor="middle" fill="#888888" font-size="12" font-family="monospace">Agent Safety Monitor</text>',
            '<text x="175" y="320" text-anchor="middle" fill="#444444" font-size="10" font-family="monospace">#',
            tokenId.toString(),
            '</text></svg>'
        ));

        string memory json = string(abi.encodePacked(
            '{"name":"Safety Badge #', tokenId.toString(),
            ' - ', tierName,
            '","description":"Agent Safety Monitor ', tierName, ' Badge. Score: ', badge.scoreAtMint.toString(),
            '/1000","image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)),
            '","attributes":[{"trait_type":"Tier","value":"', tierName,
            '"},{"trait_type":"Score","value":', badge.scoreAtMint.toString(),
            '},{"trait_type":"Token ID","value":', tokenId.toString(), '}]}'
        ));

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    /// @notice Get badge info for an agent
    function getBadge(address agent) external view returns (uint256 tokenId, BadgeInfo memory info) {
        tokenId = agentBadge[agent];
        if (tokenId == 0) revert NoBadgeFound(agent);
        info = badges[tokenId];
    }

    /// @notice Total badges minted
    function totalBadges() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    function _tierName(Tier tier) internal pure returns (string memory) {
        if (tier == Tier.Bronze) return "Bronze";
        if (tier == Tier.Silver) return "Silver";
        if (tier == Tier.Gold) return "Gold";
        return "None";
    }

    function _tierColor(Tier tier) internal pure returns (string memory) {
        if (tier == Tier.Bronze) return "#cd7f32";
        if (tier == Tier.Silver) return "#c0c0c0";
        if (tier == Tier.Gold) return "#ffd700";
        return "#888888";
    }

    function _tierEmoji(Tier tier) internal pure returns (string memory) {
        if (tier == Tier.Bronze) return unicode"🥉";
        if (tier == Tier.Silver) return unicode"🥈";
        if (tier == Tier.Gold) return unicode"🥇";
        return "?";
    }

    // Required overrides
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
