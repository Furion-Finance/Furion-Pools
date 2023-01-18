import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";

import type { AggregatePoolFactory, Checker, FurionPricingOracle, FurionToken, MockERC721 } from "../../../../types";
import { deploy } from "../../../utils";

// Convert to smallest unit (10^18)
function su(amount: string): BigNumber {
  return ethers.utils.parseEther(amount);
}

// Initial NFT balances: (id)
// admin: three NFT (0, 1, 2), one NFT1 (0)
// bob: two NFT (3, 4), one NFT1 (1)
// alice: one NFT (5), one NFT1 (2)

// Initial FUR balance:
// admin: 1000
// bob: 1000
// alice: 1000

export async function deployAPFFixture(): Promise<{
  nft: MockERC721;
  nft1: MockERC721;
  apf: AggregatePoolFactory;
}> {
  const signers: SignerWithAddress[] = await ethers.getSigners();
  const admin: SignerWithAddress = signers[0];

  // Deploy NFTs
  const nft = <MockERC721>await deploy("MockERC721", ["NFTest", "NFT", "", 0, 1000]);

  const nft1 = <MockERC721>await deploy("MockERC721", ["NFTest1", "NFT1", "", 0, 1000]);

  // Deploy FUR
  const fur = <FurionToken>await deploy("FurionToken", []);

  // Deploy checker
  const checker = <Checker>await deploy("Checker", []);

  // Deploy nft oracle
  const fpo = <FurionPricingOracle>await deploy("FurionPricingOracle", []);

  const apf = <AggregatePoolFactory>(
    await deploy("AggregatePoolFactory", [admin.address, checker.address, fur.address, fpo.address])
  );

  // Set factory
  await checker.connect(admin).setAPFactory(apf.address);

  return { nft, nft1, apf };
}
