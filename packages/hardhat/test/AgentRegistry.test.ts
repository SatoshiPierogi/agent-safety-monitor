import { expect } from "chai";
import { ethers } from "hardhat";
import { AgentRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("AgentRegistry", function () {
  let registry: AgentRegistry;
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let agent1: SignerWithAddress;
  let agent2: SignerWithAddress;

  beforeEach(async () => {
    [admin, user1, agent1, agent2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AgentRegistry");
    registry = await Factory.deploy(admin.address);
    await registry.waitForDeployment();
  });

  describe("Registration", () => {
    it("should register an agent and mint an NFT", async () => {
      const tx = await registry.connect(user1).registerAgent(agent1.address, "ipfs://metadata1");
      await expect(tx)
        .to.emit(registry, "AgentRegistered")
        .withArgs(1, agent1.address, "ipfs://metadata1");

      const info = await registry.getAgentInfo(1);
      expect(info.agentAddress).to.equal(agent1.address);
      expect(info.metadataURI).to.equal("ipfs://metadata1");
      expect(info.active).to.be.true;
    });

    it("should assign incrementing token IDs", async () => {
      await registry.registerAgent(agent1.address, "uri1");
      await registry.registerAgent(agent2.address, "uri2");
      expect(await registry.totalAgents()).to.equal(2);
      expect(await registry.agentToToken(agent1.address)).to.equal(1);
      expect(await registry.agentToToken(agent2.address)).to.equal(2);
    });

    it("should reject duplicate registration", async () => {
      await registry.registerAgent(agent1.address, "uri1");
      await expect(registry.registerAgent(agent1.address, "uri2"))
        .to.be.revertedWithCustomError(registry, "AgentAlreadyRegistered");
    });

    it("should allow lookup by address", async () => {
      await registry.registerAgent(agent1.address, "ipfs://test");
      const [tokenId, info] = await registry.getAgentByAddress(agent1.address);
      expect(tokenId).to.equal(1);
      expect(info.metadataURI).to.equal("ipfs://test");
    });

    it("should revert for unregistered address lookup", async () => {
      await expect(registry.getAgentByAddress(agent1.address))
        .to.be.revertedWithCustomError(registry, "AgentNotFound");
    });
  });

  describe("Metadata updates", () => {
    it("should allow NFT owner to update metadata", async () => {
      await registry.connect(user1).registerAgent(agent1.address, "uri1");
      await expect(registry.connect(user1).updateMetadata(1, "uri2"))
        .to.emit(registry, "AgentUpdated")
        .withArgs(1, "uri2");
      expect(await registry.tokenURI(1)).to.equal("uri2");
    });

    it("should reject non-owner metadata update", async () => {
      await registry.connect(user1).registerAgent(agent1.address, "uri1");
      await expect(registry.connect(admin).updateMetadata(1, "uri2"))
        .to.be.revertedWithCustomError(registry, "AgentNotFound");
    });
  });

  describe("Deactivation / Reactivation", () => {
    it("should allow owner to deactivate", async () => {
      await registry.connect(user1).registerAgent(agent1.address, "uri1");
      await expect(registry.connect(user1).deactivateAgent(1))
        .to.emit(registry, "AgentDeactivated").withArgs(1);
      const info = await registry.getAgentInfo(1);
      expect(info.active).to.be.false;
    });

    it("should allow admin to deactivate", async () => {
      await registry.connect(user1).registerAgent(agent1.address, "uri1");
      await registry.connect(admin).deactivateAgent(1);
      const info = await registry.getAgentInfo(1);
      expect(info.active).to.be.false;
    });

    it("should allow reactivation", async () => {
      await registry.connect(user1).registerAgent(agent1.address, "uri1");
      await registry.connect(user1).deactivateAgent(1);
      await registry.connect(user1).reactivateAgent(1);
      const info = await registry.getAgentInfo(1);
      expect(info.active).to.be.true;
    });
  });

  describe("tokenURI", () => {
    it("should return metadata URI", async () => {
      await registry.registerAgent(agent1.address, "ipfs://Qm123");
      expect(await registry.tokenURI(1)).to.equal("ipfs://Qm123");
    });

    it("should revert for non-existent token", async () => {
      await expect(registry.getAgentInfo(999))
        .to.be.revertedWithCustomError(registry, "AgentNotFound");
    });
  });
});
