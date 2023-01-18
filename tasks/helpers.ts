import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/types";
import { Contract, ContractFactory } from "ethers";

import {
  readAddressList,
  readAggregatePoolList,
  readArgs,
  readSeparatePoolList,
  storeAddressList,
  storeAggregatePoolList,
  storeArgs,
  storeSeparatePoolList,
} from "../scripts/contractAddress";

export const getNetwork = () => {
  const hre = require("hardhat");
  const { network } = hre;
  const _network = network.name == "hardhat" ? "localhost" : network.name;
  return _network;
};

/********************************* Store addresses & args *************************************/

export const writeDeployment = (network: string, name: string, _address: string, _args: Array<any>) => {
  const addressList = readAddressList();
  addressList[network][name] = _address;
  storeAddressList(addressList);

  const argsList = readArgs();
  argsList[network][name] = { address: _address, args: _args };
  storeArgs(argsList);
};

export const writeSeparatePool = (network: string, _name: string, _address: string, _args: Array<any>) => {
  const spList = readSeparatePoolList();
  spList[network].push({ name: _name, address: _address });
  storeSeparatePoolList(spList);

  const argsList = readArgs();
  const finalName = _name + " Separate Pool";
  argsList[network][finalName] = { address: _address, args: _args };
  storeArgs(argsList);
};

export const writeAggregatePool = (
  network: string,
  _name: string,
  _symbol: string,
  _address: string,
  _args: Array<any>,
) => {
  const apList = readAggregatePoolList();
  apList[network].push({ name: _name, symbol: _symbol, address: _address });
  storeAggregatePoolList(apList);

  const argsList = readArgs();
  const finalName = _name + " Aggregate Pool";
  argsList[network][finalName] = { address: _address, args: _args };
  storeArgs(argsList);
};

/**************************************** Deployment ****************************************/

export const deploy = async (ethers: HardhatEthersHelpers, artifact: string, params: Array<any>) => {
  const signers: SignerWithAddress[] = await ethers.getSigners();

  const factory: ContractFactory = <ContractFactory>await ethers.getContractFactory(artifact);
  let contract: Contract;

  if (params.length > 0) contract = await factory.connect(signers[0]).deploy(...params);
  else contract = await factory.connect(signers[0]).deploy();

  return await contract.deployed();
};
