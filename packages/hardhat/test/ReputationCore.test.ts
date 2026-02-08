import { expect } from "chai";
import { ethers } from "hardhat";
import { ReputationCore } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ReputationCore", function () {
  let reputation: ReputationCore;
  let admin: SignerWithAddress;
  let updater: SignerWithAddress;
  let agent1: SignerWithAddress;
  let nonUpdater: SignerWithAddress;

  beforeEach(async () => {
    [admin, updater, agent1, nonUpdater] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReputationCore");
    reputation = await Factory.deploy(admin.address, updater.address);
    await reputation.waitForDeployment();
  });

  describe("Score updates", () => {
    it("should update score from default", async () => {
      await expect(reputation.connect(updater).updateScore(agent1.address, 800, "Good behavior"))
        .to.emit(reputation, "ScoreUpdated")
        .withArgs(agent1.address, 500, 800, "Good behavior");
    });

    it("should reject scores above MAX_SCORE", async () => {
      await expect(reputation.connect(updater).updateScore(agent1.address, 1001, "too high"))
        .to.be.revertedWithCustomError(reputation, "ScoreOutOfRange");
    });

    it("should reject non-updater", async () => {
      await expect(reputation.connect(nonUpdater).updateScore(agent1.address, 800, "hack"))
        .to.be.reverted;
    });

    it("should track penalty on score decrease", async () => {
      await reputation.connect(updater).updateScore(agent1.address, 800, "up");
      await expect(reputation.connect(updater).updateScore(agent1.address, 600, "violation"))
        .to.emit(reputation, "PenaltyApplied")
        .withArgs(agent1.address, 200, "violation");
    });
  });

  describe("Score queries", () => {
    it("should return default score for unscored agent", async () => {
      const [effective, raw, penalty] = await reputation.getScore(agent1.address);
      expect(effective).to.equal(500);
      expect(raw).to.equal(500);
      expect(penalty).to.equal(0);
    });

    it("should return updated score", async () => {
      await reputation.connect(updater).updateScore(agent1.address, 750, "ok");
      const [effective, raw] = await reputation.getScore(agent1.address);
      expect(raw).to.equal(750);
      expect(effective).to.equal(750);
    });

    it("should report isScored correctly", async () => {
      expect(await reputation.isScored(agent1.address)).to.be.false;
      await reputation.connect(updater).updateScore(agent1.address, 500, "init");
      expect(await reputation.isScored(agent1.address)).to.be.true;
    });
  });

  describe("Time decay", () => {
    it("should decay penalty over 90 days", async () => {
      // Start at 800, drop to 600 (200 penalty)
      await reputation.connect(updater).updateScore(agent1.address, 800, "up");
      await reputation.connect(updater).updateScore(agent1.address, 600, "violation");

      // Fast forward 45 days (half decay period)
      await time.increase(45 * 24 * 60 * 60);

      const [effective, raw, penalty] = await reputation.getScore(agent1.address);
      expect(raw).to.equal(600);
      // Penalty should be roughly half (100 of 200)
      expect(penalty).to.be.closeTo(100, 5);
      // Effective = 600 + ~100 recovered = ~700
      expect(effective).to.be.closeTo(700, 5);
    });

    it("should fully decay penalty after 90 days", async () => {
      await reputation.connect(updater).updateScore(agent1.address, 800, "up");
      await reputation.connect(updater).updateScore(agent1.address, 600, "down");

      await time.increase(90 * 24 * 60 * 60);

      const [effective, , penalty] = await reputation.getScore(agent1.address);
      expect(penalty).to.equal(0);
      expect(effective).to.equal(800); // 600 + 200 recovered
    });

    it("should apply decay onchain", async () => {
      await reputation.connect(updater).updateScore(agent1.address, 800, "up");
      await reputation.connect(updater).updateScore(agent1.address, 600, "down");

      await time.increase(90 * 24 * 60 * 60);

      await expect(reputation.applyDecay(agent1.address))
        .to.emit(reputation, "PenaltyDecayed");

      const record = await reputation.scores(agent1.address);
      expect(record.score).to.equal(800);
      expect(record.penaltyPoints).to.equal(0);
    });

    it("should revert applyDecay for unscored agent", async () => {
      await expect(reputation.applyDecay(agent1.address))
        .to.be.revertedWithCustomError(reputation, "AgentNotScored");
    });

    it("should cap effective score at MAX_SCORE", async () => {
      // Score at 950, penalty of 100, then decay should not exceed 1000
      await reputation.connect(updater).updateScore(agent1.address, 950, "up");
      await reputation.connect(updater).updateScore(agent1.address, 850, "down");

      await time.increase(90 * 24 * 60 * 60);

      const [effective] = await reputation.getScore(agent1.address);
      expect(effective).to.equal(950); // 850 + 100 recovered, not exceeding original
    });
  });
});
