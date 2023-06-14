const { assert } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Basic NFT Unit Tests", () => {
      let deployer, basicNft

      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["basicnft"])
        basicNft = await ethers.getContract("BasicNFT", deployer)
      })

      describe("Constructor", () => {
        it("tests the intialization of state variables and other import details of the smart contract", async () => {
          // setting expected returns from the contracts
          const expectedName = "Puppy"
          const expectedSymbol = "DOG"
          const expectedTokenCounter = "0"
          // reading from contract
          const name = await basicNft.name()
          const symbol = await basicNft.symbol()
          const tokenCounter = await basicNft.getTokenCounter()
          // matching expected values to returned values
          assert.equal(name.toString(), expectedName)
          assert.equal(symbol.toString(), expectedSymbol)
          assert.equal(tokenCounter.toString(), expectedTokenCounter)
        })
      })

      describe("Mint NFT", () => {
        beforeEach(async () => {
          const txResponse = await basicNft.mintNft()
          await txResponse.wait(1)
        })
        it("allows users to mint an NFT, and updates appropriately", async () => {
          const tokenURI = await basicNft.tokenURI(0)
          const tokenCounter = await basicNft.getTokenCounter()

          assert.equal(tokenCounter.toString(), "1")
          assert.equal(tokenURI, await basicNft.TOKEN_URI()) // since TOKEN_URI is public constant.
        })
        it("shows the correct balance and owner of an NFT", async () => {
          const deployerAddress = deployer
          const deployerBalance = await basicNft.balanceOf(deployerAddress)
          const owner = await basicNft.ownerOf("0")

          assert.equal(deployerBalance.toString(), "1")
          assert.equal(owner, deployerAddress)
        })
      })
    })
