const { ethers } = require("hardhat");

async function main() {
    // Generate a new wallet
    const wallet = ethers.Wallet.createRandom();

    // Display the wallet's address and private key
    console.log("Address:", wallet.address);
    console.log("Private Key:", wallet.privateKey);
    
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});