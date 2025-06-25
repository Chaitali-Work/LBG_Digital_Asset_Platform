require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.0",
  networks: {
    besu: {
      url: "http://localhost:8545",
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
