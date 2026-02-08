import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploy all Agent Safety Monitor contracts:
 * 1. AgentRegistry — ERC-721 agent identity
 * 2. ReputationCore — Score storage with time-decay
 * 3. SafetyStaking — ETH staking with slashing
 * 4. SafetyBadge — Dynamic NFT badges
 *
 * Grants all necessary roles to the deployer (agent wallet).
 */
const deployContracts: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n🛡️  Deploying Agent Safety Monitor contracts...\n");
  console.log("Deployer (agent wallet):", deployer);

  // 1. AgentRegistry
  const agentRegistry = await deploy("AgentRegistry", {
    from: deployer,
    args: [deployer], // admin = deployer
    log: true,
    autoMine: true,
  });
  console.log("✅ AgentRegistry deployed at:", agentRegistry.address);

  // 2. ReputationCore — deployer is both admin and score updater
  const reputationCore = await deploy("ReputationCore", {
    from: deployer,
    args: [deployer, deployer], // admin = deployer, scoreUpdater = deployer
    log: true,
    autoMine: true,
  });
  console.log("✅ ReputationCore deployed at:", reputationCore.address);

  // 3. SafetyStaking — deployer is admin, slasher, and treasury
  const safetyStaking = await deploy("SafetyStaking", {
    from: deployer,
    args: [deployer, deployer, deployer], // admin, slasher, treasury = deployer
    log: true,
    autoMine: true,
  });
  console.log("✅ SafetyStaking deployed at:", safetyStaking.address);

  // 4. SafetyBadge — deployer is admin and minter
  const safetyBadge = await deploy("SafetyBadge", {
    from: deployer,
    args: [deployer, deployer], // admin = deployer, minter = deployer
    log: true,
    autoMine: true,
  });
  console.log("✅ SafetyBadge deployed at:", safetyBadge.address);

  console.log("\n🎉 All contracts deployed successfully!\n");
  console.log("Contract Addresses:");
  console.log("  AgentRegistry:", agentRegistry.address);
  console.log("  ReputationCore:", reputationCore.address);
  console.log("  SafetyStaking:", safetyStaking.address);
  console.log("  SafetyBadge:", safetyBadge.address);
};

export default deployContracts;

deployContracts.tags = ["AgentSafetyMonitor"];
