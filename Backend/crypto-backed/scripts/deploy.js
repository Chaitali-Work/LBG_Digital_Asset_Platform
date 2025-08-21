const hre = require("hardhat");

async function main() {

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account: ", deployer.address); 

    // Get the contract factory
    const ContractFactory = await ethers.getContractFactory("StableCoin");

    // Deploy the contract
    const contract = await ContractFactory.deploy();

    console.log("Contract deployed to address: ", contract.target);    
}

main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exitCode = 1;
});