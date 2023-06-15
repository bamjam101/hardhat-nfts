const { assert, expect } = require("chai")
const { network, getNamedAccounts, ethers, deployments } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Random IPFS NFT", () => {
      let deployer, randomIPFSNft, vrfCoordinatorV2Mock
      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["mocks", "randomipfsnft"])
        randomIPFSNft = await ethers.getContract("RandomIPFSNft", deployer)
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        )
      })

      describe("Constructor", () => {
        it("sets starting values correctly", async () => {
          const dogTokenUriZero = await randomIPFSNft.getDogTokenUris(0)
          const isInitialized = await randomIPFSNft.getInitializationStatus()
          assert(dogTokenUriZero.includes("ipfs://"))
          assert.equal(isInitialized, true)
        })
      })

      describe("Request NFT", () => {
        it("fails if payment isn't sent with the request", async () => {
          await expect(randomIPFSNft.requestNft()).to.be.revertedWith(
            "RandomIPFSNft__NeedMoreFundsToMint"
          )
        })
        it("reverts again if payment amount is less than the mint fee", async () => {
          await expect(
            randomIPFSNft.requestNft({
              value: ethers.utils.parseEther("0.009"),
            })
          ).to.be.revertedWith("RandomIPFSNft__NeedMoreFundsToMint")
        })
        it("emits an event and kicks off a random word request", async () => {
          const fee = await randomIPFSNft.getMintFee()
          await expect(
            randomIPFSNft.requestNft({
              value: fee.toString(),
            })
          ).to.emit(randomIPFSNft, "NFTRequested")
        })
      })
      describe("Fulfill Random Words by Chainlink VRF", () => {
        it.only("mints NFT after random number is retured", async () => {
          await new Promise(async (resolve, reject) => {
            randomIPFSNft.once("NFTMinted", async () => {
              try {
                const tokenUri = await randomIPFSNft.getDogTokenUris(0)
                const tokenCounter = await randomIPFSNft.getTokenCounter()

                assert.equal(tokenUri.toString().includes("ipfs://"), true)
                assert.equal(tokenCounter.toString(), "1")
                resolve()
              } catch (error) {
                console.log(error)
                reject(error)
              }
            })
            try {
              const fee = await randomIPFSNft.getMintFee()
              const requestNftResponse = await randomIPFSNft.requestNft({
                value: fee.toString(),
              })
              const requestReceipt = await requestNftResponse.wait(1)
              await vrfCoordinatorV2Mock.fulfillRandomWords(
                requestReceipt.events[1].args.requestId,
                randomIPFSNft.address
              )
            } catch (error) {
              console.log(error)
              reject(error)
            }
          })
        })
      })
    })
