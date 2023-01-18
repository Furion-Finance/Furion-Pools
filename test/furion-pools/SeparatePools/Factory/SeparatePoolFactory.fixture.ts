import { BigNumber } from "@ethersproject/bignumber";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { ethers } from "hardhat";

import type {
  Checker,
  Checker__factory,
  FurionToken,
  FurionToken__factory,
  MockERC721,
  MockERC721__factory,
  SeparatePoolFactory,
  SeparatePoolFactory__factory,
} from "../../../../types";
import { deploy } from "../../../utils";

// Convert to smallest unit (10^18)
function su(amount: string): BigNumber {
  return ethers.utils.parseEther(amount);
}

// Initial NFT balances: (id)
// admin: ten NFT (0, 1, 2, 6, 7, 8, 9, 10, 11, 12), one NFT1 (0)
// bob: two NFT (3, 4), one NFT1 (1)
// alice: one NFT (5), one NFT1 (2)

// Initial FUR balance:
// admin: 1000
// bob: 1000
// alice: 1000

export async function deploySPFFixture(): Promise<{
  nft: MockERC721;
  nft1: MockERC721;
  spf: SeparatePoolFactory;
}> {
  const signers: SignerWithAddress[] = await ethers.getSigners();
  const admin: SignerWithAddress = signers[0];
  const bob: SignerWithAddress = signers[1];
  const alice: SignerWithAddress = signers[2];

  // Deploy NFTs
  const nft = <MockERC721>await deploy("MockERC721", ["NFTest", "NFT", "", 0, 1000]);
  await nft.connect(admin).mint(admin.address, 10);
  await nft.connect(admin).mint(bob.address, 2);
  await nft.connect(admin).mint(alice.address, 1);

  const nft1 = <MockERC721>await deploy("MockERC721", ["NFTest1", "NFT1", "", 0, 1000]);
  await nft1.connect(admin).mint(admin.address, 1);
  await nft1.connect(admin).mint(bob.address, 1);
  await nft1.connect(admin).mint(alice.address, 1);

  // Deploy FUR
  const fur = <FurionToken>await deploy("FurionToken", []);
  await fur.connect(admin).mintFurion(admin.address, su("1000"));
  await fur.connect(admin).mintFurion(bob.address, su("1000"));
  await fur.connect(admin).mintFurion(alice.address, su("1000"));

  // Deploy checker
  const checker = <Checker>await deploy("Checker", []);

  // Deploy SP Factory
  const spf = <SeparatePoolFactory>await deploy("SeparatePoolFactory", [admin.address, checker.address, fur.address]);

  // Set factory
  await checker.connect(admin).setSPFactory(spf.address);

  return { nft, nft1, spf };
}
