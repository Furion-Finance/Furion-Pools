import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";

import {
  Checker,
  FractionalAggregatePool,
  FurionPricingOracle,
  FurionToken,
  MockERC721,
  SeparatePool,
  SeparatePoolFactory,
} from "../../../../types";
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

export async function deployFAPFFixture(): Promise<{
  fapf: FractionalAggregatePoolFactory;
  sp: SeparatePool;
  sp1: SeparatePool;
}> {
  const signers: SignerWithAddress[] = await ethers.getSigners();
  const admin: SignerWithAddress = signers[0];
  const bob: SignerWithAddress = signers[1];
  const alice: SignerWithAddress = signers[2];

  const nft = <MockERC721>await deploy("MockERC721", ["NFTest", "NFT", "", 0, 1000]);
  await nft.connect(admin).mint(admin.address, 3);
  await nft.connect(admin).mint(bob.address, 2);
  await nft.connect(admin).mint(alice.address, 1);

  const nft1 = <MockERC721>await deploy("MockERC721", ["NFTest1", "NFT", "", 0, 1000]);
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

  // Deploy nft oracle
  const fpo = <FurionPricingOracle>await deploy("FurionPricingOracle", []);

  // Deploy factories
  const spf = <SeparatePoolFactory>await deploy("SeparatePoolFactory", [admin.address, checker.address, fur.address]);

  const fapf = <FractionalAggregatePoolFactory>(
    await deploy("FractionalAggregatePoolFactory", [
      admin.address,
      checker.address,
      fur.address,
      fpo.address,
      spf.address,
    ])
  );

  // Set factory
  await checker.connect(admin).setSPFactory(spf.address);
  await checker.connect(admin).setFAPFactory(fapf.address);

  // Create project pools
  const spAddress = await spf.callStatic.createPool(nft.address);
  await spf.createPool(nft.address);
  const spAddress1 = await spf.callStatic.createPool(nft1.address);
  await spf.createPool(nft1.address);
  const sp = <SeparatePool>await ethers.getContractAt("SeparatePool", spAddress);
  const sp1 = <SeparatePool>await ethers.getContractAt("SeparatePool", spAddress1);

  return { fapf, sp, sp1 };
}
