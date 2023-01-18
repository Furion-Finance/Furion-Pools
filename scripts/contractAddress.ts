/**
 * Remember to use this function in the root path of your hardhat project
 */
import * as fs from "fs";

///
/// Deployed Contract Address Info Record
///
export const readAddressList = function () {
  // const filePath = __dirname + "/address.json"
  return JSON.parse(fs.readFileSync("info/address.json", "utf-8"));
};

export const storeAddressList = function (addressList: object) {
  fs.writeFileSync("info/address.json", JSON.stringify(addressList, null, "\t"));
};

export const clearAddressList = function () {
  const emptyList = {};
  fs.writeFileSync("info/address.json", JSON.stringify(emptyList, null, "\t"));
};

///
/// Separate Pool Info Record
///
export const readSeparatePoolList = function () {
  return JSON.parse(fs.readFileSync("info/SeparatePool.json", "utf-8"));
};

export const storeSeparatePoolList = function (separatePoolList: object) {
  fs.writeFileSync("info/SeparatePool.json", JSON.stringify(separatePoolList, null, "\t"));
};

export const clearSeparatePoolList = function () {
  const emptyList = { localhost: [], goerli: [] };
  fs.writeFileSync("info/SeparatePool.json", JSON.stringify(emptyList, null, "\t"));
};

///
/// Aggregate Pool Info Record
///
export const readAggregatePoolList = function () {
  return JSON.parse(fs.readFileSync("info/AggregatePool.json", "utf-8"));
};

export const storeAggregatePoolList = function (aggregatePoolList: object) {
  fs.writeFileSync("info/AggregatePool.json", JSON.stringify(aggregatePoolList, null, "\t"));
};

export const clearAggregatePoolList = function () {
  const emptyList = { localhost: [], goerli: [] };
  fs.writeFileSync("info/AggregatePool.json", JSON.stringify(emptyList, null, "\t"));
};

///
/// LINK token address for CHAINLINK Oracle using
///

export const getLinkAddress = function (networkName: string) {
  const linkAddress = {
    avax: "0x5947BB275c521040051D82396192181b413227A3",
    fuji: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
    localhost: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
  };

  const obj = JSON.parse(JSON.stringify(linkAddress));

  return obj[networkName];
};

///
/// Deployment args record
///

export const readArgs = function () {
  return JSON.parse(fs.readFileSync("info/verify.json", "utf-8"));
};

export const storeArgs = function (args: object) {
  fs.writeFileSync("info/verify.json", JSON.stringify(args, null, "\t"));
};
