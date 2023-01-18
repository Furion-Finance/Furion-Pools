import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";

import type {
  AggregatePool,
  AggregatePoolFactory,
  FurionPricingOracle,
  FurionToken,
  MockERC721,
} from "../../../../types";
import { deploy } from "../../../utils";

// Initial NFT balances: (id)
// admin: three NFT (0, 1, 2), one NFT1 (0)
// bob: two NFT (3, 4), one NFT1 (1)
// alice: one NFT (5), one NFT1 (2)

// Initial FUR balance:
// admin: 1000
// bob: 1000
// alice: 1000

function su(amount: string): BigNumberish {
  return ethers.utils.parseEther(amount);
}

export async function deployAPFixture(): Promise<{
  nft: MockERC721;
  nft1: MockERC721;
  fur: FurionToken;
  ap: FractionalAggregatePool;
  fpo: FurionPricingOracle;
}> {
  const signers: SignerWithAddress[] = await ethers.getSigners();
  const admin: SignerWithAddress = signers[0];
  const bob: SignerWithAddress = signers[1];
  const alice: SignerWithAddress = signers[2];

  // Deploy NFTs
  const nft = <MockERC721>await deploy("MockERC721", ["NFTest", "NFT", "", 0, 1000]);
  await nft.connect(admin).mint(admin.address, 3);
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

  // Deploy Furion Pricing Oracle
  const fpo = <FurionPricingOracle>await deploy("FurionPricingOracle", []);

  // Set initial NFT & NFT1 prices (2 ETH & 1.5 ETH)
  await fpo.connect(admin).initPrice(nft.address, 1);
  await fpo.connect(admin).updatePrice(nft.address, 0, su("2"));
  await fpo.connect(admin).initPrice(nft1.address, 1);
  await fpo.connect(admin).updatePrice(nft1.address, 0, su("1.5"));

  // Deploy factories
  const apf = <AggregatePoolFactory>(
    await deploy("AggregatePoolFactory", [admin.address, checker.address, fur.address, fpo.address])
  );

  // Set factory
  await checker.connect(admin).setAPFactory(apf.address);

  // Create aggregate pool, token is FFT-ANML
  const apAddress = await apf.callStatic.createPool([nft.address, nft1.address], "ANIMAL", "ANML");
  await apf.createPool([nft.address, nft1.address], "ANIMAL", "ANML");
  const ap = <AggregatePool>await ethers.getContractAt("AggregatePool", apAddress);

  // Approve spending of FUR by aggregate pool
  await fur.connect(admin).approve(ap.address, su("1000"));
  await fur.connect(bob).approve(ap.address, su("1000"));
  await fur.connect(alice).approve(ap.address, su("1000"));

  // Approve spending of NFTs by aggregate pool
  await nft.connect(admin).setApprovalForAll(ap.address, true);
  await nft.connect(bob).setApprovalForAll(ap.address, true);
  await nft.connect(alice).setApprovalForAll(ap.address, true);
  await nft1.connect(admin).setApprovalForAll(ap.address, true);
  await nft1.connect(bob).setApprovalForAll(ap.address, true);
  await nft1.connect(alice).setApprovalForAll(ap.address, true);

  return { nft, nft1, fur, ap, fpo };
}
