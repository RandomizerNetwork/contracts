const chai = require("chai");
const { network, ethers } = require("hardhat");
const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { solidity } = require("ethereum-waffle");
chai.use(solidity);
const { expect } = require("chai");
const toWei = (amount) => ethers.utils.parseEther(amount)
const fromWei = (amount) => ethers.utils.formatEther(amount)

const minter = ethers.utils.getAddress("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
const wallet = ethers.utils.getAddress("0x70997970c51812dc3a010c7d01b50e0d17dc79c8");

describe("RNToken", function () {
  beforeEach(async () => {
    const RNToken = await ethers.getContractFactory("RNToken");
    this.rn = await RNToken.deploy();
    await this.rn.deployed();

    this.totalSupply = await this.rn.totalSupply();

    await network.provider.request({ method: "hardhat_impersonateAccount",  params: [minter] });
    await network.provider.send("hardhat_setBalance", [minter, "0x4563918244F4000000"]); // 1280 BNB
    this.signer = await ethers.provider.getSigner(minter);

    const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
    await provider.send("hardhat_impersonateAccount", [wallet]);
    await network.provider.request({ method: "hardhat_impersonateAccount", params: [wallet] });
    await network.provider.send("hardhat_setBalance", [minter, "0x4563918244F40000000"]); // 1280 BNB
    this.signerWallet = await provider.getSigner(wallet);
  });

  it("should check if token has correct name", async () => {
    expect(await this.rn.name()).to.equal('Randomizer Network', "Token name is not correct")
  })

  it("should check if token has correct symbol", async () => {
    expect(await this.rn.symbol()).to.equal('RN', "Token symbol is not correct")
  })

  it("should check if token has correct decimals", async () => {
    expect(await this.rn.decimals()).to.equal(18, "Token decimals is not correct")
  })

  it("should check if initial owner balance equals to TotalSupply", async () => {
    expect(await this.rn.balanceOf(minter)).to.equal(await this.rn.totalSupply(), "Owner should initialy own all RN Tokens")
  });

  it("should check if transfers work correctly", async () => {
    const totalSupply = await this.rn.totalSupply() ;
    expect(await this.rn.balanceOf(minter)).to.equal(totalSupply, "Owner address must initialy have total supply");
    expect(await this.rn.balanceOf(wallet)).to.equal(0, "Wallet address must initialy have 0 Tokens");
    await this.rn.transfer(wallet, toWei("1000000"))
    expect(await this.rn.balanceOf(minter)).to.equal(totalSupply.sub(toWei("1000000")), "Owner address should have total supply minus 1M RN Tokens");
    expect(await this.rn.balanceOf(wallet)).to.equal(toWei("1000000"), "Wallet address has received 1M Tokens");
  });

  it("should check if approve and transferFrom works correctly", async () => {
    expect(await this.rn.balanceOf(minter)).to.equal(this.totalSupply, "Wallet address must initialy have all RN Tokens");
    const approve = await this.rn.connect(this.signer).approve(wallet, toWei("2000001"));
    await approve.wait();
    expect(await this.rn.allowance(minter, wallet)).to.equal(toWei("2000001"), "Wallet address must initialy have all RN Tokens");
    expect(await this.rn.connect(this.signerWallet).transferFrom(minter, wallet, toWei("2000000")))
  });

  it("should check if burn function works correctly", async () => {
    expect(await this.rn.balanceOf(minter)).to.equal(this.totalSupply, "Owner should have all total supply")
    await this.rn.connect(this.signer).burn(toWei("100"))
    expect(await this.rn.balanceOf(minter)).to.equal(this.totalSupply.sub(toWei("100")), "Owner should have 100 tokens less than total supply");
  });

  it("should check if increaseAllowance and decreaseAllowance works correctly", async () => {
    expect(await this.rn.allowance(minter, wallet)).to.equal(toWei("0"), "RN Tokens is not 0");
    
    await this.rn.connect(this.signer).increaseAllowance(wallet, toWei("200"));
    expect(await this.rn.allowance(minter, wallet)).to.equal(toWei("200"), "Should be 1 token");
    await this.rn.connect(this.signerWallet).transferFrom(minter, wallet, toWei("100"))

    const decreaseAllowance = await this.rn.connect(this.signer).decreaseAllowance(this.signerWallet._address, toWei("1"))
    decreaseAllowance.wait();
    expect(await this.rn.allowance(minter, wallet)).to.equal(toWei("99"), "Should still be equal to 1 because above tx fails");
    
    await this.rn.connect(this.signer).increaseAllowance(this.signerWallet._address, toWei("100"))
    expect(await this.rn.allowance(minter, wallet)).to.equal(toWei("199"), "Should be equal to 199");

    await this.rn.connect(this.signer).decreaseAllowance(this.signerWallet._address, toWei("199"))
    expect(await this.rn.allowance(minter, wallet)).to.equal(toWei("0"), "Should be equal to 0");
  });
  
});