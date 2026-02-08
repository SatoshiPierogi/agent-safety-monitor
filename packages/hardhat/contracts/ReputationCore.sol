// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ReputationCore — Onchain reputation scores with time-decay
/// @notice Stores uint16 scores (0-1000) for registered agents. Penalties decay over time.
contract ReputationCore is AccessControl {
    bytes32 public constant SCORE_UPDATER_ROLE = keccak256("SCORE_UPDATER");
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;

    uint16 public constant MAX_SCORE = 1000;
    uint16 public constant DEFAULT_SCORE = 500;
    uint256 public constant DECAY_PERIOD = 90 days;

    struct ScoreRecord {
        uint16 score;
        uint16 penaltyPoints;     // Active penalty (decays over time)
        uint256 lastUpdated;
        uint256 penaltyTimestamp;  // When the latest penalty was applied
        string lastReason;
    }

    /// @notice agentAddress => ScoreRecord
    mapping(address => ScoreRecord) public scores;

    event ScoreUpdated(address indexed agent, uint16 oldScore, uint16 newScore, string reason);
    event PenaltyApplied(address indexed agent, uint16 penaltyPoints, string reason);
    event PenaltyDecayed(address indexed agent, uint16 decayedPoints, uint16 remaining);

    error ScoreOutOfRange(uint16 score);
    error AgentNotScored(address agent);

    constructor(address admin, address scoreUpdater) {
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(SCORE_UPDATER_ROLE, scoreUpdater);
    }

    /// @notice Update an agent's score. Only SCORE_UPDATER role.
    /// @param agent The agent address
    /// @param newScore The new score (0-1000)
    /// @param reason Human-readable reason for the update
    function updateScore(address agent, uint16 newScore, string calldata reason) external onlyRole(SCORE_UPDATER_ROLE) {
        if (newScore > MAX_SCORE) revert ScoreOutOfRange(newScore);

        uint16 oldScore = scores[agent].score;
        if (scores[agent].lastUpdated == 0) {
            oldScore = DEFAULT_SCORE;
        }

        scores[agent].score = newScore;
        scores[agent].lastUpdated = block.timestamp;
        scores[agent].lastReason = reason;

        // Track penalty if score decreased
        if (newScore < oldScore) {
            uint16 penalty = oldScore - newScore;
            scores[agent].penaltyPoints += penalty;
            scores[agent].penaltyTimestamp = block.timestamp;
            emit PenaltyApplied(agent, penalty, reason);
        }

        emit ScoreUpdated(agent, oldScore, newScore, reason);
    }

    /// @notice Get an agent's current score with time-decay applied
    /// @param agent The agent address
    /// @return effectiveScore The score after applying penalty decay
    /// @return rawScore The stored score without decay adjustments
    /// @return activePenalty Remaining penalty points after decay
    function getScore(address agent) external view returns (uint16 effectiveScore, uint16 rawScore, uint16 activePenalty) {
        ScoreRecord storage record = scores[agent];

        if (record.lastUpdated == 0) {
            return (DEFAULT_SCORE, DEFAULT_SCORE, 0);
        }

        rawScore = record.score;

        // Calculate decayed penalty
        activePenalty = _calculateDecayedPenalty(record);

        // Effective score = raw score + recovered penalty points
        uint16 recovered = record.penaltyPoints - activePenalty;
        effectiveScore = rawScore + recovered;
        if (effectiveScore > MAX_SCORE) {
            effectiveScore = MAX_SCORE;
        }
    }

    /// @notice Apply time-decay to an agent's penalties and update stored score.
    ///         Anyone can call this (incentivized by agents wanting their score to recover).
    function applyDecay(address agent) external {
        ScoreRecord storage record = scores[agent];
        if (record.lastUpdated == 0) revert AgentNotScored(agent);

        uint16 decayed = record.penaltyPoints - _calculateDecayedPenalty(record);
        if (decayed == 0) return;

        record.score += decayed;
        if (record.score > MAX_SCORE) record.score = MAX_SCORE;
        record.penaltyPoints -= decayed;
        record.lastUpdated = block.timestamp;

        emit PenaltyDecayed(agent, decayed, record.penaltyPoints);
    }

    /// @notice Check if an agent has ever been scored
    function isScored(address agent) external view returns (bool) {
        return scores[agent].lastUpdated != 0;
    }

    /// @dev Calculate remaining penalty after time-decay (1/90th per day)
    function _calculateDecayedPenalty(ScoreRecord storage record) internal view returns (uint16) {
        if (record.penaltyPoints == 0 || record.penaltyTimestamp == 0) return 0;

        uint256 elapsed = block.timestamp - record.penaltyTimestamp;
        if (elapsed >= DECAY_PERIOD) return 0;

        // Linear decay: remaining = penalty * (DECAY_PERIOD - elapsed) / DECAY_PERIOD
        uint256 remaining = uint256(record.penaltyPoints) * (DECAY_PERIOD - elapsed) / DECAY_PERIOD;
        return uint16(remaining);
    }
}
