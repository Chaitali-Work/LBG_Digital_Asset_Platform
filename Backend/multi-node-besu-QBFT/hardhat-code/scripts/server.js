require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');
const app = express();
const port = 4000;

// Middleware to parse JSON bodies
app.use(express.json());

// Connect to the Besu node
// const provider = new ethers.JsonRpcProvider('http://localhost:8545');
// const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

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

// ABI of the StableCoin contract
const stableCoinAbi = [
    "function totalSupply() public view returns (uint256)",
    "function balanceOf(address account) public view returns (uint256)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "function mint(address to, uint256 amount) public",
    "function burn(uint256 amount) public",
    "function transfer(address to, uint256 amount) public returns (bool)",
    "function rewards(address account) public view returns (uint256)",
    "event RewardIssued(address indexed to, uint256 value)",
    "function issueReward(address to, uint256 amount) public",
    "function claimReward(uint256 amount) public"
];

// Address of the deployed StableCoin contract
const stableCoinAddress = '0xDE87AF9156a223404885002669D3bE239313Ae33';

// GET endpoint to retrieve the total supply of the coins
app.get('/totalSupply', async (req, res) => {
    try {
        const contract = new ethers.Contract(stableCoinAddress, stableCoinAbi, provider);
        const totalSupply = await contract.totalSupply();
        res.json({ totalSupply: totalSupply.toString() });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving total supply');
    }
});

// GET endpoint to retrieve the balance of an address
app.get('/balance/:address', async (req, res) => {
    try {
        const address = req.params.address;
        const contract = new ethers.Contract(stableCoinAddress, stableCoinAbi, provider);
        const balance = await contract.balanceOf(address);
        res.json({ address, balance: balance.toString() });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving balance');
    }
});

// GET endpoint to retrieve the rewards of an address
app.get('/reward/:address', async (req, res) => {
    try {
        const address = req.params.address;
        const contract = new ethers.Contract(stableCoinAddress, stableCoinAbi, provider);
        const reward = await contract.rewards(address);
        res.json({ address, reward: reward.toString() });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving rewards');
    }
});

// POST endpoint to mint new coins
app.post('/mint', async (req, res) => {
    try {
        const { userAddress, to, amount } = req.body;

        // Verify that the userAddress is the owner
        if (userAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
            return res.status(403).send('Only owner is authorized to mint coins!');
        }

        // Get the private key for the user's address
        const userPrivateKey = addressToPrivateKey[userAddress];

        // Create a wallet instance for the user
        const userWallet = new ethers.Wallet(userPrivateKey, provider);

        const userContract = new ethers.Contract(stableCoinAddress, stableCoinAbi, userWallet);

        // Check if the 'to' address is the zero address
        if (to === ethers.ZeroAddress) {
            return res.status(400).send('You cannot mint to zero address!');
        }

        // Mining the transaction
        const tx = await userContract.mint(to, amount);
        await tx.wait();
        res.send(`Congratulations! You have successfully minted ${amount} SE to ${to}`);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error minting coins');
    }
});

// POST endpoint to burn coins
app.post('/burn', async (req, res) => {
    try {
        const { userAddress, amount } = req.body;

        // Get the private key for the user's address
        const userPrivateKey = addressToPrivateKey[userAddress];

        // Create a wallet instance for the user
        const userWallet = new ethers.Wallet(userPrivateKey, provider);

        const userContract = new ethers.Contract(stableCoinAddress, stableCoinAbi, userWallet);

        // Check if the account has sufficient balance to burn
        const balance = await userContract.balanceOf(userAddress);
        if (amount > balance) {
            return res.status(400).send(`Burning ${amount} SE exceeds your account balance ${balance} SE!`);
        }

        // Mining the transaction
        const tx = await userContract.burn(amount);
        await tx.wait();
        res.send(`You have successfully burned ${amount} SE!`);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error burning coins');
    }
});

// POST endpoint to transfer tokens
app.post('/transfer', async (req, res) => {
    try {
        const { userAddress, to, amount } = req.body;

        // Get the private key for the user's address
        const userPrivateKey = addressToPrivateKey[userAddress];

        // Create a wallet instance for the user
        const userWallet = new ethers.Wallet(userPrivateKey, provider);

        const userContract = new ethers.Contract(stableCoinAddress, stableCoinAbi, userWallet);

        // Check if the 'to' address is the zero address
        if (to === ethers.ZeroAddress) {
            return res.status(400).send('You cannot transfer to zero address!');
        }

        // Check the sender's balance before attempting to transfer
        const balance = await userContract.balanceOf(userAddress);
        if (amount > balance) {
            return res.status(400).send(`Transferring ${amount} SE exceeds your account balance ${balance} SE!`);
        }

        // Mining the transaction
        const tx = await userContract.transfer(to, amount);
        await tx.wait();
        res.send(`You have successfully transferred ${amount} SE to ${to}!`);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error transferring tokens');
    }
});

// POST endpoint to issue rewards
app.post('/issueReward', async (req, res) => {
    try {
        const { userAddress, to, amount } = req.body;

        // Verify that the userAddress is the owner
        if (userAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
            return res.status(403).send('Only owner is authorized to issue reward points!');
        }

        // Get the private key for the user's address
        const userPrivateKey = addressToPrivateKey[userAddress];

        // Create a wallet instance for the user
        const userWallet = new ethers.Wallet(userPrivateKey, provider);

        const userContract = new ethers.Contract(stableCoinAddress, stableCoinAbi, userWallet);

        // Check if the 'to' address is the zero address
        if (to === ethers.ZeroAddress) {
            return res.status(400).send('You cannot issue rewards to zero address!');
        }

        // Mining the transaction
        const tx = await userContract.issueReward(to, amount);
        await tx.wait();
        res.send(`Congratulations! You have successfully issued ${amount} reward points to ${to}`);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error issuing reward');
    }
});

// POST endpoint to claim rewards
app.post('/claimReward', async (req, res) => {
    try {
        const { userAddress, amount } = req.body;

        // Get the private key for the user's address
        const userPrivateKey = addressToPrivateKey[userAddress];

        // Create a wallet instance for the user
        const userWallet = new ethers.Wallet(userPrivateKey, provider);

        const userContract = new ethers.Contract(stableCoinAddress, stableCoinAbi, userWallet);

        // Check the sender's reward balance  before attempting to claim
        const rewardBalance = await userContract.rewards(userAddress);
        if (rewardBalance <= 0) {
            return res.status(400).send('You have no reward points to claim!');
        }
        if (amount > rewardBalance) {
            return res.status(400).send(`Your claim exceeds reward points balance ${rewardBalance}!`);
        }

        // Mining the transaction
        const tx = await userContract.claimReward(amount);
        await tx.wait();
        res.send(`Congratulations! You have successfully claimed ${amount} reward points`);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error claiming reward');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});