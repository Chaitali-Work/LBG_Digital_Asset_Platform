async function main() {
    // Get the contract factory
    const StableCoin = await ethers.getContractFactory("StableCoin");

    // Deploy the contract
    const stableCoin = await StableCoin.deploy();

    //Wait for the deployment transaction to be mined
    await stableCoin.waitForDeployment();
    
    console.log("StableCoin deployed to: ", stableCoin.target);    
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});