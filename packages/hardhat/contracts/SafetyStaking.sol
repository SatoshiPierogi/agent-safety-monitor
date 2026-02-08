// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SafetyStaking — ETH staking with slashing and 7-day unstake timelock
/// @notice Agents stake ETH as a safety deposit. Slashed funds go to treasury.
contract SafetyStaking is AccessControl, ReentrancyGuard {
    bytes32 public constant SLASHER_ROLE = keccak256("SLASHER");
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;

    uint256 public constant MIN_STAKE = 0.01 ether;
    uint256 public constant UNSTAKE_DELAY = 7 days;
    uint256 public constant MAX_SLASH_BPS = 5000; // Max 50% slash per action

    address public treasury;

    struct StakeInfo {
        uint256 amount;
        uint256 stakedAt;
        uint256 unstakeRequestedAt; // 0 if no pending unstake
        uint256 unstakeAmount;
    }

    /// @notice agentAddress => StakeInfo
    mapping(address => StakeInfo) public stakes;

    /// @notice Total ETH staked across all agents
    uint256 public totalStaked;

    /// @notice Total ETH slashed historically
    uint256 public totalSlashed;

    event Staked(address indexed agent, uint256 amount, uint256 totalStake);
    event UnstakeRequested(address indexed agent, uint256 amount, uint256 availableAt);
    event Unstaked(address indexed agent, uint256 amount);
    event Slashed(address indexed agent, uint256 amount, string reason);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    error StakeBelowMinimum(uint256 sent, uint256 minimum);
    error NoStake(address agent);
    error UnstakeNotRequested();
    error UnstakeTimelockActive(uint256 availableAt);
    error UnstakeAmountExceedsStake(uint256 requested, uint256 available);
    error SlashExceedsMax(uint256 bps, uint256 maxBps);
    error TransferFailed();
    error ZeroAddress();

    constructor(address admin, address slasher, address _treasury) {
        if (_treasury == address(0)) revert ZeroAddress();
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(SLASHER_ROLE, slasher);
        treasury = _treasury;
    }

    /// @notice Stake ETH for an agent. The agent is msg.sender.
    function stake() external payable nonReentrant {
        if (msg.value < MIN_STAKE && stakes[msg.sender].amount == 0) {
            revert StakeBelowMinimum(msg.value, MIN_STAKE);
        }

        stakes[msg.sender].amount += msg.value;
        if (stakes[msg.sender].stakedAt == 0) {
            stakes[msg.sender].stakedAt = block.timestamp;
        }
        totalStaked += msg.value;

        // Cancel any pending unstake request when adding more stake
        if (stakes[msg.sender].unstakeRequestedAt != 0) {
            stakes[msg.sender].unstakeRequestedAt = 0;
            stakes[msg.sender].unstakeAmount = 0;
        }

        emit Staked(msg.sender, msg.value, stakes[msg.sender].amount);
    }

    /// @notice Request to unstake. Starts the 7-day timelock.
    /// @param amount Amount to unstake (must be <= current stake)
    function requestUnstake(uint256 amount) external {
        StakeInfo storage info = stakes[msg.sender];
        if (info.amount == 0) revert NoStake(msg.sender);
        if (amount > info.amount) revert UnstakeAmountExceedsStake(amount, info.amount);

        info.unstakeRequestedAt = block.timestamp;
        info.unstakeAmount = amount;

        emit UnstakeRequested(msg.sender, amount, block.timestamp + UNSTAKE_DELAY);
    }

    /// @notice Complete unstake after timelock expires.
    function unstake() external nonReentrant {
        StakeInfo storage info = stakes[msg.sender];
        if (info.unstakeRequestedAt == 0) revert UnstakeNotRequested();
        if (block.timestamp < info.unstakeRequestedAt + UNSTAKE_DELAY) {
            revert UnstakeTimelockActive(info.unstakeRequestedAt + UNSTAKE_DELAY);
        }

        uint256 amount = info.unstakeAmount;
        if (amount > info.amount) {
            amount = info.amount; // In case partial slash occurred during timelock
        }

        // Effects before interaction
        info.amount -= amount;
        info.unstakeRequestedAt = 0;
        info.unstakeAmount = 0;
        totalStaked -= amount;

        if (info.amount == 0) {
            info.stakedAt = 0;
        }

        // Interaction
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Unstaked(msg.sender, amount);
    }

    /// @notice Slash an agent's stake. Only SLASHER role.
    /// @param agent The agent to slash
    /// @param bps Basis points to slash (500 = 5%, max 5000 = 50%)
    /// @param reason Human-readable reason
    function slash(address agent, uint256 bps, string calldata reason) external onlyRole(SLASHER_ROLE) nonReentrant {
        if (bps > MAX_SLASH_BPS) revert SlashExceedsMax(bps, MAX_SLASH_BPS);
        StakeInfo storage info = stakes[agent];
        if (info.amount == 0) revert NoStake(agent);

        uint256 slashAmount = (info.amount * bps) / 10000;
        if (slashAmount == 0) return;

        // Effects
        info.amount -= slashAmount;
        totalStaked -= slashAmount;
        totalSlashed += slashAmount;

        // Reduce pending unstake if it now exceeds remaining stake
        if (info.unstakeAmount > info.amount) {
            info.unstakeAmount = info.amount;
        }

        // Send slashed funds to treasury
        (bool success, ) = treasury.call{value: slashAmount}("");
        if (!success) revert TransferFailed();

        emit Slashed(agent, slashAmount, reason);
    }

    /// @notice Get stake info for an agent
    function getStakeInfo(address agent) external view returns (
        uint256 amount,
        uint256 stakedAt,
        bool unstakePending,
        uint256 unstakeAvailableAt
    ) {
        StakeInfo storage info = stakes[agent];
        amount = info.amount;
        stakedAt = info.stakedAt;
        unstakePending = info.unstakeRequestedAt != 0;
        unstakeAvailableAt = info.unstakeRequestedAt != 0
            ? info.unstakeRequestedAt + UNSTAKE_DELAY
            : 0;
    }

    /// @notice Update treasury address. Only admin.
    function setTreasury(address newTreasury) external onlyRole(ADMIN_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    /// @notice Allow contract to receive ETH (for staking)
    receive() external payable {}
}
