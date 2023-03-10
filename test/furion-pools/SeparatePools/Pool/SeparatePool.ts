import { BigNumber } from "@ethersproject/bignumber";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { ethers } from "hardhat";

import { Signers } from "../../../types";
import { getBlockTimestamp, mineTo } from "../../../utils";
import { deploySPFixture } from "./SeparatePool.fixture";

describe("Separate Pool", function () {
  // Convert to smallest unit (10^18)
  function su(amount: string): BigNumber {
    return ethers.utils.parseEther(amount);
  }

  // Signers declaration
  before(async function () {
    this.signers = {} as Signers;

    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.admin = signers[0];
    this.signers.bob = signers[1];
    this.signers.alice = signers[2];

    this.loadFixture = loadFixture;
  });

  beforeEach(async function () {
    const { nft, fur, sp } = await this.loadFixture(deploySPFixture);
    this.nft = nft;
    this.fur = fur;
    this.sp = sp;
  });

  context("Selling", async function () {
    it("should sell one NFT", async function () {
      // Sell NFT event emission, total gas: 120624
      await expect(this.sp.connect(this.signers.admin).sell(0)).to.emit(this.sp, "SoldNFT");
      // NFT transferred to pool contract
      expect(await this.nft.ownerOf(0)).to.equal(this.sp.address);
      // F-* token balance increase
      expect(await this.sp.balanceOf(this.signers.admin.address)).to.equal(su("1000"));
    });

    it("should sell multiple NFTs in one tx", async function () {
      // Batch selling, total gas: 156014
      await this.sp.connect(this.signers.admin).sellBatch([0, 1, 2]);
      // NFT transferred to pool contract
      expect(await this.nft.balanceOf(this.sp.address)).to.equal(3);
      // F-* token balance increase
      expect(await this.sp.balanceOf(this.signers.admin.address)).to.equal(su("3000"));
    });

    it("should not allow selling of more than 9 NFTs in one tx", async function () {
      // Admin tries to sell 10 NFTs in one tx
      await expect(this.sp.connect(this.signers.admin).sellBatch([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])).to.be.revertedWith(
        "SeparatePool: Can only sell 9 NFTs at once",
      );
    });
  });

  context("Buying", async function () {
    it("should buy one NFT", async function () {
      // Admin sells one NFT, gets 1000 pool tokens
      await this.sp.connect(this.signers.admin).sell(0);
      // Admin transfers 1000 tokens to Bob
      await this.sp.connect(this.signers.admin).transfer(this.signers.bob.address, su("1000"));
      // Bob buys one NFT with 1000 tokens, check event emission
      await expect(this.sp.connect(this.signers.bob).buy(0)).to.emit(this.sp, "BoughtNFT");
      expect(await this.nft.ownerOf(0)).to.equal(this.signers.bob.address);
      // F-NFT: 1000 - 1000 = 0
      expect(await this.sp.balanceOf(this.signers.bob.address)).to.equal(0);
      // FUR: 1000 - 100 = 900
      expect(await this.fur.balanceOf(this.signers.bob.address)).to.equal(su("900"));
    });

    it("should buy multiple NFTs in one tx", async function () {
      // Admin sells three NFTs, gets 3000 pool tokens
      await this.sp.connect(this.signers.admin).sellBatch([0, 1]);
      // Admin transfers 2000 tokens to Bob
      await this.sp.connect(this.signers.admin).transfer(this.signers.bob.address, su("2000"));
      // Bob buys the two NFTs with 2000 tokens
      await this.sp.connect(this.signers.bob).buyBatch([0, 1]);
      expect(await this.nft.ownerOf(0)).to.equal(this.signers.bob.address);
      expect(await this.nft.ownerOf(1)).to.equal(this.signers.bob.address);
      // F-NFT: 2000 - 2000 = 0
      expect(await this.sp.balanceOf(this.signers.bob.address)).to.equal(0);
      // FUR: 1000 - 100 * 2 = 800
      expect(await this.fur.balanceOf(this.signers.bob.address)).to.equal(su("800"));
    });

    it("should not allow buying of more than 9 NFTs in one tx", async function () {
      // Admin sells 10 NFTs separately, gets 10000 F-NFT
      await this.sp.connect(this.signers.admin).sellBatch([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      await this.sp.connect(this.signers.admin).sell(9);
      // Admin transfers 10000 tokens to Bob
      await this.sp.connect(this.signers.admin).transfer(this.signers.bob.address, su("10000"));
      // Bob tries to buy 10 NFTs with 10000 tokens in one tx should fail
      await expect(this.sp.connect(this.signers.bob).buyBatch([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])).to.be.revertedWith(
        "SeparatePool: Can only buy 9 NFTs at once",
      );
    });
  });

  context("Locking", async function () {
    it("should lock one NFT", async function () {
      // Lock NFT, check event emission
      await expect(this.sp.connect(this.signers.bob).lock(10)).to.emit(this.sp, "LockedNFT");
      expect(await this.nft.ownerOf(10)).to.equal(this.sp.address);
      // Check release time
      const timeOfLock: number = await getBlockTimestamp();
      const releaseTime: number = timeOfLock + 30 * 24 * 3600;
      const lockInfo = await this.sp.getLockInfo(10);
      expect(lockInfo[2]).to.equal(releaseTime);
      // Gets 500 F-NFT
      expect(await this.sp.balanceOf(this.signers.bob.address)).to.equal(su("500"));
      // Pays 150 FUR as fee, 1000 - 150 = 850 FUR
      expect(await this.fur.balanceOf(this.signers.bob.address)).to.equal(su("850"));
    });

    it("should lock multiple NFTs in one tx", async function () {
      // Lock NFT, check event emission
      await expect(this.sp.connect(this.signers.bob).lockBatch([10, 11])).to.emit(this.sp, "LockedNFT");
      expect(await this.nft.ownerOf(10)).to.equal(this.sp.address);
      expect(await this.nft.ownerOf(11)).to.equal(this.sp.address);
      // Check release time
      const timeOfLock: number = await getBlockTimestamp();
      const releaseTime: number = timeOfLock + 30 * 24 * 3600;
      let lockInfo = await this.sp.getLockInfo(10);
      expect(lockInfo[2]).to.equal(releaseTime);
      lockInfo = await this.sp.getLockInfo(11);
      expect(lockInfo[2]).to.equal(releaseTime);
      // Gets 1000 F-NFT
      expect(await this.sp.balanceOf(this.signers.bob.address)).to.equal(su("1000"));
      // Pays 150 FUR as fee, 1000 - 150 * 2 = 700 FUR
      expect(await this.fur.balanceOf(this.signers.bob.address)).to.equal(su("700"));
    });

    it("should extend NFT release time by paying before original release time", async function () {
      // Lock NFT
      await this.sp.connect(this.signers.bob).lock(10);
      const timeOfLock: number = await getBlockTimestamp();
      // Extend 30 days
      await this.sp.connect(this.signers.bob).payFee(10);
      // Pays 150 * 2 = 300 FUR as fees in total, 1000 - 300 = 700 FUR
      expect(await this.fur.balanceOf(this.signers.bob.address)).to.equal(su("700"));
      // Check extension
      const releaseTime: number = timeOfLock + 2 * 30 * 24 * 3600;
      const lockInfo = await this.sp.getLockInfo(10);
      expect(lockInfo[2]).to.equal(releaseTime);
    });

    it("should not allow extending of release time if original release time has passed", async function () {
      // Lock NFT
      await this.sp.connect(this.signers.bob).lock(10);
      const timeOfLock: number = await getBlockTimestamp();
      // 31 days after locking
      await mineTo(timeOfLock + 31 * 24 * 3600);
      // Extend release time should fail
      await expect(this.sp.connect(this.signers.bob).payFee(10)).to.be.revertedWith(
        "SeparatePool: NFT already released",
      );
    });

    it("should succeed with correct mint amount given non-zero mint buffer", async function () {
      // Increase F-X lock mint amount to 550
      await this.sp.connect(this.signers.admin).setLockMintBuffer(su("50"));
      // Lock NFT
      await this.sp.connect(this.signers.bob).lock(10);
      expect(await this.sp.balanceOf(this.signers.bob.address)).to.equal(su("550"));
    });
  });

  context("Redeeming", async function () {
    it("should redeem NFT within release time", async function () {
      // Bob locks two NFTs, get 1000 tokens
      await this.sp.connect(this.signers.bob).lockBatch([10, 11]);
      const timeOfLock: number = await getBlockTimestamp();
      // 7 days after locking
      await mineTo(timeOfLock + 7 * 24 * 3600);
      // Bob redeems 1 NFT, check event emission
      await expect(this.sp.connect(this.signers.bob).redeem(10)).to.emit(this.sp, "RedeemedNFT");
      expect(await this.nft.ownerOf(10)).to.equal(this.signers.bob.address);
      expect(await this.nft.ownerOf(11)).to.equal(this.sp.address);
      // 1000 - 500 = 500
      expect(await this.sp.balanceOf(this.signers.bob.address)).to.equal(su("500"));
    });

    it("should not redeem NFT if caller is not locker", async function () {
      // Bob locks NFT, get 500 tokens
      await this.sp.connect(this.signers.bob).lock(10);
      // Redeem NFT should fail
      await expect(this.sp.connect(this.signers.admin).redeem(10)).to.be.revertedWith(
        "SeparatePool: You did not lock this NFT.",
      );
    });

    it("should not redeem NFT after release time", async function () {
      // Bob locks NFT, get 500 tokens
      await this.sp.connect(this.signers.bob).lock(10);
      const timeOfLock: number = await getBlockTimestamp();
      // 31 days after locking
      await mineTo(timeOfLock + 31 * 24 * 3600);
      // Admin tries to redeem NFT should fail
      await expect(this.sp.connect(this.signers.bob).redeem(10)).to.be.revertedWith(
        "SeparatePool: NFT has already been released to public pool.",
      );
    });

    it("should succeed with correct burn amount if mint buffer is unchanged", async function () {
      // Increase F-X lock mint amount to 550
      await this.sp.connect(this.signers.admin).setLockMintBuffer(su("50"));
      // Lock NFT
      await this.sp.connect(this.signers.bob).lock(10);
      // Redeem NFT
      await this.sp.connect(this.signers.bob).redeem(10);
      expect(await this.sp.balanceOf(this.signers.bob.address)).to.equal(0);
    });

    it("should succeed with correct burn amount if mint buffer is changed", async function () {
      // Lock NFT
      await this.sp.connect(this.signers.bob).lock(10);
      // Increase F-X lock mint amount to 550
      await this.sp.connect(this.signers.admin).setLockMintBuffer(su("50"));
      // Redeem NFT
      await this.sp.connect(this.signers.bob).redeem(10);
      expect(await this.sp.balanceOf(this.signers.bob.address)).to.equal(0);
    });
  });

  // Admin is owner, only admin can release NFTs
  context("Releasing", async function () {
    it("should release NFT that has passed release time", async function () {
      // Bob locks NFT
      await this.sp.connect(this.signers.bob).lock(10);
      const timeOfLock: number = await getBlockTimestamp();
      // 31 days after locking
      await mineTo(timeOfLock + 31 * 24 * 3600);
      // Admin releases Bob's NFT, making it available for buying, check event emission
      await expect(this.sp.connect(this.signers.admin).release(10)).to.emit(this.sp, "ReleasedNFT");
      // Bob gets remaining 200 F-NFT, loses 300 F-NFT as punishment
      expect(await this.sp.balanceOf(this.signers.bob.address)).to.equal(su("700"));
      // Admin sells own NFTs and gets 2000 tokens
      await this.sp.connect(this.signers.admin).sellBatch([0, 1]);
      // Admin buys the released NFT owned by Bob originally
      await this.sp.connect(this.signers.admin).buy(10);
      expect(await this.nft.ownerOf(10)).to.equal(this.signers.admin.address);
    });

    it("should not allow anyone other than owner to release NFT", async function () {
      // Bob locks NFT
      await this.sp.connect(this.signers.bob).lock(10);
      const timeOfLock: number = await getBlockTimestamp();
      // 31 days after locking
      await mineTo(timeOfLock + 31 * 24 * 3600);
      // Alice tries to release Bob's NFT, should fail
      await expect(this.sp.connect(this.signers.alice).release(10)).to.be.revertedWith(
        "SeparatePool: Not permitted to call.",
      );
    });

    it("should not release NFT that has not passed release time", async function () {
      // Bob locks NFT
      await this.sp.connect(this.signers.bob).lock(10);
      const timeOfLock: number = await getBlockTimestamp();
      // 7 days after locking
      await mineTo(timeOfLock + 7 * 24 * 3600);
      // Admin tries to release Bob's NFT, should fail
      await expect(this.sp.connect(this.signers.admin).release(10)).to.be.revertedWith(
        "SeparatePool: Release time not yet reached.",
      );
    });
  });

  context("Setting mint buffer", async function () {
    it("should fail with new buffer amount greater than 100", async function () {
      await expect(this.sp.connect(this.signers.admin).setLockMintBuffer(su("101"))).to.be.revertedWith(
        "Buffer too large",
      );
    });
  });
});
