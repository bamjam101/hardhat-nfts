const pinataSDK = require("@pinata/sdk")
const path = require("path")
const fs = require("fs")
require("dotenv").config()

const pinataKey = process.env.PINATA_API_KEY
const pinataSecret = process.env.PINATA_API_SECRET
const pinata = pinataSDK(pinataKey, pinataSecret)

async function storeImages(imagesFilePath) {
  const fullImagesPath = path.resolve(imagesFilePath)
  const files = fs.readdirSync(fullImagesPath)
  console.log("Uploading to IPFS through Pinata...")
  let responses = []
  for (fileIndex in files) {
    console.log(`-> Working on ${files[fileIndex]}...`)
    const readableStreamForFile = fs.createReadStream(
      `${fullImagesPath}/${files[fileIndex]}`
    )
    try {
      const response = await pinata.pinFileToIPFS(readableStreamForFile)
      responses.push(response)
    } catch (error) {
      console.log(error)
    }
  }
  console.log("Uploading finished!")
  return { responses, files }
}

async function storeTokenUriMetadata(metadata) {
  try {
    const response = await pinata.pinJSONToIPFS(metadata)
    return response
  } catch (error) {
    console.log(error)
  }
  return null
}

module.exports = { storeImages, storeTokenUriMetadata }
