require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');
const app = express();
const port = 4000;

// Middleware to parse JSON bodies
app.use(express.json());

// List of available RPC URLs for redundancy
const rpcUrls = [
    process.env.NODE_1_RPC_URL,
    process.env.NODE_2_RPC_URL,
    process.env.NODE_3_RPC_URL,
    process.env.NODE_4_RPC_URL
];

// Function to get a random provider from the list
function getProvider() {
    const randomIndex = Math.floor(Math.random() * rpcUrls.length);
    return new ethers.JsonRpcProvider(rpcUrls[randomIndex]);
}

const provider = getProvider();

// Owner of the contract
const ownerAddress = "0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73";

// Map Ethereum addresses to private keys
const addressToPrivateKey = {
    '0xfe3b557e8fb62b89f4916b721be55ceb828dbd73': process.env.ACCOUNT_1_PRIVATE_KEY,
    '0x627306090abaB3A6e1400e9345bC60c78a8BEf57': process.env.ACCOUNT_2_PRIVATE_KEY,
    '0xf17f52151EbEF6C7334FAD080c5704D77216b732': process.env.ACCOUNT_3_PRIVATE_KEY,
};

// ABI of the Stable Coin contract
const stableCoinAbi = [
    "function totalSupply() public view returns (uint256)",
    "function balanceOf(address account) public view returns (uint256)",
    "function collateralBalance(address account) public view returns (uint256)",
    "function depositAndMint() external payable",
    "event Minted(address indexed user, uint256 collateralDeposited, uint256 stableCoinMinted)",
    "function burnAndWithdraw(uint256 stableCoinAmount) external",
    "event Burned(address indexed user, uint256 stableCoinBurned, uint256 collateralReturned)",
    "function getCurrentPrice() public pure returns (uint256)"
];

// Address of the deployed StableCoin contract
const stableCoinAddress = '0x47b33c2D3e928FDf2c0A82FcD7042Ae0cFd5862A';

// Price Precision upto 2 decimals
const price_precision = BigInt(100);

// GET endpoint fetch current price
app.get('/current_price', async (req, res) => {
    try {
        const contract = new ethers.Contract(stableCoinAddress, stableCoinAbi, provider);
        const price = await contract.getCurrentPrice();
        res.json({ currentPriceUSD: price.toString() });
    } catch (error) {
        console.error("Error retrieving current price:", error);
        res.status(500).send('Unable to fetch current price from contract');
    }
});

// GET endpoint to fetch the ETH balance of the contract
app.get('/eth_balance_contract', async (req, res) => {
    try {
        const balanceWei = await provider.getBalance(stableCoinAddress);
        const balanceEther = ethers.formatEther(balanceWei); // Optional: convert to human-readable ETH
        res.json({
            contractAddress: stableCoinAddress,
            balanceWei: balanceWei.toString(),
            balanceEther: balanceEther
        });
    } catch (error) {
        console.error("Error retrieving contract ETH balance:", error);
        res.status(500).send('Unable to fetch contract ETH balance');
    }
});

// GET endpoint to retrieve the total supply of the stable coins
app.get('/total_supply_stable_coin', async (req, res) => {
    try {
        const contract = new ethers.Contract(stableCoinAddress, stableCoinAbi, provider);
        const totalSupply = await contract.totalSupply();
        res.json({ totalSupply: totalSupply.toString() });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving total supply');
    }
});

// GET endpoint to fetch ETH balance of a user address
app.get('/eth_balance_user/:address', async (req, res) => {
    try {
        const userAddress = req.params.address;
        const balanceWei = await provider.getBalance(userAddress);
        const balanceEther = ethers.formatEther(balanceWei);
        res.json({
            userAddress,
            balanceWei: balanceWei.toString(),
            balanceEther
        });
    } catch (error) {
        console.error("Error retrieving user ETH balance:", error);
        res.status(500).send('Unable to fetch ETH balance for the given address');
    }
});

