require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

module.exports = {
  solidity: "0.8.28",
  networks: {
    besuNode1: {
      url: process.env.NODE_1_RPC_URL,
      accounts: [process.env.ACCOUNT_1_PRIVATE_KEY, process.env.ACCOUNT_2_PRIVATE_KEY, process.env.ACCOUNT_3_PRIVATE_KEY]
    },
    besuNode2: {
      url: process.env.NODE_2_RPC_URL,
      accounts: [process.env.ACCOUNT_1_PRIVATE_KEY, process.env.ACCOUNT_2_PRIVATE_KEY, process.env.ACCOUNT_3_PRIVATE_KEY]
    },
    besuNode3: {
      url: process.env.NODE_3_RPC_URL,
      accounts: [process.env.ACCOUNT_1_PRIVATE_KEY, process.env.ACCOUNT_2_PRIVATE_KEY, process.env.ACCOUNT_3_PRIVATE_KEY]
    },
    besuNode4: {
      url: process.env.NODE_4_RPC_URL,
      accounts: [process.env.ACCOUNT_1_PRIVATE_KEY, process.env.ACCOUNT_2_PRIVATE_KEY, process.env.ACCOUNT_3_PRIVATE_KEY]
    },
  }
};
