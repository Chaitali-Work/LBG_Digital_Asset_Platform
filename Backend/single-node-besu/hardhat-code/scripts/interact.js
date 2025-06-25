async function  main() {
    // The address of the deployed StableCoin contract
    const contractAddress = "0x7245DD72025d4D4BE79051c99562Acf592a7eeDe";

    // Get the contract factory
    const StableCoin = await ethers.getContractFactory("StableCoin");

    // Attach to the deployed contract
    const stableCoin = StableCoin.attach(contractAddress);

    // Read the name of the token
    const name = await stableCoin.name();
    console.log("Token Name:", name);

    // Read the symbol of the token
    const symbol = await stableCoin.symbol();
    console.log("Token Symbol:", symbol);

    // Read the total supply of the tokens
    const totalSupply = await stableCoin.totalSupply();
    console.log("Total Supply:", totalSupply.toString());

    // Get the signer (owner) address
    const [owner] = await ethers.getSigners();

    // Check the balances of the owner
    let [tokenBalance, rewardBalance] = await stableCoin.getBalances(owner.address);
    console.log(`Owner's token balance: ${tokenBalance.toString()}`);
    console.log(`Owner's reward balance: ${rewardBalance.toString()}`);
    
    // Address to mint tokens to
    const Address2 = "0x99b5b6d120e28642F2b2Bff5623Cfa2e616aeDDD";

    // Mint 10 tokens to Address2
    const mintAmount = 10;
    const mintTx = await stableCoin.mint(Address2, mintAmount);
    await mintTx.wait();
    console.log(`Minted ${mintAmount.toString()} tokens to ${Address2}`);
    
    // Check the balance of Address2 after minting
    const address2Balance = await stableCoin.balanceOf(Address2);
    console.log("Address2's token balance after minting:", address2Balance.toString());

    // Burn 5 tokens from the owner
    const burnAmount = 5;
    const burnTx = await stableCoin.connect(owner).burn(burnAmount);
    await burnTx.wait();
    console.log(`Burned ${burnAmount.toString()} tokens from owner`);

    // Check the balance of the owner after burning
    const ownerBalance = await stableCoin.balanceOf(owner);
    console.log("Owner's token balance after burning:", ownerBalance.toString());

    // Transfer 5 tokens from owner to Address2
    const transferAmount = 5;
    const transferTx = await stableCoin.transfer(Address2, transferAmount);
    await transferTx.wait();
    console.log(`Transferred ${transferAmount.toString()} tokens to ${Address2}`);

    // Check the balance of the owner after transfer
    const ownerBalanceTransfer = await stableCoin.balanceOf(owner);
    console.log("Owner's token balance after transfer:", ownerBalanceTransfer.toString());

    // Check the balance of Address2 after transfer
    const address2BalanceTransfer = await stableCoin.balanceOf(Address2);
    console.log("Address2's token balance after transfer:", address2BalanceTransfer.toString());

    //Issue a reward
    const recipientAddress = "0x5dce9ad62affa0cb7088512aa4d542de4e99418f";
    const rewardAmount = 100;
    const issueRewardTx = await stableCoin.connect(owner).issueReward(recipientAddress, rewardAmount);
    await issueRewardTx.wait();
    console.log(`Issued ${rewardAmount.toString()} reward tokens to ${recipientAddress}`);

    // Read the rewards
    const rewards = await stableCoin.rewards(recipientAddress);
    console.log("Rewards:", rewards.toString());

    // Claim a reward
    const [claimer] = await ethers.getSigners();
    const claimAmount = 50;
    const claimRewardTx = await stableCoin.connect(claimer).claimReward(claimAmount);
    await claimRewardTx.wait();
    console.log(`Claimed ${claimAmount} reward tokens`);

    // Get balances of an account
    const accountAddress = recipientAddress;
    [tokenBalance, rewardBalance] = await stableCoin.getBalances(accountAddress);
    console.log(`Token Balance of ${accountAddress}: ${tokenBalance.toString()}`);
    console.log(`Reward Balance of ${accountAddress}: ${rewardBalance.toString()}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});