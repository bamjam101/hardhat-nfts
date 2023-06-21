// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

pragma solidity ^0.8.7;

contract BasicNft is ERC721 {
  string private constant TOKEN_URI =
    "ipfs://bafybeig37ioir76s7mg5oobetncojcm3c3hxasyd4rvid4jqhy4gkaheg4/?filename=0-PUG.json";
  uint256 private s_tokenCounter;

  constructor() ERC721("Puppy", "DOG") {
    s_tokenCounter = 0;
  }

  function mintNft() public returns (uint256) {
    s_tokenCounter = s_tokenCounter + 1;
    _safeMint(msg.sender, s_tokenCounter);
    return s_tokenCounter;
  }

  // View or Pure functions
  function tokenURI(
    uint256 /*tokenId*/
  ) public view virtual override returns (string memory) {
    return TOKEN_URI;
  }

  function getTokenCounter() public view returns (uint256) {
    return s_tokenCounter;
  }
}
