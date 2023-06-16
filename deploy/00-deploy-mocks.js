const { network, ethers } = require("hardhat")
const {
  developmentChains,
  DECIMALS,
  INITIAL_PRICE,
} = require("../helper-hardhat-config")

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  const BASE_FEE = ethers.utils.parseEther("0.25") // 0.25 premium per request (paid in LINK)
  const GAS_PRICE_LINK = 1e9 // 1000000000, dependent on gas price of the transaction (Link per gas).

  log("------------------------------")

  const args = [BASE_FEE, GAS_PRICE_LINK]
  if (developmentChains.includes(network.name)) {
    log("Local network detected! Deploying Mocks...")

    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      args: args,
      log: true,
      waitConfirmation: network.config.blockConfirmations || 1,
    })

    await deploy("MockV3Aggregator", {
      from: deployer,
      log: true,
      args: [DECIMALS, INITIAL_PRICE],
    })
    log("Mocks Deployed!")
    log("------------------------------")
  }
}
module.exports.tags = ["all", "mocks", "main"]
