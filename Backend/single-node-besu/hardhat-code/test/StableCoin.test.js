const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StableCoin", function () {
    let StableCoin, stableCoin, owner, addr1;

    beforeEach(async function () {
        StableCoin = await ethers.getContractFactory("StableCoin");
        [owner, addr1] = await ethers.getSigners();
        stableCoin = await StableCoin.deploy();
        await stableCoin.waitForDeployment();        
    });

    it("Should set the right owner", async function () {
        expect(await stableCoin.owner()).to.equal(owner.address);        
    });

    it("Should assign the total supply of tokens to the owner", async function () {
        const ownerBalance = await stableCoin.balanceOf(owner.address);
        expect(await stableCoin.totalSupply()).to.equal(ownerBalance);        
    });

    describe("Mint Function", function () {
        it("Should mint tokens to a specified address by the owner", async function () {
            await stableCoin.mint(addr1.address, 50);
            expect(await stableCoin.balanceOf(addr1.address)).to.equal(50);            
        });

        it("Should increase the total supply when tokens are minted", async function () {
            await stableCoin.mint(addr1.address, 50);
            expect(await stableCoin.totalSupply()).to.equal(1050);
        })

        it("Should revert if non-owner tries to mint tokens", async function () {
            await expect(
                stableCoin.connect(addr1).mint(addr1.address, 100)
            ).to.be.revertedWith("Not the contract owner");            
        });
    });

    describe("Burn Function", function () {
        it("Should burn tokens from the caller's balance", async function () {
            await stableCoin.burn(50);
            expect(await stableCoin.balanceOf(owner.address)).to.equal(950);            
        });

        it("Should decrease the total supply when tokens are burned", async function () {
            await stableCoin.burn(50);
            expect(await stableCoin.totalSupply()).to.equal(950);
        });

        it("Should revert if trying to burn more tokens than the caller's balance", async function () {
            await expect(
                stableCoin.connect(addr1).burn(50)
            ).to.be.revertedWith("Insufficient balance");
        });
    })

    describe("Transfer Function", function () {
        it("Should transfer tokens between accounts", async function () {
            await stableCoin.transfer(addr1.address, 50);
            expect(await stableCoin.balanceOf(owner.address)).to.equal(950);
            expect(await stableCoin.balanceOf(addr1.address)).to.equal(50);
        });

        it("Should emit a Transfer event when tokens are transferred", async function () {
            await expect(stableCoin.transfer(addr1.address, 50))
             .to.emit(stableCoin, "Transfer")
             .withArgs(owner.address, addr1.address, 50);
        });

        it("Should revert if trying to transfer more tokens than the available", async function () {
            await expect(
                stableCoin.connect(addr1).transfer(owner.address, 1)
            ).to.be.revertedWith("Insufficient balance");
        });
    });

    describe("Issue Reward Function", function () {
        it("Should issue rewards to the specified address by the owner", async function () {
            await stableCoin.issueReward(addr1.address, 100);
            expect(await stableCoin.rewards(addr1.address)).to.equal(100);
        });

        it("Should increase the total supply when rewards are issued", async function () {
            await stableCoin.issueReward(addr1.address, 100);
            expect(await stableCoin.totalSupply()).to.equal(1100);
        });

        it("Should emit a RewardIssued event when rewards are issued", async function () {
            await expect(stableCoin.issueReward(addr1.address, 100))
             .to.emit(stableCoin, "RewardIssued")
             .withArgs(addr1.address, 100);
        });

        it("Should revert if a non-owner tries to issue rewards", async function () {
            await expect(
                stableCoin.connect(addr1).issueReward(addr1.address, 100)
            ).to.be.revertedWith("Not the contract owner");
        });
    });

    describe("Claim Reward Function", function () {
        beforeEach(async function () {
            await stableCoin.issueReward(addr1.address, 100);
        });

        it("Should allow a user to claim their rewards and increase token balance", async function () {
            await stableCoin.connect(addr1).claimReward(50);
            expect(await stableCoin.balanceOf(addr1.address)).to.equal(50);
            expect(await stableCoin.rewards(addr1.address)).to.equal(50);
        });

        it("Should revert if trying to claim more rewards than available", async function () {
            await expect(
                stableCoin.connect(addr1).claimReward(150)
            ).to.be.revertedWith("Claim amount exceeds rewards balance");
        });

        it("Should revert if there are no rewards to claim", async function () {
            await stableCoin.connect(addr1).claimReward(100);
            await expect(
                stableCoin.connect(addr1).claimReward(1)
            ).to.be.revertedWith("No rewards to claim");
        });
    });

});