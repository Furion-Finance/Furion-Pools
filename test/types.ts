import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

import type {
  AggregatePool,
  AggregatePoolFactory,
  Checker,
  FractionalAggregatePool,
  FurionToken,
  MockERC721,
  SeparatePool,
  SeparatePoolFactory,
} from "../src/types";

type Fixture<T> = () => Promise<T>;

declare module "mocha" {
  export interface Context {
    nft: MockERC721;
    nft1: MockERC721;
    spf: SeparatePoolFactory;
    sp: SeparatePool;
    sp1: SeparatePool;
    apf: AggregatePoolFactory;
    ap: AggregatePool;
    ap1: AggregatePool;
    fap: FractionalAggregatePool;
    checker: Checker;
    fur: FurionToken;
    loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
    signers: Signers;
  }
}

export interface Signers {
  admin: SignerWithAddress;
  bob: SignerWithAddress;
  alice: SignerWithAddress;
}
