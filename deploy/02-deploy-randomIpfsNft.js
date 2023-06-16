const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const {
  storeImages,
  storeTokenUriMetadata,
} = require("../utils/uploadToPinata")
require("dotenv").config()

const FUND_AMOUNT = "1000000000000000000000" // 10 lINK
const imagesLocation = "./images/randomNft/"

const metadataTemplate = {
  name: "",
  description: "",
  image: "",
  attributes: [
    {
      trait_type: "Cuteness",
      value: 100,
    },
  ],
}

async function handleTokenUris() {
  let tokenUris = []
  // Store images in IPFS and the metadata of the same also in IPFS
  const { responses: imageUploadResponses, files } = await storeImages(
    imagesLocation
  )
  for (imagesIndex in imageUploadResponses) {
    let tokenUriMetadata = { ...metadataTemplate } // spreading the empty metadata as skeleton

    // Dynamically populating the metadata for respective tokenUris
    tokenUriMetadata.name = files[imagesIndex].replace(".png", "") // removing .png extension from image name which is due to the extension of file type
    tokenUriMetadata.description = `An adorable ${tokenUriMetadata.name} pup!`
    tokenUriMetadata.image = `ipfs://${imageUploadResponses[imagesIndex].IpfsHash}`
    console.log(`Now uploading ${tokenUriMetadata.name} metadata...`)

    // store the JSON to Pinata/ IPFS
    const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata)
    tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
  }
  console.log("Token URI's metadata Uploaded!")
  return tokenUris
}

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = network.config.chainId
  log("------------------------------")
  //   Uploading images of Pug, Shiba Inu and St. Bernard programmatically to IPFS
  /* Steps to follow to get IPFS hases of our images and pin your images/data to IPFS
  1. With our own IPFS node - https://docs.ipfs.io/
  2. Pinata - https://www.pinata.cloud/
  3. nft.storage - https://nft.storage/
  Preferred by developers to pin their data through 2 of the above ways, nft.storage won't be covered but it is more of an on chain data pinning and more robust of the all, so preferred for geniune projects.
*/
  let tokenUris = [
    "ipfs://QmYg8yWzmAsyUfWfBd98v5CC2wtCYJDLenWvm9Po1PzLiQ",
    "ipfs://QmVZ1pXmVEBEafDVYRnb8QenWKMdTbfSnDtcJ9qNZ4sBZX",
    "ipfs://QmSv5mTF9sDRWWKKxDGwjgqCDBpXvH9qyCW4UGN3QP219D",
  ]
  if (process.env.UPLOAD_TO_PINATA == "true") {
    tokenUris = await handleTokenUris()
  }

  log("------------------------------")
  let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock
  if (developmentChains.includes(network.name)) {
    vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
    const transactionReceipt = await transactionResponse.wait(1)
    subscriptionId = transactionReceipt.events[0].args.subId
    // Fund the subscription, our mock makes it so we don't actually have to worry about sending fund
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
    subscriptionId = networkConfig[chainId].subscriptionId
  }

  const args = [
    vrfCoordinatorV2Address,
    subscriptionId,
    networkConfig[chainId].gasLane,
    networkConfig[chainId].callbackGasLimit,
    networkConfig[chainId].mintFee,
    tokenUris,
  ]
  const randomIPFSNft = await deploy("RandomIPFSNft", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmation: network.config.blockConfirmations || 1,
  })

  if (developmentChains.includes(network.name)) {
    await vrfCoordinatorV2Mock.addConsumer(
      subscriptionId,
      randomIPFSNft.address
    )
  }

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying....")
    await verify(randomIPFSNft.address, args)
  }

  log("------------------------------")
}
module.exports.tags = ["all", "randomipfsnft", "main"]
