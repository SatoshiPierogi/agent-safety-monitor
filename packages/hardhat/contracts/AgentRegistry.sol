// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title AgentRegistry — ERC-721 agent identity registry for the Safety Monitor
/// @notice Registers AI agents with onchain metadata. Each agent gets a unique NFT ID.
contract AgentRegistry is ERC721, AccessControl {
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;

    uint256 private _nextTokenId;

    struct AgentInfo {
        address agentAddress;
        string metadataURI;
        uint256 registeredAt;
        bool active;
    }

    /// @notice tokenId => AgentInfo
    mapping(uint256 => AgentInfo) public agents;

    /// @notice agentAddress => tokenId (0 means not registered)
    mapping(address => uint256) public agentToToken;

    event AgentRegistered(uint256 indexed tokenId, address indexed agentAddress, string metadataURI);
    event AgentUpdated(uint256 indexed tokenId, string newMetadataURI);
    event AgentDeactivated(uint256 indexed tokenId);
    event AgentReactivated(uint256 indexed tokenId);

    error AgentAlreadyRegistered(address agentAddress);
    error AgentNotFound(uint256 tokenId);
    error AgentNotActive(uint256 tokenId);

    constructor(address admin) ERC721("Agent Safety Registry", "ASR") {
        _grantRole(ADMIN_ROLE, admin);
        _nextTokenId = 1; // Start at 1; 0 means "not registered"
    }

    /// @notice Register a new agent. Anyone can register an address.
    /// @param agentAddress The address of the agent being registered
    /// @param metadataURI URI pointing to agent metadata (IPFS, HTTP, or data URI)
    /// @return tokenId The assigned NFT token ID
    function registerAgent(address agentAddress, string calldata metadataURI) external returns (uint256 tokenId) {
        if (agentToToken[agentAddress] != 0) revert AgentAlreadyRegistered(agentAddress);

        tokenId = _nextTokenId++;
        _mint(msg.sender, tokenId);

        agents[tokenId] = AgentInfo({
            agentAddress: agentAddress,
            metadataURI: metadataURI,
            registeredAt: block.timestamp,
            active: true
        });
        agentToToken[agentAddress] = tokenId;

        emit AgentRegistered(tokenId, agentAddress, metadataURI);
    }

    /// @notice Update agent metadata. Only the NFT owner can update.
    function updateMetadata(uint256 tokenId, string calldata newMetadataURI) external {
        if (ownerOf(tokenId) != msg.sender) revert AgentNotFound(tokenId);
        agents[tokenId].metadataURI = newMetadataURI;
        emit AgentUpdated(tokenId, newMetadataURI);
    }

    /// @notice Deactivate an agent. Only admin or NFT owner.
    function deactivateAgent(uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender && !hasRole(ADMIN_ROLE, msg.sender)) {
            revert AgentNotFound(tokenId);
        }
        agents[tokenId].active = false;
        emit AgentDeactivated(tokenId);
    }

    /// @notice Reactivate an agent. Only admin or NFT owner.
    function reactivateAgent(uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender && !hasRole(ADMIN_ROLE, msg.sender)) {
            revert AgentNotFound(tokenId);
        }
        agents[tokenId].active = true;
        emit AgentReactivated(tokenId);
    }

    /// @notice Get full agent info by tokenId
    function getAgentInfo(uint256 tokenId) external view returns (AgentInfo memory) {
        if (agents[tokenId].registeredAt == 0) revert AgentNotFound(tokenId);
        return agents[tokenId];
    }

    /// @notice Get agent info by address
    function getAgentByAddress(address agentAddress) external view returns (uint256 tokenId, AgentInfo memory info) {
        tokenId = agentToToken[agentAddress];
        if (tokenId == 0) revert AgentNotFound(0);
        info = agents[tokenId];
    }

    /// @notice Total registered agents
    function totalAgents() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    /// @notice Override tokenURI to return agent metadata
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (agents[tokenId].registeredAt == 0) revert AgentNotFound(tokenId);
        return agents[tokenId].metadataURI;
    }

    // Required overrides for AccessControl + ERC721
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
