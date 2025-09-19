// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StableCoin is ERC20, Ownable {

    uint256 public constant collateral_ratio = 150;
    uint256 public constant price_precision = 100;
    uint256 public constant conversion_equivalent = 1e18;
    mapping(address => uint256) public collateralBalance;
    event Minted(address indexed user, uint256 collateralDeposited, uint256 stableCoinMinted);
    event Burned(address indexed user, uint256 stableCoinBurned, uint256 collateralReturned);

    constructor() ERC20("SecureCoin", "SE") Ownable(msg.sender) {}

    function getCurrentPrice() public pure returns (uint256) {
        return 3000; // $3000.00
    }

    function depositAndMint() external payable {
        require(msg.sender != address(0), "Sender can't be zero address");
        require(msg.value > 0, "Need to send some ETH as collateral to mint stable coin");
        collateralBalance[msg.sender] += msg.value;
        uint256 stableCoinAmount = (msg.value * getCurrentPrice() * 100) / (collateral_ratio * conversion_equivalent);
        _mint(msg.sender, stableCoinAmount);  
        emit Minted(msg.sender, msg.value, stableCoinAmount);      
    }

    function burnAndWithdraw(uint256 stableCoinAmount) external {
        require(msg.sender != address(0), "Sender can't be zero address");
        require(stableCoinAmount > 0, "Enter a valid stable coin amount to burn");
        require(balanceOf(msg.sender) >= stableCoinAmount, "Entered amount exceeds stablecoin balance");
        uint256 collateralAmount = (stableCoinAmount * collateral_ratio * conversion_equivalent) / (100 * getCurrentPrice());
        _burn(msg.sender, stableCoinAmount);
        collateralBalance[msg.sender] -= collateralAmount;
        payable(msg.sender).transfer(collateralAmount);
        emit Burned(msg.sender, stableCoinAmount, collateralAmount);
    }
    
}