// GET endpoint to retrieve the collateral balance of a user address
app.get('/collateral_balance_user/:address', async (req, res) => {
    try {
        const address = req.params.address;
        const contract = new ethers.Contract(stableCoinAddress, stableCoinAbi, provider);
        const collateralBalance = await contract.collateralBalance(address);
        res.json({ address, CollateralBalance: collateralBalance.toString() });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving collateral balance');
    }
});

// GET endpoint to retrieve the stable coin balance of an address
app.get('/balance_stable_coin/:address', async (req, res) => {
    try {
        const address = req.params.address;
        const contract = new ethers.Contract(stableCoinAddress, stableCoinAbi, provider);
        const balance = await contract.balanceOf(address);
        res.json({ address, stable_coin_balance: balance.toString() });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving balance');
    }
});

// POST endpoint to deposit collateral and mint equivalent stable coins
app.post('/deposit_and_mint', async (req, res) => {
    try {
        const { userAddress, amountInWei } = req.body;  // Accepting Wei directly
        const userPrivateKey = addressToPrivateKey[userAddress];
        const userWallet = new ethers.Wallet(userPrivateKey, provider);
        const userContract = new ethers.Contract(stableCoinAddress, stableCoinAbi, userWallet);
        const tx = await userContract.depositAndMint({
            value: BigInt(amountInWei)  // Sending raw Wei as BigInt
        });
        const receipt = await tx.wait();
        const contractInterface = new ethers.Interface(stableCoinAbi);
        let collateralDeposited = null;
        let mintedAmount = null;
        for (const log of receipt.logs) {
            if (log.address.toLowerCase() !== stableCoinAddress.toLowerCase()) continue;
            try {
                const parsedLog = contractInterface.parseLog(log);
                if (parsedLog.name === "Minted") {
                    collateralDeposited = parsedLog.args.collateralDeposited;
                    mintedAmount = parsedLog.args.stableCoinMinted;
                    break;
                }
            } catch (err) {
                continue;
            }
        }
        if (collateralDeposited && mintedAmount) {
            res.send(`Deposited collateral: ${collateralDeposited.toString()} Wei\nMinted amount: ${mintedAmount.toString()} SE`);
        } else {
            res.send("Minted, but no Minted event found in contract logs");
        }
    } catch (error) {
        console.error("Deposit and mint error:", error);
        res.status(500).send('Error processing deposit and mint');
    }
});

// POST endpoint to burn stable coins and withdraw equivalent ETH collateral
app.post('/burn_and_withdraw', async (req, res) => {
    try {
        const { userAddress, stableCoinAmount } = req.body;  
        const userPrivateKey = addressToPrivateKey[userAddress];
        const userWallet = new ethers.Wallet(userPrivateKey, provider);
        const userContract = new ethers.Contract(stableCoinAddress, stableCoinAbi, userWallet);
        const tx = await userContract.burnAndWithdraw(stableCoinAmount);
        const receipt = await tx.wait();
        const contractInterface = new ethers.Interface(stableCoinAbi);
        let burnedAmount = null;
        let returnedCollateral = null;
        for (const log of receipt.logs) {
            if (log.address.toLowerCase() !== stableCoinAddress.toLowerCase()) continue;

            try {
                const parsedLog = contractInterface.parseLog(log);
                if (parsedLog.name === "Burned") {
                    burnedAmount = parsedLog.args.stableCoinBurned;
                    returnedCollateral = parsedLog.args.collateralReturned;
                    break;
                }
            } catch (err) {
                continue;
            }
        }
        if (burnedAmount && returnedCollateral) {
            res.send(`Burned: ${burnedAmount.toString()} SE\nReturned collateral: ${returnedCollateral.toString()} Wei`);
        } else {
            res.send("Burned, but no Burned event found in contract logs");
        }
    } catch (error) {
        console.error("Burn and withdraw error:", error);
        res.status(500).send('Error processing burn and withdraw');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});