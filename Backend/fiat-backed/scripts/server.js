require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');
const { MongoClient } = require('mongodb');
const app = express();
const bodyParser = require("body-parser");

const port = 4242;

const mongoUri = process.env.MONGODB_URI;
const dbName = "stablecoinDB";
let db;

MongoClient.connect(mongoUri, { useUnifiedTopology: true })
    .then(client => {
        db = client.db(dbName);
        console.log("connected to MongoDB");
    })
    .catch(error => {
        console.error("MongoDB connection failed:", error);
    });

// Use raw body parser ONLY for Stripe webhook
app.use("/webhook", bodyParser.raw({ type: "application/json" }));

// Middleware to parse JSON bodies
// Use JSON parser for all other routes
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
    "event Minted(address indexed to, uint256 tokenAmount)",
    "event Burned(address indexed from, uint256 tokenAmount)",
    "function mint(address to, uint256 amount) external",
    "function burn(address from, uint256 amount) external"
];

// Address of the deployed StableCoin contract
const stableCoinAddress = '0xE62b93777e666224cC8029c21a31311554e2F10E';

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

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

app.post("/create_express_account", async (req, res) => {
    const { email } = req.body;
    try {
        const account = await stripe.accounts.create({
            type: "express",
            country: "GB",
            email,
            capabilities: {
                transfers: { requested: true },
                card_payments: { requested: true }
            }
        });
        console.log("Express account created:", account.id);
        res.json({ connectedAccountId: account.id });
    } catch (error) {
        console.error("Error creating Express account:", error);
        res.status(500).send("Express account creation failed");
    }
});

app.post("/generate_onboarding_link", async (req, res) => {
    const { connectedAccountId } = req.body;
    try {
        const accountLink = await stripe.accountLinks.create({
            account: connectedAccountId,
            refresh_url: "http://localhost:4242/reauth",
            return_url: `http://localhost:4242/onboarding_complete?accountId=${connectedAccountId}`,
            type: "account_onboarding"
        });
        res.json({ onboardingUrl: accountLink.url });
    } catch (error) {
        console.error("Error generating onboarding link:", error);
        res.status(500).send("Failed to generate onboarding link");
    }
});

app.get("/onboarding_complete", async (req, res) => {
    const connectedAccountId = req.query.accountId;

    const walletDoc = await db.collection("walletPool").findOne({});
    const walletAddress = walletDoc.walletAddress;

    await db.collection("bindings").insertOne({
        connectedAccountId,
        walletAddress
    });

    await db.collection("walletPool").deleteOne({ walletAddress });

    res.send(`<h4>User onboarded successfully</h4>`);
});

app.post("/create_checkout_session", async (req, res) => {
    const { connectedAccountId, amount } = req.body;
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{
                price_data: {
                    currency: "gbp",
                    product_data: {
                        name: "Fund Connected Account"
                    },
                    unit_amount: amount * 100
                },
                quantity: 1,
            }],
            mode: "payment",
            success_url: "http://localhost:4242/success",
            cancel_url: "http://localhost:4242/cancel",
            payment_intent_data: {
                on_behalf_of: connectedAccountId,
                transfer_data: {
                    destination: connectedAccountId
                }
            }
        });
        res.json({ checkoutUrl: session.url });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Failed to create checkout session");
    }
});

app.get("/success", (req, res) => {
    res.send("<h4>Funded successfully</h4>")
})

app.post("/transfer_to_custodian", async (req, res) => {
    const { connectedAccountId, amount } = req.body;
    try {
        const transfer = await stripe.transfers.create(
            {
                amount: amount * 100,
                currency: "gbp",
                destination: process.env.CUSTODIAN_STRIPE_ACCOUNT_ID,
            },
            {
                stripeAccount: connectedAccountId
            }
        );

        console.log(`${connectedAccountId} has made a payment of £${amount} GBP`);

        res.json({
            transferId: transfer.id
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Transaction failed");
    }
});

app.post("/webhook", async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return res.sendStatus(400);
    }
    if (event.type === "payment.created") {
        const payment = event.data.object;

        if (payment.status === "succeeded" && payment.source_transfer) {
            const connectedAccountId = payment.source.id;
            const amount = payment.amount / 100;

            const account = await stripe.accounts.retrieve(connectedAccountId);
            const email = account.email;

            const binding = await db.collection("bindings").findOne({ connectedAccountId });

            if (!binding || !binding.walletAddress) {
                console.warn('----------------------');
                return res.status(200).send('No wallet found');
            }

            try {
                const walletAddress = binding.walletAddress;
                const walletPrivateKey = addressToPrivateKey[walletAddress];
                const userWallet = new ethers.Wallet(walletPrivateKey, provider);
                const contract = new ethers.Contract(stableCoinAddress, stableCoinAbi, userWallet);

                const tx = await contract.mint(walletAddress, amount);
                const receipt = await tx.wait();

                let tokenAmount = null;
                for (const log of receipt.logs) {

                    try {
                        const parsedLog = contract.interface.parseLog(log);
                        if (parsedLog.name === "Minted") {
                            tokenAmount = parsedLog.args.tokenAmount;
                            break;
                        }
                    } catch (err) {
                        continue;
                    }
                }

                await db.collection("mintLogs").insertOne({
                    email: email,
                    connectedAccountId,
                    amount,
                    transferId: payment.source_transfer,
                    walletAddress,
                    tokenAmount: tokenAmount,
                    txHash: tx.hash
                });

                console.log(`Minted ${amount} TGBP to ${walletAddress}`);

            } catch (err) {
                console.error("Minting failed:", err.message);
            }

        }
    }
    res.sendStatus(200);
});

app.post("/redeem", async (req, res) => {
    const { walletAddress, amount } = req.body;
    try {

        const walletPrivateKey = addressToPrivateKey[walletAddress];
        const userWallet = new ethers.Wallet(walletPrivateKey, provider);
        const contract = new ethers.Contract(stableCoinAddress, stableCoinAbi, userWallet);

        const tx = await contract.burn(walletAddress, amount);
        const receipt = await tx.wait();

        console.log(`Burned ${amount} TGBP from ${walletAddress}`);

        let tokenAmount = null;
        for (const log of receipt.logs) {

            try {
                const parsedLog = contract.interface.parseLog(log);
                if (parsedLog.name === "Burned") {
                    tokenAmount = parsedLog.args.tokenAmount;
                    break;
                }
            } catch (err) {
                continue;
            }
        }

        const binding = await db.collection("bindings").findOne({ walletAddress });

        const connectedAccountId = binding.connectedAccountId;

        const transfer = await stripe.transfers.create(
            {
                amount: amount * 100,
                currency: "gbp",
                destination: connectedAccountId,
                description: `Redemption of ${amount} TGBP`
            }
        );

        console.log(`${connectedAccountId} has been paid back £${amount} GBP`);

        const account = await stripe.accounts.retrieve(connectedAccountId);
        const email = account.email;

        await db.collection("burnLogs").insertOne({
            walletAddress,
            tokenAmount: tokenAmount,
            txHash: tx.hash,
            email: email,
            connectedAccountId,
            amount,
            transferId: transfer.id
        })

        res.json({
            txHash: tx.hash,
            transferId: transfer.id,
            message: "Transaction successful"
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Transaction failed");
    }

})

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});