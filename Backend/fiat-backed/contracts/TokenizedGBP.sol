// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenizedGBP is ERC20, Ownable {

    constructor() ERC20("TokenizedGBP", "TGBP") Ownable(msg.sender) {}
    event Minted(address indexed to, uint256 tokenAmount);
    event Burned(address indexed from, uint256 tokenAmount);

    function mint(address to, uint256 tokenAmount) external {
        _mint(to, tokenAmount);
        emit Minted(to, tokenAmount);
    }

    function burn(address from, uint256 tokenAmount) external {
        _burn(from, tokenAmount);
        emit Burned(from, tokenAmount);
    }
}
