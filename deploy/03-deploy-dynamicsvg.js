const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const fs = require("fs")

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  let ethUsdPriceFeedAddress

  if (developmentChains.includes(network.name)) {
    // Find ETH/USD price feed
    const EthUsdAggregator = await deployments.get("MockV3Aggregator")
    ethUsdPriceFeedAddress = EthUsdAggregator.address
  } else {
    ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeed
  }

  const lowSVG = fs.readFileSync("./images/dynamicNft/frown.svg", {
    encoding: "utf8",
  })
  const highSVG = fs.readFileSync("./images/dynamicNft/smile.svg", {
    encoding: "utf8",
  })

  const args = [ethUsdPriceFeedAddress, lowSVG, highSVG]

  const dynamicSVGNft = await deploy("DynamicSVGNft", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmation: network.config.blockConfirmations || 1,
  })

  // Verify the deployment on actual network
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying....")
    await verify(dynamicSVGNft.address, args)
  }

  log("------------------------------")
}

module.exports.tags = ["all", "dynamicsvgnft", "main"]
