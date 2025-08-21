// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// A stablecoin implementation SecureCoin with collateral-based minting
/// Inherits from ERC20 and Ownable
contract Safe is ERC20, Ownable {

    /// The collateralization ratio (150%)
    uint256 public constant collateral_ratio = 150;

    /// The precision for price calculations (2 decimal places)
    uint256 public constant price_precision = 100;

    /// The conversion from Wei to Ether
    uint256 public constant conversion_equivalent = 1e18;

    /// Mapping to track collateral balances for each user
    mapping(address => uint256) public collateralBalance;

    event Minted(address indexed user, uint256 stableCoinMinted);
    event Burned(address indexed user, uint256 stableCoinBurned, uint256 collateralReturned);

    /// Initializes the SecureCoin contract
    constructor() ERC20("TrueGBP", "TGBP") Ownable(msg.sender) {}

    /// Allows users to deposit ETH (Wei) as collateral
    /// The deposited amount is added to the user's collateral balance
    /// Mints stablecoin (TGBP) based on the user's deposited collateral
    /// Calculation involves current ETH price and collateral ratio    
    /// stableCoinToMint is the amount of stablecoin to mint
    function depositAndMint() external payable {

        // Check validates sender address
        require(msg.sender != address(0), "Sender can't be zero address");

        // Check validates a valid amount of ETH send
        require(msg.value > 0, "Need to send some ETH as collateral to mint SE");

        // Increments collateral balance of user with deposited ETH (Wei)
        collateralBalance[msg.sender] += msg.value;

        // Formula to calculate amount of stable coin to mint
        // msg.value is the value sent in Wei
        uint256 stableCoinToMint = (msg.value * getCurrentPrice() * price_precision * 100) / (collateral_ratio * conversion_equivalent);

        // Mints equivalent SE back to user
        _mint(msg.sender, stableCoinToMint);
        
    }

    /// Gets the current price of ETH in USD
    /// In a real-world scenario, this would fetch the price from an oracle
    /// The current ETH price in USD (fixed at $3000 for simplicity)
    function getCurrentPrice() public pure returns (uint256) {
        // In a real-world scenario, this would fetch the current ETH/USD price from an oracle
        // For simplicity, we'll use a fixed price of $3000 per ETH
        return 3000; // $3000.00
    }
}