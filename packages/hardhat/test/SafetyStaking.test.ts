import { expect } from "chai";
import { ethers } from "hardhat";
import { SafetyStaking } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("SafetyStaking", function () {
  let staking: SafetyStaking;
  let admin: SignerWithAddress;
  let slasher: SignerWithAddress;
  let treasury: SignerWithAddress;
  let agent1: SignerWithAddress;
  let agent2: SignerWithAddress;

  const MIN_STAKE = ethers.parseEther("0.01");
  const ONE_ETH = ethers.parseEther("1");
  const SEVEN_DAYS = 7 * 24 * 60 * 60;

  beforeEach(async () => {
    [admin, slasher, treasury, agent1, agent2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SafetyStaking");
    staking = await Factory.deploy(admin.address, slasher.address, treasury.address);
    await staking.waitForDeployment();
  });

  describe("Staking", () => {
    it("should accept stake above minimum", async () => {
      await expect(staking.connect(agent1).stake({ value: MIN_STAKE }))
        .to.emit(staking, "Staked")
        .withArgs(agent1.address, MIN_STAKE, MIN_STAKE);
      expect(await staking.totalStaked()).to.equal(MIN_STAKE);
    });

    it("should reject first stake below minimum", async () => {
      const tooLow = ethers.parseEther("0.005");
      await expect(staking.connect(agent1).stake({ value: tooLow }))
        .to.be.revertedWithCustomError(staking, "StakeBelowMinimum");
    });

    it("should allow adding to existing stake below minimum", async () => {
      await staking.connect(agent1).stake({ value: MIN_STAKE });
      const small = ethers.parseEther("0.001");
      await staking.connect(agent1).stake({ value: small });
      const info = await staking.stakes(agent1.address);
      expect(info.amount).to.equal(MIN_STAKE + small);
    });

    it("should cancel pending unstake when adding stake", async () => {
      await staking.connect(agent1).stake({ value: ONE_ETH });
      await staking.connect(agent1).requestUnstake(ONE_ETH);
      await staking.connect(agent1).stake({ value: MIN_STAKE });
      const info = await staking.stakes(agent1.address);
      expect(info.unstakeRequestedAt).to.equal(0);
    });
  });

  describe("Unstaking", () => {
    it("should enforce 7-day timelock", async () => {
      await staking.connect(agent1).stake({ value: ONE_ETH });
      await staking.connect(agent1).requestUnstake(ONE_ETH);

      await expect(staking.connect(agent1).unstake())
        .to.be.revertedWithCustomError(staking, "UnstakeTimelockActive");

      await time.increase(SEVEN_DAYS);

      await expect(staking.connect(agent1).unstake())
        .to.emit(staking, "Unstaked")
        .withArgs(agent1.address, ONE_ETH);
    });

    it("should reject unstake without request", async () => {
      await staking.connect(agent1).stake({ value: ONE_ETH });
      await expect(staking.connect(agent1).unstake())
        .to.be.revertedWithCustomError(staking, "UnstakeNotRequested");
    });

    it("should reject unstake exceeding stake", async () => {
      await staking.connect(agent1).stake({ value: ONE_ETH });
      await expect(staking.connect(agent1).requestUnstake(ONE_ETH + 1n))
        .to.be.revertedWithCustomError(staking, "UnstakeAmountExceedsStake");
    });

    it("should allow partial unstake", async () => {
      await staking.connect(agent1).stake({ value: ONE_ETH });
      const half = ethers.parseEther("0.5");
      await staking.connect(agent1).requestUnstake(half);
      await time.increase(SEVEN_DAYS);
      await staking.connect(agent1).unstake();
      const info = await staking.stakes(agent1.address);
      expect(info.amount).to.equal(half);
    });
  });

  describe("Slashing", () => {
    it("should slash a percentage of stake", async () => {
      await staking.connect(agent1).stake({ value: ONE_ETH });
      const treasuryBefore = await ethers.provider.getBalance(treasury.address);

      // Slash 10% (1000 bps)
      await expect(staking.connect(slasher).slash(agent1.address, 1000, "violation"))
        .to.emit(staking, "Slashed");

      const info = await staking.stakes(agent1.address);
      expect(info.amount).to.equal(ethers.parseEther("0.9"));

      const treasuryAfter = await ethers.provider.getBalance(treasury.address);
      expect(treasuryAfter - treasuryBefore).to.equal(ethers.parseEther("0.1"));
    });

    it("should reject slash above MAX_SLASH_BPS", async () => {
      await staking.connect(agent1).stake({ value: ONE_ETH });
      await expect(staking.connect(slasher).slash(agent1.address, 5001, "too much"))
        .to.be.revertedWithCustomError(staking, "SlashExceedsMax");
    });

    it("should reject non-slasher", async () => {
      await staking.connect(agent1).stake({ value: ONE_ETH });
      await expect(staking.connect(agent1).slash(agent1.address, 500, "self-slash"))
        .to.be.reverted;
    });

    it("should reject slashing agent with no stake", async () => {
      await expect(staking.connect(slasher).slash(agent1.address, 500, "no stake"))
        .to.be.revertedWithCustomError(staking, "NoStake");
    });

    it("should reduce pending unstake if slash makes it exceed remaining", async () => {
      await staking.connect(agent1).stake({ value: ONE_ETH });
      await staking.connect(agent1).requestUnstake(ONE_ETH);

      // Slash 50%
      await staking.connect(slasher).slash(agent1.address, 5000, "heavy violation");

      const info = await staking.stakes(agent1.address);
      expect(info.amount).to.equal(ethers.parseEther("0.5"));
      // unstakeAmount should be reduced to match remaining stake
      expect(info.unstakeAmount).to.equal(ethers.parseEther("0.5"));
    });
  });

  describe("Treasury", () => {
    it("should allow admin to update treasury", async () => {
      await expect(staking.connect(admin).setTreasury(agent2.address))
        .to.emit(staking, "TreasuryUpdated");
      expect(await staking.treasury()).to.equal(agent2.address);
    });

    it("should reject zero address treasury", async () => {
      await expect(staking.connect(admin).setTreasury(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(staking, "ZeroAddress");
    });
  });

  describe("getStakeInfo", () => {
    it("should return correct info", async () => {
      await staking.connect(agent1).stake({ value: ONE_ETH });
      const [amount, stakedAt, unstakePending] = await staking.getStakeInfo(agent1.address);
      expect(amount).to.equal(ONE_ETH);
      expect(stakedAt).to.be.gt(0);
      expect(unstakePending).to.be.false;
    });
  });
});
