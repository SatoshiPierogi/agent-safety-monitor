import { expect } from "chai";
import { ethers } from "hardhat";
import { SafetyBadge } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SafetyBadge", function () {
  let badge: SafetyBadge;
  let admin: SignerWithAddress;
  let minter: SignerWithAddress;
  let agent1: SignerWithAddress;
  let agent2: SignerWithAddress;

  const Tier = { None: 0, Bronze: 1, Silver: 2, Gold: 3 };

  beforeEach(async () => {
    [admin, minter, agent1, agent2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SafetyBadge");
    badge = await Factory.deploy(admin.address, minter.address);
    await badge.waitForDeployment();
  });

  describe("Minting", () => {
    it("should mint a Bronze badge", async () => {
      await expect(badge.connect(minter).mintBadge(agent1.address, Tier.Bronze, 750))
        .to.emit(badge, "BadgeMinted")
        .withArgs(1, agent1.address, Tier.Bronze, 750);
      expect(await badge.totalBadges()).to.equal(1);
      expect(await badge.ownerOf(1)).to.equal(agent1.address);
    });

    it("should reject duplicate badge for same agent", async () => {
      await badge.connect(minter).mintBadge(agent1.address, Tier.Bronze, 750);
      await expect(badge.connect(minter).mintBadge(agent1.address, Tier.Silver, 900))
        .to.be.revertedWithCustomError(badge, "BadgeAlreadyExists");
    });

    it("should reject Tier.None", async () => {
      await expect(badge.connect(minter).mintBadge(agent1.address, Tier.None, 500))
        .to.be.revertedWithCustomError(badge, "InvalidTier");
    });

    it("should reject non-minter", async () => {
      await expect(badge.connect(agent1).mintBadge(agent1.address, Tier.Bronze, 750))
        .to.be.reverted;
    });
  });

  describe("Revoking", () => {
    it("should revoke (burn) a badge", async () => {
      await badge.connect(minter).mintBadge(agent1.address, Tier.Bronze, 750);
      await expect(badge.connect(minter).revokeBadge(agent1.address, "Score dropped"))
        .to.emit(badge, "BadgeRevoked")
        .withArgs(1, agent1.address, "Score dropped");

      // Badge should no longer exist
      await expect(badge.getBadge(agent1.address))
        .to.be.revertedWithCustomError(badge, "NoBadgeFound");
    });

    it("should reject revoking non-existent badge", async () => {
      await expect(badge.connect(minter).revokeBadge(agent1.address, "no badge"))
        .to.be.revertedWithCustomError(badge, "NoBadgeFound");
    });
  });

  describe("Upgrading", () => {
    it("should upgrade badge tier", async () => {
      await badge.connect(minter).mintBadge(agent1.address, Tier.Bronze, 750);
      await expect(badge.connect(minter).upgradeBadge(agent1.address, Tier.Silver, 880))
        .to.emit(badge, "BadgeUpgraded")
        .withArgs(1, Tier.Bronze, Tier.Silver);

      const [, info] = await badge.getBadge(agent1.address);
      expect(info.tier).to.equal(Tier.Silver);
      expect(info.scoreAtMint).to.equal(880);
    });
  });

  describe("tokenURI", () => {
    it("should return a valid data URI with SVG", async () => {
      await badge.connect(minter).mintBadge(agent1.address, Tier.Gold, 980);
      const uri = await badge.tokenURI(1);
      expect(uri).to.contain("data:application/json;base64,");

      // Decode and check JSON
      const json = Buffer.from(uri.split(",")[1], "base64").toString();
      const metadata = JSON.parse(json);
      expect(metadata.name).to.contain("Gold");
      expect(metadata.attributes[0].value).to.equal("Gold");
      expect(metadata.image).to.contain("data:image/svg+xml;base64,");
    });

    it("should contain correct SVG elements for each tier", async () => {
      await badge.connect(minter).mintBadge(agent1.address, Tier.Bronze, 720);
      const uri = await badge.tokenURI(1);
      const json = Buffer.from(uri.split(",")[1], "base64").toString();
      const metadata = JSON.parse(json);
      const svg = Buffer.from(metadata.image.split(",")[1], "base64").toString();
      expect(svg).to.contain("Bronze Badge");
      expect(svg).to.contain("#cd7f32"); // Bronze color
      expect(svg).to.contain("720");
    });
  });

  describe("getBadge", () => {
    it("should return badge info for agent", async () => {
      await badge.connect(minter).mintBadge(agent1.address, Tier.Silver, 860);
      const [tokenId, info] = await badge.getBadge(agent1.address);
      expect(tokenId).to.equal(1);
      expect(info.agent).to.equal(agent1.address);
      expect(info.tier).to.equal(Tier.Silver);
      expect(info.scoreAtMint).to.equal(860);
    });

    it("should revert for agent with no badge", async () => {
      await expect(badge.getBadge(agent1.address))
        .to.be.revertedWithCustomError(badge, "NoBadgeFound");
    });
  });
});
