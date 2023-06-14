// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error RandomIPFSNft__RangeOutOfBounds();
error RandomIPFSNft__NeedMoreFundsToMint();
error RandomIPFSNft__TransferToOwnerFailed();

contract RandomIPFSNft is VRFConsumerBaseV2, ERC721URIStorage, Ownable {
  /*
  Things to do:
  1. When minting happens, Chainlink VRF will be triggered and a random number will be provided for facilitating our RandomIPFSNft contract
  2. Using random number we obtain random NFT out of the list - Pug, Shiba Inu, St. Bernard wher Pug is super rare, Shiba Inu is sort of rare, and lastly St. Bernard is common find.
  3. Users have to pay to mint an NFt
  4. and the payed amount is accumulated and retrieveable by the owner of the NFT
  */

  // Type Declaration
  enum Breed {
    Pug,
    Shiba_INU,
    ST_BERNARD
  }

  // Chainlink VRF Variables
  VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
  uint64 private immutable i_subscriptionId;
  bytes32 private immutable i_gasLane;
  uint32 private immutable i_callbackGasLimit;
  uint16 private constant REQUEST_CONFIRMATIONS = 3;
  uint32 private constant NUM_WORDS = 1;

  // VRF Helpers
  mapping(uint256 => address) public s_requestIdToSender;

  // NFT variables
  uint256 public s_tokenCounter;
  uint256 internal constant MAX_CHANCE_VALUE = 100;
  string[] internal s_dogTokenUris;
  uint256 private immutable i_mintFee;

  // Events
  event NFTRequested(uint256 indexed requestId, address requester);
  event NFTMinted(Breed dogBreed, address minter);

  constructor(
    address vrfCoordinatorV2,
    uint64 subscriptionId,
    bytes32 gasLane,
    uint32 callbackGasLimit,
    uint256 mintFee,
    string[3] memory dogTokenUris
  ) VRFConsumerBaseV2(vrfCoordinatorV2) ERC721("Random IPFS NFT", "RIN") {
    i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
    i_subscriptionId = subscriptionId;
    i_gasLane = gasLane;
    i_callbackGasLimit = callbackGasLimit;
    s_dogTokenUris = dogTokenUris;
    i_mintFee = mintFee;
  }

  /**
   * @notice This function is responsible for connecting to Chainlink VRF nodes
   * @dev VRF coordinator is required to make the connection, usually a way to authenticate our contract to Chainlink VRF
   * gasLane is 30Gwei gas lane hash
   * subscription ID is with every consumer, which in our case is the coordinator
   * Request confirmation of 3 blocks has been set
   * callback gas limit is to stop excessive gas loss
   * Num of words is to indicate the many random words that is returned by VRF
   * lastly after connecting with Chainlink VRF the request Id is being mapped to NFT sender/owner to avoid Chainlink VRF to be presented as msg.sender while minting process
   */
  function requestNft() public payable returns (uint256 requestId) {
    if (msg.value < i_mintFee) {
      revert RandomIPFSNft__NeedMoreFundsToMint();
    }
    requestId = i_vrfCoordinator.requestRandomWords(
      i_gasLane,
      i_subscriptionId,
      REQUEST_CONFIRMATIONS,
      i_callbackGasLimit,
      NUM_WORDS
    );
    s_requestIdToSender[requestId] = msg.sender;
    emit NFTRequested(requestId, msg.sender);
  }

  /**
   * @notice This function is triggered by Chainlink VRF nodes to generate a random word
   */
  function fulfillRandomWords(
    uint256 requestId,
    uint256[] memory randowmWords
  ) internal override {
    address nftDogOwner = s_requestIdToSender[requestId]; // mapping is used to retrieve the NFT owner
    uint256 newTokenId = s_tokenCounter; // keeps track of the token list/timeline

    // What does the token look like?
    // -- Note: moddedRng is always going to be between 0-99
    uint256 moddedRng = randowmWords[0] % MAX_CHANCE_VALUE;
    /*
    Depending on the percentage by getChanceArray and moddedRng value the contract will decide the breed of the dog (since, this contract is a Dog affiliated NFT of different dogs)
    7 -> PUG
    12 -> Shiba Inu
    88 -> St. Bernard
    45 -> St. Bernard
    */
    // based on the enum breed is being assigned depending on the result retured by getBreedFromModdedRange
    Breed dogBreed = getBreedFromModdedRange(moddedRng);
    s_tokenCounter += s_tokenCounter;
    // Minting of NFT
    _safeMint(nftDogOwner, newTokenId);
    _setTokenURI(
      newTokenId,
      /* That breed's tokenURI */
      s_dogTokenUris[uint256(dogBreed)]
    );
    emit NFTMinted(dogBreed, nftDogOwner);
  }

  /**
   * @notice withdraw function for owner to collect the accumulated amount from minting of their NFT
   */
  function withdraw() public onlyOwner {
    uint256 amount = address(this).balance;
    (bool success, ) = payable(msg.sender).call{value: amount}("");
    if (!success) {
      revert RandomIPFSNft__TransferToOwnerFailed();
    }
  }

  /**
   * @notice This function is called to randomly select dog breed of NFT
   * @dev To start of cumulative sum stays at 0,
   * then the chance array is iterated checking
   * whether modded range is greater than cumulative sum
   * and
   * whether modded range is less than cumulative sum added with chance array at the current iteration
   * if true then a breed based on the enum Breed is returned of that very iteration, otherwise the cumulative sum is increased by the chance array's value at current iteration (chanceArray[i])
   */
  function getBreedFromModdedRange(
    uint256 moddedRng
  ) public pure returns (Breed) {
    uint256 cumulativeSum = 0;
    uint256[3] memory chanceArray = getChanceArray();
    for (uint256 i = 0; i < chanceArray.length; i++) {
      if (
        moddedRng >= cumulativeSum && moddedRng < cumulativeSum + chanceArray[i]
      ) {
        return Breed(i);
      }
      cumulativeSum += chanceArray[i];
    }
    revert RandomIPFSNft__RangeOutOfBounds();
  }

  /**
   * @notice returns an array crucial to determine the breed of the dog
   * @dev with index the rarity of breed decreases
   */
  function getChanceArray() public pure returns (uint256[3] memory) {
    // 10% chance of index 0, 30% chance of index 1 and 60% chance of index 2
    return [10, 40, MAX_CHANCE_VALUE];
  }

  function getMintFee() public view returns (uint256) {
    return i_mintFee;
  }

  function getDogTokenUris(uint256 index) public view returns (string memory) {
    return s_dogTokenUris[index];
  }

  function getTokenCounter() public view returns (uint256) {
    return s_tokenCounter;
  }
}
