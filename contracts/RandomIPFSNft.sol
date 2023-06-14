// SPDX-License-Identifier: MIT

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlik/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

pragma solidity ^0.8.7;

contract RandomIPFSNft is VRFConsumerBaseV2, ERC721{
    /*
    Things to do:
    1. When minting happens, Chainlink VRF will be triggered and a random number will be provided for facilitating our RandomIPFSNft contract
    2. Using random number we obtain random NFT out of the list - Pug, Shiba Inu, St. Bernard wher Pug is super rare, Shiba Inu is sort of rare, and lastly St. Bernard is common find.
    3. Users have to pay to mint an NFt
    4. and the payed amount is accumulated and retrieveable by the owner of the NFT
    */

   // Chainlink VRF Variables
   VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
   uint64 private immutable i_subscriptionId;
   bytes32 private immutable i_gasLane;
   uint32 private immutable i_callbackGasLimit;
   uint16 private constant REQUEST_CONFIRMATIONS = 3;
   uint32 private constant NUM_WORDS = 1;

   // VRF Helpers
   mapping (uint265 => address) public s_requestIdToSender;

    // NFT variables
    uint256 public s_tokenCounter;
    uint256 internal constant MAX_CHANCE_VALUE =100;

   constructor(address vrfCoordinatorV2, uint62 subscriptionId, bytes32 gasLane, uint32 callbackGasLimit) VRFConsumerBaseV2(vrfCoordinatorV2)ERC721("Random IPFS NFT", "RIN"){
    i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2)
    i_subscriptionId = subscriptionId;
    i_gasLane = gasLane;
    i_callbackGasLimit = callbackGasLimit;
   }

  function requestNft() public {
    requestId = i_vrfCoordinator.requestRandomWords(
        i_gasLane,
        i_subscriptionId,
        REQUEST_CONFIRMATIONS,
        i_callbackGasLimit,
        NUM_WORDS
    );
    s_requestIdToSender[requestId] = msg.sender;
  }

  function fulfillRandomWords(
    uint256 requestId,
    uint256[] memory randowmWords
  ) internal override {
    address nftDogOwner = s_requestIdToSender[requestId];
    uint256 newTokenId = s_tokenCounter;
    _safeMint(nftDogOwner, newTokenId);

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
  }

  function getChanceArray() public pure returns(uint256[3] memory) {
    return [10, 30, MAX_CHANCE_VALUE];
  }

  function tokenURI(uint256) public view override returns(string memory){

  }
}
